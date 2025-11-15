import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download, Trash2, FileText, Info, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlaceholderQuickCopy } from "@/components/shared/PlaceholderQuickCopy";
import { useUserRole } from "@/hooks/useUserRole";
import { REPORT_TEMPLATE_TYPES, ReportTemplateType, getTemplatePlaceholders } from "@/utils/reportTemplateSchemas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function DocumentTemplates() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useUserRole();
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState<ReportTemplateType | 'all'>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    template_type: 'cover_page' as ReportTemplateType,
    is_default: false,
  });
  const queryClient = useQueryClient();

  // Restrict access
  if (loading) return <div className="p-8">Loading...</div>;
  if (!isAdmin) {
    return <div className="p-8">You do not have permission to access this page.</div>;
  }

  // Fetch existing templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['document_templates', filterType],
    queryFn: async () => {
      let query = supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filterType !== 'all') {
        query = query.eq('template_type', filterType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];

    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a Word document (.doc or .docx)');
      return;
    }

    if (!newTemplate.name) {
      toast.error('Please enter a template name');
      return;
    }

    setUploading(true);

    try {
      // Upload to Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document_templates')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('document_templates')
        .getPublicUrl(fileName);

      // Get placeholders for this template type
      const placeholders = getTemplatePlaceholders(newTemplate.template_type);

      // Insert into database
      const { error: dbError } = await supabase
        .from('document_templates')
        .insert([{
          name: newTemplate.name,
          description: newTemplate.description || null,
          file_name: file.name,
          file_url: publicUrl,
          template_type: newTemplate.template_type,
          is_active: true,
          is_default_cover: newTemplate.is_default,
          placeholder_schema: placeholders,
        }]);

      if (dbError) throw dbError;

      toast.success('Template uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['document_templates'] });
      setUploadDialogOpen(false);
      setNewTemplate({
        name: '',
        description: '',
        template_type: 'cover_page',
        is_default: false,
      });
    } catch (error: any) {
      console.error('Error uploading template:', error);
      toast.error(error.message || 'Failed to upload template');
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset input
    }
  };

  // Download handler
  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  // Delete mutation
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['document_templates'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="placeholders">Placeholders</TabsTrigger>
            <TabsTrigger value="setup">Setup Guide</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Document Template Manager</h2>
                  <p className="text-muted-foreground">Upload and manage Word templates for all report types</p>
                </div>
              </div>

              {/* Filter by template type */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="filter-type">Filter by Type</Label>
                  <Select value={filterType} onValueChange={(value) => setFilterType(value as ReportTemplateType | 'all')}>
                    <SelectTrigger id="filter-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      {REPORT_TEMPLATE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => setUploadDialogOpen(true)} className="mt-6">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New Template
                </Button>
              </div>

              {/* Upload Dialog */}
              {uploadDialogOpen && (
                <Card className="p-6 border-2 border-primary">
                  <h3 className="text-lg font-semibold mb-4">Upload New Template</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="template-name">Template Name *</Label>
                      <Input
                        id="template-name"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="e.g., Standard Cost Report Template"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-description">Description</Label>
                      <Textarea
                        id="template-description"
                        value={newTemplate.description}
                        onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                        placeholder="Optional description of this template"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-type">Template Type *</Label>
                      <Select 
                        value={newTemplate.template_type} 
                        onValueChange={(value) => setNewTemplate({ ...newTemplate, template_type: value as ReportTemplateType })}
                      >
                        <SelectTrigger id="template-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REPORT_TEMPLATE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is-default"
                        checked={newTemplate.is_default}
                        onChange={(e) => setNewTemplate({ ...newTemplate, is_default: e.target.checked })}
                      />
                      <Label htmlFor="is-default">Set as default template for this type</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setUploadDialogOpen(false);
                          setNewTemplate({
                            name: '',
                            description: '',
                            template_type: 'cover_page',
                            is_default: false,
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1" 
                        onClick={() => document.getElementById('template-upload')?.click()}
                        disabled={uploading || !newTemplate.name}
                      >
                        {uploading ? 'Uploading...' : 'Choose File & Upload'}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
              <input
                id="template-upload"
                type="file"
                accept=".doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Templates List */}
              {isLoading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : templates.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {filterType === 'all' ? 'No templates uploaded yet' : `No ${filterType} templates found`}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {filterType === 'all' 
                      ? 'Upload your first Word template to get started with automated report generation'
                      : `Upload a template for ${REPORT_TEMPLATE_TYPES.find(t => t.value === filterType)?.label} reports`
                    }
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">{template.name}</h3>
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mb-2">{template.file_name}</p>
                          <div className="flex gap-2 flex-wrap">
                            <span className="text-xs bg-secondary px-2 py-1 rounded">
                              {REPORT_TEMPLATE_TYPES.find(t => t.value === template.template_type)?.label || template.template_type}
                            </span>
                            {template.is_active && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Active
                              </span>
                            )}
                            {template.is_default_cover && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(template.file_url, template.file_name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTemplate.mutate(template.id)}
                            disabled={deleteTemplate.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Placeholder Reference */}
          <TabsContent value="placeholders" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Placeholder Reference</h2>
              <p className="text-muted-foreground mb-4">
                Select a report type to view available placeholders
              </p>
              <Select value={filterType} onValueChange={(value) => setFilterType(value as ReportTemplateType | 'all')}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TEMPLATE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filterType !== 'all' && (
              <PlaceholderQuickCopy templateType={filterType as ReportTemplateType} />
            )}
          </TabsContent>

          {/* Setup Guide */}
          <TabsContent value="setup" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Template Setup Guide</h2>
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">1. Create Your Word Template</h3>
                  <p className="text-muted-foreground">Create a Word document with your desired layout and styling.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">2. Add Text Placeholders</h3>
                  <p className="text-muted-foreground mb-2">
                    Insert placeholders using curly braces, e.g., <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">{'{project_name}'}</code>
                  </p>
                  <p className="text-muted-foreground">
                    Check the Placeholders tab to see all available placeholders for each report type.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">3. Add Logo Placeholders</h3>
                  <ol className="text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Insert any placeholder image in Word</li>
                    <li>Right-click → "Edit Alt Text"</li>
                    <li>Set alt text to <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">company_logo</code> or <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">client_logo</code></li>
                  </ol>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">4. Upload Template</h3>
                  <p className="text-muted-foreground">
                    Go to the Templates tab, click "Upload New Template", fill in the details, and select the appropriate template type.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
