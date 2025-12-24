import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileImage, ExternalLink, Trash2, Send, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ReferenceDrawingsManagerProps {
  accountId: string;
  projectId: string;
}

export const ReferenceDrawingsManager: React.FC<ReferenceDrawingsManagerProps> = ({
  accountId,
  projectId
}) => {
  const queryClient = useQueryClient();

  // Fetch reference drawings with related data
  const { data: drawings, isLoading } = useQuery({
    queryKey: ['final-account-reference-drawings', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('final_account_reference_drawings')
        .select(`
          *,
          floor_plan:floor_plan_projects(id, name, updated_at),
          section:final_account_sections(id, section_code, section_name),
          shop:final_account_shop_subsections(id, shop_number, shop_name)
        `)
        .eq('final_account_id', accountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });

  // Count items from each drawing
  const { data: itemCounts } = useQuery({
    queryKey: ['reference-drawing-item-counts', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('final_account_items')
        .select('source_reference_drawing_id')
        .not('source_reference_drawing_id', 'is', null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const item of data) {
        const id = item.source_reference_drawing_id;
        if (id) {
          counts[id] = (counts[id] || 0) + 1;
        }
      }
      return counts;
    },
    enabled: !!accountId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (drawingId: string) => {
      const { error } = await supabase
        .from('final_account_reference_drawings')
        .delete()
        .eq('id', drawingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reference drawing removed');
      queryClient.invalidateQueries({ queryKey: ['final-account-reference-drawings'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleOpenFloorPlan = (floorPlanId: string) => {
    // Open floor plan in a new tab or navigate
    window.open(`/dashboard/floor-plan?design=${floorPlanId}`, '_blank');
  };

  const handleDelete = (drawingId: string, drawingName: string) => {
    if (window.confirm(`Remove "${drawingName}" as a reference drawing? This won't delete the floor plan itself.`)) {
      deleteMutation.mutate(drawingId);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          Reference Drawings
        </CardTitle>
        <CardDescription>
          Floor plan drawings linked to this Final Account. Take-offs from these drawings can populate item quantities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!drawings || drawings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileImage className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No reference drawings linked yet.</p>
            <p className="text-sm mt-1">
              Link floor plans from the Floor Plan Markup tool using "Link to Final Account".
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drawing Name</TableHead>
                <TableHead>Linked Section</TableHead>
                <TableHead>Items Created</TableHead>
                <TableHead>Transferred</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drawings.map((drawing) => (
                <TableRow key={drawing.id}>
                  <TableCell className="font-medium">
                    {drawing.drawing_name}
                    {drawing.is_primary && (
                      <Badge variant="secondary" className="ml-2">Primary</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {drawing.section ? (
                        <span>
                          {drawing.section.section_code}: {drawing.section.section_name}
                          {drawing.shop && (
                            <span className="text-muted-foreground ml-1">
                              → {drawing.shop.shop_number}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No section</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {itemCounts?.[drawing.id] ? (
                      <Badge variant="outline">{itemCounts[drawing.id]} items</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {drawing.takeoffs_transferred ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <Send className="h-3 w-3" />
                        <span className="text-sm">Yes</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(drawing.created_at), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => drawing.floor_plan && handleOpenFloorPlan(drawing.floor_plan.id)}
                        disabled={!drawing.floor_plan}
                        title="Open floor plan"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(drawing.id, drawing.drawing_name)}
                        title="Remove reference"
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
  );
};
