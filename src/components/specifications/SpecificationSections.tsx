import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionRichEditor } from "./SectionRichEditor";

interface SpecificationSectionsProps {
  specId: string;
}

export const SpecificationSections = ({ specId }: SpecificationSectionsProps) => {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSection, setNewSection] = useState({
    section_number: "",
    section_title: "",
    section_content: "",
  });
  const [editData, setEditData] = useState({
    section_number: "",
    section_title: "",
    section_content: "",
  });
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["specification-sections", specId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specification_sections")
        .select("*")
        .eq("spec_id", specId)
        .order("display_order");

      if (error) throw error;
      return data || [];
    },
    enabled: !!specId,
  });

  const handleAdd = async () => {
    if (!newSection.section_number || !newSection.section_title) return;

    try {
      const { error } = await supabase.from("specification_sections").insert({
        spec_id: specId,
        section_number: newSection.section_number,
        section_title: newSection.section_title,
        section_content: newSection.section_content,
        display_order: sections.length,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Section added successfully" });
      queryClient.invalidateQueries({ queryKey: ["specification-sections", specId] });
      setNewSection({ section_number: "", section_title: "", section_content: "" });
      setAdding(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleStartEdit = (section: any) => {
    setEditingId(section.id);
    setEditData({
      section_number: section.section_number,
      section_title: section.section_title,
      section_content: section.section_content || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editData.section_number || !editData.section_title) return;

    try {
      const { error } = await supabase
        .from("specification_sections")
        .update({
          section_number: editData.section_number,
          section_title: editData.section_title,
          section_content: editData.section_content,
        })
        .eq("id", editingId);

      if (error) throw error;

      toast({ title: "Success", description: "Section updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["specification-sections", specId] });
      setEditingId(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("specification_sections")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Section deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["specification-sections", specId] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div>Loading sections...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Document Sections</CardTitle>
          <Button onClick={() => setAdding(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <div className="p-4 border rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Section Number</Label>
                <Input
                  value={newSection.section_number}
                  onChange={(e) =>
                    setNewSection({ ...newSection, section_number: e.target.value })
                  }
                  placeholder="1, 2, 3..."
                />
              </div>
              <div>
                <Label>Section Title</Label>
                <Input
                  value={newSection.section_title}
                  onChange={(e) =>
                    setNewSection({ ...newSection, section_title: e.target.value })
                  }
                  placeholder="Introduction and Background"
                />
              </div>
            </div>
            <div>
              <Label>Content</Label>
              <SectionRichEditor
                content={newSection.section_content}
                onChange={(html) =>
                  setNewSection({ ...newSection, section_content: html })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd}>
                Add Section
              </Button>
            </div>
          </div>
        )}

        {sections.length === 0 && !adding ? (
          <div className="text-center py-8 text-muted-foreground">
            No sections added yet. Click "Add Section" to get started.
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {sections.map((section) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-medium">
                      {section.section_number}. {section.section_title}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(section);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteSectionId(section.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {editingId === section.id ? (
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Section Number</Label>
                          <Input
                            value={editData.section_number}
                            onChange={(e) =>
                              setEditData({ ...editData, section_number: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Section Title</Label>
                          <Input
                            value={editData.section_title}
                            onChange={(e) =>
                              setEditData({ ...editData, section_title: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Content</Label>
                        <SectionRichEditor
                          content={editData.section_content}
                          onChange={(html) =>
                            setEditData({ ...editData, section_content: html })
                          }
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="p-4 bg-muted rounded-lg prose prose-sm max-w-none [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted/50 [&_th]:font-semibold"
                    >
                      {section.section_content ? (
                        <div dangerouslySetInnerHTML={{ __html: section.section_content }} />
                      ) : (
                        <p className="text-muted-foreground italic">No content yet</p>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
    <ConfirmDeleteDialog
      open={!!deleteSectionId}
      onOpenChange={(open) => !open && setDeleteSectionId(null)}
      onConfirm={() => { if (deleteSectionId) { handleDelete(deleteSectionId); setDeleteSectionId(null); } }}
      title="Delete Section"
      description="Are you sure you want to delete this section and all its content?"
    />
    </>
  );
};
