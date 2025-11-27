import { Building2, Hash } from 'lucide-react';

interface ProjectContextHeaderProps {
  projectName: string;
  projectNumber?: string;
  className?: string;
}

/**
 * Persistent header displaying current project context.
 * Helps users avoid confusion when switching between multiple active projects.
 */
export function ProjectContextHeader({ 
  projectName, 
  projectNumber,
  className = ''
}: ProjectContextHeaderProps) {
  if (!projectName) return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-border ${className}`}>
      <Building2 className="h-4 w-4 text-primary shrink-0" />
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium text-sm text-foreground truncate">
          {projectName}
        </span>
        {projectNumber && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Hash className="h-3 w-3" />
              {projectNumber}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
