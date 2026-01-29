/**
 * Drawing Checklist Pane
 * Displays checklist with manual template selection
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Check, Loader2, Save, ChevronDown, ChevronRight, AlertCircle, User, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor, RichTextEditorRef } from '@/components/messaging/RichTextEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  useChecklistTemplates,
  useChecklistItems,
  useChecklistItemsFlat,
  useDrawingReview,
  useCreateDrawingReview,
  useReviewChecks,
  useToggleCheckItem,
  useUpdateReviewStatus,
  useReviewerProfile,
} from '@/hooks/useDrawingChecklists';
import { 
  DrawingChecklistItem,
  REVIEW_STATUS_OPTIONS,
} from '@/types/drawingChecklists';
import { ProjectDrawing } from '@/types/drawings';

interface DrawingChecklistPaneProps {
  drawing: ProjectDrawing;
}

export function DrawingChecklistPane({ drawing }: DrawingChecklistPaneProps) {
  const [notes, setNotes] = useState('');
  const [notesHtml, setNotesHtml] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const notesEditorRef = useRef<RichTextEditorRef>(null);
  
  // Fetch all available templates
  const { data: allTemplates = [], isLoading: templatesLoading } = useChecklistTemplates();
  
  // Get the selected template
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return allTemplates.find(t => t.id === selectedTemplateId) || null;
  }, [allTemplates, selectedTemplateId]);
  
  // Fetch items for selected template
  const { data: hierarchicalItems = [], isLoading: itemsLoading } = useChecklistItems(selectedTemplateId);
  const { data: flatItems = [] } = useChecklistItemsFlat(selectedTemplateId);
  
  // Fetch or create review status
  const { data: reviewStatus, isLoading: reviewLoading } = useDrawingReview(drawing.id);
  const createReview = useCreateDrawingReview();
  
  // Fetch reviewer profile if review is completed
  const { data: reviewerProfile } = useReviewerProfile(reviewStatus?.reviewed_by);
  
  // Fetch review checks
  const { data: checks = [] } = useReviewChecks(reviewStatus?.id);
  
  // Mutations
  const toggleCheck = useToggleCheckItem();
  const updateStatus = useUpdateReviewStatus();
  
  // Auto-select a template based on drawing category when templates load
  useEffect(() => {
    if (allTemplates.length > 0 && !selectedTemplateId) {
      // Try to find a template matching the drawing category
      const categoryMatch = allTemplates.find(
        t => t.category_code?.toLowerCase() === drawing.category?.toLowerCase()
      );
      if (categoryMatch) {
        setSelectedTemplateId(categoryMatch.id);
      } else if (allTemplates.length > 0) {
        // Default to first template if no category match
        setSelectedTemplateId(allTemplates[0].id);
      }
    }
  }, [allTemplates, drawing.category, selectedTemplateId]);
  
  // Create review if it doesn't exist
  useEffect(() => {
    if (!reviewLoading && !reviewStatus && selectedTemplateId && !createReview.isPending) {
      createReview.mutate(drawing.id);
    }
  }, [reviewLoading, reviewStatus, selectedTemplateId, drawing.id, createReview.isPending]);
  
  // Load notes from review status
  useEffect(() => {
    if (reviewStatus?.notes) {
      setNotes(reviewStatus.notes);
      setNotesHtml(reviewStatus.notes);
    }
  }, [reviewStatus?.notes]);
  
  // Initialize all sections as expanded
  useEffect(() => {
    const parentIds = new Set(
      hierarchicalItems
        .filter(item => item.children && item.children.length > 0)
        .map(item => item.id)
    );
    setExpandedSections(parentIds);
  }, [hierarchicalItems]);
  
  // Build check map for quick lookup
  const checkMap = useMemo(() => {
    const map = new Map<string, { isChecked: boolean; notes?: string }>();
    checks.forEach(check => {
      map.set(check.item_id, { isChecked: check.is_checked, notes: check.notes || undefined });
    });
    return map;
  }, [checks]);
  
  // Calculate progress
  const progress = useMemo(() => {
    const total = flatItems.length;
    const checked = checks.filter(c => c.is_checked).length;
    return {
      total,
      checked,
      percentage: total > 0 ? Math.round((checked / total) * 100) : 0,
    };
  }, [flatItems, checks]);
  
  const handleToggle = (itemId: string, isChecked: boolean) => {
    if (!reviewStatus) return;
    toggleCheck.mutate({
      reviewId: reviewStatus.id,
      itemId,
      isChecked,
    });
  };
  
  const handleStatusChange = (status: string) => {
    if (!reviewStatus) return;
    updateStatus.mutate({
      reviewId: reviewStatus.id,
      status,
      drawingId: drawing.id,
      projectId: drawing.project_id,
    });
  };
  
  const handleSaveNotes = () => {
    if (!reviewStatus) return;
    updateStatus.mutate({
      reviewId: reviewStatus.id,
      notes: notesHtml,
      drawingId: drawing.id,
      projectId: drawing.project_id,
    });
  };
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };
  
  const isLoading = templatesLoading || itemsLoading || reviewLoading;
  
  if (templatesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (allTemplates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No checklists available</p>
        <p className="text-sm text-center mt-2">
          Create checklist templates in the Checklists tab first.
        </p>
      </div>
    );
  }
  
  const renderChecklistItem = (item: DrawingChecklistItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);
    const checkState = checkMap.get(item.id);
    const isChecked = checkState?.isChecked || false;
    
    if (hasChildren) {
      // Count checked children
      const childIds = item.children!.map(c => c.id);
      const checkedChildren = childIds.filter(id => checkMap.get(id)?.isChecked).length;
      
      return (
        <Collapsible
          key={item.id}
          open={isExpanded}
          onOpenChange={() => toggleSection(item.id)}
        >
          <div className={cn("border-b", level > 0 && "ml-4")}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 py-2 px-2 hover:bg-muted/50 cursor-pointer">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                <span className="font-medium text-sm flex-1">{item.label}</span>
                <Badge variant="outline" className="text-xs">
                  {checkedChildren}/{item.children!.length}
                </Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pb-2">
                {item.children!.map(child => renderChecklistItem(child, level + 1))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      );
    }
    
    return (
      <div
        key={item.id}
        className={cn(
          "flex items-start gap-2 py-1.5 px-2 hover:bg-muted/30 transition-colors",
          level > 0 && "ml-6"
        )}
      >
        <Checkbox
          id={item.id}
          checked={isChecked}
          onCheckedChange={(checked) => handleToggle(item.id, checked as boolean)}
          disabled={toggleCheck.isPending}
          className="mt-0.5"
        />
        <label
          htmlFor={item.id}
          className={cn(
            "text-sm cursor-pointer flex-1 leading-relaxed",
            isChecked && "text-muted-foreground line-through"
          )}
        >
          {item.label}
        </label>
        {isChecked && (
          <Check className="h-4 w-4 text-primary shrink-0" />
        )}
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        {/* Template Selector */}
        <div className="mb-3">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Select Checklist
          </label>
          <Select
            value={selectedTemplateId || ''}
            onValueChange={(value) => setSelectedTemplateId(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a checklist template">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <span>{selectedTemplate?.name || 'Select checklist'}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {allTemplates.map(tmpl => (
                <SelectItem key={tmpl.id} value={tmpl.id}>
                  <div className="flex items-center gap-2">
                    <span>{tmpl.name}</span>
                    {tmpl.category_code && (
                      <Badge variant="outline" className="text-xs ml-2">
                        {tmpl.category_code}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Review Status</h3>
          <Select
            value={reviewStatus?.status || 'pending'}
            onValueChange={handleStatusChange}
            disabled={updateStatus.isPending || !selectedTemplateId}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVIEW_STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progress.checked} of {progress.total} ({progress.percentage}%)</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>
        
        {/* Reviewer Info */}
        {reviewerProfile && reviewStatus?.review_date && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={reviewerProfile.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {reviewerProfile.full_name?.split(' ').map(n => n[0]).join('') || <User className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                Reviewed by {reviewerProfile.full_name || reviewerProfile.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(reviewStatus.review_date), 'PPp')}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Checklist Items */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {hierarchicalItems.map(item => renderChecklistItem(item))}
        </div>
      </ScrollArea>
      
      {/* Notes Section */}
      <div className="border-t p-3 space-y-3">
        <p className="text-sm font-medium">Review Notes</p>
        <RichTextEditor
          ref={notesEditorRef}
          value={notesHtml}
          onChange={(text, html) => {
            setNotes(text);
            setNotesHtml(html);
          }}
          placeholder="Add overall review notes..."
          className="min-h-[120px]"
        />
        <Button 
          size="sm" 
          onClick={handleSaveNotes}
          disabled={updateStatus.isPending}
          className="w-full"
        >
          {updateStatus.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Notes
        </Button>
      </div>
    </div>
  );
}
