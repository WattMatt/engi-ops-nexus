import { Building2, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className={cn(
      "flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent",
      "border-b border-border/50 backdrop-blur-sm",
      "sticky top-16 z-40",
      className
    )}>
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
        <Building2 className="h-4 w-4 text-primary" />
      </div>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-foreground truncate">
            {projectName}
          </span>
          {projectNumber && (
            <>
              <span className="text-muted-foreground/60">•</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 font-medium">
                <Hash className="h-3.5 w-3.5" />
                {projectNumber}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
