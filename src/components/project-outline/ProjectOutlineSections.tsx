import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Save, X, Trash2, GripVertical, Plus, ChevronUp, ChevronDown } from "lucide-react";
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
import { AddSectionDialog } from "./AddSectionDialog";

interface ProjectOutlineSectionsProps {
  outlineId: string;
  sections: any[];
}

export const ProjectOutlineSections = ({ outlineId, sections }: ProjectOutlineSectionsProps) => {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  

  const handleEdit = (section: any) => {
    setEditingId(section.id);
    setEditContent(section.content || "");
  };

  const handleSave = async (sectionId: string) => {
    try {
      const { error } = await supabase
        .from("project_outline_sections")
        .update({ content: editContent })
        .eq("id", sectionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Section updated successfully",
      });
      setEditingId(null);
      window.location.reload(); // Refresh to show updated content
    } catch (error) {
      console.error("Error updating section:", error);
      toast({
        title: "Error",
        description: "Failed to update section",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleDelete = async () => {
    if (!deleteSectionId) return;

    try {
      const { error } = await supabase
        .from("project_outline_sections")
        .delete()
        .eq("id", deleteSectionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Section deleted successfully",
      });

      setDeleteSectionId(null);
      window.location.reload();
    } catch (error) {
      console.error("Error deleting section:", error);
      toast({
        title: "Error",
        description: "Failed to delete section",
        variant: "destructive",
      });
    }
  };

  const handleMoveSection = async (sectionId: string, direction: "up" | "down") => {
    const currentIndex = sections.findIndex(s => s.id === sectionId);
    if (currentIndex === -1) return;
    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === sections.length - 1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const currentSection = sections[currentIndex];
    const targetSection = sections[targetIndex];

    try {
      // Swap sort_order values
      const { error: error1 } = await supabase
        .from("project_outline_sections")
        .update({ sort_order: targetSection.sort_order })
        .eq("id", currentSection.id);

      const { error: error2 } = await supabase
        .from("project_outline_sections")
        .update({ sort_order: currentSection.sort_order })
        .eq("id", targetSection.id);

      if (error1 || error2) throw error1 || error2;

      toast({
        title: "Success",
        description: "Section reordered successfully",
      });

      window.location.reload();
    } catch (error) {
      console.error("Error reordering section:", error);
      toast({
        title: "Error",
        description: "Failed to reorder section",
        variant: "destructive",
      });
    }
  };

  const nextSectionNumber = sections.length > 0 
    ? Math.max(...sections.map(s => s.section_number)) + 1 
    : 1;
  const nextSortOrder = sections.length > 0 
    ? Math.max(...sections.map(s => s.sort_order)) + 1 
    : 1;


  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddSectionOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>

      {sections.map((section, index) => (
        <Card key={section.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">
                  {section.section_number}. {section.section_title}
                </CardTitle>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveSection(section.id, "up")}
                  disabled={index === 0}
                  title="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveSection(section.id, "down")}
                  disabled={index === sections.length - 1}
                  title="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {editingId === section.id ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => handleSave(section.id)}>
                      <Save className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(section)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteSectionId(section.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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
                rows={8}
                placeholder="Enter section content..."
                className="font-mono text-sm"
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                {section.content ? (
                  <p className="whitespace-pre-wrap">{section.content}</p>
                ) : (
                  <p className="text-muted-foreground italic">No content yet. Click Edit to add content.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <AddSectionDialog
        open={addSectionOpen}
        onOpenChange={setAddSectionOpen}
        outlineId={outlineId}
        nextSectionNumber={nextSectionNumber}
        nextSortOrder={nextSortOrder}
      />

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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
