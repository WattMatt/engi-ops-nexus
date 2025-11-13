import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Zap, Star, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { QualityPreset } from "@/utils/pdfQualitySettings";

const QUALITY_PRESETS = {
  draft: {
    label: "Draft",
    description: "Fast rendering, smaller files (~1-3MB)",
    icon: Zap,
    details: "Scale: 1.5x, JPEG 75%, Table font: 8pt",
    color: "text-orange-500"
  },
  standard: {
    label: "Standard",
    description: "Balanced quality and file size (~2-6MB)",
    icon: FileText,
    details: "Scale: 2x, JPEG 85%, Table font: 9pt",
    color: "text-blue-500"
  },
  high: {
    label: "High Quality",
    description: "Best quality, larger files (~5-15MB)",
    icon: Star,
    details: "Scale: 3x, JPEG 95%, Table font: 10pt",
    color: "text-purple-500"
  }
} as const;

export function PDFExportSettings() {
  const { toast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState<QualityPreset>("standard");

  // Load saved preset from localStorage
  useEffect(() => {
    const savedPreset = localStorage.getItem("pdf-quality-preset") as QualityPreset;
    if (savedPreset && (savedPreset === "draft" || savedPreset === "standard" || savedPreset === "high")) {
      setSelectedPreset(savedPreset);
    }
  }, []);

  // Save preset to localStorage
  const handlePresetChange = (preset: QualityPreset) => {
    setSelectedPreset(preset);
    localStorage.setItem("pdf-quality-preset", preset);
    
    toast({
      title: "PDF Quality Updated",
      description: `All future PDF exports will use ${QUALITY_PRESETS[preset].label} quality settings.`,
    });
  };

  const currentPreset = QUALITY_PRESETS[selectedPreset];
  const PresetIcon = currentPreset.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF Export Quality</CardTitle>
        <CardDescription>
          Choose the default quality preset for all PDF exports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="quality-preset">Quality Preset</Label>
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger id="quality-preset">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <PresetIcon className={`h-4 w-4 ${currentPreset.color}`} />
                  <span>{currentPreset.label}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(QUALITY_PRESETS).map(([key, preset]) => {
                const Icon = preset.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-3 py-1">
                      <Icon className={`h-5 w-5 ${preset.color}`} />
                      <div className="flex flex-col">
                        <span className="font-medium">{preset.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {preset.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Current Preset Details */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{currentPreset.label} Settings:</p>
              <p className="text-sm text-muted-foreground">{currentPreset.details}</p>
              <p className="text-sm">{currentPreset.description}</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Comparison Table */}
        <div className="rounded-lg border">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Feature</th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="h-3 w-3 text-orange-500" />
                    Draft
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <FileText className="h-3 w-3 text-blue-500" />
                    Standard
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 text-purple-500" />
                    High
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-3 text-sm">Resolution Scale</td>
                <td className="px-4 py-3 text-center text-sm">1.5x</td>
                <td className="px-4 py-3 text-center text-sm font-medium">2x</td>
                <td className="px-4 py-3 text-center text-sm">3x</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm">JPEG Quality</td>
                <td className="px-4 py-3 text-center text-sm">75%</td>
                <td className="px-4 py-3 text-center text-sm font-medium">85%</td>
                <td className="px-4 py-3 text-center text-sm">95%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm">Table Font Size</td>
                <td className="px-4 py-3 text-center text-sm">8pt</td>
                <td className="px-4 py-3 text-center text-sm font-medium">9pt</td>
                <td className="px-4 py-3 text-center text-sm">10pt</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm">Typical File Size</td>
                <td className="px-4 py-3 text-center text-sm">1-3 MB</td>
                <td className="px-4 py-3 text-center text-sm font-medium">2-6 MB</td>
                <td className="px-4 py-3 text-center text-sm">5-15 MB</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm">Export Speed</td>
                <td className="px-4 py-3 text-center text-sm">⚡ Fast</td>
                <td className="px-4 py-3 text-center text-sm font-medium">⚖️ Balanced</td>
                <td className="px-4 py-3 text-center text-sm">🐢 Slower</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm">Best For</td>
                <td className="px-4 py-3 text-center text-sm text-xs">Quick previews</td>
                <td className="px-4 py-3 text-center text-sm text-xs font-medium">General use</td>
                <td className="px-4 py-3 text-center text-sm text-xs">Client deliverables</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Alert variant="default">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            This setting applies to all PDF exports including Cost Reports, Cable Schedules, 
            Generator Reports, Specifications, and more. You can change this at any time.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
