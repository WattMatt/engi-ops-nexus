import { GlobalContactsManager } from "@/components/settings/GlobalContactsManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ContactLibrary() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/projects")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Contact Library</h1>
          <p className="text-muted-foreground">
            Manage your global contact database. These contacts can be imported into any project.
          </p>
        </div>
        <GlobalContactsManager />
      </div>
    </div>
  );
}
