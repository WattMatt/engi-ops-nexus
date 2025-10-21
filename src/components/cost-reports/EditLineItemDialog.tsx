import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const lineItemSchema = z.object({
  code: z.string().min(1, "Code is required"),
  description: z.string().min(1, "Description is required"),
  original_budget: z.string().min(1, "Original budget is required"),
  previous_report: z.string().min(1, "Previous report is required"),
  anticipated_final: z.string().min(1, "Anticipated final cost is required"),
});

interface EditLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItem: any;
  onSuccess: () => void;
}

export const EditLineItemDialog = ({
  open,
  onOpenChange,
  lineItem,
  onSuccess,
}: EditLineItemDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof lineItemSchema>>({
    resolver: zodResolver(lineItemSchema),
    values: {
      code: lineItem?.code || "",
      description: lineItem?.description || "",
      original_budget: lineItem?.original_budget?.toString() || "0",
      previous_report: lineItem?.previous_report?.toString() || "0",
      anticipated_final: lineItem?.anticipated_final?.toString() || "0",
    },
  });

  const onSubmit = async (values: z.infer<typeof lineItemSchema>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("cost_line_items")
        .update({
          code: values.code,
          description: values.description,
          original_budget: parseFloat(values.original_budget),
          previous_report: parseFloat(values.previous_report),
          anticipated_final: parseFloat(values.anticipated_final),
        })
        .eq("id", lineItem.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Line item updated successfully",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Line Item</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="original_budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Budget (R)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="previous_report"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previous Report (R)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="anticipated_final"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anticipated Final (R)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
