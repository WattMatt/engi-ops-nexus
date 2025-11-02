import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileText, Loader2 } from "lucide-react";

export interface ReportOptions {
  includeCoverPage: boolean;
  includeKPIPage: boolean;
  includeTenantSchedule: boolean;
  includeFloorPlan: boolean;
  tenantFields: {
    shopNumber: boolean;
    shopName: boolean;
    category: boolean;
    area: boolean;
    dbAllowance: boolean;
    dbScopeOfWork: boolean;
    sowReceived: boolean;
    layoutReceived: boolean;
    dbOrdered: boolean;
    dbCost: boolean;
    lightingOrdered: boolean;
    lightingCost: boolean;
  };
}

interface ReportOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (options: ReportOptions) => void;
  isGenerating: boolean;
}

export const ReportOptionsDialog = ({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
}: ReportOptionsDialogProps) => {
  const [options, setOptions] = useState<ReportOptions>({
    includeCoverPage: true,
    includeKPIPage: true,
    includeTenantSchedule: true,
    includeFloorPlan: true,
    tenantFields: {
      shopNumber: true,
      shopName: true,
      category: true,
      area: true,
      dbAllowance: true,
      dbScopeOfWork: true,
      sowReceived: true,
      layoutReceived: true,
      dbOrdered: true,
      dbCost: true,
      lightingOrdered: true,
      lightingCost: true,
    },
  });

  const handleSelectAll = () => {
    setOptions({
      includeCoverPage: true,
      includeKPIPage: true,
      includeTenantSchedule: true,
      includeFloorPlan: true,
      tenantFields: {
        shopNumber: true,
        shopName: true,
        category: true,
        area: true,
        dbAllowance: true,
        dbScopeOfWork: true,
        sowReceived: true,
        layoutReceived: true,
        dbOrdered: true,
        dbCost: true,
        lightingOrdered: true,
        lightingCost: true,
      },
    });
  };

  const handleDeselectAll = () => {
    setOptions({
      includeCoverPage: false,
      includeKPIPage: false,
      includeTenantSchedule: false,
      includeFloorPlan: false,
      tenantFields: {
        shopNumber: false,
        shopName: false,
        category: false,
        area: false,
        dbAllowance: false,
        dbScopeOfWork: false,
        sowReceived: false,
        layoutReceived: false,
        dbOrdered: false,
        dbCost: false,
        lightingOrdered: false,
        lightingCost: false,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Generation Options
          </DialogTitle>
          <DialogDescription>
            Select which sections and fields to include in your PDF report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>

          <Separator />

          {/* Report Sections */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Report Sections</h4>
            <div className="space-y-3 pl-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="coverPage"
                  checked={options.includeCoverPage}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeCoverPage: checked as boolean })
                  }
                />
                <Label htmlFor="coverPage" className="cursor-pointer">
                  Cover Page
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="kpiPage"
                  checked={options.includeKPIPage}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeKPIPage: checked as boolean })
                  }
                />
                <Label htmlFor="kpiPage" className="cursor-pointer">
                  KPI Summary Page
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tenantSchedule"
                  checked={options.includeTenantSchedule}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeTenantSchedule: checked as boolean })
                  }
                />
                <Label htmlFor="tenantSchedule" className="cursor-pointer">
                  Tenant Schedule
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="floorPlan"
                  checked={options.includeFloorPlan}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeFloorPlan: checked as boolean })
                  }
                />
                <Label htmlFor="floorPlan" className="cursor-pointer">
                  Floor Plan with Zones
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tenant Schedule Fields */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Tenant Schedule Fields</h4>
            <div className="grid grid-cols-2 gap-3 pl-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="shopNumber"
                  checked={options.tenantFields.shopNumber}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      tenantFields: { ...options.tenantFields, shopNumber: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="shopNumber" className="cursor-pointer">
                  Shop Number
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="shopName"
                  checked={options.tenantFields.shopName}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      tenantFields: { ...options.tenantFields, shopName: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="shopName" className="cursor-pointer">
                  Shop Name
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="category"
                  checked={options.tenantFields.category}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      tenantFields: { ...options.tenantFields, category: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="category" className="cursor-pointer">
                  Category
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="area"
                  checked={options.tenantFields.area}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      tenantFields: { ...options.tenantFields, area: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="area" className="cursor-pointer">
                  Area (m²)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dbAllowance"
                  checked={options.tenantFields.dbAllowance}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      tenantFields: { ...options.tenantFields, dbAllowance: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="dbAllowance" className="cursor-pointer">
                  DB Allowance
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dbScopeOfWork"
                  checked={options.tenantFields.dbScopeOfWork}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      tenantFields: { ...options.tenantFields, dbScopeOfWork: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="dbScopeOfWork" className="cursor-pointer">
                  DB Scope of Work
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sowReceived"
                  checked={options.tenantFields.sowReceived}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      tenantFields: { ...options.tenantFields, sowReceived: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="sowReceived" className="cursor-pointer">
                  SOW Received
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="layoutReceived"
                  checked={options.tenantFields.layoutReceived}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      tenantFields: { ...options.tenantFields, layoutReceived: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="layoutReceived" className="cursor-pointer">
                  Layout Received
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dbOrdered"
                  checked={options.tenantFields.dbOrdered}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      tenantFields: { ...options.tenantFields, dbOrdered: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="dbOrdered" className="cursor-pointer">
                  DB Ordered
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dbCost"
                  checked={options.tenantFields.dbCost}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      tenantFields: { ...options.tenantFields, dbCost: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="dbCost" className="cursor-pointer">
                  DB Cost
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lightingOrdered"
                  checked={options.tenantFields.lightingOrdered}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      tenantFields: { ...options.tenantFields, lightingOrdered: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="lightingOrdered" className="cursor-pointer">
                  Lighting Ordered
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lightingCost"
                  checked={options.tenantFields.lightingCost}
                  onCheckedChange={(checked) =>
                    setOptions({
                      ...options,
                      tenantFields: { ...options.tenantFields, lightingCost: checked as boolean },
                    })
                  }
                />
                <Label htmlFor="lightingCost" className="cursor-pointer">
                  Lighting Cost
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={() => onGenerate(options)} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
