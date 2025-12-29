import React, { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Plus, 
  Download, 
  Trash2, 
  Save,
  Loader2,
  FolderOpen,
  Star,
  MoreVertical,
  Pencil,
  Copy,
  Upload,
  FileDown,
  Check,
  X,
  Tag
} from 'lucide-react';
import { 
  useCircuitTemplates, 
  useCreateTemplateFromCircuit, 
  useApplyTemplateToCircuit,
  useDeleteTemplate,
  useUpdateTemplate,
  useDuplicateTemplate,
  useImportTemplate,
  exportTemplateToJson,
  TemplateWithItems,
  TEMPLATE_CATEGORIES,
  ExportableTemplate,
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
  const [newTemplateCategory, setNewTemplateCategory] = useState('custom');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: templates, isLoading: templatesLoading } = useCircuitTemplates(projectId);
  const { data: currentMaterials } = useCircuitMaterials(circuitId, { projectId });
  
  const createTemplate = useCreateTemplateFromCircuit();
  const applyTemplate = useApplyTemplateToCircuit();
  const deleteTemplate = useDeleteTemplate();
  const updateTemplate = useUpdateTemplate();
  const duplicateTemplate = useDuplicateTemplate();
  const importTemplate = useImportTemplate();

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (filterCategory === 'all') return templates;
    return templates.filter(t => t.circuit_type === filterCategory);
  }, [templates, filterCategory]);

  // Filter out consumables from materials for saving
  const savableMaterials = currentMaterials?.filter(m => {
    const desc = m.description?.toLowerCase() || '';
    return !['cable tie', 'cable saddle', 'cable clip', 'cable identification marker'].some(p => desc.includes(p));
  }) || [];

  const getCategoryInfo = (categoryId: string) => {
    return TEMPLATE_CATEGORIES.find(c => c.id === categoryId) || TEMPLATE_CATEGORIES[5]; // Default to custom
  };

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
        circuitType: newTemplateCategory,
        projectId,
        materials: savableMaterials.map(m => ({
          description: m.description,
          quantity: m.quantity,
          unit: m.unit || 'No',
        })),
      });
      
      toast.success(`Template "${newTemplateName}" saved!`);
      setNewTemplateName('');
      setNewTemplateCategory('custom');
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

  const startEditing = (template: TemplateWithItems, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(template.id);
    setEditName(template.name);
    setEditCategory(template.circuit_type);
  };

  const cancelEditing = () => {
    setEditingTemplate(null);
    setEditName('');
    setEditCategory('');
  };

  const handleSaveEdit = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      await updateTemplate.mutateAsync({
        templateId,
        name: editName.trim(),
        category: editCategory,
      });
      toast.success('Template updated');
      cancelEditing();
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleDuplicate = async (template: TemplateWithItems, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await duplicateTemplate.mutateAsync({
        templateId: template.id,
        newName: `${template.name} (Copy)`,
        targetProjectId: projectId,
      });
      toast.success('Template duplicated');
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleExport = (template: TemplateWithItems, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const exportData = exportTemplateToJson(template);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `template-${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Template exported');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportableTemplate;
      
      // Validate basic structure
      if (!data.name || !Array.isArray(data.items)) {
        throw new Error('Invalid template format');
      }

      await importTemplate.mutateAsync({
        templateData: data,
        projectId,
      });

      toast.success(`Imported template "${data.name}"`);
    } catch (error) {
      console.error('Failed to import template:', error);
      toast.error('Failed to import template. Please check the file format.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
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
            {/* Filter & Import Row */}
            <div className="flex items-center gap-2 mb-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex-1" />
              
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                className="hidden"
                onChange={handleFileImport}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleImportClick}
              >
                <Upload className="h-3 w-3 mr-1" />
                Import
              </Button>
            </div>

            {templatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !filteredTemplates || filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No templates available</p>
                <p className="text-xs mt-1">Save a circuit's materials as a template first</p>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pr-2">
                    {filteredTemplates.map((template) => {
                      const categoryInfo = getCategoryInfo(template.circuit_type);
                      const isEditing = editingTemplate === template.id;
                      
                      return (
                        <div
                          key={template.id}
                          onClick={() => !isEditing && setSelectedTemplate(template.id)}
                          className={cn(
                            "p-3 rounded-md transition-all border",
                            isEditing 
                              ? "bg-muted border-border"
                              : selectedTemplate === template.id
                                ? "bg-primary/10 border-primary cursor-pointer"
                                : "bg-muted/50 border-transparent hover:bg-muted hover:border-border cursor-pointer"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            {isEditing ? (
                              <div className="flex-1 flex items-center gap-2">
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="h-7 text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Select value={editCategory} onValueChange={setEditCategory}>
                                  <SelectTrigger className="w-24 h-7 text-xs" onClick={(e) => e.stopPropagation()}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TEMPLATE_CATEGORIES.map(cat => (
                                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600"
                                  onClick={(e) => handleSaveEdit(template.id, e)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground"
                                  onClick={(e) => { e.stopPropagation(); cancelEditing(); }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 min-w-0">
                                  {template.is_default && (
                                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                                  )}
                                  <span className="font-medium text-sm truncate">{template.name}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge 
                                    variant="secondary" 
                                    className={cn("text-xs text-white", categoryInfo.color)}
                                  >
                                    {categoryInfo.label}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {template.items?.length || 0}
                                  </Badge>
                                  
                                  {!template.is_default && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreVertical className="h-3.5 w-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => startEditing(template, e as any)}>
                                          <Pencil className="h-3.5 w-3.5 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => handleDuplicate(template, e as any)}>
                                          <Copy className="h-3.5 w-3.5 mr-2" />
                                          Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => handleExport(template, e as any)}>
                                          <FileDown className="h-3.5 w-3.5 mr-2" />
                                          Export
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-destructive"
                                          onClick={(e) => handleDeleteTemplate(template.id, e as any)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                  
                                  {template.is_default && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => handleExport(template, e)}
                                    >
                                      <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* Preview items when selected */}
                          {selectedTemplate === template.id && !isEditing && template.items && template.items.length > 0 && (
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
                      );
                    })}
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
              <div className="grid grid-cols-2 gap-3">
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
                  <Label>Category</Label>
                  <Select value={newTemplateCategory} onValueChange={setNewTemplateCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", cat.color)} />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
