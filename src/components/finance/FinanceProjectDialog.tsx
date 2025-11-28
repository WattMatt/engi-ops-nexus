import { useEffect, useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ChevronDown, Calendar } from "lucide-react";
import { format, addMonths } from "date-fns";

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

  // Payment schedule state (only for new projects)
  const [setupSchedule, setSetupSchedule] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [startMonth, setStartMonth] = useState(format(new Date(), "yyyy-MM"));
  const [numberOfDraws, setNumberOfDraws] = useState("10");
  const [drawType, setDrawType] = useState<"equal" | "custom">("equal");
  const [customDrawAmount, setCustomDrawAmount] = useState("");
  const [includeFinalPayment, setIncludeFinalPayment] = useState(true);
  const [finalPaymentAmount, setFinalPaymentAmount] = useState("");

  const agreedFee = watch("agreed_fee");

  // Calculate draw amounts
  const schedulePreview = useMemo(() => {
    const fee = parseFloat(agreedFee) || 0;
    const draws = parseInt(numberOfDraws) || 0;
    
    if (!fee || !draws) return { draws: [], total: 0 };

    let drawAmount: number;
    let finalAmount: number;

    if (drawType === "equal") {
      if (includeFinalPayment) {
        // Equal draws with separate final payment (user specifies final amount)
        const final = parseFloat(finalPaymentAmount) || 0;
        drawAmount = draws > 0 ? (fee - final) / draws : 0;
        finalAmount = final;
      } else {
        // All equal draws
        drawAmount = fee / draws;
        finalAmount = 0;
      }
    } else {
      // Custom draw amount
      drawAmount = parseFloat(customDrawAmount) || 0;
      const totalFromDraws = drawAmount * draws;
      finalAmount = includeFinalPayment ? fee - totalFromDraws : 0;
    }

    const drawsList = Array.from({ length: draws }, (_, i) => ({
      month: format(addMonths(new Date(startMonth + "-01"), i), "yyyy-MM"),
      amount: drawAmount,
    }));

    if (includeFinalPayment && finalAmount > 0) {
      drawsList.push({
        month: format(addMonths(new Date(startMonth + "-01"), draws), "yyyy-MM"),
        amount: finalAmount,
      });
    }

    return {
      draws: drawsList,
      total: drawsList.reduce((sum, d) => sum + d.amount, 0),
    };
  }, [agreedFee, numberOfDraws, drawType, customDrawAmount, includeFinalPayment, finalPaymentAmount, startMonth]);

  useEffect(() => {
    if (project) {
      setValue("project_name", project.project_name);
      setValue("client_name", project.client_name);
      setValue("client_vat_number", project.client_vat_number || "");
      setValue("client_address", project.client_address || "");
      setValue("agreed_fee", project.agreed_fee.toString());
      setValue("status", project.status || "active");
      setSetupSchedule(false);
      setScheduleOpen(false);
    } else {
      reset();
      setSetupSchedule(false);
      setScheduleOpen(false);
      setStartMonth(format(new Date(), "yyyy-MM"));
      setNumberOfDraws("10");
      setDrawType("equal");
      setCustomDrawAmount("");
      setIncludeFinalPayment(true);
      setFinalPaymentAmount("");
    }
  }, [project, setValue, reset]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const agreedFeeValue = parseFloat(data.agreed_fee) || 0;
      const payload = {
        project_name: data.project_name,
        client_name: data.client_name,
        client_vat_number: data.client_vat_number || null,
        client_address: data.client_address || null,
        agreed_fee: agreedFeeValue,
        outstanding_amount: project ? project.outstanding_amount : agreedFeeValue,
        status: data.status,
      };

      if (project) {
        // Update existing project
        const { error } = await supabase
          .from("invoice_projects")
          .update(payload)
          .eq("id", project.id);
        if (error) throw error;
        toast.success("Project updated successfully");
      } else {
        // Insert new project
        const { data: newProject, error } = await supabase
          .from("invoice_projects")
          .insert({ ...payload, created_by: user.id })
          .select()
          .single();
        if (error) throw error;

        // Create payment schedule if enabled
        if (setupSchedule && schedulePreview.draws.length > 0) {
          const paymentsToInsert = schedulePreview.draws.map((draw) => ({
            project_id: newProject.id,
            payment_month: draw.month + "-01",
            amount: draw.amount,
          }));

          const { error: scheduleError } = await supabase
            .from("monthly_payments")
            .insert(paymentsToInsert);

          if (scheduleError) {
            console.error("Schedule error:", scheduleError);
            toast.warning("Project created but payment schedule failed to save");
          } else {
            toast.success(`Project created with ${schedulePreview.draws.length} payment draws`);
          }
        } else {
          toast.success("Project created successfully");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["finance-projects"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-projects"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-payments-with-projects"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow-dashboard-payments"] });
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const status = watch("status");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Add Finance Project"}</DialogTitle>
          <DialogDescription>
            {project ? "Update project details" : "Create a new finance project with optional payment schedule"}
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
              rows={2}
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

          {/* Payment Schedule Section - Only for new projects */}
          {!project && (
            <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <div className="border rounded-lg p-3 space-y-3">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Payment Schedule (Optional)</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${scheduleOpen ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="setup-schedule" 
                      checked={setupSchedule}
                      onCheckedChange={(checked) => setSetupSchedule(!!checked)}
                    />
                    <Label htmlFor="setup-schedule" className="text-sm font-normal cursor-pointer">
                      Set up payment drawdown schedule
                    </Label>
                  </div>

                  {setupSchedule && (
                    <div className="space-y-4 pl-6 border-l-2 border-muted">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Start Month</Label>
                          <Input
                            type="month"
                            value={startMonth}
                            onChange={(e) => setStartMonth(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Number of Draws</Label>
                          <Input
                            type="number"
                            min="1"
                            max="36"
                            value={numberOfDraws}
                            onChange={(e) => setNumberOfDraws(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Draw Calculation</Label>
                        <Select value={drawType} onValueChange={(val: "equal" | "custom") => setDrawType(val)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equal">Equal amounts (auto-calculated)</SelectItem>
                            <SelectItem value="custom">Custom draw amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {drawType === "custom" && (
                        <div className="space-y-2">
                          <Label className="text-xs">Draw Amount (each)</Label>
                          <Input
                            type="number"
                            value={customDrawAmount}
                            onChange={(e) => setCustomDrawAmount(e.target.value)}
                            placeholder="Amount per draw"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="final-payment" 
                          checked={includeFinalPayment}
                          onCheckedChange={(checked) => setIncludeFinalPayment(!!checked)}
                        />
                        <Label htmlFor="final-payment" className="text-xs font-normal cursor-pointer">
                          Separate final/completion payment
                        </Label>
                      </div>

                      {includeFinalPayment && drawType === "equal" && (
                        <div className="space-y-2">
                          <Label className="text-xs">Final Payment Amount</Label>
                          <Input
                            type="number"
                            value={finalPaymentAmount}
                            onChange={(e) => setFinalPaymentAmount(e.target.value)}
                            placeholder="Final completion payment"
                          />
                        </div>
                      )}

                      {/* Schedule Preview */}
                      {schedulePreview.draws.length > 0 && (
                        <div className="bg-muted/50 rounded-md p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Preview</p>
                          <div className="flex justify-between text-sm">
                            <span>{schedulePreview.draws.length} payments</span>
                            <span className="font-medium">{formatCurrency(schedulePreview.total)}</span>
                          </div>
                          {schedulePreview.draws.slice(0, 3).map((draw, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                              <span>{format(new Date(draw.month + "-01"), "MMM yyyy")}</span>
                              <span>{formatCurrency(draw.amount)}</span>
                            </div>
                          ))}
                          {schedulePreview.draws.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              ...and {schedulePreview.draws.length - 3} more
                            </p>
                          )}
                          {Math.abs(schedulePreview.total - (parseFloat(agreedFee) || 0)) > 1 && (
                            <p className="text-xs text-orange-600">
                              ⚠ Schedule total differs from agreed fee by {formatCurrency(Math.abs(schedulePreview.total - (parseFloat(agreedFee) || 0)))}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : project ? "Update" : setupSchedule ? "Create with Schedule" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
