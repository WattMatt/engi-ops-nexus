/**
 * Checklist List Component
 * Displays all checklist templates with edit/add capabilities
 */

import { useState } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { useChecklistTemplates, useChecklistItems, useDeleteChecklistTemplate } from '@/hooks/useDrawingChecklists';
import { DrawingChecklistTemplate } from '@/types/drawingChecklists';
import { EditTickSheetDialog } from './EditTickSheetDialog';

interface TickSheetCardProps {
  template: DrawingChecklistTemplate;
  onEdit: (template: DrawingChecklistTemplate) => void;
  onDelete: (template: DrawingChecklistTemplate) => void;
}

function TickSheetCard({ template, onEdit, onDelete }: TickSheetCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: checklistItems = [], isLoading } = useChecklistItems(isOpen ? template.id : undefined);

  // Count total items including nested
  const countItems = (itemList: typeof checklistItems): number => {
    return itemList.reduce((acc, item) => {
      return acc + 1 + (item.children ? countItems(item.children) : 0);
    }, 0);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-3">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {template.name}
                    {template.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Category: <Badge variant="outline" className="ml-1">{template.category_code}</Badge>
                    {template.description && (
                      <span className="ml-2">• {template.description}</span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(template)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(template)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : checklistItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items in this checklist</p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium mb-2">
                  {countItems(checklistItems)} check items:
                </p>
                <div className="max-h-64 overflow-y-auto space-y-1 text-sm">
                  {checklistItems.map((item, idx) => (
                    <div key={item.id}>
                      <div className="flex items-start gap-2 py-1">
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        <span>{item.label}</span>
                        {item.linked_document_type && (
                          <Badge variant="outline" className="text-xs ml-auto">
                            <FileText className="h-3 w-3 mr-1" />
                            {item.linked_document_type}
                          </Badge>
                        )}
                      </div>
                      {item.children && item.children.length > 0 && (
                        <div className="ml-6 border-l-2 border-muted pl-3 space-y-1">
                          {item.children.map((child, childIdx) => (
                            <div key={child.id} className="flex items-start gap-2 py-0.5 text-muted-foreground">
                              <span>{idx + 1}.{childIdx + 1}</span>
                              <span>{child.label}</span>
                              {child.linked_document_type && (
                                <Badge variant="outline" className="text-xs ml-auto">
                                  <FileText className="h-3 w-3 mr-1" />
                                  {child.linked_document_type}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function TickSheetList() {
  const [editingTemplate, setEditingTemplate] = useState<DrawingChecklistTemplate | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<DrawingChecklistTemplate | null>(null);
  
  const { data: templates = [], isLoading } = useChecklistTemplates();
  const deleteTemplate = useDeleteChecklistTemplate();

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    await deleteTemplate.mutateAsync(deletingTemplate.id);
    setDeletingTemplate(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    const cat = template.category_code;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, DrawingChecklistTemplate[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Checklist Templates</h2>
          <p className="text-sm text-muted-foreground">
            Manage checklist templates for drawing reviews
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Checklist
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No checklists yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first checklist template to start reviewing drawings
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Checklist
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                {category}
              </h3>
              {categoryTemplates.map(template => (
                <TickSheetCard
                  key={template.id}
                  template={template}
                  onEdit={setEditingTemplate}
                  onDelete={setDeletingTemplate}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <EditTickSheetDialog
        open={isAddDialogOpen || !!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingTemplate(null);
          }
        }}
        template={editingTemplate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.name}"? 
              This will also delete all checklist items. This action cannot be undone.
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
    </div>
  );
}
