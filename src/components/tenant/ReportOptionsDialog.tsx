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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Loader2, LayoutDashboard } from "lucide-react";

export interface ReportOptions {
  includeCoverPage: boolean;
  includeKPIPage: boolean;
  includeTenantSchedule: boolean;
  includeFloorPlan: boolean;
  kpiLayout: 'compact' | 'detailed';
  kpiCards: {
    totalTenants: boolean;
    totalArea: boolean;
    totalDbCost: boolean;
    totalLightingCost: boolean;
  };
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
    kpiLayout: 'compact',
    kpiCards: {
      totalTenants: true,
      totalArea: true,
      totalDbCost: true,
      totalLightingCost: true,
    },
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
      kpiLayout: 'compact',
      kpiCards: {
        totalTenants: true,
        totalArea: true,
        totalDbCost: true,
        totalLightingCost: true,
      },
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
      kpiLayout: 'compact',
      kpiCards: {
        totalTenants: false,
        totalArea: false,
        totalDbCost: false,
        totalLightingCost: false,
      },
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

              <div className="space-y-3">
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
                
                {options.includeKPIPage && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-xs text-muted-foreground">Layout Style</Label>
                    <RadioGroup
                      value={options.kpiLayout}
                      onValueChange={(value: 'compact' | 'detailed') =>
                        setOptions({ ...options, kpiLayout: value })
                      }
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="compact" id="compact" />
                        <Label htmlFor="compact" className="cursor-pointer font-normal">
                          Compact
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="detailed" id="detailed" />
                        <Label htmlFor="detailed" className="cursor-pointer font-normal">
                          Detailed
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>

              <Separator className="my-2" />

              {/* KPI Cards Selection - Only shown if KPI page is enabled */}
              {options.includeKPIPage && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-xs text-muted-foreground">KPI Cards to Include</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="kpiTotalTenants"
                        checked={options.kpiCards.totalTenants}
                        onCheckedChange={(checked) =>
                          setOptions({
                            ...options,
                            kpiCards: { ...options.kpiCards, totalTenants: checked as boolean },
                          })
                        }
                      />
                      <Label htmlFor="kpiTotalTenants" className="cursor-pointer font-normal text-xs">
                        Total Tenants
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="kpiTotalArea"
                        checked={options.kpiCards.totalArea}
                        onCheckedChange={(checked) =>
                          setOptions({
                            ...options,
                            kpiCards: { ...options.kpiCards, totalArea: checked as boolean },
                          })
                        }
                      />
                      <Label htmlFor="kpiTotalArea" className="cursor-pointer font-normal text-xs">
                        Total Area
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="kpiTotalDbCost"
                        checked={options.kpiCards.totalDbCost}
                        onCheckedChange={(checked) =>
                          setOptions({
                            ...options,
                            kpiCards: { ...options.kpiCards, totalDbCost: checked as boolean },
                          })
                        }
                      />
                      <Label htmlFor="kpiTotalDbCost" className="cursor-pointer font-normal text-xs">
                        Total DB Cost
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="kpiTotalLightingCost"
                        checked={options.kpiCards.totalLightingCost}
                        onCheckedChange={(checked) =>
                          setOptions({
                            ...options,
                            kpiCards: { ...options.kpiCards, totalLightingCost: checked as boolean },
                          })
                        }
                      />
                      <Label htmlFor="kpiTotalLightingCost" className="cursor-pointer font-normal text-xs">
                        Total Lighting Cost
                      </Label>
                    </div>
                  </div>
                </div>
              )}

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
