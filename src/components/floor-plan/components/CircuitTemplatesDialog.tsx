import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Download, 
  Trash2, 
  Save,
  Loader2,
  FolderOpen,
  Star
} from 'lucide-react';
import { 
  useCircuitTemplates, 
  useCreateTemplateFromCircuit, 
  useApplyTemplateToCircuit,
  useDeleteTemplate,
  TemplateWithItems 
} from '../hooks/useCircuitTemplates';
import { useCircuitMaterials } from '@/components/circuit-schedule/hooks/useDistributionBoards';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CircuitTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circuitId: string;
  circuitRef: string;
  projectId?: string;
  floorPlanId?: string;
}

export const CircuitTemplatesDialog: React.FC<CircuitTemplatesDialogProps> = ({
  open,
  onOpenChange,
  circuitId,
  circuitRef,
  projectId,
  floorPlanId,
}) => {
  const [activeTab, setActiveTab] = useState<'apply' | 'save'>('apply');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  const { data: templates, isLoading: templatesLoading } = useCircuitTemplates(projectId);
  const { data: currentMaterials } = useCircuitMaterials(circuitId, { projectId });
  
  const createTemplate = useCreateTemplateFromCircuit();
  const applyTemplate = useApplyTemplateToCircuit();
  const deleteTemplate = useDeleteTemplate();

  // Filter out consumables from materials for saving
  const savableMaterials = currentMaterials?.filter(m => {
    const desc = m.description?.toLowerCase() || '';
    return !['cable tie', 'cable saddle', 'cable clip', 'cable identification marker'].some(p => desc.includes(p));
  }) || [];

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    
    if (savableMaterials.length === 0) {
      toast.error('No materials to save as template');
      return;
    }

    try {
      await createTemplate.mutateAsync({
        name: newTemplateName.trim(),
        circuitType: 'custom',
        projectId,
        materials: savableMaterials.map(m => ({
          description: m.description,
          quantity: m.quantity,
          unit: m.unit || 'No',
        })),
      });
      
      toast.success(`Template "${newTemplateName}" saved!`);
      setNewTemplateName('');
      setActiveTab('apply');
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    try {
      await applyTemplate.mutateAsync({
        templateId: selectedTemplate,
        circuitId,
        projectId,
        floorPlanId,
      });
      
      const template = templates?.find(t => t.id === selectedTemplate);
      toast.success(`Applied template "${template?.name}" to ${circuitRef}`);
      setSelectedTemplate(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to apply template:', error);
      toast.error('Failed to apply template');
    }
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await deleteTemplate.mutateAsync(templateId);
      toast.success('Template deleted');
      if (selectedTemplate === templateId) {
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const selectedTemplateData = templates?.find(t => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Circuit Templates
            <Badge variant="outline" className="ml-2">
              {circuitRef}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'apply' | 'save')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="apply" className="flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              Apply Template
            </TabsTrigger>
            <TabsTrigger value="save" className="flex items-center gap-1.5">
              <Save className="h-4 w-4" />
              Save as Template
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apply" className="flex-1 flex flex-col min-h-0 mt-4">
            {templatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !templates || templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No templates available</p>
                <p className="text-xs mt-1">Save a circuit's materials as a template first</p>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pr-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={cn(
                          "p-3 rounded-md cursor-pointer transition-all border",
                          selectedTemplate === template.id
                            ? "bg-primary/10 border-primary"
                            : "bg-muted/50 border-transparent hover:bg-muted hover:border-border"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {template.is_default && (
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            )}
                            <span className="font-medium text-sm">{template.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {template.items?.length || 0} items
                            </Badge>
                            {!template.is_default && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={(e) => handleDeleteTemplate(template.id, e)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Preview items when selected */}
                        {selectedTemplate === template.id && template.items && template.items.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border space-y-1">
                            {template.items.slice(0, 5).map((item) => (
                              <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                                <span className="truncate">{item.description}</span>
                                <span className="flex-shrink-0 ml-2">
                                  {item.quantity_formula} {item.unit}
                                </span>
                              </div>
                            ))}
                            {template.items.length > 5 && (
                              <div className="text-xs text-muted-foreground italic">
                                +{template.items.length - 5} more items...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleApplyTemplate}
                    disabled={!selectedTemplate || applyTemplate.isPending}
                  >
                    {applyTemplate.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Apply Template
                  </Button>
                </DialogFooter>
              </>
            )}
          </TabsContent>

          <TabsContent value="save" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Standard Shop Lighting"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>
              
              <div>
                <Label className="text-muted-foreground">
                  Materials to save ({savableMaterials.length})
                </Label>
                <ScrollArea className="h-48 mt-2 border rounded-md">
                  <div className="p-3 space-y-1">
                    {savableMaterials.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-4 italic">
                        No materials in this circuit to save
                      </div>
                    ) : (
                      savableMaterials.map((mat) => (
                        <div key={mat.id} className="flex justify-between text-sm py-1">
                          <span className="truncate text-foreground">{mat.description}</span>
                          <span className="flex-shrink-0 ml-2 text-muted-foreground">
                            {mat.quantity} {mat.unit}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveTemplate}
                disabled={!newTemplateName.trim() || savableMaterials.length === 0 || createTemplate.isPending}
              >
                {createTemplate.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Template
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
