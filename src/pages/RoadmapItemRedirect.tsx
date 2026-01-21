import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock, Loader2, ArrowRight } from "lucide-react";

/**
 * RoadmapItemRedirect handles deep links to roadmap items from email notifications.
 * 
 * Flow:
 * 1. Unauthenticated users → Redirect to login with return URL
 * 2. Authenticated but not project member → Show access denied
 * 3. Authenticated project member → Redirect to roadmap page with item highlighted
 */
export default function RoadmapItemRedirect() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const itemId = searchParams.get("item");

  const [status, setStatus] = useState<"loading" | "unauthorized" | "no-access" | "redirecting">("loading");
  const [projectName, setProjectName] = useState<string>("");
  const [itemTitle, setItemTitle] = useState<string>("");

  useEffect(() => {
    checkAccessAndRedirect();
  }, [projectId, itemId]);

  const checkAccessAndRedirect = async () => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Store the return URL and redirect to auth
        const returnUrl = `/projects/${projectId}/roadmap?item=${itemId}`;
        sessionStorage.setItem("authReturnUrl", returnUrl);
        setStatus("unauthorized");
        return;
      }

      // Check if user is a member of this project
      const { data: membership, error: membershipError } = await supabase
        .from("project_members")
        .select("id, position")
        .eq("project_id", projectId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      // Also check if user is admin
      const { data: isAdmin } = await supabase
        .rpc("is_admin", { user_id: session.user.id });

      if (!membership && !isAdmin) {
        // Fetch project name for display
        const { data: project } = await supabase
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .single();
        
        setProjectName(project?.name || "this project");
        setStatus("no-access");
        return;
      }

      // User has access - fetch item details and redirect
      if (itemId) {
        const { data: item } = await supabase
          .from("project_roadmap_items")
          .select("title")
          .eq("id", itemId)
          .single();
        
        setItemTitle(item?.title || "");
      }

      setStatus("redirecting");

      // Set the project in localStorage so DashboardLayout picks it up
      localStorage.setItem("selectedProjectId", projectId!);

      // Navigate to the roadmap page with the item highlighted
      setTimeout(() => {
        navigate(`/dashboard/roadmap?highlight=${itemId}`, { replace: true });
      }, 500);

    } catch (error) {
      console.error("Error checking access:", error);
      setStatus("no-access");
    }
  };

  const handleLoginRedirect = () => {
    const returnUrl = `/projects/${projectId}/roadmap?item=${itemId}`;
    sessionStorage.setItem("authReturnUrl", returnUrl);
    navigate("/auth");
  };

  const handleGoToProjects = () => {
    navigate("/projects");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Checking access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Please sign in to view this roadmap item. You'll be redirected back after logging in.
            </p>
            <Button onClick={handleLoginRedirect} className="w-full">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "no-access") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              You don't have access to <strong>{projectName}</strong>. 
              Please contact the project administrator if you believe this is an error.
            </p>
            <Button onClick={handleGoToProjects} variant="outline" className="w-full">
              Go to My Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirecting state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium mb-1">Opening roadmap item...</p>
          {itemTitle && (
            <p className="text-sm text-muted-foreground">{itemTitle}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
