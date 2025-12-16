import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Star, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LightingReportConfig } from './LightingReportTab';

interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  config: LightingReportConfig;
  is_default: boolean;
}

interface ReportTemplateManagerProps {
  templates: ReportTemplate[];
  currentConfig: LightingReportConfig;
  onTemplateSelect: (templateId: string) => void;
  onTemplatesChange: () => void;
}

export const ReportTemplateManager: React.FC<ReportTemplateManagerProps> = ({
  templates,
  currentConfig,
  onTemplateSelect,
  onTemplatesChange,
}) => {
  const { toast } = useToast();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the template",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        name: templateName,
        description: templateDescription || null,
        config: currentConfig as unknown as Record<string, unknown>,
        created_by: user?.id || null,
        is_default: false,
      };

      const { error } = await supabase
        .from('lighting_report_templates')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Template Saved",
        description: `Template "${templateName}" has been saved`,
      });

      setShowSaveDialog(false);
      setTemplateName('');
      setTemplateDescription('');
      onTemplatesChange();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTemplate = async () => {
    if (!selectedTemplate || !templateName.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('lighting_report_templates')
        .update({
          name: templateName,
          description: templateDescription || null,
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      toast({
        title: "Template Updated",
        description: `Template "${templateName}" has been updated`,
      });

      setShowEditDialog(false);
      setSelectedTemplate(null);
      setTemplateName('');
      setTemplateDescription('');
      onTemplatesChange();
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (template: ReportTemplate) => {
    if (template.is_default) {
      toast({
        title: "Cannot Delete",
        description: "Default templates cannot be deleted",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('lighting_report_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Template Deleted",
        description: `Template "${template.name}" has been deleted`,
      });

      onTemplatesChange();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setShowEditDialog(true);
  };

  const countEnabledSections = (config: LightingReportConfig): number => {
    return Object.values(config.sections).filter(Boolean).length;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Report Templates</CardTitle>
              <CardDescription>Manage saved report configurations</CardDescription>
            </div>
            <Button onClick={() => setShowSaveDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Save Current as Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Sections</TableHead>
                <TableHead className="text-center">Cover Page</TableHead>
                <TableHead className="text-center">TOC</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(template => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {template.is_default && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      <span className="font-medium">{template.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {template.description || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {countEnabledSections(template.config)} / 8
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {template.config.includesCoverPage ? '✓' : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {template.config.includeTableOfContents ? '✓' : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTemplateSelect(template.id)}
                      >
                        Use
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(template)}
                        disabled={template.is_default}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template)}
                        disabled={template.is_default}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Enter description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsTemplate} disabled={isSubmitting || !templateName.trim()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Enter description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTemplate} disabled={isSubmitting || !templateName.trim()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
