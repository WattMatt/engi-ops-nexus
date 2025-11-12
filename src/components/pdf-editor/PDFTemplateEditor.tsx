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
import { Loader2, Save, FileDown, ChevronLeft, ChevronRight, Undo, Redo, Type, Square, Circle, Minus, ImageIcon } from "lucide-react";
import { LivePreview } from "./LivePreview";
import { StylePanel } from "./StylePanel";
import { TemplateSelector } from "./TemplateSelector";
import { LayersPanel } from "./LayersPanel";
import { AlignmentToolbar, AlignmentType } from "./AlignmentToolbar";
import { PDFPagePreview } from "./PDFPagePreview";
import { ThumbnailSidebar } from "./ThumbnailSidebar";
import { PDFStyleSettings } from "@/utils/pdfStyleManager";
import { Checkbox } from "@/components/ui/checkbox";

interface PDFTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: string;
  onApplyTemplate?: (templateId: string) => void;
  reportPdfUrl?: string | null; // URL to the actual PDF report
}

export const PDFTemplateEditor = ({
  open,
  onOpenChange,
  reportType,
  onApplyTemplate,
  reportPdfUrl,
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
  
  // PDF page navigation
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // Undo/Redo state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Track extracted PDF elements for color control
  const [extractedText, setExtractedText] = useState<any[]>([]);
  const [extractedImages, setExtractedImages] = useState<any[]>([]);
  const [extractedShapes, setExtractedShapes] = useState<any[]>([]);

  // Track user-added elements
  const [addedElements, setAddedElements] = useState<{
    text: any[];
    images: any[];
    shapes: any[];
  }>({ text: [], images: [], shapes: [] });

  const handleUndoRedoChange = (undo: boolean, redo: boolean) => {
    setCanUndo(undo);
    setCanRedo(redo);
  };

  const handleColorChange = (elementId: string, colorType: 'text' | 'stroke' | 'fill', color: string) => {
    // This is called from StylePanel and needs to update LivePreview's elements
    if (colorType === 'text') {
      setExtractedText(prev => prev.map(item => 
        item.id === elementId ? { ...item, color } : item
      ));
    } else if (colorType === 'stroke') {
      setExtractedShapes(prev => prev.map(item =>
        item.id === elementId ? { ...item, strokeColor: color } : item
      ));
    } else if (colorType === 'fill') {
      setExtractedShapes(prev => prev.map(item =>
        item.id === elementId ? { ...item, fillColor: color } : item
      ));
    }
  };

  // Handle elements extracted callback
  const handleElementsExtracted = (elements: { text: any[]; images: any[]; shapes: any[] }) => {
    setExtractedText(elements.text);
    setExtractedImages(elements.images);
    setExtractedShapes(elements.shapes);
    
    toast({
      title: "Elements extracted",
      description: `Found ${elements.text.length} text, ${elements.images.length} images, ${elements.shapes.length} shapes`,
    });
  };

  // Get data for selected element
  const getSelectedElementData = () => {
    if (!selectedElements.length || selectedElements.length > 1) return null;
    
    const selectedId = selectedElements[0];
    
    // Check extracted text elements
    const textElement = extractedText.find(t => t.id === selectedId);
    if (textElement) {
      return {
        type: 'text' as const,
        color: textElement.color || '#000000',
      };
    }
    
    // Check added text elements
    const addedTextElement = addedElements.text.find(t => t.id === selectedId);
    if (addedTextElement) {
      return {
        type: 'text' as const,
        color: addedTextElement.color || '#000000',
      };
    }
    
    // Check extracted shape elements
    const shapeElement = extractedShapes.find(s => s.id === selectedId);
    if (shapeElement) {
      return {
        type: 'shape' as const,
        strokeColor: shapeElement.strokeColor || '#000000',
        fillColor: shapeElement.fillColor || 'none',
      };
    }
    
    // Check added shape elements
    const addedShapeElement = addedElements.shapes.find(s => s.id === selectedId);
    if (addedShapeElement) {
      return {
        type: 'shape' as const,
        strokeColor: addedShapeElement.strokeColor || '#000000',
        fillColor: addedShapeElement.fillColor || 'none',
      };
    }
    
    return null;
  };

  // Handlers for adding new elements
  const imageInputRef = useState<HTMLInputElement | null>(null)[0];
  
  const handleAddTextBox = () => {
    const newTextBox = {
      id: `added-text-${Date.now()}`,
      text: 'New Text',
      x: 100,
      y: 100,
      width: 200,
      height: 40,
      fontSize: 16,
      fontFamily: 'Arial',
      page: currentPage,
      color: '#000000',
      bold: false,
    };
    
    setAddedElements(prev => ({
      ...prev,
      text: [...prev.text, newTextBox],
    }));
    setSelectedElements([newTextBox.id]);
    toast({
      title: "Text box added",
      description: "You can now edit and position the text box",
    });
  };

  const handleAddShape = (type: 'rect' | 'circle' | 'line') => {
    const newShape = {
      id: `added-shape-${Date.now()}`,
      type,
      x: 150,
      y: 150,
      width: type === 'line' ? 200 : 100,
      height: type === 'line' ? 2 : 100,
      page: currentPage,
      strokeColor: '#000000',
      fillColor: type === 'line' ? 'transparent' : '#cccccc',
      strokeWidth: 2,
    };
    
    setAddedElements(prev => ({
      ...prev,
      shapes: [...prev.shapes, newShape],
    }));
    setSelectedElements([newShape.id]);
    toast({
      title: `${type} added`,
      description: "You can now resize and position the shape",
    });
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImage = {
        id: `added-image-${Date.now()}`,
        dataUrl: e.target?.result as string,
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        page: currentPage,
      };
      
      setAddedElements(prev => ({
        ...prev,
        images: [...prev.images, newImage],
      }));
      setSelectedElements([newImage.id]);
      toast({
        title: "Image added",
        description: "You can now resize and position the image",
      });
    };
    reader.readAsDataURL(file);
  };

  // Element definitions with defaults (imported from LivePreview for consistency)
  const ELEMENT_DEFAULTS = [
    { key: 'cover-title', defaultX: 100, defaultY: 150, page: 1 },
    { key: 'cover-subtitle', defaultX: 100, defaultY: 200, page: 1 },
    { key: 'section-heading', defaultX: 50, defaultY: 100, page: 2 },
    { key: 'section-body', defaultX: 50, defaultY: 140, page: 2 },
    { key: 'subsection-heading', defaultX: 50, defaultY: 200, page: 2 },
    { key: 'kpi-text', defaultX: 50, defaultY: 240, page: 2 },
    { key: 'table-heading', defaultX: 50, defaultY: 300, page: 2 },
    { key: 'sample-table', defaultX: 50, defaultY: 340, page: 2 },
  ];

  // Initialize missing positions with defaults
  const initializeElementPositions = (settings: PDFStyleSettings): PDFStyleSettings => {
    const newSettings = { ...settings };
    
    if (!newSettings.positions) {
      newSettings.positions = {};
    }
    
    if (!newSettings.elements) {
      newSettings.elements = {};
    }

    // Add missing positions and metadata
    ELEMENT_DEFAULTS.forEach(el => {
      if (!newSettings.positions![el.key]) {
        newSettings.positions![el.key] = { 
          x: el.defaultX, 
          y: el.defaultY,
          page: el.page 
        };
      }
      
      if (!newSettings.elements![el.key]) {
        newSettings.elements![el.key] = {
          visible: true,
          locked: false,
          zIndex: 0,
          page: el.page
        };
      }
    });

    return newSettings;
  };

  // Load PDF URL when dialog opens
  useState(() => {
    if (open && reportPdfUrl) {
      setPdfUrl(reportPdfUrl);
    }
  });

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
        const initializedSettings = initializeElementPositions(defaultTemplate.settings as unknown as PDFStyleSettings);
        setCurrentSettings(initializedSettings);
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
      const initializedSettings = initializeElementPositions(template.settings as unknown as PDFStyleSettings);
      setCurrentSettings(initializedSettings);
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

  const handleDocumentLoadSuccess = (pages: number) => {
    setNumPages(pages);
    setCurrentPage(1);
  };

  const handleDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    toast({
      title: "Failed to load PDF",
      description: "Could not load the PDF report for editing.",
      variant: "destructive",
    });
  };

  const filteredElementsForPage = (page: number) => {
    // Filter elements that belong to the current page
    // If no page is set, show on page 1 by default
    return selectedElements.filter(key => {
      const metadata = currentSettings?.elements?.[key];
      const elementPage = metadata?.page || 1;
      return elementPage === page;
    });
  };

  const allElementsForPage = (page: number) => {
    // Combine template elements with added elements for the page
    const templateElements = filteredElementsForPage(page);
    const addedTextIds = addedElements.text.filter(el => el.page === page).map(el => el.id);
    const addedImageIds = addedElements.images.filter(el => el.page === page).map(el => el.id);
    const addedShapeIds = addedElements.shapes.filter(el => el.page === page).map(el => el.id);
    
    return [...templateElements, ...addedTextIds, ...addedImageIds, ...addedShapeIds];
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
            {/* Thumbnail Sidebar */}
            {pdfUrl && numPages > 0 && (
              <ThumbnailSidebar
                pdfUrl={pdfUrl}
                numPages={numPages}
                currentPage={currentPage}
                settings={currentSettings}
                onPageSelect={setCurrentPage}
              />
            )}
            
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
                {/* Undo/Redo Controls */}
                <div className="flex items-center justify-center gap-2 p-2 bg-background border rounded-lg">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Trigger undo via keyboard event
                      const event = new KeyboardEvent('keydown', {
                        key: 'z',
                        ctrlKey: true,
                        bubbles: true
                      });
                      window.dispatchEvent(event);
                    }}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo className="h-4 w-4 mr-1" />
                    Undo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Trigger redo via keyboard event
                      const event = new KeyboardEvent('keydown', {
                        key: 'y',
                        ctrlKey: true,
                        bubbles: true
                      });
                      window.dispatchEvent(event);
                    }}
                    disabled={!canRedo}
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo className="h-4 w-4 mr-1" />
                    Redo
                  </Button>
                </div>

                {/* Page Navigation */}
                {numPages > 1 && (
                  <div className="flex items-center justify-center gap-4 p-2 bg-background border rounded-lg">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm font-medium">
                      Page {currentPage} of {numPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                      disabled={currentPage >= numPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}

                <div className="p-3 bg-info/10 border border-info rounded-lg">
                  <p className="text-sm text-info-foreground flex items-center gap-2">
                    <strong>Tip:</strong> {pdfUrl ? "Edit elements on the actual PDF pages" : "Generate a report to see actual pages"}. Ctrl+Click to multi-select.
                    {currentSettings?.grid?.enabled && (
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
              
              <div className="relative mx-auto" style={{ width: '793.7px' }}>
                {/* Add Elements Toolbar */}
                {pdfUrl && (
                  <div className="absolute top-4 right-4 z-10 flex gap-2 bg-background/95 p-2 rounded-lg shadow-lg border">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddTextBox}
                      title="Add Text Box"
                    >
                      <Type className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddShape('rect')}
                      title="Add Rectangle"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddShape('circle')}
                      title="Add Circle"
                    >
                      <Circle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddShape('line')}
                      title="Add Line"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <label>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        title="Add Image"
                      >
                        <span className="cursor-pointer">
                          <ImageIcon className="h-4 w-4" />
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAddImage}
                      />
                    </label>
                  </div>
                )}

                {/* PDF Background */}
                {pdfUrl && (
                  <div className="relative">
                    <PDFPagePreview
                      pdfUrl={pdfUrl}
                      currentPage={currentPage}
                      onDocumentLoadSuccess={handleDocumentLoadSuccess}
                      onDocumentLoadError={handleDocumentLoadError}
                    />
                  </div>
                )}

                {/* Editable Elements Overlay */}
                {pdfUrl && (
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="relative w-full h-full pointer-events-auto">
                      <LivePreview
                        settings={currentSettings}
                        selectedElements={allElementsForPage(currentPage)}
                        onSelectElement={handleSelectElement}
                        onPositionChange={handlePositionChange}
                        onGroupDrag={handleGroupDrag}
                        reportType={reportType}
                        currentPage={currentPage}
                        pdfUrl={pdfUrl}
                        enablePDFEditing={true}
                        onUndoRedoChange={handleUndoRedoChange}
                        onColorChange={handleColorChange}
                        onElementsExtracted={handleElementsExtracted}
                        addedElements={addedElements}
                      />
                    </div>
                  </div>
                )}
                
                {/* Fallback when no PDF */}
                {!pdfUrl && (
                  <LivePreview
                    settings={currentSettings}
                    selectedElements={filteredElementsForPage(currentPage)}
                    onSelectElement={handleSelectElement}
                    onPositionChange={handlePositionChange}
                    onGroupDrag={handleGroupDrag}
                    reportType={reportType}
                    currentPage={currentPage}
                    pdfUrl={null}
                    enablePDFEditing={false}
                    onUndoRedoChange={handleUndoRedoChange}
                    onColorChange={handleColorChange}
                    onElementsExtracted={handleElementsExtracted}
                    addedElements={addedElements}
                  />
                )}
              </div>
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
                onColorChange={handleColorChange}
                selectedElementData={getSelectedElementData()}
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
