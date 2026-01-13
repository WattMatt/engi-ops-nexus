import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEmailTemplate, useEmailSenders, useEmailTemplateCategories, useCreateEmailTemplate, useUpdateEmailTemplate } from "@/hooks/useEmailTemplates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, Eye, Code, Sparkles, LayoutTemplate, Variable, Send, Undo2, Lock, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { EmailBuilderCanvas } from "./builder/EmailBuilderCanvas";
import { EmailPreviewModal } from "./EmailPreviewModal";

interface TemplateFormData {
  name: string;
  description: string;
  category_id: string;
  sender_id: string;
  subject_template: string;
  html_content: string;
  json_content: any;
  variables: any[];
  is_active: boolean;
  is_default: boolean;
}

const DEFAULT_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; max-width: 600px; background: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Watson Mattheus</h1>
              <p style="margin: 12px 0 0 0; opacity: 0.9;">{{title}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p>Hi {{recipient_name}},</p>
              <p>{{content}}</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f8fafc; padding: 24px; text-align: center; color: #64748b; font-size: 12px;">
              <p style="margin: 0;">Watson Mattheus Engineering</p>
              <p style="margin: 8px 0 0 0;">This is an automated message.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

const DEFAULT_VARIABLES = [
  { name: "recipient_name", description: "Recipient's full name", example: "John Smith" },
  { name: "title", description: "Email title/header", example: "Notification" },
  { name: "content", description: "Main email content", example: "Your message here..." },
];

export function EmailTemplateEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === "new";

  const { data: template, isLoading: templateLoading } = useEmailTemplate(id === "new" ? "" : id!);
  const { data: senders } = useEmailSenders();
  const { data: categories } = useEmailTemplateCategories();
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();

  const [activeTab, setActiveTab] = useState("builder");
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    description: "",
    category_id: "",
    sender_id: "",
    subject_template: "",
    html_content: DEFAULT_HTML,
    json_content: null,
    variables: DEFAULT_VARIABLES,
    is_active: true,
    is_default: false,
  });

  // Initialize form with template data when loaded
  useEffect(() => {
    if (template && !isNew) {
      setFormData({
        name: template.name,
        description: template.description || "",
        category_id: template.category_id || "",
        sender_id: template.sender_id || "",
        subject_template: template.subject_template,
        html_content: template.html_content,
        json_content: template.json_content,
        variables: template.variables || DEFAULT_VARIABLES,
        is_active: template.is_active,
        is_default: template.is_default,
      });
    }
  }, [template, isNew]);

  const handleSave = async () => {
    if (!formData.name || !formData.subject_template) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      if (isNew) {
        await createTemplate.mutateAsync(formData);
        toast.success("Template created");
        navigate("/admin/email-templates");
      } else {
        await updateTemplate.mutateAsync({ id: id!, ...formData });
        toast.success("Template saved");
      }
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleBuilderChange = useCallback((html: string, json: any) => {
    setFormData((prev) => ({
      ...prev,
      html_content: html,
      json_content: json,
    }));
  }, []);

  if (templateLoading && !isNew) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  const isSystemTemplate = template?.is_system === true;

  return (
    <div className="space-y-6">
      {/* System Template Warning */}
      {isSystemTemplate && !isNew && (
        <Alert className="border-amber-300 bg-amber-50">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>System Template</strong> – This template is managed by the system and used by automated workflows. 
            Changes here will update the template for all future emails. The edge function implementation remains the source of truth.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/email-templates")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                {isNew ? "Create Email Template" : `Edit: ${template?.name || "Template"}`}
              </h1>
              <p className="text-muted-foreground">
                {isNew ? "Design a new email template with the drag-and-drop builder" : `Version ${template?.version || 1}`}
              </p>
            </div>
            {isSystemTemplate && (
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50">
                <Lock className="h-3 w-3" />
                System
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)} className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={createTemplate.isPending || updateTemplate.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {isNew ? "Create Template" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        {/* Settings Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Template Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Welcome Email"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this template used for?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender">Sender</Label>
              <Select
                value={formData.sender_id}
                onValueChange={(value) => setFormData({ ...formData, sender_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sender" />
                </SelectTrigger>
                <SelectContent>
                  {senders?.filter((s) => s.is_active).map((sender) => (
                    <SelectItem key={sender.id} value={sender.id}>
                      <span>{sender.display_name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({sender.full_email})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line *</Label>
              <Input
                id="subject"
                placeholder="e.g., Welcome to Watson Mattheus, {{recipient_name}}!"
                value={formData.subject_template}
                onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{variable}}"} for dynamic content
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_default">Set as Default</Label>
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
            </div>

            {/* Variables */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Variable className="h-4 w-4" />
                <Label>Available Variables</Label>
              </div>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {formData.variables.map((variable, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {`{{${variable.name}}}`}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {variable.description}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Editor Panel */}
        <Card className="overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-0 border-b">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="builder" className="gap-2">
                  <LayoutTemplate className="h-4 w-4" />
                  Visual Builder
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <Code className="h-4 w-4" />
                  HTML Code
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Assist
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="builder" className="m-0 h-[600px]">
              <EmailBuilderCanvas
                initialHtml={formData.html_content}
                initialJson={formData.json_content}
                onChange={handleBuilderChange}
              />
            </TabsContent>

            <TabsContent value="code" className="m-0 p-4">
              <Textarea
                value={formData.html_content}
                onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                className="font-mono text-sm h-[560px] resize-none"
                placeholder="Enter HTML content..."
              />
            </TabsContent>

            <TabsContent value="ai" className="m-0 p-6">
              <div className="flex flex-col items-center justify-center h-[560px] text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">AI Writing Assistant</h3>
                <p className="text-muted-foreground mt-1 max-w-md">
                  Coming soon: Get AI-powered suggestions for subject lines, content improvements, and personalization.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Preview Modal */}
      <EmailPreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        html={formData.html_content}
        subject={formData.subject_template}
        variables={formData.variables}
      />
    </div>
  );
}
