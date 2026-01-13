import React from 'react';
import { DocumentationSection, generateSpecificationPrompt } from '@/hooks/useDocumentation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, FileText, Folder, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SectionListItemProps {
  section: DocumentationSection;
  isParent: boolean;
  onSelect: () => void;
}

const statusColors = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  documented: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const statusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  documented: 'Done',
};

export function SectionListItem({ section, isParent, onSelect }: SectionListItemProps) {
  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = generateSpecificationPrompt(section);
    navigator.clipboard.writeText(prompt);
    toast.success('Specification prompt copied to clipboard');
  };

  return (
    <div 
      className={cn(
        "flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer transition-colors flex-1",
        "hover:bg-muted/50",
        isParent && "font-semibold"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isParent ? (
          <Folder className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        
        <span className="truncate">{section.section_name}</span>
        
        {section.component_path && (
          <span className="text-xs text-muted-foreground truncate hidden md:block">
            {section.component_path.split('/').pop()}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <Badge 
          variant="secondary" 
          className={cn("text-xs", statusColors[section.status])}
        >
          {statusLabels[section.status]}
        </Badge>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCopyPrompt}
          title="Copy specification prompt"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
