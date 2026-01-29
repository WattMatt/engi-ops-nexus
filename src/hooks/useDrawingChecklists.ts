/**
 * Drawing Checklist Hooks
 * React Query hooks for managing drawing review checklists
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  DrawingChecklistTemplate, 
  DrawingChecklistItem, 
  DrawingReviewStatus,
  DrawingReviewCheck,
  ChecklistProgress,
  buildChecklistHierarchy 
} from '@/types/drawingChecklists';
import { useToast } from '@/hooks/use-toast';

// Fetch template by category code
export function useChecklistTemplate(categoryCode: string | undefined) {
  return useQuery({
    queryKey: ['checklist-template', categoryCode],
    queryFn: async () => {
      if (!categoryCode) return null;
      
      const { data, error } = await supabase
        .from('drawing_checklist_templates')
        .select('*')
        .eq('category_code', categoryCode)
        .eq('is_default', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as DrawingChecklistTemplate | null;
    },
    enabled: !!categoryCode,
  });
}

// Fetch all templates
export function useChecklistTemplates() {
  return useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drawing_checklist_templates')
        .select('*')
        .order('category_code');
      
      if (error) throw error;
      return data as DrawingChecklistTemplate[];
    },
  });
}

// Fetch items for a template (with hierarchy)
export function useChecklistItems(templateId: string | undefined) {
  return useQuery({
    queryKey: ['checklist-items', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from('drawing_checklist_items')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order');
      
      if (error) throw error;
      return buildChecklistHierarchy(data as DrawingChecklistItem[]);
    },
    enabled: !!templateId,
  });
}

// Fetch flat items for a template (used for check state)
export function useChecklistItemsFlat(templateId: string | undefined) {
  return useQuery({
    queryKey: ['checklist-items-flat', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from('drawing_checklist_items')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order');
      
      if (error) throw error;
      return data as DrawingChecklistItem[];
    },
    enabled: !!templateId,
  });
}

// Fetch or create review status for a drawing
export function useDrawingReview(drawingId: string | undefined) {
  return useQuery({
    queryKey: ['drawing-review', drawingId],
    queryFn: async () => {
      if (!drawingId) return null;
      
      // Try to get existing review
      const { data, error } = await supabase
        .from('drawing_review_status')
        .select('*')
        .eq('drawing_id', drawingId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as DrawingReviewStatus | null;
    },
    enabled: !!drawingId,
  });
}

// Create review status for a drawing
export function useCreateDrawingReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (drawingId: string) => {
      const { data, error } = await supabase
        .from('drawing_review_status')
        .insert({ drawing_id: drawingId })
        .select()
        .single();
      
      if (error) throw error;
      return data as DrawingReviewStatus;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drawing-review', data.drawing_id] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create review status',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
}

// Fetch review checks for a review
export function useReviewChecks(reviewId: string | undefined) {
  return useQuery({
    queryKey: ['review-checks', reviewId],
    queryFn: async () => {
      if (!reviewId) return [];
      
      const { data, error } = await supabase
        .from('drawing_review_checks')
        .select('*')
        .eq('review_id', reviewId);
      
      if (error) throw error;
      return data as DrawingReviewCheck[];
    },
    enabled: !!reviewId,
  });
}

// Toggle check item
export function useToggleCheckItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({
      reviewId,
      itemId,
      isChecked,
      notes,
    }: {
      reviewId: string;
      itemId: string;
      isChecked: boolean;
      notes?: string;
    }) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from('drawing_review_checks')
        .select('id')
        .eq('review_id', reviewId)
        .eq('item_id', itemId)
        .single();
      
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('drawing_review_checks')
          .update({
            is_checked: isChecked,
            notes,
            checked_at: isChecked ? new Date().toISOString() : null,
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('drawing_review_checks')
          .insert({
            review_id: reviewId,
            item_id: itemId,
            is_checked: isChecked,
            notes,
            checked_at: isChecked ? new Date().toISOString() : null,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['review-checks', variables.reviewId] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update check',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
}

// Update review status
export function useUpdateReviewStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({
      reviewId,
      status,
      notes,
    }: {
      reviewId: string;
      status?: string;
      notes?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (status === 'completed' || status === 'approved') {
        updateData.review_date = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('drawing_review_status')
        .update(updateData)
        .eq('id', reviewId)
        .select()
        .single();
      
      if (error) throw error;
      return data as DrawingReviewStatus;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drawing-review', data.drawing_id] });
      toast({
        title: 'Review Updated',
        description: 'Review status has been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update review status',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
}

// Calculate progress for a drawing
export function useChecklistProgress(
  reviewId: string | undefined,
  totalItems: number
): ChecklistProgress {
  const { data: checks = [] } = useReviewChecks(reviewId);
  
  const checked = checks.filter(c => c.is_checked).length;
  const percentage = totalItems > 0 ? Math.round((checked / totalItems) * 100) : 0;
  
  return {
    total: totalItems,
    checked,
    percentage,
  };
}

// Bulk fetch review statuses for multiple drawings
export function useDrawingReviewStatuses(drawingIds: string[]) {
  return useQuery({
    queryKey: ['drawing-review-statuses', drawingIds],
    queryFn: async () => {
      if (!drawingIds.length) return [];
      
      const { data, error } = await supabase
        .from('drawing_review_status')
        .select('*')
        .in('drawing_id', drawingIds);
      
      if (error) throw error;
      return data as DrawingReviewStatus[];
    },
    enabled: drawingIds.length > 0,
  });
}
