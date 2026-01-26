/**
 * Edit Drawing Dialog
 * Form for editing an existing drawing
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUpdateDrawing, useDrawingCategories } from '@/hooks/useProjectDrawings';
import { ProjectDrawing, DRAWING_STATUS_OPTIONS } from '@/types/drawings';

const formSchema = z.object({
  drawing_number: z.string().min(1, 'Drawing number is required'),
  drawing_title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  shop_number: z.string().optional(),
  current_revision: z.string().default('A'),
  revision_notes: z.string().optional(),
  status: z.string().default('draft'),
  notes: z.string().optional(),
  visible_to_client: z.boolean().default(false),
  visible_to_contractor: z.boolean().default(true),
  included_in_handover: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface EditDrawingDialogProps {
  drawing: ProjectDrawing | null;
  onClose: () => void;
  projectId: string;
}

export function EditDrawingDialog({
  drawing,
  onClose,
  projectId,
}: EditDrawingDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const { data: categories = [] } = useDrawingCategories();
  const updateDrawing = useUpdateDrawing();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drawing_number: '',
      drawing_title: '',
      category: '',
      subcategory: '',
      shop_number: '',
      current_revision: 'A',
      revision_notes: '',
      status: 'draft',
      notes: '',
      visible_to_client: false,
      visible_to_contractor: true,
      included_in_handover: false,
    },
  });
  
  // Populate form when drawing changes
  useEffect(() => {
    if (drawing) {
      form.reset({
        drawing_number: drawing.drawing_number,
        drawing_title: drawing.drawing_title,
        category: drawing.category,
        subcategory: drawing.subcategory || '',
        shop_number: drawing.shop_number || '',
        current_revision: drawing.current_revision,
        revision_notes: drawing.revision_notes || '',
        status: drawing.status,
        notes: drawing.notes || '',
        visible_to_client: drawing.visible_to_client,
        visible_to_contractor: drawing.visible_to_contractor,
        included_in_handover: drawing.included_in_handover,
      });
    }
  }, [drawing, form]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };
  
  const onSubmit = async (data: FormData) => {
    if (!drawing) return;
    
    await updateDrawing.mutateAsync({
      drawingId: drawing.id,
      projectId,
      data: {
        drawing_number: data.drawing_number,
        drawing_title: data.drawing_title,
        category: data.category,
        subcategory: data.subcategory,
        shop_number: data.shop_number,
        current_revision: data.current_revision,
        revision_notes: data.revision_notes,
        status: data.status as 'draft' | 'issued_for_construction' | 'as_built' | 'superseded',
        notes: data.notes,
        visible_to_client: data.visible_to_client,
        visible_to_contractor: data.visible_to_contractor,
      },
      file: file || undefined,
    });
    
    setFile(null);
    onClose();
  };
  
  return (
    <Dialog open={!!drawing} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Drawing</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Drawing Number */}
          <div className="space-y-2">
            <Label htmlFor="edit_drawing_number">Drawing Number *</Label>
            <Input
              id="edit_drawing_number"
              {...form.register('drawing_number')}
            />
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit_drawing_title">Title *</Label>
            <Input
              id="edit_drawing_title"
              {...form.register('drawing_title')}
            />
          </div>
          
          {/* Category and Revision */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(value) => form.setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.code} value={cat.code}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_current_revision">Revision</Label>
              <Input
                id="edit_current_revision"
                {...form.register('current_revision')}
              />
            </div>
          </div>
          
          {/* Status and Shop Number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAWING_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_shop_number">Shop Number</Label>
              <Input
                id="edit_shop_number"
                {...form.register('shop_number')}
              />
            </div>
          </div>
          
          {/* Revision Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit_revision_notes">Revision Notes</Label>
            <Input
              id="edit_revision_notes"
              placeholder="Brief description of changes..."
              {...form.register('revision_notes')}
            />
          </div>
          
          {/* Current File */}
          {drawing?.file_url && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Current File</p>
              <a 
                href={drawing.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                {drawing.file_name || 'View File'}
              </a>
            </div>
          )}
          
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload New Revision</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload new file
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.dwg,.dxf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit_notes">Notes</Label>
            <Textarea
              id="edit_notes"
              {...form.register('notes')}
              rows={2}
            />
          </div>
          
          {/* Visibility Toggles */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit_visible_to_client">Visible to Client Portal</Label>
              <Switch
                id="edit_visible_to_client"
                checked={form.watch('visible_to_client')}
                onCheckedChange={(checked) => form.setValue('visible_to_client', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit_visible_to_contractor">Visible to Contractor Portal</Label>
              <Switch
                id="edit_visible_to_contractor"
                checked={form.watch('visible_to_contractor')}
                onCheckedChange={(checked) => form.setValue('visible_to_contractor', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit_included_in_handover">Include in Handover</Label>
              <Switch
                id="edit_included_in_handover"
                checked={form.watch('included_in_handover')}
                onCheckedChange={(checked) => form.setValue('included_in_handover', checked)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateDrawing.isPending}>
              {updateDrawing.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
