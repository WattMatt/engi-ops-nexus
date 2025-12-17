import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Sparkles, 
  Plus, 
  AlertTriangle, 
  CheckCircle2,
  Loader2,
  Crop,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SpecSheet, ExtractedLightingData, ConfidenceScores } from './types';
import { FITTING_TYPES, IP_RATINGS, IK_RATINGS, DRIVER_TYPES, COLOR_TEMPERATURES } from '../lightingTypes';
import { ImageAreaSelector } from './ImageAreaSelector';
import { PdfPageSelector } from './PdfPageSelector';

interface ExtractionReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specSheet: SpecSheet;
  projectId?: string | null;
}

interface FormData extends ExtractedLightingData {
  fitting_code?: string;
}

export const ExtractionReviewDialog: React.FC<ExtractionReviewDialogProps> = ({
  open,
  onOpenChange,
  specSheet,
  projectId,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>({} as FormData);
  const [duplicateWarning, setDuplicateWarning] = useState<any[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [extractedImage, setExtractedImage] = useState<Blob | null>(null);
  const [extractedImagePreview, setExtractedImagePreview] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // Load spec sheet URL for cropping
  useEffect(() => {
    if (open && specSheet) {
      loadFileUrl();
    }
  }, [open, specSheet]);

  const loadFileUrl = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('lighting-spec-sheets')
        .createSignedUrl(specSheet.file_path, 3600);
      if (error) throw error;
      setFileUrl(data.signedUrl);
    } catch (error) {
      console.error('Error loading file URL:', error);
    }
  };

  // Check for duplicates
  const { data: existingFittings = [] } = useQuery({
    queryKey: ['lighting-fittings-for-duplicate-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lighting_fittings')
        .select('id, fitting_code, manufacturer, model_name, wattage, lumen_output');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (open && specSheet.extracted_data) {
      const extracted = specSheet.extracted_data as unknown as ExtractedLightingData;
      setFormData({
        ...extracted,
        fitting_code: generateFittingCode(extracted),
      });
      setExtractedImage(null);
      setExtractedImagePreview(null);
      setCropMode(false);
    }
  }, [open, specSheet]);

  const generateFittingCode = (data: ExtractedLightingData): string => {
    const prefix = data.manufacturer?.substring(0, 3).toUpperCase() || 'LGT';
    const model = data.model_name?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase() || '';
    return `${prefix}-${model}-${Date.now().toString(36).toUpperCase()}`;
  };

  const getConfidenceColor = (score: number | undefined) => {
    if (score === undefined) return 'text-muted-foreground';
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceBadge = (score: number | undefined) => {
    if (score === undefined) return null;
    const percentage = Math.round(score * 100);
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "ml-2 text-xs",
          score >= 0.8 && "bg-green-500/10 text-green-500 border-green-500/30",
          score >= 0.5 && score < 0.8 && "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
          score < 0.5 && "bg-red-500/10 text-red-500 border-red-500/30"
        )}
      >
        {percentage}%
      </Badge>
    );
  };

  const confidenceScores = specSheet.confidence_scores as unknown as ConfidenceScores | null;

  // Check for duplicates when form fields change - using stable references
  const manufacturer = formData.manufacturer;
  const modelName = formData.model_name;
  const wattage = formData.wattage;
  const lumenOutput = formData.lumen_output;
  
  useEffect(() => {
    if (!open) return; // Only run when dialog is open
    
    if (manufacturer || modelName) {
      const duplicates = existingFittings.filter(f => {
        const sameManufacturer = f.manufacturer?.toLowerCase() === manufacturer?.toLowerCase();
        const sameModel = f.model_name?.toLowerCase() === modelName?.toLowerCase();
        
        // Check if wattage/lumens are within 5%
        const wattageClose = wattage && f.wattage 
          ? Math.abs(f.wattage - wattage) / wattage < 0.05
          : false;
        const lumensClose = lumenOutput && f.lumen_output
          ? Math.abs(f.lumen_output - lumenOutput) / lumenOutput < 0.05
          : false;

        return (sameManufacturer && sameModel) || (wattageClose && lumensClose);
      });
      setDuplicateWarning(duplicates);
    } else {
      setDuplicateWarning([]);
    }
  }, [open, manufacturer, modelName, wattage, lumenOutput, existingFittings]);

  // Add to library mutation
  const addToLibraryMutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string | null = null;

      // Upload extracted image if present
      if (extractedImage) {
        const fileName = `fitting-images/${Date.now()}-${formData.fitting_code || 'fitting'}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('lighting-spec-sheets')
          .upload(fileName, extractedImage, {
            contentType: 'image/png',
            upsert: false,
          });

        if (uploadError) {
          console.error('Image upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('lighting-spec-sheets')
            .getPublicUrl(uploadData.path);
          imageUrl = urlData.publicUrl;
        }
      }

      const fittingData = {
        fitting_code: formData.fitting_code,
        manufacturer: formData.manufacturer,
        model_name: formData.model_name,
        fitting_type: 'downlight', // Default, can be updated
        wattage: formData.wattage ? Math.round(formData.wattage) : null,
        lumen_output: formData.lumen_output ? Math.round(formData.lumen_output) : null,
        wattage_variants: (formData.wattage_variants || []) as unknown as Record<string, unknown>[],
        color_temperature: formData.color_temperature ? Math.round(formData.color_temperature) : null,
        cri: formData.cri ? Math.round(formData.cri) : null,
        beam_angle: formData.beam_angle ? Math.round(formData.beam_angle) : null,
        ip_rating: formData.ip_rating,
        ik_rating: formData.ik_rating,
        dimmable: formData.dimmable,
        driver_type: formData.driver_type,
        lifespan_hours: formData.lifespan_hours ? Math.round(formData.lifespan_hours) : null,
        project_id: projectId,
        image_url: imageUrl,
      };

      const { data, error } = await supabase
        .from('lighting_fittings')
        .insert(fittingData as any)
        .select()
        .single();

      if (error) throw error;

      // Link spec sheet to fitting
      await supabase
        .from('lighting_spec_sheets')
        .update({ fitting_id: data.id })
        .eq('id', specSheet.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lighting-fittings'] });
      queryClient.invalidateQueries({ queryKey: ['lighting-spec-sheets'] });
      toast.success('Fitting added to library');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to add fitting');
      console.error(error);
    },
  });

  const handleImageCrop = (blob: Blob) => {
    setExtractedImage(blob);
    setExtractedImagePreview(URL.createObjectURL(blob));
    setCropMode(false);
    toast.success('Image extracted');
  };

  const clearExtractedImage = () => {
    if (extractedImagePreview) {
      URL.revokeObjectURL(extractedImagePreview);
    }
    setExtractedImage(null);
    setExtractedImagePreview(null);
  };

  const handleAddToLibrary = () => {
    if (duplicateWarning.length > 0) {
      setShowDuplicateDialog(true);
    } else {
      addToLibraryMutation.mutate();
    }
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isImage = specSheet.file_type?.startsWith('image/');
  const isPdf = specSheet.file_type === 'application/pdf';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn(
          "flex flex-col",
          cropMode ? "max-w-5xl h-[85vh]" : "max-w-2xl max-h-[90vh]"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {cropMode ? 'Extract Fitting Image' : 'Review Extracted Data'}
            </DialogTitle>
          </DialogHeader>

          {cropMode && fileUrl ? (
            // Crop mode view
            isPdf ? (
              <PdfPageSelector
                pdfUrl={fileUrl}
                onCrop={handleImageCrop}
                onCancel={() => setCropMode(false)}
              />
            ) : isImage ? (
              <ImageAreaSelector
                imageUrl={fileUrl}
                onCrop={handleImageCrop}
                onCancel={() => setCropMode(false)}
              />
            ) : null
          ) : (
            <>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6 py-4">
                  {/* Image Extraction Section */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Fitting Image</h4>
                    <div className="flex items-start gap-4">
                      {extractedImagePreview ? (
                        <div className="relative">
                          <img 
                            src={extractedImagePreview} 
                            alt="Extracted fitting" 
                            className="w-24 h-24 object-contain border rounded bg-background"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={clearExtractedImage}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center bg-muted/30">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCropMode(true)}
                          disabled={!fileUrl || (!isImage && !isPdf)}
                        >
                          <Crop className="h-4 w-4 mr-2" />
                          {extractedImagePreview ? 'Re-extract Image' : 'Extract from Spec Sheet'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Select an area from the spec sheet to use as the fitting thumbnail
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fitting Code */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fitting Code</Label>
                      <Input
                        value={formData.fitting_code || ''}
                        onChange={(e) => updateField('fitting_code', e.target.value)}
                        placeholder="Auto-generated"
                      />
                    </div>
                  </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Basic Information</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center">
                      Manufacturer
                      {getConfidenceBadge(confidenceScores?.manufacturer)}
                    </Label>
                    <Input
                      value={formData.manufacturer || ''}
                      onChange={(e) => updateField('manufacturer', e.target.value)}
                      className={cn(getConfidenceColor(confidenceScores?.manufacturer))}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center">
                      Model Name
                      {getConfidenceBadge(confidenceScores?.model_name)}
                    </Label>
                    <Input
                      value={formData.model_name || ''}
                      onChange={(e) => updateField('model_name', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Electrical */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Electrical Specifications</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="flex items-center">
                      Wattage (W)
                      {getConfidenceBadge(confidenceScores?.wattage)}
                    </Label>
                    <Input
                      type="number"
                      value={formData.wattage || ''}
                      onChange={(e) => updateField('wattage', parseFloat(e.target.value) || null)}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center">
                      Lumen Output (lm)
                      {getConfidenceBadge(confidenceScores?.lumen_output)}
                    </Label>
                    <Input
                      type="number"
                      value={formData.lumen_output || ''}
                      onChange={(e) => updateField('lumen_output', parseFloat(e.target.value) || null)}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center">
                      Color Temp (K)
                      {getConfidenceBadge(confidenceScores?.color_temperature)}
                    </Label>
                    <Select
                      value={formData.color_temperature?.toString() || ''}
                      onValueChange={(v) => updateField('color_temperature', parseInt(v) || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_TEMPERATURES.map(ct => (
                          <SelectItem key={ct.value} value={ct.value.toString()}>
                            {ct.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="flex items-center">
                      CRI
                      {getConfidenceBadge(confidenceScores?.cri)}
                    </Label>
                    <Input
                      type="number"
                      value={formData.cri || ''}
                      onChange={(e) => updateField('cri', parseFloat(e.target.value) || null)}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center">
                      Beam Angle (°)
                      {getConfidenceBadge(confidenceScores?.beam_angle)}
                    </Label>
                    <Input
                      type="number"
                      value={formData.beam_angle || ''}
                      onChange={(e) => updateField('beam_angle', parseFloat(e.target.value) || null)}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center">
                      Lifespan (hrs)
                      {getConfidenceBadge(confidenceScores?.lifespan_hours)}
                    </Label>
                    <Input
                      type="number"
                      value={formData.lifespan_hours || ''}
                      onChange={(e) => updateField('lifespan_hours', parseFloat(e.target.value) || null)}
                    />
                  </div>
                </div>
              </div>

              {/* Ratings */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Protection Ratings</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="flex items-center">
                      IP Rating
                      {getConfidenceBadge(confidenceScores?.ip_rating)}
                    </Label>
                    <Select
                      value={formData.ip_rating || ''}
                      onValueChange={(v) => updateField('ip_rating', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {IP_RATINGS.map(rating => (
                          <SelectItem key={rating} value={rating}>
                            {rating}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="flex items-center">
                      IK Rating
                      {getConfidenceBadge(confidenceScores?.ik_rating)}
                    </Label>
                    <Select
                      value={formData.ik_rating || ''}
                      onValueChange={(v) => updateField('ik_rating', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {IK_RATINGS.map(rating => (
                          <SelectItem key={rating} value={rating}>
                            {rating}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="flex items-center">
                      Driver Type
                      {getConfidenceBadge(confidenceScores?.driver_type)}
                    </Label>
                    <Select
                      value={formData.driver_type || ''}
                      onValueChange={(v) => updateField('driver_type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {DRIVER_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Label className="flex items-center gap-2">
                    Dimmable
                    {getConfidenceBadge(confidenceScores?.dimmable)}
                  </Label>
                  <Switch
                    checked={formData.dimmable || false}
                    onCheckedChange={(checked) => updateField('dimmable', checked)}
                  />
                </div>
              </div>

              {/* Duplicate Warning */}
              {duplicateWarning.length > 0 && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-2 text-yellow-500 mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Potential Duplicates Found</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Similar fittings exist in the library:
                  </p>
                  <ul className="text-sm space-y-1">
                    {duplicateWarning.slice(0, 3).map(f => (
                      <li key={f.id} className="flex items-center gap-2">
                        <span>{f.fitting_code}</span>
                        <span className="text-muted-foreground">
                          {f.manufacturer} {f.model_name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddToLibrary}
              disabled={addToLibraryMutation.isPending}
            >
              {addToLibraryMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add to Library
            </Button>
          </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicate Confirmation Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Warning</AlertDialogTitle>
            <AlertDialogDescription>
              Similar fittings already exist in the library. Do you want to create a new entry anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowDuplicateDialog(false);
              addToLibraryMutation.mutate();
            }}>
              Create Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
