import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Download, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PDFMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PDFSectionOptions {
  coverPage: boolean;
  tableOfContents: boolean;
  executiveSummary: boolean;
  categoryDetails: boolean;
  projectInfo: boolean;
  costSummary: boolean;
  detailedLineItems: boolean;
  variations: boolean;
}

interface PDFExportSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  margins: PDFMargins;
  onMarginsChange: (margins: PDFMargins) => void;
  sections: PDFSectionOptions;
  onSectionsChange: (sections: PDFSectionOptions) => void;
  onApply: () => void;
  projectId: string;
  selectedContactId?: string;
  onContactChange?: (contactId: string) => void;
}

type MarginPreset = 'normal' | 'narrow' | 'wide' | 'custom';

const MARGIN_PRESETS: Record<Exclude<MarginPreset, 'custom'>, PDFMargins> = {
  normal: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20,
  },
  narrow: {
    top: 12,
    bottom: 12,
    left: 12,
    right: 12,
  },
  wide: {
    top: 30,
    bottom: 30,
    left: 30,
    right: 30,
  },
};

const DEFAULT_MARGINS: PDFMargins = MARGIN_PRESETS.normal;

export const DEFAULT_SECTIONS: PDFSectionOptions = {
  coverPage: true,
  tableOfContents: true,
  executiveSummary: true,
  categoryDetails: true,
  projectInfo: true,
  costSummary: true,
  detailedLineItems: true,
  variations: true,
};

