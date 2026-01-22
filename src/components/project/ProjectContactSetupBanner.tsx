import { AlertTriangle, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate, useLocation } from "react-router-dom";

interface ProjectContactSetupBannerProps {
  projectName: string;
}

export function ProjectContactSetupBanner({ projectName }: ProjectContactSetupBannerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show banner if already on contact-library page
  if (location.pathname.includes("contact-library")) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mx-6 mt-4 border-2 border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-lg font-semibold">Project Setup Required</AlertTitle>
      <AlertDescription className="mt-2 space-y-4">
        <p className="text-base">
          No client contact has been assigned to <strong>"{projectName}"</strong>. 
          You must assign at least one client contact from the Contact Library before accessing project features.
        </p>
        <Button
          onClick={() => navigate("/dashboard/contact-library")}
          className="gap-2"
          size="lg"
        >
          <Users className="h-4 w-4" />
          Go to Contact Library
          <ArrowRight className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
