/**
 * Hook for uploading drawing files to Supabase storage
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadResult {
  fileUrl: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

interface UploadOptions {
  drawingId: string;
  projectId: string;
  onSuccess?: (result: UploadResult) => void;
}

export function useDrawingFileUpload() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, options }: { file: File; options: UploadOptions }) => {
      const { drawingId, projectId } = options;
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('File type not supported. Please upload a PDF or image file.');
      }

      // Create unique file path
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${projectId}/${drawingId}/${timestamp}_${sanitizedName}`;

      setUploadProgress(10);

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-drawings')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      setUploadProgress(70);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-drawings')
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;

      // Update the drawing record
      const { error: updateError } = await supabase
        .from('project_drawings')
        .update({
          file_url: fileUrl,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          updated_at: new Date().toISOString(),
        })
        .eq('id', drawingId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to update drawing record: ${updateError.message}`);
      }

      setUploadProgress(100);

      return {
        fileUrl,
        filePath,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      };
    },
    onSuccess: (result, variables) => {
      toast.success('Drawing file uploaded successfully');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['project-drawings'] });
      
      // Call custom success handler
      variables.options.onSuccess?.(result);
      
      // Reset progress after a delay
      setTimeout(() => setUploadProgress(0), 500);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload file');
      setUploadProgress(0);
    },
  });

  const uploadFile = (file: File, options: UploadOptions) => {
    return uploadMutation.mutateAsync({ file, options });
  };

  const deleteFile = async (drawingId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('project-drawings')
        .remove([filePath]);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw new Error(`Failed to delete file: ${deleteError.message}`);
      }

      // Clear file fields in drawing record
      const { error: updateError } = await supabase
        .from('project_drawings')
        .update({
          file_url: null,
          file_path: null,
          file_name: null,
          file_size: null,
          file_type: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', drawingId);

      if (updateError) {
        throw new Error(`Failed to update drawing record: ${updateError.message}`);
      }

      toast.success('File removed successfully');
      queryClient.invalidateQueries({ queryKey: ['project-drawings'] });
      
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove file');
      return false;
    }
  };

  return {
    uploadFile,
    deleteFile,
    isUploading: uploadMutation.isPending,
    uploadProgress,
  };
}
