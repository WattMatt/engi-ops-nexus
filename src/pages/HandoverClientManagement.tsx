import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  Eye,
  Share2,
  CheckCircle,
  Globe,
  Lock,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const HandoverClientManagement = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [projectId, setProjectId] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");
  const [clientUrl, setClientUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    // Get project from localStorage
    const storedProjectId = localStorage.getItem("selectedProjectId");
    if (storedProjectId) {
      setProjectId(storedProjectId);
      loadProjectDetails(storedProjectId);
      generateClientUrl(storedProjectId);
    }
  }, [isAdmin, roleLoading, navigate]);

  const loadProjectDetails = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("name")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        setProjectName(data.name);
      }
    } catch (error) {
      console.error("Error loading project:", error);
    }
  };

  const generateClientUrl = (id: string) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/handover-client?project=${id}`;
    setClientUrl(url);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(clientUrl);
      setCopied(true);
      toast.success("URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const handleOpenPreview = () => {
    window.open(clientUrl, "_blank");
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Client Handover Portal</h1>
        <p className="text-muted-foreground mt-2">
          Manage and share your project handover portal with clients
        </p>
      </div>

      {/* Admin Notice */}
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle>Admin Access Only</AlertTitle>
        <AlertDescription>
          This page is only accessible to administrators. Use the URL below to share
          the client portal with your clients.
        </AlertDescription>
      </Alert>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Project Information
          </CardTitle>
          <CardDescription>
            Current project details and client portal URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Project Name
            </label>
            <div className="mt-1 text-lg font-semibold">{projectName || "Loading..."}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Project ID
            </label>
            <div className="mt-1 font-mono text-sm">{projectId}</div>
          </div>
        </CardContent>
      </Card>

      {/* Client Portal URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Client Portal URL
          </CardTitle>
          <CardDescription>
            Share this URL with your clients to give them access to their handover
            documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={clientUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant={copied ? "default" : "outline"}
              size="icon"
              onClick={handleCopyUrl}
            >
              {copied ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleOpenPreview} className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              Preview Client Portal
            </Button>
            <Button onClick={handleCopyUrl} variant="outline" className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copy URL
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Portal Features */}
      <Card>
        <CardHeader>
          <CardTitle>What Clients Will See</CardTitle>
          <CardDescription>
            Features available in the client portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Document Access</p>
                <p className="text-sm text-muted-foreground">
                  View and download all handover documents for their tenant space
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Document Upload</p>
                <p className="text-sm text-muted-foreground">
                  Upload their own documents like COCs and warranties
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Real-time Updates</p>
                <p className="text-sm text-muted-foreground">
                  Automatically see new documents as they're added
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Secure Access</p>
                <p className="text-sm text-muted-foreground">
                  Project-specific access with secure document storage
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Share</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center">
                1
              </Badge>
              <p className="text-sm">
                Copy the client portal URL using the button above
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center">
                2
              </Badge>
              <p className="text-sm">
                Share the URL with your clients via email or other communication channels
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center">
                3
              </Badge>
              <p className="text-sm">
                Clients can access their documents and upload required files using their tenant information
              </p>
            </div>
          </div>

          <Alert>
            <ExternalLink className="h-4 w-4" />
            <AlertDescription>
              The portal URL is project-specific and will show all tenants within this
              project. Clients can select their tenant to view their documents.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default HandoverClientManagement;
