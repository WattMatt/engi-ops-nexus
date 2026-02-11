import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileText, Package, MessageSquarePlus, AlertTriangle, Users, Cable, ClipboardCheck, RefreshCw, Mail, Map, CircuitBoard } from "lucide-react";
import { ContractorDrawingRegister } from "@/components/contractor-portal/ContractorDrawingRegister";
import { ContractorProcurementStatus } from "@/components/contractor-portal/ContractorProcurementStatus";
import { ContractorRFISection } from "@/components/contractor-portal/ContractorRFISection";
import { ContractorTenantTracker } from "@/components/contractor-portal/ContractorTenantTracker";
import { ContractorCableStatus } from "@/components/contractor-portal/ContractorCableStatus";
import { ContractorInspectionRequests } from "@/components/contractor-portal/ContractorInspectionRequests";
import { ContractorFloorPlanView } from "@/components/contractor-portal/ContractorFloorPlanView";
import { ContractorDBLegendCards } from "@/components/contractor-portal/ContractorDBLegendCards";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalUserIdentityDialog, PortalUserIdentity } from "@/components/contractor-portal/PortalUserIdentityDialog";
import { InfoTooltip } from "@/components/ui/rich-tooltip";

// Version for cache busting - increment when major UI changes are deployed
const PORTAL_VERSION = '2.1.0';

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

type ErrorCode = 'MISSING' | 'EXPIRED' | 'INACTIVE' | 'NOT_FOUND' | 'UNKNOWN';

interface AccessError {
  code: ErrorCode;
  message: string;
  details?: string;
}

const ERROR_MESSAGES: Record<ErrorCode, { title: string; description: string }> = {
  MISSING: {
    title: "No Access Token",
    description: "This link is missing the required access token. Please use the complete link provided by the project team."
  },
  EXPIRED: {
    title: "Link Expired",
    description: "Your access link has expired. Please request a new link from the project team."
  },
  INACTIVE: {
    title: "Access Revoked",
    description: "Your access to this portal has been revoked. Please contact the project team if you need access restored."
  },
  NOT_FOUND: {
    title: "Invalid Link",
    description: "This access link is not valid. It may have been deleted or the URL may be corrupted."
  },
  UNKNOWN: {
    title: "Access Denied",
    description: "Unable to access the contractor portal. Please contact the project team for assistance."
  }
};

