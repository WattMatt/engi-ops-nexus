import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SpecificationSectionsProps {
  specId: string;
}

export const SpecificationSections = ({ specId }: SpecificationSectionsProps) => {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newSection, setNewSection] = useState({
    section_number: "",
    section_title: "",
    section_content: "",
  });
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
              <Textarea
                value={newSection.section_content}
                onChange={(e) =>
                  setNewSection({ ...newSection, section_content: e.target.value })
                }
                placeholder="Section content..."
                rows={5}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(section.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 bg-muted rounded-lg">
                    {section.section_content ? (
                      <p className="whitespace-pre-wrap">{section.section_content}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No content yet</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};
