import { useProjectClientCheck } from "@/hooks/useProjectClientCheck";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ProjectContactAssignment } from "@/components/project/ProjectContactAssignment";

export default function DashboardContactLibrary() {
  const projectId = localStorage.getItem("selectedProjectId");
  const { hasClient, isLoading, clientContact } = useProjectClientCheck(projectId);

  if (!projectId) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          No project selected
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Project Contacts</h1>
        <p className="text-muted-foreground">
          Assign contacts from your global library to this project.
        </p>
      </div>

      {/* Status Banner */}
      {!isLoading && (
        hasClient ? (
          <Alert className="border-primary/50 bg-primary/10">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <AlertTitle className="text-primary">Client Assigned</AlertTitle>
            <AlertDescription>
              This project has <strong>{clientContact?.organization_name}</strong> assigned as the client.
              You can now access all project features.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive" className="border-2 border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Action Required</AlertTitle>
            <AlertDescription>
              You must assign a <strong>Client</strong> contact to this project before you can access other features.
              Select a client from the dropdown below.
            </AlertDescription>
          </Alert>
        )
      )}

      {/* Contact Assignment Interface */}
      <ProjectContactAssignment projectId={projectId} />
    </div>
  );
}
