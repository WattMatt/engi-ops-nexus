import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Loader2, LayoutDashboard, Users, Square, DollarSign, Lightbulb, Save, FolderOpen, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ReportOptions {
  includeCoverPage: boolean;
  includeTableOfContents: boolean;
  includeKPIPage: boolean;
  includeTenantSchedule: boolean;
  includeFloorPlan: boolean;
  kpiLayout: 'compact' | 'detailed';
  kpiAppearance: {
    colorTheme: 'professional' | 'vibrant' | 'minimal';
    showIcons: boolean;
    showBorders: boolean;
  };
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
  projectId: string;
}

export const ReportOptionsDialog = ({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
  projectId,
}: ReportOptionsDialogProps) => {
  const queryClient = useQueryClient();
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [options, setOptions] = useState<ReportOptions>({
    includeCoverPage: true,
    includeTableOfContents: true,
    includeKPIPage: true,
    includeTenantSchedule: true,
    includeFloorPlan: true,
    kpiLayout: 'compact',
    kpiAppearance: {
      colorTheme: 'professional',
      showIcons: true,
      showBorders: true,
    },
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
      includeTableOfContents: true,
      includeKPIPage: true,
      includeTenantSchedule: true,
      includeFloorPlan: true,
      kpiLayout: 'compact',
      kpiAppearance: {
        colorTheme: 'professional',
        showIcons: true,
        showBorders: true,
      },
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

  // Get theme colors for preview
  const getThemeColors = () => {
    const themes = {
      professional: {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        accent: 'bg-blue-500',
        text: 'text-slate-900',
      },
      vibrant: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        accent: 'bg-purple-500',
        text: 'text-slate-900',
      },
      minimal: {
        bg: 'bg-white',
        border: 'border-slate-300',
        accent: 'bg-slate-500',
        text: 'text-slate-900',
      },
    };
    return themes[options.kpiAppearance.colorTheme];
  };

  const themeColors = getThemeColors();

  // Fetch saved templates
  const { data: templates = [] } = useQuery({
    queryKey: ['tenant-report-templates', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_report_templates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('tenant_report_templates')
        .insert({
          project_id: projectId,
          template_name: name,
          settings: options as any,
          created_by: user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-report-templates', projectId] });
      toast.success("Template saved successfully");
      setTemplateName("");
      setShowSaveDialog(false);
    },
    onError: () => {
      toast.error("Failed to save template");
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenant_report_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-report-templates', projectId] });
      toast.success("Template deleted successfully");
      setDeleteTemplateId(null);
      setSelectedTemplateId("");
    },
    onError: () => {
      toast.error("Failed to delete template");
    },
  });

  // Load template
  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template && template.settings) {
      setOptions(template.settings as unknown as ReportOptions);
      setSelectedTemplateId(templateId);
      toast.success(`Loaded template: ${template.template_name}`);
    }
  };

  const handleDeselectAll = () => {
    setOptions({
      includeCoverPage: false,
      includeTableOfContents: false,
      includeKPIPage: false,
      includeTenantSchedule: false,
      includeFloorPlan: false,
      kpiLayout: 'compact',
      kpiAppearance: {
        colorTheme: 'professional',
        showIcons: true,
        showBorders: true,
      },
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
          {/* Template Management */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Report Templates
            </h4>
            <div className="flex gap-2">
              <Select value={selectedTemplateId} onValueChange={loadTemplate}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Load a saved template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.template_name}
                    </SelectItem>
                  ))}
                  {templates.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No saved templates
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSaveDialog(true)}
                title="Save current settings as template"
              >
                <Save className="h-4 w-4" />
              </Button>
              {selectedTemplateId && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDeleteTemplateId(selectedTemplateId)}
                  title="Delete selected template"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

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
                  id="tableOfContents"
                  checked={options.includeTableOfContents}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeTableOfContents: checked as boolean })
                  }
                />
                <Label htmlFor="tableOfContents" className="cursor-pointer">
                  Table of Contents
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
                  <div className="ml-6 space-y-4">
                    <div className="space-y-2">
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

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Color Theme</Label>
                      <RadioGroup
                        value={options.kpiAppearance.colorTheme}
                        onValueChange={(value: 'professional' | 'vibrant' | 'minimal') =>
                          setOptions({
                            ...options,
                            kpiAppearance: { ...options.kpiAppearance, colorTheme: value }
                          })
                        }
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="professional" id="professional" />
                          <Label htmlFor="professional" className="cursor-pointer font-normal">
                            Professional
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="vibrant" id="vibrant" />
                          <Label htmlFor="vibrant" className="cursor-pointer font-normal">
                            Vibrant
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="minimal" id="minimal" />
                          <Label htmlFor="minimal" className="cursor-pointer font-normal">
                            Minimal
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Visual Elements</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showIcons"
                            checked={options.kpiAppearance.showIcons}
                            onCheckedChange={(checked) =>
                              setOptions({
                                ...options,
                                kpiAppearance: { ...options.kpiAppearance, showIcons: checked as boolean }
                              })
                            }
                          />
                          <Label htmlFor="showIcons" className="cursor-pointer font-normal text-xs">
                            Show Icons
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showBorders"
                            checked={options.kpiAppearance.showBorders}
                            onCheckedChange={(checked) =>
                              setOptions({
                                ...options,
                                kpiAppearance: { ...options.kpiAppearance, showBorders: checked as boolean }
                              })
                            }
                          />
                          <Label htmlFor="showBorders" className="cursor-pointer font-normal text-xs">
                            Show Borders
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Live Preview Section */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs text-muted-foreground">Preview</Label>
                      <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg">
                        {/* Sample KPI Card 1 */}
                        <Card className={`${themeColors.bg} ${options.kpiAppearance.showBorders ? `border ${themeColors.border}` : 'border-0'} shadow-sm`}>
                          <CardContent className="p-3 space-y-1">
                            <div className="flex items-center gap-2">
                              {options.kpiAppearance.showIcons && (
                                <div className={`${themeColors.accent} w-5 h-5 rounded-full flex items-center justify-center`}>
                                  <Users className="w-3 h-3 text-white" />
                                </div>
                              )}
                              <span className="text-[10px] font-medium text-muted-foreground uppercase">Total Tenants</span>
                            </div>
                            <p className={`text-xl font-bold ${themeColors.text}`}>24</p>
                          </CardContent>
                        </Card>

                        {/* Sample KPI Card 2 */}
                        <Card className={`${themeColors.bg} ${options.kpiAppearance.showBorders ? `border ${themeColors.border}` : 'border-0'} shadow-sm`}>
                          <CardContent className="p-3 space-y-1">
                            <div className="flex items-center gap-2">
                              {options.kpiAppearance.showIcons && (
                                <div className={`${themeColors.accent} w-5 h-5 rounded-full flex items-center justify-center`}>
                                  <Square className="w-3 h-3 text-white" />
                                </div>
                              )}
                              <span className="text-[10px] font-medium text-muted-foreground uppercase">Total Area</span>
                            </div>
                            <p className={`text-xl font-bold ${themeColors.text}`}>1,250 m²</p>
                          </CardContent>
                        </Card>

                        {/* Sample KPI Card 3 */}
                        <Card className={`${themeColors.bg} ${options.kpiAppearance.showBorders ? `border ${themeColors.border}` : 'border-0'} shadow-sm`}>
                          <CardContent className="p-3 space-y-1">
                            <div className="flex items-center gap-2">
                              {options.kpiAppearance.showIcons && (
                                <div className={`${themeColors.accent} w-5 h-5 rounded-full flex items-center justify-center`}>
                                  <DollarSign className="w-3 h-3 text-white" />
                                </div>
                              )}
                              <span className="text-[10px] font-medium text-muted-foreground uppercase">DB Cost</span>
                            </div>
                            <p className={`text-sm font-bold ${themeColors.text}`}>R 45,000</p>
                          </CardContent>
                        </Card>

                        {/* Sample KPI Card 4 */}
                        <Card className={`${themeColors.bg} ${options.kpiAppearance.showBorders ? `border ${themeColors.border}` : 'border-0'} shadow-sm`}>
                          <CardContent className="p-3 space-y-1">
                            <div className="flex items-center gap-2">
                              {options.kpiAppearance.showIcons && (
                                <div className={`${themeColors.accent} w-5 h-5 rounded-full flex items-center justify-center`}>
                                  <Lightbulb className="w-3 h-3 text-white" />
                                </div>
                              )}
                              <span className="text-[10px] font-medium text-muted-foreground uppercase">Lighting</span>
                            </div>
                            <p className={`text-sm font-bold ${themeColors.text}`}>R 32,500</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
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

      {/* Save Template Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Report Template</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for this template to save your current report settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Template name (e.g., Executive Summary)"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && templateName.trim()) {
                saveTemplateMutation.mutate(templateName.trim());
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (templateName.trim()) {
                  saveTemplateMutation.mutate(templateName.trim());
                }
              }}
              disabled={!templateName.trim() || saveTemplateMutation.isPending}
            >
              {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Template Dialog */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTemplateId) {
                  deleteTemplateMutation.mutate(deleteTemplateId);
                }
              }}
              disabled={deleteTemplateMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
