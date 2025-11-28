import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface InvoiceProject {
  id: string;
  project_name: string;
  client_name: string;
  client_vat_number: string | null;
  client_address: string | null;
  agreed_fee: number;
  total_invoiced: number | null;
  outstanding_amount: number;
  status: string | null;
}

interface FinanceProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: InvoiceProject | null;
}

interface FormData {
  project_name: string;
  client_name: string;
  client_vat_number: string;
  client_address: string;
  agreed_fee: string;
  status: string;
}

export function FinanceProjectDialog({ open, onOpenChange, project }: FinanceProjectDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      project_name: "",
      client_name: "",
      client_vat_number: "",
      client_address: "",
      agreed_fee: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (project) {
      setValue("project_name", project.project_name);
      setValue("client_name", project.client_name);
      setValue("client_vat_number", project.client_vat_number || "");
      setValue("client_address", project.client_address || "");
      setValue("agreed_fee", project.agreed_fee.toString());
      setValue("status", project.status || "active");
    } else {
      reset();
    }
  }, [project, setValue, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const agreedFee = parseFloat(data.agreed_fee) || 0;
      const payload = {
        project_name: data.project_name,
        client_name: data.client_name,
        client_vat_number: data.client_vat_number || null,
        client_address: data.client_address || null,
        agreed_fee: agreedFee,
        outstanding_amount: project ? project.outstanding_amount : agreedFee,
        status: data.status,
      };

      if (project) {
        // Update
        const { error } = await supabase
          .from("invoice_projects")
          .update(payload)
          .eq("id", project.id);
        if (error) throw error;
        toast.success("Project updated successfully");
      } else {
        // Insert
        const { error } = await supabase
          .from("invoice_projects")
          .insert({ ...payload, created_by: user.id });
        if (error) throw error;
        toast.success("Project created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["finance-projects"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-projects"] });
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const status = watch("status");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Add Finance Project"}</DialogTitle>
          <DialogDescription>
            {project ? "Update project details" : "Create a new finance project for invoicing"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project_name">Project Name *</Label>
            <Input
              id="project_name"
              {...register("project_name", { required: true })}
              placeholder="e.g., Saxdowne Shopping Centre"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_name">Client Name *</Label>
            <Input
              id="client_name"
              {...register("client_name", { required: true })}
              placeholder="e.g., Saxdowne Property Holdings"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_vat_number">VAT Number</Label>
              <Input
                id="client_vat_number"
                {...register("client_vat_number")}
                placeholder="e.g., 4123456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agreed_fee">Agreed Fee (excl. VAT) *</Label>
              <Input
                id="agreed_fee"
                type="number"
                {...register("agreed_fee", { required: true })}
                placeholder="e.g., 1100000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_address">Client Address</Label>
            <Textarea
              id="client_address"
              {...register("client_address")}
              placeholder="Full billing address"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(val) => setValue("status", val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : project ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
