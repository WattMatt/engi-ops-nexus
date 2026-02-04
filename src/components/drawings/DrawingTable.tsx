/**
 * Drawing Table Component
 * Displays drawings in a table format with actions
 */

import { useState, useCallback } from 'react';
import { 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2, 
  Download,
  Users,
  Building2,
  FileCheck,
  ClipboardCheck
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDeleteDrawing, useUpdateDrawingVisibility } from '@/hooks/useProjectDrawings';
import { useDrawingReviewStatuses } from '@/hooks/useDrawingChecklists';
import { ProjectDrawing, DRAWING_STATUS_OPTIONS, naturalSortDrawings } from '@/types/drawings';
import { REVIEW_STATUS_OPTIONS } from '@/types/drawingChecklists';
import { EditDrawingDialog } from './EditDrawingDialog';
import { DrawingReviewDialog } from './review';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Private buckets that need signed URLs
const PRIVATE_BUCKETS = ['handover-documents', 'budget-reports', 'invoice-pdfs', 'floor-plan-reports', 'cost-report-pdfs', 'tenant-evaluation-reports', 'final-account-reviews'];

// Extract bucket name from URL
const extractBucketFromUrl = (url: string): string | null => {
  const match = url.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)/);
  return match?.[1] || null;
};

// Extract file path from URL
const extractPathFromUrl = (url: string, bucket: string): string | null => {
  const regex = new RegExp(`/storage/v1/object/(?:public|authenticated)/${bucket}/(.+)$`);
  const match = url.match(regex);
  return match?.[1] || null;
};

interface DrawingTableProps {
  drawings: ProjectDrawing[];
  isLoading: boolean;
  projectId: string;
}

export function DrawingTable({ drawings, isLoading, projectId }: DrawingTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingDrawing, setEditingDrawing] = useState<ProjectDrawing | null>(null);
  const [deletingDrawing, setDeletingDrawing] = useState<ProjectDrawing | null>(null);
  const [reviewingDrawing, setReviewingDrawing] = useState<ProjectDrawing | null>(null);
  
  const { toast } = useToast();
  const deleteDrawing = useDeleteDrawing();
  const updateVisibility = useUpdateDrawingVisibility();
  
  // Fetch review statuses for all drawings
  const drawingIds = drawings.map(d => d.id);
  const { data: reviewStatuses = [] } = useDrawingReviewStatuses(drawingIds);
  const reviewStatusMap = new Map(reviewStatuses.map(s => [s.drawing_id, s]));
  
  const sortedDrawings = [...drawings].sort(naturalSortDrawings);
  
  // Handle opening files (generate signed URL for private buckets)
  const handleOpenFile = useCallback(async (fileUrl: string) => {
    const bucket = extractBucketFromUrl(fileUrl);
    
    // If it's a private bucket, create a signed URL
    if (bucket && PRIVATE_BUCKETS.includes(bucket)) {
      const path = extractPathFromUrl(fileUrl, bucket);
      if (path) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(decodeURIComponent(path), 3600);
        
        if (error) {
          console.error('Signed URL error:', error);
          toast({
            title: 'Error',
            description: 'Failed to access file. Please try again.',
            variant: 'destructive',
          });
          return;
        }
        
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
          return;
        }
      }
    }
    
    // For public buckets or if extraction failed, open directly
    window.open(fileUrl, '_blank');
  }, [toast]);
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(drawings.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };
  
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };
  
  const handleDelete = async () => {
    if (!deletingDrawing) return;
    
    await deleteDrawing.mutateAsync({
      drawingId: deletingDrawing.id,
      projectId,
      filePath: deletingDrawing.file_path,
    });
    
    setDeletingDrawing(null);
  };
  
  const handleBulkVisibility = async (visibility: {
    visible_to_client?: boolean;
    visible_to_contractor?: boolean;
    included_in_handover?: boolean;
  }) => {
    if (selectedIds.length === 0) return;
    
    await updateVisibility.mutateAsync({
      drawingIds: selectedIds,
      projectId,
      visibility,
    });
    
    setSelectedIds([]);
  };
  
  const getStatusBadge = (status: string) => {
    const option = DRAWING_STATUS_OPTIONS.find(o => o.value === status);
    return (
      <Badge variant="outline" className={option?.color || ''}>
        {option?.label || status}
      </Badge>
    );
  };
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  
  if (drawings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No drawings found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Add drawings manually or import from Excel
        </p>
      </div>
    );
  }
  
  return (
    <>
      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkVisibility({ visible_to_client: true })}
          >
            <Users className="h-3 w-3 mr-1" />
            Show to Client
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkVisibility({ visible_to_contractor: true })}
          >
            <Building2 className="h-3 w-3 mr-1" />
            Show to Contractor
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkVisibility({ included_in_handover: true })}
          >
            <FileCheck className="h-3 w-3 mr-1" />
            Add to Handover
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds([])}
          >
            Clear
          </Button>
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.length === drawings.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-32">Drawing No.</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-24">Rev</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-28">Review</TableHead>
              <TableHead className="w-24">File</TableHead>
              <TableHead className="w-24 text-center">Portals</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDrawings.map(drawing => {
              const reviewStatus = reviewStatusMap.get(drawing.id);
              const reviewOption = reviewStatus 
                ? REVIEW_STATUS_OPTIONS.find(o => o.value === reviewStatus.status)
                : null;
              
              return (
              <TableRow key={drawing.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(drawing.id)}
                    onCheckedChange={(checked) => handleSelectOne(drawing.id, !!checked)}
                  />
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {drawing.drawing_number}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{drawing.drawing_title}</p>
                    {drawing.shop_number && (
                      <p className="text-xs text-muted-foreground">
                        Shop {drawing.shop_number}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{drawing.current_revision}</Badge>
                  {drawing.revision_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(drawing.revision_date), 'dd MMM yyyy')}
                    </p>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(drawing.status)}</TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReviewingDrawing(drawing)}
                        className="w-full justify-start gap-2"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        {reviewOption ? (
                          <Badge variant="outline" className={reviewOption.color}>
                            {reviewOption.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Review</span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open drawing review checklist</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {drawing.file_url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenFile(drawing.file_url!)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">No file</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {drawing.visible_to_client && (
                      <Badge variant="outline" className="text-xs px-1">
                        <Users className="h-3 w-3" />
                      </Badge>
                    )}
                    {drawing.visible_to_contractor && (
                      <Badge variant="outline" className="text-xs px-1">
                        <Building2 className="h-3 w-3" />
                      </Badge>
                    )}
                    {drawing.included_in_handover && (
                      <Badge variant="outline" className="text-xs px-1">
                        <FileCheck className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {drawing.file_url && (
                        <DropdownMenuItem onClick={() => handleOpenFile(drawing.file_url!)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setEditingDrawing(drawing)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeletingDrawing(drawing)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Edit Dialog */}
      <EditDrawingDialog
        drawing={editingDrawing}
        onClose={() => setEditingDrawing(null)}
        projectId={projectId}
      />
      
      {/* Review Dialog */}
      <DrawingReviewDialog
        open={!!reviewingDrawing}
        onOpenChange={() => setReviewingDrawing(null)}
        drawing={reviewingDrawing}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingDrawing} onOpenChange={() => setDeletingDrawing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Drawing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingDrawing?.drawing_number}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
