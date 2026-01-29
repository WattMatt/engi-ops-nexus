/**
 * Edit Tick Sheet Dialog
 * Dialog for creating and editing checklist templates with their items
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Trash2, 
  GripVertical,
  ChevronRight,
  Link as LinkIcon,
  Save
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  useChecklistItemsFlat,
  useCreateChecklistTemplate,
  useUpdateChecklistTemplate,
  useSaveChecklistItems 
} from '@/hooks/useDrawingChecklists';
import { useDrawingCategories } from '@/hooks/useProjectDrawings';
import { DrawingChecklistTemplate, DrawingChecklistItem, DOCUMENT_LINK_TYPES } from '@/types/drawingChecklists';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category_code: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  is_default: z.boolean(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface EditableItem {
  id: string;
  tempId?: string; // For new items
  label: string;
  parent_id: string | null;
  linked_document_type: string | null;
  sort_order: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface EditTickSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DrawingChecklistTemplate | null;
}

export function EditTickSheetDialog({ open, onOpenChange, template }: EditTickSheetDialogProps) {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  
  const { data: categories = [] } = useDrawingCategories();
  const { data: existingItems = [] } = useChecklistItemsFlat(template?.id);
  
  const createTemplate = useCreateChecklistTemplate();
  const updateTemplate = useUpdateChecklistTemplate();
  const saveItems = useSaveChecklistItems();
  
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      category_code: '',
      description: '',
      is_default: true,
    },
  });
  
  // Reset form when template changes
  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        category_code: template.category_code,
        description: template.description || '',
        is_default: template.is_default,
      });
    } else {
      form.reset({
        name: '',
        category_code: '',
        description: '',
        is_default: true,
      });
    }
  }, [template, form]);
  
  // Load existing items when editing
  useEffect(() => {
    if (template && existingItems.length > 0) {
      setItems(existingItems.map(item => ({
        id: item.id,
        label: item.label,
        parent_id: item.parent_id || null,
        linked_document_type: item.linked_document_type || null,
        sort_order: item.sort_order,
      })));
    } else if (!template) {
      setItems([]);
    }
  }, [template, existingItems]);
  
  const handleAddItem = () => {
    if (!newItemLabel.trim()) return;
    
    const newItem: EditableItem = {
      id: `temp-${Date.now()}`,
      tempId: `temp-${Date.now()}`,
      label: newItemLabel.trim(),
      parent_id: selectedParentId || null,
      linked_document_type: null,
      sort_order: items.filter(i => !i.isDeleted).length,
      isNew: true,
    };
    
    setItems(prev => [...prev, newItem]);
    setNewItemLabel('');
    setSelectedParentId('');
  };
  
  const handleDeleteItem = (itemId: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, isDeleted: true }
        : item
    ));
  };
  
  const handleUpdateItemLabel = (itemId: string, label: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, label } : item
    ));
  };
  
  const handleUpdateItemLink = (itemId: string, linked_document_type: string | null) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, linked_document_type } : item
    ));
  };
  
  const handleSubmit = async (formData: TemplateFormData) => {
    try {
      let templateId = template?.id;
      
      if (template) {
        // Update existing template
        await updateTemplate.mutateAsync({
          id: template.id,
          name: formData.name,
          category_code: formData.category_code,
          description: formData.description,
          is_default: formData.is_default,
        });
      } else {
        // Create new template
        const newTemplate = await createTemplate.mutateAsync({
          name: formData.name,
          category_code: formData.category_code,
          description: formData.description,
          is_default: formData.is_default,
        });
        templateId = newTemplate.id;
      }
      
      // Save items
      if (templateId) {
        const activeItems = items.filter(i => !i.isDeleted);
        const deletedItemIds = items.filter(i => i.isDeleted && !i.isNew).map(i => i.id);
        
        await saveItems.mutateAsync({
          templateId,
          items: activeItems.map((item, idx) => ({
            id: item.isNew ? undefined : item.id,
            template_id: templateId!,
            label: item.label,
            parent_id: item.parent_id,
            linked_document_type: item.linked_document_type,
            sort_order: idx,
          })),
          deletedItemIds,
        });
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving tick sheet:', error);
    }
  };
  
  // Get root-level items for parent selection
  const rootItems = items.filter(i => !i.parent_id && !i.isDeleted);
  const activeItems = items.filter(i => !i.isDeleted);
  
  // Group items by parent
  const groupedItems = activeItems.reduce((acc, item) => {
    const parentId = item.parent_id || 'root';
    if (!acc[parentId]) acc[parentId] = [];
    acc[parentId].push(item);
    return acc;
  }, {} as Record<string, EditableItem[]>);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Tick Sheet' : 'Create New Tick Sheet'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Template Details */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Site Plan Check Sheet" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="category_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.code} value={cat.code}>
                                {cat.name} ({cat.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of this checklist..."
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Default Template</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Use this as the default checklist for this category
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                {/* Checklist Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Checklist Items</Label>
                    <Badge variant="secondary">{activeItems.length} items</Badge>
                  </div>
                  
                  {/* Add New Item */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Enter checklist item..."
                        value={newItemLabel}
                        onChange={(e) => setNewItemLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItem();
                          }
                        }}
                      />
                    </div>
                    <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Parent (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No parent (root level)</SelectItem>
                        {rootItems.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.label.slice(0, 30)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="icon" onClick={handleAddItem}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Items List */}
                  {activeItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No items yet. Add checklist items above.</p>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2">
                      {(groupedItems['root'] || []).sort((a, b) => a.sort_order - b.sort_order).map(item => (
                        <div key={item.id}>
                          <ItemRow
                            item={item}
                            onUpdate={handleUpdateItemLabel}
                            onDelete={handleDeleteItem}
                            onUpdateLink={handleUpdateItemLink}
                          />
                          {/* Child items */}
                          {(groupedItems[item.id] || []).sort((a, b) => a.sort_order - b.sort_order).map(child => (
                            <div key={child.id} className="ml-6">
                              <ItemRow
                                item={child}
                                onUpdate={handleUpdateItemLabel}
                                onDelete={handleDeleteItem}
                                onUpdateLink={handleUpdateItemLink}
                                isChild
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter className="mt-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTemplate.isPending || updateTemplate.isPending || saveItems.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {template ? 'Save Changes' : 'Create Tick Sheet'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface ItemRowProps {
  item: EditableItem;
  onUpdate: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onUpdateLink: (id: string, link: string | null) => void;
  isChild?: boolean;
}

function ItemRow({ item, onUpdate, onDelete, onUpdateLink, isChild }: ItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.label);
  
  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(item.id, editValue.trim());
    }
    setIsEditing(false);
  };
  
  return (
    <div className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 group ${isChild ? 'border-l-2 border-muted' : ''}`}>
      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
      
      {isChild && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
      
      {isEditing ? (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="h-7 text-sm flex-1"
          autoFocus
        />
      ) : (
        <span 
          className="flex-1 text-sm cursor-pointer hover:text-primary"
          onClick={() => setIsEditing(true)}
        >
          {item.label}
        </span>
      )}
      
      {item.linked_document_type && (
        <Badge variant="outline" className="text-xs">
          <LinkIcon className="h-3 w-3 mr-1" />
          {item.linked_document_type}
        </Badge>
      )}
      
      <Select 
        value={item.linked_document_type || ''} 
        onValueChange={(val) => onUpdateLink(item.id, val || null)}
      >
        <SelectTrigger className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
          <LinkIcon className="h-3 w-3" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">No link</SelectItem>
          {DOCUMENT_LINK_TYPES.map(type => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
