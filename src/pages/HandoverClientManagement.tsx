import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="outline" onClick={() => navigate('/dashboard/projects-report/handover')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Handover
        </Button>

        {/* URL Bar */}
        <Alert>
          <AlertDescription>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Client Portal URL:</span>
              <div className="flex-1 p-2 bg-muted rounded font-mono text-xs break-all">
                {clientUrl || "Loading..."}
              </div>
              <Button onClick={handleCopyUrl} disabled={!clientUrl} size="sm">
                <Copy className="h-4 w-4 mr-2" />
                {copied ? "Copied!" : "Copy URL"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* Client Portal Preview */}
        <Card>
          <CardContent className="p-2">
            <div className="border-2 border-dashed rounded-lg overflow-hidden">
              <iframe
                src={clientUrl}
                className="w-full h-[800px] border-0"
                title="Client Portal Preview"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HandoverClientManagement;
