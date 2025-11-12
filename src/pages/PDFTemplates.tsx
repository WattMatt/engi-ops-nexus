import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PDFTemplateDesigner } from "@/components/pdf-templates/PDFTemplateDesigner";
import { TemplateLibrary } from "@/components/pdf-templates/TemplateLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PDFTemplates() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [isDesigning, setIsDesigning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("cost_report");

  if (!projectId) {
    return <div>Project not found</div>;
  }

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
          <PDFTemplateDesigner
            templateId={selectedTemplateId}
            category={selectedCategory}
            projectId={projectId}
            onSave={handleSave}
          />
        ) : (
          <div className="container mx-auto p-6">
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
                  projectId={projectId}
                  category={selectedCategory}
                  onSelectTemplate={handleSelectTemplate}
                  onCreateNew={handleCreateNew}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
