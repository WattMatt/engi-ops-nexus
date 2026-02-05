/**
 * Drawing Grid Component
 * Displays drawings in a card grid format
 */

import { useState } from 'react';
import { 
  FileText, 
   Download,
   Eye,
  Users, 
  Building2, 
  FileCheck,
  MoreHorizontal,
  Pencil,
  Trash2,
  ClipboardCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ProjectDrawing, DRAWING_STATUS_OPTIONS, naturalSortDrawings } from '@/types/drawings';
import { REVIEW_STATUS_OPTIONS } from '@/types/drawingChecklists';
import { useDrawingReviewStatuses } from '@/hooks/useDrawingChecklists';
import { DrawingReviewDialog } from './review';
 import { openFile, downloadFile } from '@/lib/fileViewer';
 import { useToast } from '@/hooks/use-toast';

interface DrawingGridProps {
  drawings: ProjectDrawing[];
  isLoading: boolean;
  projectId: string;
}

export function DrawingGrid({ drawings, isLoading, projectId }: DrawingGridProps) {
  const [reviewingDrawing, setReviewingDrawing] = useState<ProjectDrawing | null>(null);
   const { toast } = useToast();
 
  const sortedDrawings = [...drawings].sort(naturalSortDrawings);

  // Fetch review statuses for all drawings
  const drawingIds = drawings.map(d => d.id);
  const { data: reviewStatuses = [] } = useDrawingReviewStatuses(drawingIds);
  const reviewStatusMap = new Map(reviewStatuses.map(s => [s.drawing_id, s]));

   // Handle opening files with bulletproof file viewer
   const handleOpenFile = async (fileUrl: string) => {
     await openFile(fileUrl, {
       onError: (error) => {
         toast({
           title: 'Error Opening File',
           description: error,
           variant: 'destructive',
         });
       },
     });
   };

   // Handle downloading files
   const handleDownloadFile = async (fileUrl: string, fileName?: string) => {
     await downloadFile(fileUrl, fileName, {
       onError: (error) => {
         toast({
           title: 'Download Failed',
           description: error,
           variant: 'destructive',
         });
       },
     });
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-24 w-full mb-3" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedDrawings.map(drawing => {
        const reviewStatus = reviewStatusMap.get(drawing.id);
        const reviewOption = reviewStatus 
          ? REVIEW_STATUS_OPTIONS.find(o => o.value === reviewStatus.status)
          : null;
        
        return (
        <Card key={drawing.id} className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            {/* Preview Area */}
            <div className="aspect-[4/3] bg-muted rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
              {drawing.file_url ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                  <FileText className="h-12 w-12 text-primary/40" />
                </div>
              ) : (
                <div className="text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                  <span className="text-xs text-muted-foreground">No file</span>
                </div>
              )}
              
              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {drawing.file_url && (
                  <>
                     <Button 
                       size="sm" 
                       variant="secondary"
                       onClick={() => handleOpenFile(drawing.file_url!)}
                     >
                       <Eye className="h-4 w-4" />
                    </Button>
                     <Button 
                       size="sm" 
                       variant="secondary"
                       onClick={() => handleDownloadFile(drawing.file_url!, `${drawing.drawing_number}.pdf`)}
                     >
                       <Download className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setReviewingDrawing(drawing)}
                    >
                      <ClipboardCheck className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Review Checklist</TooltipContent>
                </Tooltip>
              </div>
              
              {/* Revision Badge */}
              <Badge 
                variant="secondary" 
                className="absolute top-2 right-2"
              >
                Rev {drawing.current_revision}
              </Badge>
              
              {/* Review Status Badge */}
              {reviewOption && (
                <Badge 
                  variant="outline" 
                  className={`absolute top-2 left-2 ${reviewOption.color}`}
                >
                  {reviewOption.label}
                </Badge>
              )}
            </div>
            
            {/* Drawing Info */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium truncate">
                    {drawing.drawing_number}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {drawing.drawing_title}
                  </p>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setReviewingDrawing(drawing)}>
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Review
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Status and Visibility */}
              <div className="flex items-center justify-between">
                {getStatusBadge(drawing.status)}
                
                <div className="flex items-center gap-1">
                  {drawing.visible_to_client && (
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {drawing.visible_to_contractor && (
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {drawing.included_in_handover && (
                    <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              {/* Tenant Info */}
              {drawing.shop_number && (
                <p className="text-xs text-muted-foreground">
                  Shop {drawing.shop_number}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      );
      })}
    </div>
    
    {/* Review Dialog */}
    <DrawingReviewDialog
      open={!!reviewingDrawing}
      onOpenChange={() => setReviewingDrawing(null)}
      drawing={reviewingDrawing}
    />
    </>
  );
}
