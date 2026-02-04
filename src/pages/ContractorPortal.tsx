import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Package, MessageSquarePlus, AlertTriangle, Users, Cable, ClipboardCheck } from "lucide-react";
import { ContractorDrawingRegister } from "@/components/contractor-portal/ContractorDrawingRegister";
import { ContractorProcurementStatus } from "@/components/contractor-portal/ContractorProcurementStatus";
import { ContractorRFISection } from "@/components/contractor-portal/ContractorRFISection";
import { ContractorTenantTracker } from "@/components/contractor-portal/ContractorTenantTracker";
import { ContractorCableStatus } from "@/components/contractor-portal/ContractorCableStatus";
import { ContractorInspectionRequests } from "@/components/contractor-portal/ContractorInspectionRequests";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalUserIdentityDialog, PortalUserIdentity } from "@/components/contractor-portal/PortalUserIdentityDialog";

interface TokenData {
  project_id: string;
  contractor_type: string;
  contractor_name: string;
  contractor_email: string;
  company_name: string | null;
  document_categories: string[];
  expires_at: string;
}

interface Project {
  id: string;
  name: string;
  project_number: string;
  project_logo_url: string | null;
  client_logo_url: string | null;
  consultant_logo_url: string | null;
}

export default function ContractorPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [portalUser, setPortalUser] = useState<PortalUserIdentity | null>(null);

  // Handler for when user identity is confirmed - must be before early returns
  const handleIdentityConfirmed = useCallback((identity: PortalUserIdentity) => {
    setPortalUser(identity);
  }, []);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setError("No access token provided");
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc('validate_contractor_portal_token', {
        p_token: token,
        p_ip_address: null,
        p_user_agent: navigator.userAgent
      });

      if (rpcError) throw rpcError;

      if (!data || data.length === 0 || !data[0].is_valid) {
        setError("Invalid or expired access link");
        setLoading(false);
        return;
      }

      const tokenInfo = data[0];
      setTokenData({
        project_id: tokenInfo.project_id,
        contractor_type: tokenInfo.contractor_type,
        contractor_name: tokenInfo.contractor_name,
        contractor_email: tokenInfo.contractor_email,
        company_name: tokenInfo.company_name,
        document_categories: tokenInfo.document_categories || [],
        expires_at: tokenInfo.expires_at
      });

      // Fetch project details with branding
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, project_number, project_logo_url, client_logo_url, consultant_logo_url')
        .eq('id', tokenInfo.project_id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

    } catch (err) {
      console.error("Token validation error:", err);
      setError("Failed to validate access. Please try again or request a new link.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !tokenData || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              {error || "Unable to access contractor portal"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            If you believe this is an error, please contact the project team for a new access link.
          </CardContent>
        </Card>
      </div>
    );
  }

  const contractorTypeLabel = tokenData.contractor_type === 'main_contractor' ? 'Main Contractor' : 'Subcontractor';

  // Use portal user's name/email if available, otherwise fall back to token data
  const activeUserName = portalUser?.name || tokenData.contractor_name;
  const activeUserEmail = portalUser?.email || tokenData.contractor_email;

  return (
    <div className="min-h-screen bg-background">
      {/* User identity dialog - shown on first visit */}
      {token && project && (
        <PortalUserIdentityDialog
          projectId={project.id}
          token={token}
          onIdentityConfirmed={handleIdentityConfirmed}
        />
      )}

      <PortalHeader
        projectName={project.name}
        projectNumber={project.project_number}
        projectLogoUrl={project.project_logo_url}
        clientLogoUrl={project.client_logo_url}
        consultantLogoUrl={project.consultant_logo_url}
        portalType="contractor"
        userName={activeUserName}
        userBadge={contractorTypeLabel}
        showLogout={false}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <Tabs defaultValue="drawings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="drawings" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Drawing Register</span>
            </TabsTrigger>
            <TabsTrigger value="tenants" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Tenant Tracker</span>
            </TabsTrigger>
            <TabsTrigger value="cables" className="gap-2">
              <Cable className="h-4 w-4" />
              <span className="hidden sm:inline">Cable Status</span>
            </TabsTrigger>
            <TabsTrigger value="inspections" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Inspections</span>
            </TabsTrigger>
            <TabsTrigger value="procurement" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Procurement</span>
            </TabsTrigger>
            <TabsTrigger value="rfi" className="gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              <span className="hidden sm:inline">RFI Tracker</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drawings">
            <ContractorDrawingRegister projectId={project.id} />
          </TabsContent>

          <TabsContent value="tenants">
            <ContractorTenantTracker projectId={project.id} />
          </TabsContent>

          <TabsContent value="cables">
            <ContractorCableStatus projectId={project.id} />
          </TabsContent>

          <TabsContent value="inspections">
            <ContractorInspectionRequests
              projectId={project.id}
              contractorName={activeUserName}
              contractorEmail={activeUserEmail}
              companyName={tokenData.company_name}
              token={token || ''}
            />
          </TabsContent>

          <TabsContent value="procurement">
            <ContractorProcurementStatus 
              projectId={project.id}
              contractorName={activeUserName}
              contractorEmail={activeUserEmail}
              companyName={tokenData.company_name}
            />
          </TabsContent>

          <TabsContent value="rfi">
            <ContractorRFISection 
              projectId={project.id}
              contractorName={activeUserName}
              contractorEmail={activeUserEmail}
              companyName={tokenData.company_name}
              token={token || ''}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
