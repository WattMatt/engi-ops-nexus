/**
 * Add Drawing Dialog
 * Form for adding a new drawing to the register
 */

import { useState } from 'react';
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
import { useCreateDrawing } from '@/hooks/useProjectDrawings';
import { DrawingCategory, detectDrawingCategory, DRAWING_STATUS_OPTIONS } from '@/types/drawings';

const formSchema = z.object({
  drawing_number: z.string().min(1, 'Drawing number is required'),
  drawing_title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  shop_number: z.string().optional(),
  current_revision: z.string().default('A'),
  status: z.string().default('draft'),
  notes: z.string().optional(),
  visible_to_client: z.boolean().default(false),
  visible_to_contractor: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface AddDrawingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  categories: DrawingCategory[];
}

export function AddDrawingDialog({
  open,
  onOpenChange,
  projectId,
  categories,
}: AddDrawingDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const createDrawing = useCreateDrawing();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drawing_number: '',
      drawing_title: '',
      category: '',
      subcategory: '',
      shop_number: '',
      current_revision: 'A',
      status: 'draft',
      notes: '',
      visible_to_client: false,
      visible_to_contractor: true,
    },
  });
  
  const handleDrawingNumberChange = (value: string) => {
    form.setValue('drawing_number', value);
    
    // Auto-detect category
    const category = detectDrawingCategory(value);
    if (category !== 'other') {
      form.setValue('category', category);
    }
    
    // Extract shop number for tenant drawings
    const match = value.match(/\/4(\d+)/);
    if (match) {
      form.setValue('shop_number', match[1]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };
  
  const onSubmit = async (data: FormData) => {
    await createDrawing.mutateAsync({
      projectId,
      data: {
        drawing_number: data.drawing_number,
        drawing_title: data.drawing_title,
        category: data.category,
        subcategory: data.subcategory,
        shop_number: data.shop_number,
        current_revision: data.current_revision,
        status: data.status as 'draft' | 'issued_for_construction' | 'as_built' | 'superseded',
        notes: data.notes,
        visible_to_client: data.visible_to_client,
        visible_to_contractor: data.visible_to_contractor,
      },
      file: file || undefined,
    });
    
    form.reset();
    setFile(null);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Drawing</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Drawing Number */}
          <div className="space-y-2">
            <Label htmlFor="drawing_number">Drawing Number *</Label>
            <Input
              id="drawing_number"
              placeholder="e.g., 636/E/001"
              {...form.register('drawing_number')}
              onChange={(e) => handleDrawingNumberChange(e.target.value)}
            />
            {form.formState.errors.drawing_number && (
              <p className="text-sm text-destructive">
                {form.formState.errors.drawing_number.message}
              </p>
            )}
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="drawing_title">Title *</Label>
            <Input
              id="drawing_title"
              placeholder="e.g., SITE PLAN ELECTRICAL INSTALLATION"
              {...form.register('drawing_title')}
            />
            {form.formState.errors.drawing_title && (
              <p className="text-sm text-destructive">
                {form.formState.errors.drawing_title.message}
              </p>
            )}
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
              <Label htmlFor="current_revision">Revision</Label>
              <Input
                id="current_revision"
                placeholder="A"
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
              <Label htmlFor="shop_number">Shop Number</Label>
              <Input
                id="shop_number"
                placeholder="e.g., 07"
                {...form.register('shop_number')}
              />
            </div>
          </div>
          
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Drawing File (PDF)</Label>
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
                    Click to upload or drag and drop
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes..."
              {...form.register('notes')}
              rows={2}
            />
          </div>
          
          {/* Visibility Toggles */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="visible_to_client">Visible to Client Portal</Label>
              <Switch
                id="visible_to_client"
                checked={form.watch('visible_to_client')}
                onCheckedChange={(checked) => form.setValue('visible_to_client', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="visible_to_contractor">Visible to Contractor Portal</Label>
              <Switch
                id="visible_to_contractor"
                checked={form.watch('visible_to_contractor')}
                onCheckedChange={(checked) => form.setValue('visible_to_contractor', checked)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDrawing.isPending}>
              {createDrawing.isPending ? 'Adding...' : 'Add Drawing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
