import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface GeneratorCostSettings {
  id?: string;
  rate_per_tenant_db: number;
  num_main_boards: number;
  rate_per_main_board: number;
  additional_cabling_cost: number;
  control_wiring_cost: number;
  capital_recovery_period_years: number;
  capital_recovery_rate_percent: number;
}

interface GeneratorCostSettingsDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: GeneratorCostSettings | null;
  onSaved: () => void;
}

export const GeneratorCostSettingsDialog = ({
  projectId,
  open,
  onOpenChange,
  settings,
  onSaved,
}: GeneratorCostSettingsDialogProps) => {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [formValues, setFormValues] = useState({
    ratePerTenantDB: 0,
    numMainBoards: 0,
    ratePerMainBoard: 0,
    additionalCablingCost: 0,
    controlWiringCost: 0,
    capitalRecoveryPeriodYears: 10,
    capitalRecoveryRatePercent: 12,
  });

  // Initialize form values when dialog opens
  useEffect(() => {
    if (open && settings) {
      setFormValues({
        ratePerTenantDB: settings.rate_per_tenant_db || 0,
        numMainBoards: settings.num_main_boards || 0,
        ratePerMainBoard: settings.rate_per_main_board || 0,
        additionalCablingCost: settings.additional_cabling_cost || 0,
        controlWiringCost: settings.control_wiring_cost || 0,
        capitalRecoveryPeriodYears: settings.capital_recovery_period_years || 10,
        capitalRecoveryRatePercent: settings.capital_recovery_rate_percent || 12,
      });
    } else if (open && !settings) {
      setFormValues({
        ratePerTenantDB: 0,
        numMainBoards: 0,
        ratePerMainBoard: 0,
        additionalCablingCost: 0,
        controlWiringCost: 0,
        capitalRecoveryPeriodYears: 10,
        capitalRecoveryRatePercent: 12,
      });
    }
  }, [open, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dbValues = {
        rate_per_tenant_db: formValues.ratePerTenantDB,
        num_main_boards: formValues.numMainBoards,
        rate_per_main_board: formValues.ratePerMainBoard,
        additional_cabling_cost: formValues.additionalCablingCost,
        control_wiring_cost: formValues.controlWiringCost,
        capital_recovery_period_years: formValues.capitalRecoveryPeriodYears,
        capital_recovery_rate_percent: formValues.capitalRecoveryRatePercent,
      };

      const { error } = await supabase
        .from("generator_settings")
        .upsert(
          {
            ...(settings?.id ? { id: settings.id } : {}),
            project_id: projectId,
            ...dbValues,
          },
          { onConflict: "project_id" }
        );

      if (error) throw error;
      toast.success("Cost settings saved");

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["generator-settings-tenant-rate", projectId] });
      queryClient.invalidateQueries({ queryKey: ["generator-settings", projectId] });
      queryClient.invalidateQueries({ queryKey: ["capital-recovery-settings", projectId] });
      
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving cost settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `R ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate preview totals
  const previewMainBoardsCost = formValues.numMainBoards * formValues.ratePerMainBoard;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generator Cost Settings</DialogTitle>
          <DialogDescription>
            Configure all rates and costs for generator calculations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tenant Distribution Boards */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Tenant Distribution Boards</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ratePerTenantDB" className="text-xs text-muted-foreground">
                  Rate per DB (R)
                </Label>
                <Input
                  id="ratePerTenantDB"
                  type="number"
                  step="0.01"
                  value={formValues.ratePerTenantDB}
                  onChange={(e) => setFormValues({ ...formValues, ratePerTenantDB: Number(e.target.value) })}
                  className="font-mono"
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-end">
                <span className="text-xs text-muted-foreground pb-2">
                  Auto-calculated from tenants without own generator
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Main Boards */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Main Boards</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numMainBoards" className="text-xs text-muted-foreground">
                  Number of Boards
                </Label>
                <Input
                  id="numMainBoards"
                  type="number"
                  value={formValues.numMainBoards}
                  onChange={(e) => setFormValues({ ...formValues, numMainBoards: Number(e.target.value) })}
                  className="font-mono"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ratePerMainBoard" className="text-xs text-muted-foreground">
                  Rate per Board (R)
                </Label>
                <Input
                  id="ratePerMainBoard"
                  type="number"
                  step="0.01"
                  value={formValues.ratePerMainBoard}
                  onChange={(e) => setFormValues({ ...formValues, ratePerMainBoard: Number(e.target.value) })}
                  className="font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Subtotal: {formatCurrency(previewMainBoardsCost)}
            </div>
          </div>

          <Separator />

          {/* Additional Costs */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Additional Costs</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="additionalCablingCost" className="text-xs text-muted-foreground">
                  Additional Cabling (R)
                </Label>
                <Input
                  id="additionalCablingCost"
                  type="number"
                  step="0.01"
                  value={formValues.additionalCablingCost}
                  onChange={(e) => setFormValues({ ...formValues, additionalCablingCost: Number(e.target.value) })}
                  className="font-mono"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="controlWiringCost" className="text-xs text-muted-foreground">
                  Control Wiring (R)
                </Label>
                <Input
                  id="controlWiringCost"
                  type="number"
                  step="0.01"
                  value={formValues.controlWiringCost}
                  onChange={(e) => setFormValues({ ...formValues, controlWiringCost: Number(e.target.value) })}
                  className="font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Capital Recovery Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Capital Recovery</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capitalRecoveryPeriodYears" className="text-xs text-muted-foreground">
                  Recovery Period (Years)
                </Label>
                <Input
                  id="capitalRecoveryPeriodYears"
                  type="number"
                  min="1"
                  value={formValues.capitalRecoveryPeriodYears}
                  onChange={(e) => setFormValues({ ...formValues, capitalRecoveryPeriodYears: Number(e.target.value) })}
                  className="font-mono"
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capitalRecoveryRatePercent" className="text-xs text-muted-foreground">
                  Interest Rate (%)
                </Label>
                <Input
                  id="capitalRecoveryRatePercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formValues.capitalRecoveryRatePercent}
                  onChange={(e) => setFormValues({ ...formValues, capitalRecoveryRatePercent: Number(e.target.value) })}
                  className="font-mono"
                  placeholder="12.00"
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Used to calculate monthly capital recovery charges for tenants
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
