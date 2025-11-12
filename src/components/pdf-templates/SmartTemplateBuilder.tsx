import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Settings2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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

  return (
    <div className="space-y-6">
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
  );
};
