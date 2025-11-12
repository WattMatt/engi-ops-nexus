import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, FileDown } from "lucide-react";
import { LivePreview } from "./LivePreview";
import { StylePanel } from "./StylePanel";
import { TemplateSelector } from "./TemplateSelector";
import { LayersPanel } from "./LayersPanel";
import { AlignmentToolbar, AlignmentType } from "./AlignmentToolbar";
import { PDFStyleSettings } from "@/utils/pdfStyleManager";
import { Checkbox } from "@/components/ui/checkbox";

interface PDFTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: string;
  onApplyTemplate?: (templateId: string) => void;
}

export const PDFTemplateEditor = ({
  open,
  onOpenChange,
  reportType,
  onApplyTemplate,
}: PDFTemplateEditorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [elementType, setElementType] = useState<'heading' | 'body' | 'table' | 'section' | null>(null);
  const [elementLevel, setElementLevel] = useState<1 | 2 | 3 | undefined>();
  const [currentSettings, setCurrentSettings] = useState<PDFStyleSettings | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(false);

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['pdf-templates', reportType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdf_style_templates')
        .select('*')
        .eq('report_type', reportType)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load default template on initial load
      const defaultTemplate = data?.find(t => t.is_default);
      if (defaultTemplate && !currentSettings) {
        setCurrentSettings(defaultTemplate.settings as unknown as PDFStyleSettings);
        setSelectedTemplateId(defaultTemplate.id);
      }

      return data;
    },
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!currentSettings) throw new Error("No settings to save");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // If setting as default, unset other defaults first
      if (setAsDefault) {
        await supabase
          .from('pdf_style_templates')
          .update({ is_default: false })
          .eq('report_type', reportType);
      }

      const { error } = await supabase
        .from('pdf_style_templates')
        .insert({
          report_type: reportType,
          is_default: setAsDefault,
          created_by: user.id,
          settings: currentSettings as any,
          name: templateName,
          description: templateDescription || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates', reportType] });
      toast({
        title: "Template saved",
        description: "Your template has been saved successfully.",
      });
      setSaveDialogOpen(false);
      setTemplateName("");
      setTemplateDescription("");
      setSetAsDefault(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('pdf_style_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates', reportType] });
      toast({
        title: "Template deleted",
        description: "The template has been deleted successfully.",
      });
      setSelectedTemplateId(null);
    },
  });

  const handleSelectElement = (key: string, isCtrlKey: boolean) => {
    if (isCtrlKey) {
      // Multi-select with Ctrl/Cmd
      setSelectedElements(prev => 
        prev.includes(key) 
          ? prev.filter(k => k !== key) 
          : [...prev, key]
      );
    } else {
      // Single select
      setSelectedElements([key]);
    }
    
    // Parse element type and level from key (for single selection)
    if (!isCtrlKey) {
      if (key.includes('heading')) {
        setElementType('heading');
        if (key.includes('section-heading')) {
          setElementLevel(1);
        } else if (key.includes('subsection')) {
          setElementLevel(2);
        } else {
          setElementLevel(3);
        }
      } else if (key.includes('table')) {
        setElementType('table');
        setElementLevel(undefined);
      } else {
        setElementType('body');
        setElementLevel(undefined);
      }
    }
  };

  const handleStyleChange = (path: string, value: any) => {
    if (!currentSettings) return;

    setCurrentSettings((prev) => {
      if (!prev) return prev;
      
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const handlePositionChange = (elementKey: string, x: number, y: number) => {
    if (!currentSettings) return;

    setCurrentSettings((prev) => {
      if (!prev) return prev;
      
      return {
        ...prev,
        positions: {
          ...prev.positions,
          [elementKey]: { x, y }
        }
      };
    });
  };

  const handleToggleVisibility = (elementKey: string) => {
    if (!currentSettings) return;

    setCurrentSettings((prev) => {
      if (!prev) return prev;
      
      const currentMetadata = prev.elements?.[elementKey] || { visible: true, locked: false, zIndex: 0 };
      
      return {
        ...prev,
        elements: {
          ...prev.elements,
          [elementKey]: {
            ...currentMetadata,
            visible: !currentMetadata.visible
          }
        }
      };
    });
  };

  const handleToggleLocked = (elementKey: string) => {
    if (!currentSettings) return;

    setCurrentSettings((prev) => {
      if (!prev) return prev;
      
      const currentMetadata = prev.elements?.[elementKey] || { visible: true, locked: false, zIndex: 0 };
      
      return {
        ...prev,
        elements: {
          ...prev.elements,
          [elementKey]: {
            ...currentMetadata,
            locked: !currentMetadata.locked
          }
        }
      };
    });
  };

  const handleChangeZIndex = (elementKey: string, direction: 'up' | 'down') => {
    if (!currentSettings) return;

    setCurrentSettings((prev) => {
      if (!prev) return prev;
      
      const currentMetadata = prev.elements?.[elementKey] || { visible: true, locked: false, zIndex: 0 };
      const newZIndex = direction === 'up' ? currentMetadata.zIndex + 1 : currentMetadata.zIndex - 1;
      
      return {
        ...prev,
        elements: {
          ...prev.elements,
          [elementKey]: {
            ...currentMetadata,
            zIndex: newZIndex
          }
        }
      };
    });
  };

  const handleGroupDrag = (deltaX: number, deltaY: number) => {
    if (!currentSettings || selectedElements.length === 0) return;

    setCurrentSettings((prev) => {
      if (!prev) return prev;
      
      const newPositions = { ...prev.positions };
      
      selectedElements.forEach((key) => {
        const currentPos = newPositions[key] || { x: 0, y: 0 };
        newPositions[key] = {
          x: currentPos.x + deltaX,
          y: currentPos.y + deltaY
        };
      });
      
      return {
        ...prev,
        positions: newPositions
      };
    });
  };

  const handleAlign = (type: AlignmentType) => {
    if (!currentSettings || selectedElements.length < 2) return;

    setCurrentSettings((prev) => {
      if (!prev) return prev;
      
      const positions = selectedElements.map(key => ({
        key,
        pos: prev.positions?.[key] || { x: 0, y: 0 }
      }));

      const newPositions = { ...prev.positions };

      switch (type) {
        case 'left': {
          const minX = Math.min(...positions.map(p => p.pos.x));
          positions.forEach(({ key }) => {
            newPositions[key] = { ...newPositions[key], x: minX };
          });
          break;
        }
        case 'center-h': {
          const avgX = positions.reduce((sum, p) => sum + p.pos.x, 0) / positions.length;
          positions.forEach(({ key }) => {
            newPositions[key] = { ...newPositions[key], x: avgX };
          });
          break;
        }
        case 'right': {
          const maxX = Math.max(...positions.map(p => p.pos.x));
          positions.forEach(({ key }) => {
            newPositions[key] = { ...newPositions[key], x: maxX };
          });
          break;
        }
        case 'top': {
          const minY = Math.min(...positions.map(p => p.pos.y));
          positions.forEach(({ key }) => {
            newPositions[key] = { ...newPositions[key], y: minY };
          });
          break;
        }
        case 'center-v': {
          const avgY = positions.reduce((sum, p) => sum + p.pos.y, 0) / positions.length;
          positions.forEach(({ key }) => {
            newPositions[key] = { ...newPositions[key], y: avgY };
          });
          break;
        }
        case 'bottom': {
          const maxY = Math.max(...positions.map(p => p.pos.y));
          positions.forEach(({ key }) => {
            newPositions[key] = { ...newPositions[key], y: maxY };
          });
          break;
        }
        case 'distribute-h': {
          const sorted = [...positions].sort((a, b) => a.pos.x - b.pos.x);
          const minX = sorted[0].pos.x;
          const maxX = sorted[sorted.length - 1].pos.x;
          const spacing = (maxX - minX) / (sorted.length - 1);
          sorted.forEach(({ key }, i) => {
            newPositions[key] = { ...newPositions[key], x: minX + spacing * i };
          });
          break;
        }
        case 'distribute-v': {
          const sorted = [...positions].sort((a, b) => a.pos.y - b.pos.y);
          const minY = sorted[0].pos.y;
          const maxY = sorted[sorted.length - 1].pos.y;
          const spacing = (maxY - minY) / (sorted.length - 1);
          sorted.forEach(({ key }, i) => {
            newPositions[key] = { ...newPositions[key], y: minY + spacing * i };
          });
          break;
        }
      }

      return {
        ...prev,
        positions: newPositions
      };
    });
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setCurrentSettings(template.settings as unknown as PDFStyleSettings);
      setSelectedTemplateId(templateId);
      setSelectedElements([]); // Clear selection when loading template
    }
  };

  const handleReset = () => {
    const defaultTemplate = templates?.find(t => t.is_default);
    if (defaultTemplate) {
      setCurrentSettings(defaultTemplate.settings as unknown as PDFStyleSettings);
    }
  };

  const handleApplyAndGenerate = () => {
    if (selectedTemplateId && onApplyTemplate) {
      onApplyTemplate(selectedTemplateId);
    }
    onOpenChange(false);
  };

  if (isLoading || !currentSettings) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>PDF Template Editor</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Click on any element to customize its style
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={saveTemplateMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
                <Button onClick={handleApplyAndGenerate}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Apply & Generate PDF
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <Label className="mb-2 block">Load Template</Label>
              <TemplateSelector
                templates={templates || []}
                selectedTemplateId={selectedTemplateId}
                onSelectTemplate={handleLoadTemplate}
                onDeleteTemplate={(id) => deleteTemplateMutation.mutate(id)}
              />
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden border-t">
            {/* Layers Panel */}
            <div className="w-64 border-r bg-background">
              <LayersPanel
                settings={currentSettings}
                selectedElements={selectedElements}
                onSelectElement={handleSelectElement}
                onToggleVisibility={handleToggleVisibility}
                onToggleLocked={handleToggleLocked}
                onChangeZIndex={handleChangeZIndex}
              />
            </div>

            {/* Preview Panel */}
            <ScrollArea className="flex-1 p-6 bg-muted/30">
              <div className="space-y-2 mb-4">
                <div className="p-3 bg-info/10 border border-info rounded-lg">
                  <p className="text-sm text-info-foreground flex items-center gap-2">
                    <strong>Tip:</strong> Ctrl+Click to multi-select. Drag selected elements together.
                    {currentSettings.grid?.enabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded text-xs">
                        Snap-to-grid ({currentSettings.grid.size}px)
                      </span>
                    )}
                  </p>
                </div>
                
                {/* Alignment Toolbar */}
                <AlignmentToolbar
                  selectedCount={selectedElements.length}
                  onAlign={handleAlign}
                />
              </div>
              
              <LivePreview
                settings={currentSettings}
                selectedElements={selectedElements}
                onSelectElement={handleSelectElement}
                onPositionChange={handlePositionChange}
                onGroupDrag={handleGroupDrag}
                reportType={reportType}
              />
            </ScrollArea>

            {/* Style Editor Panel */}
            <div className="w-80 border-l bg-background">
              <StylePanel
                selectedElement={selectedElements.length === 1 ? selectedElements[0] : null}
                elementType={elementType}
                level={elementLevel}
                currentStyles={currentSettings}
                onStyleChange={handleStyleChange}
                onPositionChange={handlePositionChange}
                onReset={handleReset}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Company Branding 2024"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Optional description of this template"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="set-default"
                checked={setAsDefault}
                onCheckedChange={(checked) => setSetAsDefault(checked as boolean)}
              />
              <Label htmlFor="set-default" className="cursor-pointer">
                Set as default template
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveTemplateMutation.mutate()}
              disabled={!templateName || saveTemplateMutation.isPending}
            >
              {saveTemplateMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
