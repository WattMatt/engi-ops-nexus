import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Settings2, Eye, BarChart3, FileBarChart, StickyNote } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SmartTemplateBuilderProps {
  category: "cost_report" | "cable_schedule" | "final_account";
  projectId: string;
  reportId: string;
  onGenerate: (config: TemplateConfig) => void;
}

export interface TemplateConfig {
  sections: {
    coverPage: boolean;
    executiveSummary: boolean;
    kpiCards: boolean;
    charts: boolean;
    categoryBreakdown: boolean;
    detailedLineItems: boolean;
    variations: boolean;
    notes: boolean;
  };
  layout: {
    orientation: "portrait" | "landscape";
    columns: "single" | "double";
    pageSize: "a4" | "letter";
  };
  coverPage: {
    includeCompanyLogo: boolean;
    title: string;
    subtitle: string;
  };
  styling: {
    colorScheme: "blue" | "green" | "purple" | "professional";
    fontSize: "small" | "medium" | "large";
  };
}

const DEFAULT_CONFIG: TemplateConfig = {
  sections: {
    coverPage: true,
    executiveSummary: true,
    kpiCards: true,
    charts: true,
    categoryBreakdown: true,
    detailedLineItems: true,
    variations: false,
    notes: false,
  },
  layout: {
    orientation: "portrait",
    columns: "single",
    pageSize: "a4",
  },
  coverPage: {
    includeCompanyLogo: true,
    title: "",
    subtitle: "",
  },
  styling: {
    colorScheme: "blue",
    fontSize: "medium",
  },
};

