/**
 * Cable Verification Portal Page
 * Public-facing portal for site electricians to verify cable installations
 */
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
import { VerificationPortalData, VerificationStats } from "@/types/cableVerification";
import { LoadingState, ErrorState } from "@/components/common";

export default function CableVerificationPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<VerificationPortalData | null>(null);
  const [stats, setStats] = useState<VerificationStats>({
    total: 0,
    pending: 0,
    verified: 0,
    issues: 0,
    not_installed: 0,
    completion_percentage: 0,
  });

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
      
      // Update stats based on cable count
      setStats(prev => ({
        ...prev,
        total: result.cable_count,
        pending: result.cable_count,
      }));
      
    } catch (err) {
      console.error('Token validation error:', err);
      setError('Failed to validate verification link. Please try again.');
    } finally {
      setIsLoading(false);
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
            <div className="space-y-4">
              <Progress value={stats.completion_percentage} className="h-3" />
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total Cables</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.verified}</div>
                  <div className="text-xs text-muted-foreground">Verified</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-100 dark:bg-amber-900/20">
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.issues}</div>
                  <div className="text-xs text-muted-foreground">Issues</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </div>
            </div>
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
                <div className="text-center py-12 text-muted-foreground">
                  <Cable className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Cable verification list coming soon</p>
                  <p className="text-sm">Phase 2 implementation</p>
                </div>
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
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No issues flagged yet</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signoff">
            <Card>
              <CardHeader>
                <CardTitle>Complete Verification</CardTitle>
                <CardDescription>
                  Submit your credentials and digital signature to complete the verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Sign-off form coming soon</p>
                  <p className="text-sm">Phase 3 implementation</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}