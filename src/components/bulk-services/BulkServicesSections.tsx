import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Save, X, Trash2 } from "lucide-react";
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

interface BulkServicesSectionsProps {
  documentId: string;
  sections: any[];
}

export const BulkServicesSections = ({ documentId, sections }: BulkServicesSectionsProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);

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
            ) : (
              <div className="prose prose-sm max-w-none">
                {section.content ? (
                  <div className="whitespace-pre-wrap">
                    {section.content.split('\n').map((line: string, idx: number) => {
                      // Handle markdown tables
                      if (line.trim().startsWith('|')) {
                        return <div key={idx} className="font-mono text-xs bg-muted p-2 rounded my-1">{line}</div>;
                      }
                      // Handle markdown headers
                      if (line.trim().startsWith('## ')) {
                        return <h3 key={idx} className="text-lg font-semibold mt-4 mb-2">{line.replace('## ', '')}</h3>;
                      }
                      if (line.trim().startsWith('# ')) {
                        return <h2 key={idx} className="text-xl font-bold mt-4 mb-2">{line.replace('# ', '')}</h2>;
                      }
                      // Handle bullet points
                      if (line.trim().startsWith('- ')) {
                        return <li key={idx} className="ml-4">{line.replace('- ', '')}</li>;
                      }
                      // Regular text
                      return line.trim() ? <p key={idx} className="mb-2">{line}</p> : <br key={idx} />;
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
