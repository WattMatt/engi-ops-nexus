import React, { useState } from 'react';
import { DocumentationSection, generateSpecificationPrompt, useUpdateDocumentation, useUpdateReadmeContent } from '@/hooks/useDocumentation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Copy, Save, FileText, FolderOpen, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SectionDetailProps {
  section: DocumentationSection;
  onBack: () => void;
}

const statusColors = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  documented: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function SectionDetail({ section, onBack }: SectionDetailProps) {
  const [readmeContent, setReadmeContent] = useState(section.readme_content || '');
  const [status, setStatus] = useState(section.status);
  const updateDocumentation = useUpdateDocumentation();
  const updateReadme = useUpdateReadmeContent();

  const handleCopyPrompt = () => {
    const prompt = generateSpecificationPrompt(section);
    navigator.clipboard.writeText(prompt);
    toast.success('Specification prompt copied to clipboard');
  };

  const handleSaveReadme = () => {
    updateReadme.mutate({
      sectionKey: section.section_key,
      readmeContent,
    });
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus as DocumentationSection['status']);
    updateDocumentation.mutate({
      sectionKey: section.section_key,
      updates: { status: newStatus as DocumentationSection['status'] },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{section.section_name}</h2>
            <Badge className={cn("text-xs", statusColors[status])}>
              {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
          {section.description && (
            <p className="text-muted-foreground mt-1">{section.description}</p>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Section Key:</span>
              <code className="bg-muted px-2 py-0.5 rounded text-xs">{section.section_key}</code>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Path:</span>
              <code className="bg-muted px-2 py-0.5 rounded text-xs truncate">
                {section.component_path || 'N/A'}
              </code>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Updated:</span>
              <span>
                {section.last_updated 
                  ? format(new Date(section.last_updated), 'PPp')
                  : 'Never'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prompt Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Specification Prompt</CardTitle>
              <CardDescription>
                Copy this prompt to generate the documentation for this section
              </CardDescription>
            </div>
            <Button onClick={handleCopyPrompt} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy Prompt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
            {generateSpecificationPrompt(section)}
          </pre>
        </CardContent>
      </Card>

      {/* README Editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">README Content</CardTitle>
              <CardDescription>
                Paste the generated documentation here
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="documented">Documented</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                onClick={handleSaveReadme} 
                disabled={updateReadme.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={readmeContent}
            onChange={(e) => setReadmeContent(e.target.value)}
            placeholder="Paste the generated README documentation here..."
            className="min-h-[400px] font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
