import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PDFTemplateDesigner } from "@/components/pdf-templates/PDFTemplateDesigner";
import { TemplateLibrary } from "@/components/pdf-templates/TemplateLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PDFTemplates() {
  const navigate = useNavigate();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [isDesigning, setIsDesigning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("cost_report");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsDesigning(true);
  };

  const handleCreateNew = () => {
    setSelectedTemplateId(undefined);
    setIsDesigning(true);
  };

  const handleSave = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsDesigning(false);
  };

  const handleBackToLibrary = () => {
    setIsDesigning(false);
    setSelectedTemplateId(undefined);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b bg-background p-4">
        <div className="flex items-center gap-4">
          {isDesigning && (
            <Button variant="ghost" size="sm" onClick={handleBackToLibrary}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">PDF Templates</h1>
            <p className="text-sm text-muted-foreground">
              Design custom PDF layouts with drag-and-drop editing
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isDesigning ? (
          selectedProjectId ? (
          <PDFTemplateDesigner
            templateId={selectedTemplateId}
            category={selectedCategory}
            projectId={selectedProjectId}
            onSave={handleSave}
          />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Please select a project first</p>
            </div>
          )
        ) : (
          <div className="container mx-auto p-6 space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>How field mapping works:</strong> Field names in your template automatically fill with report data. 
                For example, <code className="bg-muted px-1 py-0.5 rounded text-xs">report_name</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">project_number</code>, 
                and <code className="bg-muted px-1 py-0.5 rounded text-xs">category_1_budget</code> will auto-populate when you export. 
                Use the starter template to see available fields.
              </AlertDescription>
            </Alert>
            
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList>
                <TabsTrigger value="cost_report">Cost Reports</TabsTrigger>
                <TabsTrigger value="tenant_report">Tenant Reports</TabsTrigger>
                <TabsTrigger value="cable_schedule">Cable Schedules</TabsTrigger>
                <TabsTrigger value="final_account">Final Accounts</TabsTrigger>
                <TabsTrigger value="bulk_services">Bulk Services</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-6">
                <TemplateLibrary
                  projectId={selectedProjectId}
                  category={selectedCategory}
                  onSelectTemplate={handleSelectTemplate}
                  onCreateNew={handleCreateNew}
                  onProjectChange={setSelectedProjectId}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
