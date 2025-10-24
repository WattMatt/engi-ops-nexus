import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SpecificationTermsProps {
  specId: string;
}

export const SpecificationTerms = ({ specId }: SpecificationTermsProps) => {
  const [adding, setAdding] = useState(false);
  const [newTerm, setNewTerm] = useState({ term: "", definition: "" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ["specification-terms", specId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specification_terms")
        .select("*")
        .eq("spec_id", specId)
        .order("display_order");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!specId,
  });

  const handleAdd = async () => {
    if (!newTerm.term || !newTerm.definition) return;

    try {
      const { error } = await supabase.from("specification_terms").insert({
        spec_id: specId,
        term: newTerm.term,
        definition: newTerm.definition,
        display_order: terms.length,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Term added successfully" });
      queryClient.invalidateQueries({ queryKey: ["specification-terms", specId] });
      setNewTerm({ term: "", definition: "" });
      setAdding(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("specification_terms")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Term deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["specification-terms", specId] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div>Loading terms...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Terms & Abbreviations</CardTitle>
          <Button onClick={() => setAdding(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Term
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {adding && (
          <div className="mb-4 p-4 border rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Term/Abbreviation</Label>
                <Input
                  value={newTerm.term}
                  onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })}
                  placeholder="LV, RMU, etc."
                />
              </div>
              <div>
                <Label>Definition</Label>
                <Input
                  value={newTerm.definition}
                  onChange={(e) => setNewTerm({ ...newTerm, definition: e.target.value })}
                  placeholder="Low voltage, Ring main unit, etc."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd}>
                Add
              </Button>
            </div>
          </div>
        )}

        {terms.length === 0 && !adding ? (
          <div className="text-center py-8 text-muted-foreground">
            No terms added yet. Click "Add Term" to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Term/Abbreviation</TableHead>
                <TableHead>Definition</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="font-medium">{term.term}</TableCell>
                  <TableCell>{term.definition}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(term.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