export const SmartTemplateBuilder = ({
  category,
  projectId,
  reportId,
  onGenerate,
}: SmartTemplateBuilderProps) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);

  const handleSectionToggle = (section: keyof TemplateConfig["sections"]) => {
    setConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: !prev.sections[section],
      },
    }));
  };

  const handleGenerate = () => {
    // Validate that at least one section is selected
    const hasAtLeastOneSection = Object.values(config.sections).some((v) => v);
    
    if (!hasAtLeastOneSection) {
      toast({
        title: "No Sections Selected",
        description: "Please select at least one section to include in your template",
        variant: "destructive",
      });
      return;
    }

    onGenerate(config);
    
    toast({
      title: "Template Generated",
      description: "Your custom PDF template is being generated...",
    });
  };

  const getCategoryLabel = () => {
    switch (category) {
      case "cost_report": return "Cost Report";
      case "cable_schedule": return "Cable Schedule";
      case "final_account": return "Final Account";
      default: return "";
    }
  };

  const getColorSchemeStyles = () => {
    switch (config.styling.colorScheme) {
      case "blue":
        return { primary: "bg-blue-600", secondary: "bg-blue-100", text: "text-blue-900" };
      case "green":
        return { primary: "bg-emerald-600", secondary: "bg-emerald-100", text: "text-emerald-900" };
      case "purple":
        return { primary: "bg-purple-600", secondary: "bg-purple-100", text: "text-purple-900" };
      case "professional":
        return { primary: "bg-slate-700", secondary: "bg-slate-100", text: "text-slate-900" };
      default:
        return { primary: "bg-blue-600", secondary: "bg-blue-100", text: "text-blue-900" };
    }
  };

  const getFontSizeClass = () => {
    switch (config.styling.fontSize) {
      case "small": return "text-xs";
      case "medium": return "text-sm";
      case "large": return "text-base";
      default: return "text-sm";
    }
  };

  const colors = getColorSchemeStyles();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left Side: Configuration */}
      <div className="xl:col-span-2 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sections Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Sections
            </CardTitle>
            <CardDescription>
              Choose which sections to include in your {getCategoryLabel().toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="coverPage"
                  checked={config.sections.coverPage}
                  onCheckedChange={() => handleSectionToggle("coverPage")}
                />
                <Label htmlFor="coverPage" className="cursor-pointer">
                  Cover Page
                </Label>
              </div>

              {category === "cost_report" && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="executiveSummary"
                      checked={config.sections.executiveSummary}
                      onCheckedChange={() => handleSectionToggle("executiveSummary")}
                    />
                    <Label htmlFor="executiveSummary" className="cursor-pointer">
                      Executive Summary
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="kpiCards"
                      checked={config.sections.kpiCards}
                      onCheckedChange={() => handleSectionToggle("kpiCards")}
                    />
                    <Label htmlFor="kpiCards" className="cursor-pointer">
                      KPI Cards
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="charts"
                      checked={config.sections.charts}
                      onCheckedChange={() => handleSectionToggle("charts")}
                    />
                    <Label htmlFor="charts" className="cursor-pointer">
                      Charts & Visualizations
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="categoryBreakdown"
                      checked={config.sections.categoryBreakdown}
                      onCheckedChange={() => handleSectionToggle("categoryBreakdown")}
                    />
                    <Label htmlFor="categoryBreakdown" className="cursor-pointer">
                      Category Breakdown
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="variations"
                      checked={config.sections.variations}
                      onCheckedChange={() => handleSectionToggle("variations")}
                    />
                    <Label htmlFor="variations" className="cursor-pointer">
                      Variations Sheet
                    </Label>
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="detailedLineItems"
                  checked={config.sections.detailedLineItems}
                  onCheckedChange={() => handleSectionToggle("detailedLineItems")}
                />
                <Label htmlFor="detailedLineItems" className="cursor-pointer">
                  Detailed Line Items
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notes"
                  checked={config.sections.notes}
                  onCheckedChange={() => handleSectionToggle("notes")}
                />
                <Label htmlFor="notes" className="cursor-pointer">
                  Notes & Comments
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout & Styling Options */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Layout Options
              </CardTitle>
              <CardDescription>
                Configure the layout and appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Page Orientation</Label>
                <RadioGroup
                  value={config.layout.orientation}
                  onValueChange={(value: "portrait" | "landscape") =>
                    setConfig((prev) => ({
                      ...prev,
                      layout: { ...prev.layout, orientation: value },
                    }))
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="portrait" id="portrait" />
                    <Label htmlFor="portrait" className="cursor-pointer">Portrait</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="landscape" id="landscape" />
                    <Label htmlFor="landscape" className="cursor-pointer">Landscape</Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Page Size</Label>
                <Select
                  value={config.layout.pageSize}
                  onValueChange={(value: "a4" | "letter") =>
                    setConfig((prev) => ({
                      ...prev,
                      layout: { ...prev.layout, pageSize: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                    <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Column Layout</Label>
                <RadioGroup
                  value={config.layout.columns}
                  onValueChange={(value: "single" | "double") =>
                    setConfig((prev) => ({
                      ...prev,
                      layout: { ...prev.layout, columns: value },
                    }))
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="cursor-pointer">Single Column</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="double" id="double" />
                    <Label htmlFor="double" className="cursor-pointer">Two Columns</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Styling</CardTitle>
              <CardDescription>Customize the visual appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Color Scheme</Label>
                <Select
                  value={config.styling.colorScheme}
                  onValueChange={(value: any) =>
                    setConfig((prev) => ({
                      ...prev,
                      styling: { ...prev.styling, colorScheme: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Professional Blue</SelectItem>
                    <SelectItem value="green">Financial Green</SelectItem>
                    <SelectItem value="purple">Modern Purple</SelectItem>
                    <SelectItem value="professional">Classic Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Font Size</Label>
                <Select
                  value={config.styling.fontSize}
                  onValueChange={(value: any) =>
                    setConfig((prev) => ({
                      ...prev,
                      styling: { ...prev.styling, fontSize: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (More Content)</SelectItem>
                    <SelectItem value="medium">Medium (Balanced)</SelectItem>
                    <SelectItem value="large">Large (Better Readability)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cover Page Customization */}
      {config.sections.coverPage && (
        <Card>
          <CardHeader>
            <CardTitle>Cover Page Details</CardTitle>
            <CardDescription>
              Customize the information shown on the cover page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCompanyLogo"
                checked={config.coverPage.includeCompanyLogo}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({
                    ...prev,
                    coverPage: { ...prev.coverPage, includeCompanyLogo: !!checked },
                  }))
                }
              />
              <Label htmlFor="includeCompanyLogo" className="cursor-pointer">
                Include Company Logo
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Custom Title (Optional)</Label>
                <Input
                  id="title"
                  placeholder={`e.g., ${getCategoryLabel()}`}
                  value={config.coverPage.title}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      coverPage: { ...prev.coverPage, title: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle (Optional)</Label>
                <Input
                  id="subtitle"
                  placeholder="e.g., Q4 2024 Financial Report"
                  value={config.coverPage.subtitle}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      coverPage: { ...prev.coverPage, subtitle: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {Object.values(config.sections).filter(Boolean).length} section(s) selected
        </div>
        <Button size="lg" onClick={handleGenerate}>
          <Download className="h-4 w-4 mr-2" />
          Generate PDF Template
        </Button>
      </div>
      </div>

      {/* Right Side: Live Preview */}
      <div className="xl:col-span-1">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Live Preview
            </CardTitle>
            <CardDescription>
              See how your PDF will look
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[700px] pr-4">
              <div 
                className={`bg-white border-2 shadow-lg mx-auto transition-all ${
                  config.layout.orientation === "portrait" 
                    ? "w-full aspect-[210/297]" 
                    : "w-full aspect-[297/210]"
                } ${getFontSizeClass()}`}
              >
                {/* Cover Page Preview */}
                {config.sections.coverPage && (
                  <div className={`${colors.primary} p-6 h-32 flex flex-col justify-center items-center text-white`}>
                    {config.coverPage.includeCompanyLogo && (
                      <div className="w-12 h-12 bg-white/20 rounded mb-2 flex items-center justify-center">
                        <FileText className="h-6 w-6" />
                      </div>
                    )}
                    <h1 className="font-bold text-lg text-center">
                      {config.coverPage.title || getCategoryLabel()}
                    </h1>
                    {config.coverPage.subtitle && (
                      <p className="text-xs mt-1 opacity-90">{config.coverPage.subtitle}</p>
                    )}
                  </div>
                )}

                <div className={`p-4 space-y-3 ${config.layout.columns === "double" ? "columns-2 gap-3" : ""}`}>
                  {/* Executive Summary */}
                  {config.sections.executiveSummary && category === "cost_report" && (
                    <div className="break-inside-avoid">
                      <div className={`${colors.secondary} p-3 rounded`}>
                        <h2 className={`font-semibold mb-2 ${colors.text}`}>Executive Summary</h2>
                        <div className="space-y-1 text-xs opacity-60">
                          <div className="h-2 bg-current rounded w-full" />
                          <div className="h-2 bg-current rounded w-3/4" />
                          <div className="h-2 bg-current rounded w-5/6" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KPI Cards */}
                  {config.sections.kpiCards && category === "cost_report" && (
                    <div className="break-inside-avoid">
                      <h3 className="font-semibold mb-2 text-xs">Key Performance Indicators</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`${colors.secondary} p-2 rounded border-l-2 ${colors.primary.replace('bg-', 'border-')}`}>
                            <div className="text-[0.5rem] opacity-60 mb-1">KPI {i}</div>
                            <div className="h-3 bg-current opacity-20 rounded w-3/4" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Charts */}
                  {config.sections.charts && category === "cost_report" && (
                    <div className="break-inside-avoid">
                      <h3 className="font-semibold mb-2 text-xs flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Charts & Visualizations
                      </h3>
                      <div className="space-y-2">
                        <div className={`${colors.secondary} p-3 rounded h-20 flex items-end justify-around gap-1`}>
                          {[60, 80, 45, 90, 70].map((height, i) => (
                            <div 
                              key={i} 
                              className={colors.primary}
                              style={{ height: `${height}%`, width: '15%' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category Breakdown */}
                  {config.sections.categoryBreakdown && category === "cost_report" && (
                    <div className="break-inside-avoid">
                      <h3 className="font-semibold mb-2 text-xs flex items-center gap-1">
                        <FileBarChart className="h-3 w-3" />
                        Category Breakdown
                      </h3>
                      <div className="border rounded overflow-hidden">
                        <div className={`${colors.primary} text-white p-1 grid grid-cols-3 text-[0.5rem] font-medium`}>
                          <div>Category</div>
                          <div className="text-right">Budget</div>
                          <div className="text-right">Actual</div>
                        </div>
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="grid grid-cols-3 p-1 text-[0.45rem] border-t">
                            <div className="opacity-60">Category {i}</div>
                            <div className="text-right opacity-60">R 0.00</div>
                            <div className="text-right opacity-60">R 0.00</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Line Items */}
                  {config.sections.detailedLineItems && (
                    <div className="break-inside-avoid">
                      <h3 className="font-semibold mb-2 text-xs">Detailed Line Items</h3>
                      <div className="border rounded overflow-hidden">
                        <div className={`${colors.primary} text-white p-1 text-[0.5rem] font-medium`}>
                          Line Items Details
                        </div>
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="p-1 text-[0.45rem] border-t">
                            <div className="opacity-60">Item {i} description</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variations */}
                  {config.sections.variations && category === "cost_report" && (
                    <div className="break-inside-avoid">
                      <h3 className="font-semibold mb-2 text-xs">Variations</h3>
                      <div className={`${colors.secondary} p-2 rounded`}>
                        <div className="space-y-1">
                          {[1, 2].map((i) => (
                            <div key={i} className="text-[0.45rem] opacity-60">
                              Variation #{i}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {config.sections.notes && (
                    <div className="break-inside-avoid">
                      <h3 className="font-semibold mb-2 text-xs flex items-center gap-1">
                        <StickyNote className="h-3 w-3" />
                        Notes & Comments
                      </h3>
                      <div className={`${colors.secondary} p-2 rounded`}>
                        <div className="space-y-1 text-[0.45rem] opacity-60">
                          <div className="h-1.5 bg-current rounded w-full" />
                          <div className="h-1.5 bg-current rounded w-5/6" />
                          <div className="h-1.5 bg-current rounded w-4/5" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Page Footer */}
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <div className="text-[0.4rem] opacity-40">
                    Page 1 • {config.layout.orientation === "portrait" ? "Portrait" : "Landscape"} • {config.layout.pageSize.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Preview Badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {config.layout.orientation === "portrait" ? "Portrait" : "Landscape"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {config.layout.columns === "single" ? "Single Column" : "Two Columns"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {config.layout.pageSize.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {config.styling.colorScheme.charAt(0).toUpperCase() + config.styling.colorScheme.slice(1)}
                </Badge>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