export default function ContractorPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [accessError, setAccessError] = useState<AccessError | null>(null);
  const [portalUser, setPortalUser] = useState<PortalUserIdentity | null>(null);

  // Handler for when user identity is confirmed - must be before early returns
  const handleIdentityConfirmed = useCallback((identity: PortalUserIdentity) => {
    setPortalUser(identity);
  }, []);

  // Version-based cache busting
  useEffect(() => {
    const storedVersion = localStorage.getItem('contractor_portal_version');
    if (storedVersion !== PORTAL_VERSION) {
      localStorage.setItem('contractor_portal_version', PORTAL_VERSION);
      if (storedVersion) {
        // Force reload to get latest code
        window.location.reload();
      }
    }
  }, []);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setAccessError({ code: 'MISSING', message: 'No access token provided' });
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[Portal] Validating token, attempt ${attempt + 1}/${maxRetries}`);
        
        const { data, error: rpcError } = await supabase.rpc('validate_contractor_portal_token', {
          p_token: token,
          p_ip_address: null,
          p_user_agent: navigator.userAgent
        });

        if (rpcError) {
          console.error(`[Portal] RPC error on attempt ${attempt + 1}:`, rpcError);
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
            continue;
          }
          throw rpcError;
        }

        if (!data || data.length === 0) {
          setAccessError({ code: 'NOT_FOUND', message: 'Token not found in database' });
          setLoading(false);
          return;
        }

        const tokenInfo = data[0];
        
        // Check specific error conditions
        if (!tokenInfo.is_valid) {
          // Determine specific reason based on expires_at
          if (tokenInfo.expires_at && new Date(tokenInfo.expires_at) < new Date()) {
            setAccessError({ 
              code: 'EXPIRED', 
              message: 'Token has expired',
              details: `Expired on ${new Date(tokenInfo.expires_at).toLocaleDateString()}`
            });
          } else {
            // Token exists but is not valid - likely deactivated
            setAccessError({ code: 'INACTIVE', message: 'Token has been deactivated' });
          }
          setLoading(false);
          return;
        }

        console.log('[Portal] Token validated successfully');
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
        setLoading(false);
        return;

      } catch (err) {
        console.error(`[Portal] Validation error on attempt ${attempt + 1}:`, err);
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        } else {
          setAccessError({ code: 'UNKNOWN', message: 'Failed to validate access' });
          setLoading(false);
        }
      }
    }
  };

  const handleForceRefresh = () => {
    localStorage.removeItem('contractor_portal_version');
    window.location.reload();
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

  if (accessError || !tokenData || !project) {
    const errorInfo = accessError ? ERROR_MESSAGES[accessError.code] : ERROR_MESSAGES.UNKNOWN;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>{errorInfo.title}</CardTitle>
            <CardDescription>{errorInfo.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accessError?.details && (
              <p className="text-sm text-center text-muted-foreground bg-muted p-2 rounded">
                {accessError.details}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={handleForceRefresh} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              <Button 
                variant="default" 
                onClick={() => window.location.href = 'mailto:support@watsonmattheus.com?subject=Contractor%20Portal%20Access%20Issue'}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                Request New Access Link
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-4">
              Error Code: {accessError?.code || 'UNKNOWN'}
            </p>
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
          <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-grid">
            <InfoTooltip
              title="Drawing Register"
              description="View and download electrical drawings with full revision history. Drawings are grouped by discipline."
              icon={FileText}
              side="bottom"
            >
              <TabsTrigger value="drawings" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Drawings</span>
              </TabsTrigger>
            </InfoTooltip>
            <InfoTooltip
              title="Tenant Tracker"
              description="Track documentation status and order deadlines per tenant. Monitor SOW, layouts, DB orders, and lighting orders."
              icon={Users}
              side="bottom"
            >
              <TabsTrigger value="tenants" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Tenants</span>
              </TabsTrigger>
            </InfoTooltip>
            <InfoTooltip
              title="Floor Plan"
              description="View the floor plan with color-coded tenant zones. Click on a zone to see tenant details and status."
              icon={Map}
              side="bottom"
            >
              <TabsTrigger value="floorplan" className="gap-2">
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">Floor Plan</span>
              </TabsTrigger>
            </InfoTooltip>
            <InfoTooltip
              title="Cable Status"
              description="Monitor cable installation and verification status across the project."
              icon={Cable}
              side="bottom"
            >
              <TabsTrigger value="cables" className="gap-2">
                <Cable className="h-4 w-4" />
                <span className="hidden sm:inline">Cables</span>
              </TabsTrigger>
            </InfoTooltip>
            <InfoTooltip
              title="Inspections"
              description="Request and track site inspections. Submit inspection requests and view scheduled inspections."
              icon={ClipboardCheck}
              side="bottom"
            >
              <TabsTrigger value="inspections" className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Inspections</span>
              </TabsTrigger>
            </InfoTooltip>
            <InfoTooltip
              title="Procurement"
              description="View procurement status and update order dates for equipment and materials."
              icon={Package}
              side="bottom"
            >
              <TabsTrigger value="procurement" className="gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Procurement</span>
              </TabsTrigger>
            </InfoTooltip>
            <InfoTooltip
              title="RFI Tracker"
              description="Submit and track Requests for Information. The project team will be notified of new RFIs."
              icon={MessageSquarePlus}
              side="bottom"
            >
              <TabsTrigger value="rfi" className="gap-2">
                <MessageSquarePlus className="h-4 w-4" />
                <span className="hidden sm:inline">RFI</span>
              </TabsTrigger>
            </InfoTooltip>
            <InfoTooltip
              title="DB Legend Cards"
              description="Complete distribution board legend cards electronically for each tenant. Submit completed cards for review."
              icon={CircuitBoard}
              side="bottom"
            >
              <TabsTrigger value="db-legend" className="gap-2">
                <CircuitBoard className="h-4 w-4" />
                <span className="hidden sm:inline">DB Cards</span>
              </TabsTrigger>
            </InfoTooltip>
          </TabsList>

          <TabsContent value="drawings">
            <ContractorDrawingRegister 
              projectId={project.id} 
              token={token || undefined}
              userEmail={activeUserEmail}
            />
          </TabsContent>

          <TabsContent value="tenants">
            <ContractorTenantTracker projectId={project.id} />
          </TabsContent>

          <TabsContent value="floorplan">
            <ContractorFloorPlanView projectId={project.id} />
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

          <TabsContent value="db-legend">
            <ContractorDBLegendCards
              projectId={project.id}
              contractorName={activeUserName}
              contractorEmail={activeUserEmail}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
