import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const rateSchema = z.object({
  item_description: z.string().min(1, "Description is required"),
  item_code: z.string().optional(),
  retailer_id: z.string().optional(),
  item_type: z.string().min(1, "Type is required"),
  base_rate: z.coerce.number().min(0, "Must be positive"),
  ti_rate: z.coerce.number().min(0, "Must be positive"),
  unit: z.string().min(1, "Unit is required"),
  notes: z.string().optional(),
});

type RateFormData = z.infer<typeof rateSchema>;

interface RetailerRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rate: {
    id: string;
    retailer_id: string | null;
    item_type: string;
    item_code: string | null;
    item_description: string;
    base_rate: number;
    ti_rate: number;
    unit: string;
  } | null;
}

export const RetailerRateDialog = ({ open, onOpenChange, rate }: RetailerRateDialogProps) => {
  const queryClient = useQueryClient();
  const isEditing = !!rate;

  const { data: retailers } = useQuery({
    queryKey: ["retailers-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retailer_master")
        .select("id, retailer_name")
        .eq("is_active", true)
        .order("retailer_name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<RateFormData>({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      item_description: "",
      item_code: "",
      retailer_id: "",
      item_type: "base_building",
      base_rate: 0,
      ti_rate: 0,
      unit: "per_sqm",
      notes: "",
    },
  });

  useEffect(() => {
    if (rate) {
      form.reset({
        item_description: rate.item_description,
        item_code: rate.item_code || "",
        retailer_id: rate.retailer_id || "",
        item_type: rate.item_type,
        base_rate: rate.base_rate,
        ti_rate: rate.ti_rate,
        unit: rate.unit,
        notes: "",
      });
    } else {
      form.reset({
        item_description: "",
        item_code: "",
        retailer_id: "",
        item_type: "base_building",
        base_rate: 0,
        ti_rate: 0,
        unit: "per_sqm",
        notes: "",
      });
    }
  }, [rate, form]);

  const mutation = useMutation({
    mutationFn: async (data: RateFormData) => {
      const payload = {
        item_description: data.item_description,
        item_code: data.item_code || null,
        retailer_id: data.retailer_id || null,
        item_type: data.item_type,
        base_rate: data.base_rate,
        ti_rate: data.ti_rate,
        unit: data.unit,
        notes: data.notes || null,
        is_current: true,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("master_rate_library")
          .update(payload)
          .eq("id", rate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("master_rate_library")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-rates"] });
      toast.success(isEditing ? "Rate updated" : "Rate created");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save rate");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Rate" : "Add Rate"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the rate details" : "Add a new rate to the library"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField
              control={form.control}
              name="item_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Base building electrical allowance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="retailer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retailer (Optional)</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} 
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Generic" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Generic (All Retailers)</SelectItem>
                        {retailers?.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.retailer_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="item_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="base_building">Base Building</SelectItem>
                        <SelectItem value="tenant_improvement">Tenant Improvement</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="provisional">Provisional</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="base_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Rate (R)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ti_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TI Rate (R)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="per_sqm">Per m²</SelectItem>
                        <SelectItem value="each">Each</SelectItem>
                        <SelectItem value="lump_sum">Lump Sum</SelectItem>
                        <SelectItem value="per_meter">Per Meter</SelectItem>
                        <SelectItem value="per_kva">Per kVA</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
