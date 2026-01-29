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

// Create review status for a drawing (uses upsert to avoid duplicates)
export function useCreateDrawingReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (drawingId: string) => {
      // First check if review already exists
      const { data: existing } = await supabase
        .from('drawing_review_status')
        .select('*')
        .eq('drawing_id', drawingId)
        .maybeSingle();
      
      if (existing) {
        return existing as DrawingReviewStatus;
      }
      
      // Create new review if doesn't exist
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

// Update review status with reviewer tracking and notifications
export function useUpdateReviewStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({
      reviewId,
      status,
      notes,
      drawingId,
      projectId,
    }: {
      reviewId: string;
      status?: string;
      notes?: string;
      drawingId?: string;
      projectId?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: Record<string, unknown> = {};
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (status === 'completed' || status === 'approved') {
        updateData.review_date = new Date().toISOString();
        updateData.reviewed_by = user?.id;
      }
      
      const { data, error } = await supabase
        .from('drawing_review_status')
        .update(updateData)
        .eq('id', reviewId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Send notification for completed/approved reviews
      if ((status === 'completed' || status === 'approved') && drawingId && projectId && user?.id) {
        try {
          await supabase.functions.invoke('send-drawing-review-notification', {
            body: {
              reviewId,
              drawingId,
              projectId,
              reviewerId: user.id,
              status,
            },
          });
        } catch (notificationError) {
          console.error('Failed to send review notification:', notificationError);
          // Don't fail the mutation if notification fails
        }
      }
      
      return data as DrawingReviewStatus;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drawing-review', data.drawing_id] });
      queryClient.invalidateQueries({ queryKey: ['drawing-review-statuses'] });
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

// Fetch reviewer profile by ID
export function useReviewerProfile(reviewerId: string | null | undefined) {
  return useQuery({
    queryKey: ['reviewer-profile', reviewerId],
    queryFn: async () => {
      if (!reviewerId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', reviewerId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!reviewerId,
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

// Create a new checklist template
export function useCreateChecklistTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: {
      name: string;
      category_code: string;
      description?: string;
      is_default: boolean;
    }) => {
      // If this is the new default, unset other defaults for this category
      if (data.is_default) {
        await supabase
          .from('drawing_checklist_templates')
          .update({ is_default: false })
          .eq('category_code', data.category_code);
      }
      
      const { data: newTemplate, error } = await supabase
        .from('drawing_checklist_templates')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return newTemplate as DrawingChecklistTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast({
        title: 'Template Created',
        description: 'Tick sheet template has been created',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
}

// Update an existing checklist template
export function useUpdateChecklistTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      category_code: string;
      description?: string;
      is_default: boolean;
    }) => {
      // If this is becoming the new default, unset other defaults for this category
      if (data.is_default) {
        await supabase
          .from('drawing_checklist_templates')
          .update({ is_default: false })
          .eq('category_code', data.category_code)
          .neq('id', data.id);
      }
      
      const { data: updated, error } = await supabase
        .from('drawing_checklist_templates')
        .update({
          name: data.name,
          category_code: data.category_code,
          description: data.description,
          is_default: data.is_default,
        })
        .eq('id', data.id)
        .select()
        .single();
      
      if (error) throw error;
      return updated as DrawingChecklistTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast({
        title: 'Template Updated',
        description: 'Tick sheet template has been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
}

// Delete a checklist template
export function useDeleteChecklistTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (templateId: string) => {
      // Delete items first (cascade would handle this but let's be explicit)
      await supabase
        .from('drawing_checklist_items')
        .delete()
        .eq('template_id', templateId);
      
      const { error } = await supabase
        .from('drawing_checklist_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast({
        title: 'Template Deleted',
        description: 'Tick sheet template has been deleted',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
}

// Save checklist items (create, update, delete)
export function useSaveChecklistItems() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({
      templateId,
      items,
      deletedItemIds,
    }: {
      templateId: string;
      items: Array<{
        id?: string;
        template_id: string;
        label: string;
        parent_id: string | null;
        linked_document_type: string | null;
        sort_order: number;
      }>;
      deletedItemIds: string[];
    }) => {
      // Delete removed items
      if (deletedItemIds.length > 0) {
        await supabase
          .from('drawing_checklist_items')
          .delete()
          .in('id', deletedItemIds);
      }
      
      // Separate new and existing items
      const newItems = items.filter(i => !i.id);
      const existingItems = items.filter(i => i.id);
      
      // Insert new items
      if (newItems.length > 0) {
        const { error } = await supabase
          .from('drawing_checklist_items')
          .insert(newItems.map(item => ({
            template_id: item.template_id,
            label: item.label,
            parent_id: item.parent_id,
            linked_document_type: item.linked_document_type,
            sort_order: item.sort_order,
          })));
        
        if (error) throw error;
      }
      
      // Update existing items
      for (const item of existingItems) {
        const { error } = await supabase
          .from('drawing_checklist_items')
          .update({
            label: item.label,
            parent_id: item.parent_id,
            linked_document_type: item.linked_document_type,
            sort_order: item.sort_order,
          })
          .eq('id', item.id!);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items', variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ['checklist-items-flat', variables.templateId] });
      toast({
        title: 'Items Saved',
        description: 'Checklist items have been saved',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save checklist items',
        variant: 'destructive',
      });
      console.error(error);
    },
  });
}
