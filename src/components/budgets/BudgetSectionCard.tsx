import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { AddLineItemDialog } from "./AddLineItemDialog";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BudgetSectionCardProps {
  section: any;
  lineItems: any[];
}

export const BudgetSectionCard = ({ section, lineItems }: BudgetSectionCardProps) => {
  const [addItemOpen, setAddItemOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sectionTotal = lineItems.reduce((sum, item) => sum + Number(item.total), 0);

  const handleDeleteSection = async () => {
    try {
      const { error } = await supabase
        .from("budget_sections")
        .delete()
        .eq("id", section.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Section deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["budget-sections"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {section.section_code}. {section.section_name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total: {formatCurrency(sectionTotal)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddItemOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Section</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete the section and all its line items. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSection}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {lineItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No line items yet. Click "Add Item" to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Area</TableHead>
                <TableHead className="text-right">Base Rate</TableHead>
                <TableHead className="text-right">TI Rate</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.item_number || "-"}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">
                    {item.area ? `${Number(item.area).toLocaleString()} ${item.area_unit}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.base_rate ? formatCurrency(Number(item.base_rate)) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.ti_rate ? formatCurrency(Number(item.ti_rate)) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(item.total))}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={5}>Total for Section {section.section_code}</TableCell>
                <TableCell className="text-right">{formatCurrency(sectionTotal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AddLineItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        sectionId={section.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["budget-line-items"] });
          setAddItemOpen(false);
        }}
      />
    </Card>
  );
};
