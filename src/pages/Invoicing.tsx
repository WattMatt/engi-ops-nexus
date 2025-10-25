import { ProjectsManager } from "@/components/invoicing/ProjectsManager";
import { InvoicesList } from "@/components/invoicing/InvoicesList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderKanban, FileText } from "lucide-react";

const Invoicing = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoicing</h1>
        <p className="text-muted-foreground">Manage projects and generate invoices</p>
      </div>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">
            <FolderKanban className="h-4 w-4 mr-2" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <ProjectsManager />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Invoicing;
