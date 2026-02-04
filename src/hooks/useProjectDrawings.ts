/**
 * Hook for managing project drawings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  ProjectDrawing, 
  DrawingCategory, 
  DrawingRevision,
  DrawingFormData,
  DrawingFilters,
  DrawingStats,
  DrawingStatus
} from '@/types/drawings';

// ============================================================================
// FETCH DRAWING CATEGORIES
// ============================================================================

export function useDrawingCategories() {
  return useQuery({
    queryKey: ['drawing-categories'],
    queryFn: async (): Promise<DrawingCategory[]> => {
      const { data, error } = await supabase
        .from('drawing_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as DrawingCategory[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

// ============================================================================
// FETCH PROJECT DRAWINGS
// ============================================================================

export function useProjectDrawings(projectId: string | undefined, filters?: DrawingFilters) {
  return useQuery({
    queryKey: ['project-drawings', projectId, filters],
    queryFn: async (): Promise<ProjectDrawing[]> => {
      if (!projectId) return [];
      
      let query = supabase
        .from('project_drawings')
        .select(`*`)
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('drawing_number', { ascending: true });
      
      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.tenant_id) {
        query = query.eq('tenant_id', filters.tenant_id);
      }
      if (filters?.visible_to_client !== undefined) {
        query = query.eq('visible_to_client', filters.visible_to_client);
      }
      if (filters?.visible_to_contractor !== undefined) {
        query = query.eq('visible_to_contractor', filters.visible_to_contractor);
      }
      if (filters?.search) {
        query = query.or(`drawing_number.ilike.%${filters.search}%,drawing_title.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as unknown as ProjectDrawing[];
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// FETCH SINGLE DRAWING
// ============================================================================

export function useDrawing(drawingId: string | undefined) {
  return useQuery({
    queryKey: ['drawing', drawingId],
    queryFn: async (): Promise<ProjectDrawing | null> => {
      if (!drawingId) return null;
      
      const { data, error } = await supabase
        .from('project_drawings')
        .select(`*`)
        .eq('id', drawingId)
        .single();
      
      if (error) throw error;
      return data as unknown as ProjectDrawing;
    },
    enabled: !!drawingId,
  });
}

// ============================================================================
// FETCH DRAWING REVISIONS
// ============================================================================

export function useDrawingRevisions(drawingId: string | undefined) {
  return useQuery({
    queryKey: ['drawing-revisions', drawingId],
    queryFn: async (): Promise<DrawingRevision[]> => {
      if (!drawingId) return [];
      
      const { data, error } = await supabase
        .from('drawing_revisions')
        .select('*')
        .eq('drawing_id', drawingId)
        .order('revision_date', { ascending: false });
      
      if (error) throw error;
      return data as DrawingRevision[];
    },
    enabled: !!drawingId,
  });
}

// ============================================================================
// DRAWING STATS
// ============================================================================

export function useDrawingStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ['drawing-stats', projectId],
    queryFn: async (): Promise<DrawingStats> => {
      if (!projectId) {
        return {
          total: 0,
          byCategory: {},
          byStatus: {},
          withFiles: 0,
          withoutFiles: 0,
        };
      }
      
      const { data, error } = await supabase
        .from('project_drawings')
        .select('id, category, status, file_url')
        .eq('project_id', projectId);
      
      if (error) throw error;
      
      const drawings = data || [];
      const byCategory: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      let withFiles = 0;
      let withoutFiles = 0;
      
      drawings.forEach(d => {
        byCategory[d.category] = (byCategory[d.category] || 0) + 1;
        byStatus[d.status] = (byStatus[d.status] || 0) + 1;
        if (d.file_url) {
          withFiles++;
        } else {
          withoutFiles++;
        }
      });
      
      return {
        total: drawings.length,
        byCategory,
        byStatus,
        withFiles,
        withoutFiles,
      };
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// CREATE DRAWING
// ============================================================================

export function useCreateDrawing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      data, 
      file 
    }: { 
      projectId: string; 
      data: DrawingFormData;
      file?: File;
    }): Promise<ProjectDrawing> => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      let fileUrl: string | undefined;
      let filePath: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;
      let fileType: string | undefined;
      
      // Upload file if provided
      if (file) {
        const ext = file.name.split('.').pop() || 'pdf';
        const safeName = data.drawing_number.replace(/\//g, '-');
        filePath = `${projectId}/drawings/${data.category}/${safeName}-${data.current_revision || 'A'}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-drawings')
          .upload(filePath, file, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        // project-drawings is a public bucket, use getPublicUrl
        const { data: urlData } = supabase.storage
          .from('project-drawings')
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
        fileName = file.name;
        fileSize = file.size;
        fileType = ext;
      }
      
      const { data: drawing, error } = await supabase
        .from('project_drawings')
        .insert({
          project_id: projectId,
          drawing_number: data.drawing_number,
          drawing_title: data.drawing_title,
          category: data.category,
          subcategory: data.subcategory,
          tenant_id: data.tenant_id,
          shop_number: data.shop_number,
          current_revision: data.current_revision || 'A',
          revision_date: data.revision_date,
          revision_notes: data.revision_notes,
          status: data.status || 'draft',
          issue_date: data.issue_date,
          visible_to_client: data.visible_to_client ?? false,
          visible_to_contractor: data.visible_to_contractor ?? true,
          notes: data.notes,
          file_url: fileUrl,
          file_path: filePath,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return drawing as ProjectDrawing;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-drawings', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['drawing-stats', variables.projectId] });
      toast.success('Drawing added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add drawing: ${error.message}`);
    },
  });
}

// ============================================================================
// UPDATE DRAWING
// ============================================================================

export function useUpdateDrawing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      drawingId, 
      projectId,
      data,
      file
    }: { 
      drawingId: string;
      projectId: string;
      data: Partial<DrawingFormData>;
      file?: File;
    }): Promise<ProjectDrawing> => {
      let fileUrl: string | undefined;
      let filePath: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;
      let fileType: string | undefined;
      
      // Upload new file if provided
      if (file && data.drawing_number) {
        const ext = file.name.split('.').pop() || 'pdf';
        const safeName = data.drawing_number.replace(/\//g, '-');
        filePath = `${projectId}/drawings/${data.category || 'other'}/${safeName}-${data.current_revision || 'A'}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-drawings')
          .upload(filePath, file, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        // project-drawings is a public bucket, use getPublicUrl
        const { data: urlData } = supabase.storage
          .from('project-drawings')
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
        fileName = file.name;
        fileSize = file.size;
        fileType = ext;
      }
      
      const updateData: Record<string, unknown> = { ...data };
      if (fileUrl) {
        updateData.file_url = fileUrl;
        updateData.file_path = filePath;
        updateData.file_name = fileName;
        updateData.file_size = fileSize;
        updateData.file_type = fileType;
      }
      
      const { data: drawing, error } = await supabase
        .from('project_drawings')
        .update(updateData)
        .eq('id', drawingId)
        .select()
        .single();
      
      if (error) throw error;
      return drawing as ProjectDrawing;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-drawings', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['drawing', variables.drawingId] });
      queryClient.invalidateQueries({ queryKey: ['drawing-stats', variables.projectId] });
      toast.success('Drawing updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update drawing: ${error.message}`);
    },
  });
}

// ============================================================================
// DELETE DRAWING
// ============================================================================

export function useDeleteDrawing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      drawingId, 
      projectId,
      filePath 
    }: { 
      drawingId: string;
      projectId: string;
      filePath?: string;
    }): Promise<void> => {
      // Delete file from storage if exists
      if (filePath) {
        await supabase.storage
          .from('handover-documents')
          .remove([filePath]);
      }
      
      const { error } = await supabase
        .from('project_drawings')
        .delete()
        .eq('id', drawingId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-drawings', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['drawing-stats', variables.projectId] });
      toast.success('Drawing deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete drawing: ${error.message}`);
    },
  });
}

// ============================================================================
// BULK IMPORT DRAWINGS
// ============================================================================

export function useBulkImportDrawings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      drawings 
    }: { 
      projectId: string; 
      drawings: DrawingFormData[];
    }): Promise<{ imported: number; errors: string[] }> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const toInsert = drawings.map(d => ({
        project_id: projectId,
        drawing_number: d.drawing_number,
        drawing_title: d.drawing_title,
        category: d.category,
        subcategory: d.subcategory,
        tenant_id: d.tenant_id,
        shop_number: d.shop_number,
        current_revision: d.current_revision || 'A',
        status: d.status || 'draft' as DrawingStatus,
        visible_to_client: d.visible_to_client ?? false,
        visible_to_contractor: d.visible_to_contractor ?? true,
        notes: d.notes,
        created_by: user?.id,
      }));
      
      const { data, error } = await supabase
        .from('project_drawings')
        .insert(toInsert)
        .select();
      
      if (error) {
        // Handle partial failures
        return { 
          imported: 0, 
          errors: [error.message] 
        };
      }
      
      return { 
        imported: data?.length || 0, 
        errors: [] 
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-drawings', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['drawing-stats', variables.projectId] });
      
      if (result.errors.length > 0) {
        toast.warning(`Imported ${result.imported} drawings with ${result.errors.length} errors`);
      } else {
        toast.success(`Successfully imported ${result.imported} drawings`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to import drawings: ${error.message}`);
    },
  });
}

// ============================================================================
// UPDATE DRAWING VISIBILITY
// ============================================================================

export function useUpdateDrawingVisibility() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      drawingIds,
      projectId,
      visibility 
    }: { 
      drawingIds: string[];
      projectId: string;
      visibility: {
        visible_to_client?: boolean;
        visible_to_contractor?: boolean;
        included_in_handover?: boolean;
      };
    }): Promise<void> => {
      const { error } = await supabase
        .from('project_drawings')
        .update(visibility)
        .in('id', drawingIds);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-drawings', variables.projectId] });
      toast.success('Visibility updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update visibility: ${error.message}`);
    },
  });
}
