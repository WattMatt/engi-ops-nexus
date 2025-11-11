import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Save, X, Trash2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadClarificationSection } from "./LoadClarificationSection";

interface BulkServicesSectionsProps {
  documentId: string;
  sections: any[];
}

export const BulkServicesSections = ({ documentId, sections }: BulkServicesSectionsProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const { data: document } = useQuery({
    queryKey: ["bulk-services-document", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const populatePlaceholders = (content: string): string => {
    if (!document) return content;

    const vaPerSqm = document.building_calculation_type === 'sans_204' 
      ? (document.va_per_sqm || 0) 
      : document.building_calculation_type === 'sans_10142'
      ? 40
      : 25;

    const totalSize = document.project_area ? 
      (document.project_area * vaPerSqm / 1000).toFixed(2) : 
      '0';

    const climaticZoneNames: Record<string, string> = {
      '1': 'Cold Interior (Zone 1)',
      '2': 'Hot Interior (Zone 2)',
      '3': 'Temperate Coastal (Zone 3)',
      '4': 'Sub-tropical Coastal (Zone 4)',
      '5': 'Arid Interior (Zone 5)',
    };

    let result = content
      .replace(/\[AREA\]/g, document.project_area?.toLocaleString() || '0')
      .replace(/\[VA\/m²\]/g, vaPerSqm.toString())
      .replace(/\[SIZE\]/g, `${totalSize} kVA`)
      .replace(/\[SUPPLY AUTHORITY\]/g, document.supply_authority || 'the local supply authority')
      .replace(/\[CLIENT NAME\]/g, document.client_name || 'the client')
      .replace(/\[DOCUMENT NUMBER\]/g, document.document_number || 'N/A')
      .replace(/\[CLIMATIC ZONE\]/g, climaticZoneNames[document.climatic_zone || '3'] || 'Temperate Coastal (Zone 3)')
      .replace(/\[CALCULATION TYPE\]/g, (document.building_calculation_type || 'sans_204').toUpperCase().replace('_', ' '))
      .replace(/\[ARCHITECT\]/g, document.architect || 'the appointed architect')
      .replace(/\[PRIMARY VOLTAGE\]/g, document.primary_voltage || '11kV')
      .replace(/\[CONNECTION SIZE\]/g, document.connection_size || 'to be determined')
      .replace(/\[DIVERSITY FACTOR\]/g, document.diversity_factor?.toString() || '1.0')
      .replace(/\[ELECTRICAL STANDARD\]/g, document.electrical_standard || 'SANS 10142-1');

    return result;
  };

  const handleEdit = (section: any) => {
    setEditingId(section.id);
    setEditContent(section.content || "");
  };

  const handleSave = async (sectionId: string) => {
    try {
      const { error } = await supabase
        .from("bulk_services_sections")
        .update({ content: editContent })
        .eq("id", sectionId);

      if (error) throw error;

      toast.success("Section updated successfully");
      setEditingId(null);
      window.location.reload();
    } catch (error: any) {
      console.error("Error updating section:", error);
      toast.error("Failed to update section");
    }
  };

  const handleDelete = async () => {
    if (!deleteSectionId) return;

    try {
      const { error } = await supabase
        .from("bulk_services_sections")
        .delete()
        .eq("id", deleteSectionId);

      if (error) throw error;

      toast.success("Section deleted successfully");
      setDeleteSectionId(null);
      window.location.reload();
    } catch (error: any) {
      console.error("Error deleting section:", error);
      toast.error("Failed to delete section");
    }
  };

  const handleAIGenerate = async (section: any) => {
    setGeneratingId(section.id);
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        "ai-generate-document",
        {
          body: {
            documentType: "bulk_services_section",
            sectionTitle: section.section_title,
            sectionNumber: section.section_number,
            projectData: document,
          },
        }
      );

      if (functionError) throw functionError;

      const { error: updateError } = await supabase
        .from("bulk_services_sections")
        .update({ content: functionData.content })
        .eq("id", section.id);

      if (updateError) throw updateError;

      toast.success("Section generated successfully");
      window.location.reload();
    } catch (error: any) {
      console.error("Error generating section:", error);
      toast.error("Failed to generate section");
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {section.section_number}. {section.section_title}
              </CardTitle>
              <div className="flex gap-2">
                {editingId === section.id ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleSave(section.id)}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAIGenerate(section)}
                      disabled={generatingId === section.id}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {generatingId === section.id ? "Generating..." : "AI Generate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(section)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteSectionId(section.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {editingId === section.id ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={15}
                placeholder="Enter section content..."
                className="font-mono text-sm"
              />
            ) : section.section_title === "Load Clarification" ? (
              <LoadClarificationSection documentId={documentId} />
            ) : (
              <div className="prose prose-sm max-w-none">
                {section.content ? (
                  <div className="whitespace-pre-wrap">
                    {populatePlaceholders(section.content).split('\n').map((line: string, idx: number) => {
                      // Handle markdown tables
                      if (line.trim().startsWith('|')) {
                        return <div key={idx} className="font-mono text-xs bg-muted/50 p-2 rounded my-1 border border-border">{line}</div>;
                      }
                      // Handle markdown headers
                      if (line.trim().startsWith('## ')) {
                        return <h3 key={idx} className="text-lg font-semibold mt-4 mb-2 text-foreground">{line.replace('## ', '')}</h3>;
                      }
                      if (line.trim().startsWith('# ')) {
                        return <h2 key={idx} className="text-xl font-bold mt-4 mb-2 text-foreground">{line.replace('# ', '')}</h2>;
                      }
                      // Handle bullet points
                      if (line.trim().startsWith('- ')) {
                        return <li key={idx} className="ml-4 text-foreground">{line.replace('- ', '')}</li>;
                      }
                      // Regular text
                      return line.trim() ? <p key={idx} className="mb-2 text-foreground leading-relaxed">{line}</p> : <br key={idx} />;
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">
                    No content yet. Click Edit to add content.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={!!deleteSectionId} onOpenChange={() => setDeleteSectionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this section? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