export const PDFExportSettings = ({
  open,
  onOpenChange,
  margins,
  onMarginsChange,
  sections,
  onSectionsChange,
  onApply,
  projectId,
  selectedContactId,
  onContactChange,
}: PDFExportSettingsProps) => {
  const [localMargins, setLocalMargins] = useState<PDFMargins>(margins);
  const [localSections, setLocalSections] = useState<PDFSectionOptions>(sections);
  const [selectedPreset, setSelectedPreset] = useState<MarginPreset>('custom');
  const [localContactId, setLocalContactId] = useState<string>(selectedContactId || '');

  const { data: contacts } = useQuery({
    queryKey: ["project-contacts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_contacts")
        .select("*")
        .eq("project_id", projectId)
        .order("is_primary", { ascending: false })
        .order("contact_type");
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && open,
  });

  // Detect which preset is currently selected
  useEffect(() => {
    const isPreset = (preset: Exclude<MarginPreset, 'custom'>) => {
      const presetMargins = MARGIN_PRESETS[preset];
      return (
        localMargins.top === presetMargins.top &&
        localMargins.bottom === presetMargins.bottom &&
        localMargins.left === presetMargins.left &&
        localMargins.right === presetMargins.right
      );
    };

    if (isPreset('normal')) {
      setSelectedPreset('normal');
    } else if (isPreset('narrow')) {
      setSelectedPreset('narrow');
    } else if (isPreset('wide')) {
      setSelectedPreset('wide');
    } else {
      setSelectedPreset('custom');
    }
  }, [localMargins]);

  const handleMarginChange = (key: keyof PDFMargins, value: string) => {
    const numValue = parseFloat(value) || 0;
    const validValue = Math.max(0, Math.min(50, numValue)); // Limit between 0-50mm
    setLocalMargins({ ...localMargins, [key]: validValue });
  };

  const handlePresetSelect = (preset: Exclude<MarginPreset, 'custom'>) => {
    setLocalMargins(MARGIN_PRESETS[preset]);
    setSelectedPreset(preset);
  };

  const handleApply = () => {
    onMarginsChange(localMargins);
    onSectionsChange(localSections);
    if (onContactChange && localContactId) {
      onContactChange(localContactId);
    }
    onApply();
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalMargins(DEFAULT_MARGINS);
    setLocalSections(DEFAULT_SECTIONS);
    setSelectedPreset('normal');
  };

  const handleSectionToggle = (section: keyof PDFSectionOptions) => {
    setLocalSections({ ...localSections, [section]: !localSections[section] });
  };

  const handleSelectAll = () => {
    setLocalSections(DEFAULT_SECTIONS);
  };

  const handleDeselectAll = () => {
    setLocalSections({
      coverPage: false,
      tableOfContents: false,
      executiveSummary: false,
      categoryDetails: false,
      projectInfo: false,
      costSummary: false,
      detailedLineItems: false,
      variations: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>PDF Export Settings</DialogTitle>
          <DialogDescription>
            Choose which sections to include and configure page margins for the PDF export.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Prepared For Contact Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">Prepared For</Label>
            </div>
            <Select value={localContactId} onValueChange={setLocalContactId}>
              <SelectTrigger>
                <SelectValue placeholder="Select contact for cover page" />
              </SelectTrigger>
              <SelectContent>
                {contacts?.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.organization_name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({contact.contact_type.replace(/_/g, ' ')})
                      </span>
                      {contact.is_primary && (
                        <span className="text-xs text-primary">★</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {localContactId && contacts && (
              <p className="text-xs text-muted-foreground">
                This contact's information will appear in the "Prepared For" section on the cover page
              </p>
            )}
          </div>

          <Separator />
          
          {/* Section Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Include Sections</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-8 text-xs"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="h-8 text-xs"
                >
                  Deselect All
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cover-page"
                  checked={localSections.coverPage}
                  onCheckedChange={() => handleSectionToggle('coverPage')}
                />
                <label
                  htmlFor="cover-page"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Cover Page
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="toc"
                  checked={localSections.tableOfContents}
                  onCheckedChange={() => handleSectionToggle('tableOfContents')}
                />
                <label
                  htmlFor="toc"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Table of Contents
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exec-summary"
                  checked={localSections.executiveSummary}
                  onCheckedChange={() => handleSectionToggle('executiveSummary')}
                />
                <label
                  htmlFor="exec-summary"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Executive Summary
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="category-details"
                  checked={localSections.categoryDetails}
                  onCheckedChange={() => handleSectionToggle('categoryDetails')}
                />
                <label
                  htmlFor="category-details"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Category Performance
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="project-info"
                  checked={localSections.projectInfo}
                  onCheckedChange={() => handleSectionToggle('projectInfo')}
                />
                <label
                  htmlFor="project-info"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Project Information
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cost-summary"
                  checked={localSections.costSummary}
                  onCheckedChange={() => handleSectionToggle('costSummary')}
                />
                <label
                  htmlFor="cost-summary"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Cost Summary
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="line-items"
                  checked={localSections.detailedLineItems}
                  onCheckedChange={() => handleSectionToggle('detailedLineItems')}
                />
                <label
                  htmlFor="line-items"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Detailed Line Items
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="variations"
                  checked={localSections.variations}
                  onCheckedChange={() => handleSectionToggle('variations')}
                />
                <label
                  htmlFor="variations"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Variations
                </label>
              </div>
            </div>
          </div>
          
          <Separator />
          {/* Preset Selection */}
          <div className="space-y-3">
            <Label>Margin Presets</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={selectedPreset === 'normal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetSelect('normal')}
                className={cn(
                  "transition-all",
                  selectedPreset === 'normal' && "ring-2 ring-primary ring-offset-2"
                )}
              >
                Normal
              </Button>
              <Button
                type="button"
                variant={selectedPreset === 'narrow' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetSelect('narrow')}
                className={cn(
                  "transition-all",
                  selectedPreset === 'narrow' && "ring-2 ring-primary ring-offset-2"
                )}
              >
                Narrow
              </Button>
              <Button
                type="button"
                variant={selectedPreset === 'wide' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetSelect('wide')}
                className={cn(
                  "transition-all",
                  selectedPreset === 'wide' && "ring-2 ring-primary ring-offset-2"
                )}
              >
                Wide
              </Button>
            </div>
            {selectedPreset === 'custom' && (
              <p className="text-xs text-muted-foreground">
                Custom margins detected. Adjust values below or select a preset.
              </p>
            )}
            {selectedPreset !== 'custom' && (
              <p className="text-xs text-muted-foreground">
                {selectedPreset === 'normal' && 'Standard 20mm margins on all sides'}
                {selectedPreset === 'narrow' && 'Compact 12mm margins for more content'}
                {selectedPreset === 'wide' && 'Generous 30mm margins for formal documents'}
              </p>
            )}
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Custom Values
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="top-margin">Top Margin (mm)</Label>
              <Input
                id="top-margin"
                type="number"
                min="0"
                max="50"
                step="1"
                value={localMargins.top}
                onChange={(e) => handleMarginChange("top", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bottom-margin">Bottom Margin (mm)</Label>
              <Input
                id="bottom-margin"
                type="number"
                min="0"
                max="50"
                step="1"
                value={localMargins.bottom}
                onChange={(e) => handleMarginChange("bottom", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="left-margin">Left Margin (mm)</Label>
              <Input
                id="left-margin"
                type="number"
                min="0"
                max="50"
                step="1"
                value={localMargins.left}
                onChange={(e) => handleMarginChange("left", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="right-margin">Right Margin (mm)</Label>
              <Input
                id="right-margin"
                type="number"
                min="0"
                max="50"
                step="1"
                value={localMargins.right}
                onChange={(e) => handleMarginChange("right", e.target.value)}
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="relative border-2 border-muted rounded-lg h-48 bg-background">
              <div 
                className="absolute bg-primary/10 border-2 border-dashed border-primary/30 rounded"
                style={{
                  top: `${(localMargins.top / 297) * 100}%`,
                  bottom: `${(localMargins.bottom / 297) * 100}%`,
                  left: `${(localMargins.left / 210) * 100}%`,
                  right: `${(localMargins.right / 210) * 100}%`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  Content Area
                </div>
              </div>
              <div className="absolute top-2 left-2 text-xs text-muted-foreground">
                {localMargins.top}mm
              </div>
              <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                {localMargins.bottom}mm
              </div>
              <div className="absolute top-2 left-2 text-xs text-muted-foreground" style={{ writingMode: 'vertical-lr' }}>
                {localMargins.left}mm
              </div>
              <div className="absolute top-2 right-2 text-xs text-muted-foreground" style={{ writingMode: 'vertical-lr' }}>
                {localMargins.right}mm
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            <Download className="mr-2 h-4 w-4" />
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { DEFAULT_MARGINS };
