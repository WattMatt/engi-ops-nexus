import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Eye, 
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SpecSheet, UploadingFile } from './types';
import { SpecSheetViewer } from './SpecSheetViewer';
import { ExtractionReviewDialog } from './ExtractionReviewDialog';

interface SpecSheetUploadTabProps {
  projectId?: string | null;
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const SpecSheetUploadTab: React.FC<SpecSheetUploadTabProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSheet, setSelectedSheet] = useState<SpecSheet | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isReExtracting, setIsReExtracting] = useState(false);
  const [reExtractProgress, setReExtractProgress] = useState({ current: 0, total: 0 });

  // Fetch existing spec sheets
  const { data: specSheets = [], isLoading } = useQuery({
    queryKey: ['lighting-spec-sheets', projectId],
    queryFn: async () => {
      let query = supabase
        .from('lighting_spec_sheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.or(`project_id.is.null,project_id.eq.${projectId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SpecSheet[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (sheet: SpecSheet) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('lighting-spec-sheets')
        .remove([sheet.file_path]);
      
      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error } = await supabase
        .from('lighting_spec_sheets')
        .delete()
        .eq('id', sheet.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lighting-spec-sheets'] });
      toast.success('Spec sheet deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete spec sheet');
      console.error(error);
    },
  });

  // Handle file upload
  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = projectId ? `${projectId}/${fileName}` : `general/${fileName}`;

    const { error } = await supabase.storage
      .from('lighting-spec-sheets')
      .upload(filePath, file);

    if (error) throw error;
    return filePath;
  };

  // Handle AI extraction
  const extractData = async (filePath: string, fileType: string): Promise<{ extracted_data: any; confidence_scores: any }> => {
    // Get signed URL for the file
    const { data: urlData, error: urlError } = await supabase.storage
      .from('lighting-spec-sheets')
      .createSignedUrl(filePath, 3600);

    if (urlError || !urlData) {
      throw new Error('Failed to get file URL');
    }

    // For PDFs and images, we can process them
    if (fileType.startsWith('image/') || fileType === 'application/pdf') {
      // For images, convert to base64
      if (fileType.startsWith('image/')) {
        const response = await fetch(urlData.signedUrl);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(blob);
        });

        const { data, error } = await supabase.functions.invoke('extract-lighting-specs', {
          body: { imageBase64: base64, mimeType: fileType },
        });

        if (error) throw error;
        return data;
      } else {
        // For PDFs, we'll pass the URL
        const { data, error } = await supabase.functions.invoke('extract-lighting-specs', {
          body: { imageUrl: urlData.signedUrl, mimeType: fileType },
        });

        if (error) throw error;
        return data;
      }
    }

    return { extracted_data: null, confidence_scores: null };
  };

  // Process uploaded files
  const processFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = Object.keys(ACCEPTED_TYPES).includes(file.type);
      const isValidSize = file.size <= MAX_FILE_SIZE;
      
      if (!isValidType) {
        toast.error(`${file.name}: Unsupported file type`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Create uploading entries
    const newUploads: UploadingFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    // Process each file
    for (const upload of newUploads) {
      try {
        // Upload to storage
        setUploadingFiles(prev => 
          prev.map(u => u.id === upload.id ? { ...u, progress: 30 } : u)
        );

        const filePath = await uploadFile(upload.file);

        setUploadingFiles(prev => 
          prev.map(u => u.id === upload.id ? { ...u, progress: 50, status: 'processing' } : u)
        );

        // Create database entry
        const { data: specSheet, error: dbError } = await supabase
          .from('lighting_spec_sheets')
          .insert({
            file_name: upload.file.name,
            file_path: filePath,
            file_type: upload.file.type,
            file_size: upload.file.size,
            project_id: projectId,
            extraction_status: 'processing',
          })
          .select()
          .single();

        if (dbError) throw dbError;

        setUploadingFiles(prev => 
          prev.map(u => u.id === upload.id ? { ...u, progress: 70, specSheetId: specSheet.id } : u)
        );

        // Trigger AI extraction for images and PDFs
        if (upload.file.type.startsWith('image/') || upload.file.type === 'application/pdf') {
          try {
            const extractionResult = await extractData(filePath, upload.file.type);
            
            // Update with extraction results
            await supabase
              .from('lighting_spec_sheets')
              .update({
                extraction_status: 'completed',
                extracted_data: extractionResult.extracted_data,
                confidence_scores: extractionResult.confidence_scores,
              })
              .eq('id', specSheet.id);

          } catch (extractError) {
            console.error('Extraction error:', extractError);
            await supabase
              .from('lighting_spec_sheets')
              .update({
                extraction_status: 'failed',
                extraction_error: extractError instanceof Error ? extractError.message : 'Extraction failed',
              })
              .eq('id', specSheet.id);
          }
        } else {
          // For non-supported files (like DOCX), mark as pending
          await supabase
            .from('lighting_spec_sheets')
            .update({ extraction_status: 'pending' })
            .eq('id', specSheet.id);
        }

        setUploadingFiles(prev => 
          prev.map(u => u.id === upload.id ? { ...u, progress: 100, status: 'completed' } : u)
        );

        // Refresh list
        queryClient.invalidateQueries({ queryKey: ['lighting-spec-sheets'] });

      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prev => 
          prev.map(u => u.id === upload.id ? { 
            ...u, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Upload failed' 
          } : u)
        );
      }
    }

    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(u => u.status !== 'completed'));
    }, 3000);
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [projectId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  // Re-extract data for a spec sheet
  const handleReExtract = async (sheet: SpecSheet) => {
    try {
      toast.info('Re-extracting data...');
      
      await supabase
        .from('lighting_spec_sheets')
        .update({ extraction_status: 'processing' })
        .eq('id', sheet.id);

      queryClient.invalidateQueries({ queryKey: ['lighting-spec-sheets'] });

      const result = await extractData(sheet.file_path, sheet.file_type);
      
      await supabase
        .from('lighting_spec_sheets')
        .update({
          extraction_status: 'completed',
          extracted_data: result.extracted_data,
          confidence_scores: result.confidence_scores,
          extraction_error: null,
        })
        .eq('id', sheet.id);

      queryClient.invalidateQueries({ queryKey: ['lighting-spec-sheets'] });
      toast.success('Extraction completed');
    } catch (error) {
      toast.error('Re-extraction failed');
      console.error(error);
    }
  };

  // Bulk re-extract fitting types from all spec sheets with linked fittings
  const handleBulkReExtract = async () => {
    const sheetsWithFittings = specSheets.filter(s => 
      s.fitting_id && 
      s.extraction_status === 'completed' &&
      (s.file_type.startsWith('image/') || s.file_type === 'application/pdf')
    );
    
    if (sheetsWithFittings.length === 0) {
      toast.error('No spec sheets with linked fittings found');
      return;
    }

    setIsReExtracting(true);
    setReExtractProgress({ current: 0, total: sheetsWithFittings.length });

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < sheetsWithFittings.length; i++) {
      const sheet = sheetsWithFittings[i];
      setReExtractProgress({ current: i + 1, total: sheetsWithFittings.length });

      try {
        const result = await extractData(sheet.file_path, sheet.file_type);

        if (result?.extracted_data && sheet.fitting_id) {
          const updateData: Record<string, unknown> = {};
          
          // Always update fitting_type if extracted
          if (result.extracted_data.fitting_type) {
            updateData.fitting_type = result.extracted_data.fitting_type;
          }
          
          // Update wattage if extracted and fitting doesn't have one
          if (result.extracted_data.wattage) {
            updateData.wattage = result.extracted_data.wattage;
          }
          
          // Update lumen_output if extracted and fitting doesn't have one  
          if (result.extracted_data.lumen_output) {
            updateData.lumen_output = result.extracted_data.lumen_output;
          }
          
          // Save wattage_variants if any were extracted
          if (result.extracted_data.wattage_variants && result.extracted_data.wattage_variants.length > 0) {
            updateData.wattage_variants = result.extracted_data.wattage_variants;
          }

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('lighting_fittings')
              .update(updateData)
              .eq('id', sheet.fitting_id);

            if (updateError) throw updateError;
            
            // Also update the spec sheet's extracted_data
            await supabase
              .from('lighting_spec_sheets')
              .update({ 
                extracted_data: result.extracted_data,
                confidence_scores: result.confidence_scores
              })
              .eq('id', sheet.id);
            
            updated++;
          }
        }
      } catch (err) {
        console.error(`Failed to re-extract ${sheet.file_name}:`, err);
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsReExtracting(false);
    queryClient.invalidateQueries({ queryKey: ['lighting-fittings'] });
    
    if (updated > 0) {
      toast.success(`Updated ${updated} fitting type(s)`, {
        description: failed > 0 ? `${failed} failed` : undefined,
      });
    } else if (failed > 0) {
      toast.error(`Failed to update fittings`, { description: `${failed} failed` });
    }
  };

  // Filter spec sheets
  const filteredSheets = specSheets.filter(sheet =>
    sheet.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sheetsWithFittings = specSheets.filter(s => 
    s.fitting_id && 
    s.extraction_status === 'completed' &&
    (s.file_type.startsWith('image/') || s.file_type === 'application/pdf')
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />Extracted</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Spec Sheets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              onChange={handleFileSelect}
              className="hidden"
              id="spec-sheet-upload"
            />
            <label htmlFor="spec-sheet-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-muted rounded-full">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Drop files here or click to upload</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports PDF, JPG, PNG, DOCX (max 10MB)
                  </p>
                </div>
                <Button variant="secondary" size="sm">
                  Select Files
                </Button>
              </div>
            </label>
          </div>

          {/* Upload Progress */}
          {uploadingFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadingFiles.map(upload => (
                <div key={upload.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  {getFileIcon(upload.file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{upload.file.name}</p>
                    <Progress value={upload.progress} className="h-1 mt-1" />
                  </div>
                  <Badge variant="outline" className={cn(
                    upload.status === 'completed' && "bg-green-500/20 text-green-400",
                    upload.status === 'error' && "bg-red-500/20 text-red-400",
                    upload.status === 'processing' && "bg-blue-500/20 text-blue-400"
                  )}>
                    {upload.status === 'uploading' && 'Uploading'}
                    {upload.status === 'processing' && 'Extracting'}
                    {upload.status === 'completed' && 'Done'}
                    {upload.status === 'error' && 'Error'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Re-Extract Progress */}
      {isReExtracting && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Re-extracting fitting types...</p>
                <Progress 
                  value={(reExtractProgress.current / reExtractProgress.total) * 100} 
                  className="h-2 mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {reExtractProgress.current} of {reExtractProgress.total} spec sheets
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spec Sheets List */}
      <Card className="flex flex-col max-h-[600px]">
        <CardHeader className="flex-shrink-0 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <CardTitle>Uploaded Spec Sheets</CardTitle>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkReExtract}
                disabled={isReExtracting || sheetsWithFittings.length === 0}
                title={sheetsWithFittings.length === 0 ? 'No spec sheets with linked fittings' : `Re-extract types for ${sheetsWithFittings.length} fittings`}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", isReExtracting && "animate-spin")} />
                Re-Extract Types ({sheetsWithFittings.length})
              </Button>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSheets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No spec sheets uploaded yet</p>
              <p className="text-sm">Upload files to extract lighting specifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSheets.map(sheet => (
                <div
                  key={sheet.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 rounded-md bg-muted">
                    {getFileIcon(sheet.file_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{sheet.file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(sheet.file_size || 0 / 1024).toFixed(1)} KB • 
                      {new Date(sheet.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {getStatusBadge(sheet.extraction_status)}

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedSheet(sheet);
                        setViewerOpen(true);
                      }}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {sheet.extraction_status === 'completed' && !sheet.fitting_id && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedSheet(sheet);
                          setReviewOpen(true);
                        }}
                        className="gap-1"
                      >
                        <Sparkles className="h-4 w-4" />
                        Add to Library
                      </Button>
                    )}
                    
                    {sheet.extraction_status === 'completed' && sheet.fitting_id && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        In Library
                      </Badge>
                    )}

                    {(sheet.extraction_status === 'failed' || sheet.extraction_status === 'pending' || sheet.extraction_status === 'processing') && 
                     (sheet.file_type.startsWith('image/') || sheet.file_type === 'application/pdf') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReExtract(sheet)}
                        title={sheet.extraction_status === 'processing' ? 'Retry extraction' : 'Extract Data'}
                        className="gap-1"
                      >
                        <Sparkles className="h-4 w-4 text-primary" />
                        {sheet.extraction_status === 'processing' ? 'Retry' : 'Extract'}
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(sheet)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Viewer Dialog */}
      {selectedSheet && (
        <SpecSheetViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          specSheet={selectedSheet}
          onImageExtracted={async (blob, specSheetId) => {
            try {
              // Upload the extracted image
              const fileName = `fitting-images/${Date.now()}-extracted.png`;
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('lighting-spec-sheets')
                .upload(fileName, blob, {
                  contentType: 'image/png',
                  upsert: false,
                });

              if (uploadError) throw uploadError;

              const { data: urlData } = supabase.storage
                .from('lighting-spec-sheets')
                .getPublicUrl(uploadData.path);

              // Check if spec sheet has a linked fitting
              const sheet = specSheets.find(s => s.id === specSheetId);
              if (sheet?.fitting_id) {
                // Update the fitting's image_url
                const { error: updateError } = await supabase
                  .from('lighting_fittings')
                  .update({ image_url: urlData.publicUrl })
                  .eq('id', sheet.fitting_id);

                if (updateError) throw updateError;
                
                queryClient.invalidateQueries({ queryKey: ['lighting-fittings'] });
                toast.success('Fitting image updated');
              } else {
                toast.success('Image extracted - link spec sheet to a fitting to use it');
              }
            } catch (error) {
              console.error('Error saving extracted image:', error);
              toast.error('Failed to save extracted image');
            }
          }}
        />
      )}

      {/* Review Dialog */}
      {selectedSheet && (
        <ExtractionReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          specSheet={selectedSheet}
          projectId={projectId}
        />
      )}
    </div>
  );
};
