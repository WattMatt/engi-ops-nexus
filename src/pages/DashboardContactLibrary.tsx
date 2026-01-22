import { GlobalContactsManager } from "@/components/settings/GlobalContactsManager";
import { ProjectContacts } from "@/components/settings/ProjectContacts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Library, Users } from "lucide-react";
import { useProjectClientCheck } from "@/hooks/useProjectClientCheck";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function DashboardContactLibrary() {
  const projectId = localStorage.getItem("selectedProjectId");
  const { hasClient, isLoading, clientContact } = useProjectClientCheck(projectId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contact Library</h1>
        <p className="text-muted-foreground">
          Manage your global contacts and assign them to this project.
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
              Use the "Project Contacts" tab to link a client from your global library.
            </AlertDescription>
          </Alert>
        )
      )}

      <Tabs defaultValue={hasClient ? "global" : "project"} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="project" className="gap-2">
            <Users className="h-4 w-4" />
            Project Contacts
          </TabsTrigger>
          <TabsTrigger value="global" className="gap-2">
            <Library className="h-4 w-4" />
            Global Library
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="project" className="mt-6">
          {projectId ? (
            <ProjectContacts projectId={projectId} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No project selected
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="global" className="mt-6">
          <GlobalContactsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
