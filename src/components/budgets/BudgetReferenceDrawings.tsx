import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Upload, FileImage, Trash2, Download, Eye, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface BudgetReferenceDrawingsProps {
  budgetId: string;
  projectId: string;
}

interface ReferenceDrawing {
  id: string;
  budget_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  drawing_number: string | null;
  revision: string | null;
  created_at: string;
}

export const BudgetReferenceDrawings: React.FC<BudgetReferenceDrawingsProps> = ({
  budgetId,
  projectId,
}) => {
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [drawingNumber, setDrawingNumber] = useState('');
  const [revision, setRevision] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch reference drawings
  const { data: drawings, isLoading } = useQuery({
    queryKey: ['budget-reference-drawings', budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_reference_drawings')
        .select('*')
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReferenceDrawing[];
    },
    enabled: !!budgetId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (drawing: ReferenceDrawing) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('budget-drawings')
        .remove([drawing.file_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error } = await supabase
        .from('budget_reference_drawings')
        .delete()
        .eq('id', drawing.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Drawing deleted');
      queryClient.invalidateQueries({ queryKey: ['budget-reference-drawings', budgetId] });
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 50MB)`);
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...validFiles]);
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = selectedFiles.length;
      let completedFiles = 0;

      for (const file of selectedFiles) {
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const filePath = `${projectId}/${budgetId}/${timestamp}_${sanitizedName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('budget-drawings')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('budget-drawings')
          .getPublicUrl(filePath);

        // Insert record
        const { error: insertError } = await supabase
          .from('budget_reference_drawings')
          .insert({
            budget_id: budgetId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            drawing_number: drawingNumber || null,
            revision: revision || null,
            description: description || null,
          });

        if (insertError) throw insertError;

        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
      }

      toast.success(`${selectedFiles.length} drawing(s) uploaded successfully`);
      queryClient.invalidateQueries({ queryKey: ['budget-reference-drawings', budgetId] });
      handleCloseUpload();
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCloseUpload = () => {
    setIsUploadOpen(false);
    setSelectedFiles([]);
    setDrawingNumber('');
    setRevision('');
    setDescription('');
    setUploadProgress(0);
  };

  const handleDownload = (drawing: ReferenceDrawing) => {
    const { data: { publicUrl } } = supabase.storage
      .from('budget-drawings')
      .getPublicUrl(drawing.file_path);

    const link = document.createElement('a');
    link.href = publicUrl;
    link.download = drawing.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (drawing: ReferenceDrawing) => {
    const { data: { publicUrl } } = supabase.storage
      .from('budget-drawings')
      .getPublicUrl(drawing.file_path);
    setPreviewUrl(publicUrl);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = (drawing: ReferenceDrawing) => {
    if (window.confirm(`Delete "${drawing.file_name}"? This cannot be undone.`)) {
      deleteMutation.mutate(drawing);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Reference Drawings
              </CardTitle>
              <CardDescription>
                Drawings and documents this budget is based on
              </CardDescription>
            </div>
            <Button onClick={() => setIsUploadOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Drawings
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!drawings || drawings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <FileImage className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No reference drawings uploaded yet.</p>
              <p className="text-sm mt-1">
                Upload drawings to keep track of what this budget is based on.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setIsUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Drawings
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Drawing #</TableHead>
                  <TableHead>Revision</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drawings.map((drawing) => (
                  <TableRow key={drawing.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{drawing.file_name}</p>
                        {drawing.description && (
                          <p className="text-sm text-muted-foreground">{drawing.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{drawing.drawing_number || '—'}</TableCell>
                    <TableCell>{drawing.revision || '—'}</TableCell>
                    <TableCell>{formatFileSize(drawing.file_size)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(drawing.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(drawing)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(drawing)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(drawing)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={handleCloseUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Reference Drawings</DialogTitle>
            <DialogDescription>
              Add drawings or documents that this budget is based on.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="drawingNumber">Drawing Number (optional)</Label>
                <Input
                  id="drawingNumber"
                  value={drawingNumber}
                  onChange={(e) => setDrawingNumber(e.target.value)}
                  placeholder="e.g., E-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revision">Revision (optional)</Label>
                <Input
                  id="revision"
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                  placeholder="e.g., Rev A"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the drawing"
              />
            </div>

            <div className="space-y-2">
              <Label>Files</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click to select files or drag and drop
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG, DWG, DXF (max 50MB each)
                  </span>
                </label>
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({selectedFiles.length})</Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                    >
                      <span className="truncate flex-1">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseUpload} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Drawing Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex items-center justify-center overflow-auto max-h-[70vh]">
              {previewUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh]"
                  title="PDF Preview"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Drawing Preview"
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
