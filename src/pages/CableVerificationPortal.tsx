/**
 * Cable Verification Portal Page
 * Public-facing portal for site electricians to verify cable installations
 */
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Cable, 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle,
  User,
  Building2,
  Calendar,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { 
  VerificationPortalData, 
  VerificationStats, 
  CableEntryForVerification,
  VerificationItemStatus 
} from "@/types/cableVerification";
import { LoadingState, ErrorState } from "@/components/common";
import { 
  CableVerificationList, 
  ElectricianCredentialsForm,
  VerificationProgressBar 
} from "@/components/cable-verification";
import { useToast } from "@/hooks/use-toast";

export default function CableVerificationPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<VerificationPortalData | null>(null);
  const [cables, setCables] = useState<CableEntryForVerification[]>([]);
  const [stats, setStats] = useState<VerificationStats>({
    total: 0,
    pending: 0,
    verified: 0,
    issues: 0,
    not_installed: 0,
    completion_percentage: 0,
  });
  const [updatingCableId, setUpdatingCableId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No verification token provided');
      setIsLoading(false);
      return;
    }

    validateToken(token);
  }, [token]);

  const validateToken = async (token: string) => {
    try {
      setIsLoading(true);
      
      const { data, error: rpcError } = await supabase
        .rpc('validate_cable_verification_token', { p_token: token });

      if (rpcError) throw rpcError;

      const result = data as unknown as VerificationPortalData;
      
      if (!result.valid) {
        setError(result.error || 'Invalid or expired verification link');
        return;
      }

      setPortalData(result);
      
      // Check if already completed
      if (result.verification_status === 'verified' || result.verification_status === 'issues_found') {
        setIsCompleted(true);
      }
      
      // Load cable entries with verification status
      await loadCables(result.schedule.id, result.verification_id);
      
    } catch (err) {
      console.error('Token validation error:', err);
      setError('Failed to validate verification link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCables = async (scheduleId: string, verificationId: string) => {
    try {
      // Get cable entries for the schedule
      const { data: cableData, error: cableError } = await supabase
        .from('cable_entries')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('cable_tag', { ascending: true });

      if (cableError) throw cableError;

      // Get verification items for this verification
      const { data: verificationItems, error: itemsError } = await supabase
        .from('cable_verification_items')
        .select('*')
        .eq('verification_id', verificationId);

      if (itemsError) throw itemsError;

      // Merge cable data with verification status
      const itemsMap = new Map(verificationItems?.map(item => [item.cable_entry_id, item]) || []);
      
      const cablesWithStatus: CableEntryForVerification[] = (cableData || []).map(cable => {
        const verificationItem = itemsMap.get(cable.id);
        return {
          id: cable.id,
          cable_tag: cable.cable_tag,
          from_location: cable.from_location,
          to_location: cable.to_location,
          cable_size: cable.cable_size,
          core_count: cable.core_configuration || null,
          cable_type: cable.cable_type,
          voltage: cable.voltage?.toString() || null,
          total_length: cable.total_length,
          measured_length: cable.measured_length,
          extra_length: cable.extra_length,
          load_amps: cable.load_amps,
          verification_status: verificationItem?.status as VerificationItemStatus || 'pending',
          verification_notes: verificationItem?.notes,
          verification_photos: verificationItem?.photo_urls,
          verification_measured_length: verificationItem?.measured_length_actual,
        };
      });

      setCables(cablesWithStatus);
      updateStats(cablesWithStatus);
    } catch (err) {
      console.error('Failed to load cables:', err);
      toast({
        title: "Error",
        description: "Failed to load cable data",
        variant: "destructive",
      });
    }
  };

  const updateStats = (cableList: CableEntryForVerification[]) => {
    const newStats: VerificationStats = {
      total: cableList.length,
      pending: 0,
      verified: 0,
      issues: 0,
      not_installed: 0,
      completion_percentage: 0,
    };

    cableList.forEach(cable => {
      const status = cable.verification_status || 'pending';
      newStats[status]++;
    });

    const completed = newStats.verified + newStats.issues + newStats.not_installed;
    newStats.completion_percentage = newStats.total > 0 
      ? Math.round((completed / newStats.total) * 100) 
      : 0;

    setStats(newStats);
  };

  const handleStatusChange = useCallback(async (
    cableId: string, 
    status: VerificationItemStatus, 
    notes?: string, 
    measuredLength?: number
  ) => {
    if (!portalData) return;

    setUpdatingCableId(cableId);
    try {
      // Check if verification item exists
      const { data: existing } = await supabase
        .from('cable_verification_items')
        .select('id')
        .eq('verification_id', portalData.verification_id)
        .eq('cable_entry_id', cableId)
        .maybeSingle();

      const itemData = {
        status,
        notes: notes || null,
        measured_length_actual: measuredLength || null,
        verified_at: status !== 'pending' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase
          .from('cable_verification_items')
          .update(itemData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('cable_verification_items')
          .insert({
            ...itemData,
            verification_id: portalData.verification_id,
            cable_entry_id: cableId,
          });
      }

      // Update verification status to in_progress if still pending
      if (portalData.verification_status === 'pending') {
        await supabase
          .from('cable_schedule_verifications')
          .update({ 
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .eq('id', portalData.verification_id);
      }

      // Update local state
      setCables(prev => prev.map(cable => 
        cable.id === cableId 
          ? { 
              ...cable, 
              verification_status: status,
              verification_notes: notes || null,
              verification_measured_length: measuredLength || null,
            }
          : cable
      ));

      // Update stats
      updateStats(cables.map(cable => 
        cable.id === cableId 
          ? { ...cable, verification_status: status }
          : cable
      ));

    } catch (err) {
      console.error('Failed to update cable status:', err);
      toast({
        title: "Error",
        description: "Failed to save verification status",
        variant: "destructive",
      });
    } finally {
      setUpdatingCableId(null);
    }
  }, [portalData, cables, toast]);

  const handlePhotoUpload = useCallback(async (cableId: string, file: File): Promise<string> => {
    if (!portalData) throw new Error('No portal data');

    const fileExt = file.name.split('.').pop();
    const fileName = `${portalData.verification_id}/${cableId}/${Date.now()}.${fileExt}`;

    const { data, error: uploadError } = await supabase.storage
      .from('cable-verification-photos')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('cable-verification-photos')
      .getPublicUrl(fileName);

    // Update cable verification item with new photo
    const cable = cables.find(c => c.id === cableId);
    const currentPhotos = cable?.verification_photos || [];
    const newPhotos = [...currentPhotos, urlData.publicUrl];

    const { data: existing } = await supabase
      .from('cable_verification_items')
      .select('id')
      .eq('verification_id', portalData.verification_id)
      .eq('cable_entry_id', cableId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('cable_verification_items')
        .update({ photo_urls: newPhotos })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('cable_verification_items')
        .insert({
          verification_id: portalData.verification_id,
          cable_entry_id: cableId,
          status: 'pending',
          photo_urls: newPhotos,
        });
    }

    // Update local state
    setCables(prev => prev.map(c => 
      c.id === cableId 
        ? { ...c, verification_photos: newPhotos }
        : c
    ));

    return urlData.publicUrl;
  }, [portalData, cables]);

  const handlePhotoRemove = useCallback(async (cableId: string, photoUrl: string) => {
    if (!portalData) return;

    const cable = cables.find(c => c.id === cableId);
    const newPhotos = (cable?.verification_photos || []).filter(url => url !== photoUrl);

    await supabase
      .from('cable_verification_items')
      .update({ photo_urls: newPhotos.length > 0 ? newPhotos : null })
      .eq('verification_id', portalData.verification_id)
      .eq('cable_entry_id', cableId);

    // Update local state
    setCables(prev => prev.map(c => 
      c.id === cableId 
        ? { ...c, verification_photos: newPhotos }
        : c
    ));
  }, [portalData, cables]);

  const handleSignoffSubmit = async (data: {
    name: string;
    position: string;
    company: string;
    registration_number?: string;
    overall_notes?: string;
    authorization_confirmed: boolean;
    signature: string;
  }) => {
    if (!portalData) return;

    setIsSubmitting(true);
    try {
      // Upload signature image
      const signatureBlob = await fetch(data.signature).then(r => r.blob());
      const signatureFileName = `${portalData.verification_id}/signature.png`;
      
      await supabase.storage
        .from('cable-verification-photos')
        .upload(signatureFileName, signatureBlob, { upsert: true });

      const { data: signatureUrl } = supabase.storage
        .from('cable-verification-photos')
        .getPublicUrl(signatureFileName);

      // Determine final status
      const finalStatus = stats.issues > 0 ? 'issues_found' : 'verified';

      // Update verification record
      await supabase
        .from('cable_schedule_verifications')
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          overall_notes: data.overall_notes || null,
          signoff_name: data.name,
          signoff_position: data.position,
          signoff_company: data.company,
          signoff_registration: data.registration_number || null,
          signoff_date: new Date().toISOString().split('T')[0],
          authorization_confirmed: data.authorization_confirmed,
          signature_image_url: signatureUrl.publicUrl,
        })
        .eq('id', portalData.verification_id);

      // Send notification to project team
      try {
        await supabase.functions.invoke('send-cable-verification-notification', {
          body: {
            verification_id: portalData.verification_id,
            project_name: portalData.project.name,
            schedule_name: portalData.schedule.name,
            electrician_name: data.name,
            stats: {
              total: stats.total,
              verified: stats.verified,
              issues: stats.issues,
              not_installed: stats.not_installed,
            },
          },
        });
      } catch (notifyErr) {
        console.warn('Failed to send notification:', notifyErr);
      }

      toast({
        title: "Verification Complete",
        description: "Your sign-off has been submitted successfully.",
      });

      setIsCompleted(true);

    } catch (err) {
      console.error('Failed to submit sign-off:', err);
      toast({
        title: "Error",
        description: "Failed to submit verification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <LoadingState message="Validating verification access..." />
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <ErrorState
              title="Access Denied"
              message={error || 'Unable to access verification portal'}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-bold mb-2">Verification Complete</h2>
            <p className="text-muted-foreground mb-4">
              Thank you for completing the cable schedule verification.
              The project team has been notified.
            </p>
            <div className="p-4 rounded-lg bg-muted/50 text-left">
              <h3 className="font-medium mb-2">Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Total Cables:</div>
                <div className="font-medium">{stats.total}</div>
                <div>Verified:</div>
                <div className="font-medium text-green-600">{stats.verified}</div>
                <div>Issues Found:</div>
                <div className="font-medium text-amber-600">{stats.issues}</div>
                <div>Not Installed:</div>
                <div className="font-medium text-red-600">{stats.not_installed}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{portalData.project.name}</span>
              {portalData.project.project_number && (
                <span className="text-muted-foreground/60">
                  • {portalData.project.project_number}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Cable className="h-6 w-6" />
              {portalData.schedule.name}
            </h1>
            {portalData.schedule.revision && (
              <p className="text-sm text-muted-foreground">
                Revision: {portalData.schedule.revision}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Electrician Info Banner */}
      <div className="border-b bg-muted/30">
        <div className="container py-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{portalData.electrician.name}</span>
            </div>
            {portalData.electrician.company && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{portalData.electrician.company}</span>
              </div>
            )}
            {portalData.electrician.registration && (
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>{portalData.electrician.registration}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Expires: {format(new Date(portalData.expires_at), 'PPP')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="container py-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Verification Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VerificationProgressBar
              total={stats.total}
              verified={stats.verified}
              issues={stats.issues}
              pending={stats.pending}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div className="container pb-8">
        <Tabs defaultValue="cables" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cables" className="flex items-center gap-2">
              <Cable className="h-4 w-4" />
              <span className="hidden sm:inline">Cable List</span>
              <span className="sm:hidden">Cables</span>
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Issues</span>
              <span className="sm:hidden">Issues</span>
              {stats.issues > 0 && (
                <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 rounded-full">
                  {stats.issues}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="signoff" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Sign-off</span>
              <span className="sm:hidden">Sign</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cables">
            <Card>
              <CardHeader>
                <CardTitle>Cable Verification List</CardTitle>
                <CardDescription>
                  Review and verify each cable installation. Tap a cable to mark its status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CableVerificationList
                  cables={cables}
                  onStatusChange={handleStatusChange}
                  onPhotoUpload={handlePhotoUpload}
                  onPhotoRemove={handlePhotoRemove}
                  updatingCableId={updatingCableId}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <CardTitle>Flagged Issues</CardTitle>
                <CardDescription>
                  Cables marked with issues or not installed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.issues + stats.not_installed === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No issues flagged yet</p>
                  </div>
                ) : (
                  <CableVerificationList
                    cables={cables.filter(c => 
                      c.verification_status === 'issue' || 
                      c.verification_status === 'not_installed'
                    )}
                    onStatusChange={handleStatusChange}
                    onPhotoUpload={handlePhotoUpload}
                    onPhotoRemove={handlePhotoRemove}
                    updatingCableId={updatingCableId}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signoff">
            <ElectricianCredentialsForm
              defaultValues={{
                name: portalData.electrician.name,
                company: portalData.electrician.company || '',
                registration_number: portalData.electrician.registration || '',
                position: '',
                authorization_confirmed: false,
              }}
              onSubmit={handleSignoffSubmit}
              isSubmitting={isSubmitting}
              verificationStats={{
                total: stats.total,
                verified: stats.verified,
                issues: stats.issues,
                pending: stats.pending,
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
