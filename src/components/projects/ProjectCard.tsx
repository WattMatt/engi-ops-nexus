import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  project_number: string;
  name: string;
  description: string | null;
  status: string;
  project_logo_url: string | null;
  client_logo_url: string | null;
}

interface ProjectCardProps {
  project: Project;
  onSelect: (id: string) => void;
  index: number;
  viewMode: "grid" | "list";
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  proposal: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  completed: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  on_hold: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-500" },
};

export const ProjectCard = ({ project, onSelect, index, viewMode }: ProjectCardProps) => {
  const status = statusColors[project.status] || statusColors.active;
  
  if (viewMode === "list") {
    return (
      <Card 
        className={cn(
          "cursor-pointer group transition-all duration-300 hover:shadow-md hover:border-primary/50",
          "animate-fade-in"
        )}
        style={{ animationDelay: `${index * 50}ms` }}
        onClick={() => onSelect(project.id)}
      >
        <div className="flex items-center gap-4 p-4">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Folder className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className={cn("flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full", status.bg, status.text)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
              {project.status}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {project.project_number}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{project.name}</h3>
          </div>
          
          {(project.project_logo_url || project.client_logo_url) && (
            <div className="flex items-center gap-3">
              {project.project_logo_url && (
                <img 
                  src={project.project_logo_url} 
                  alt="Project" 
                  className="h-8 w-auto object-contain"
                />
              )}
              {project.client_logo_url && (
                <img 
                  src={project.client_logo_url} 
                  alt="Client" 
                  className="h-8 w-auto object-contain"
                />
              )}
            </div>
          )}
          
          <Button variant="ghost" size="sm" className="gap-2 group-hover:gap-3 transition-all">
            Open
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "cursor-pointer group transition-all duration-300",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/50 hover:-translate-y-1",
        "relative overflow-hidden animate-fade-in"
      )}
      style={{ animationDelay: `${index * 75}ms` }}
      onClick={() => onSelect(project.id)}
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
            <Folder className="h-6 w-6 text-primary" />
          </div>
          <span className={cn(
            "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium",
            status.bg, status.text
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", status.dot)} />
            {project.status}
          </span>
        </div>
        
        {(project.project_logo_url || project.client_logo_url) && (
          <div className="flex items-center justify-center gap-6 mt-5 pb-5 border-b border-border/50">
            {project.project_logo_url && (
              <div className="flex-1 flex justify-center">
                <img 
                  src={project.project_logo_url} 
                  alt="Project Logo" 
                  className="h-12 w-auto object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                />
              </div>
            )}
            {project.project_logo_url && project.client_logo_url && (
              <div className="h-12 w-px bg-border/50" />
            )}
            {project.client_logo_url && (
              <div className="flex-1 flex justify-center">
                <img 
                  src={project.client_logo_url} 
                  alt="Client Logo" 
                  className="h-12 w-auto object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                />
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 space-y-1">
          <div className="text-sm font-semibold text-primary/80">
            {project.project_number}
          </div>
          <CardTitle className="text-lg group-hover:text-primary transition-colors">
            {project.name}
          </CardTitle>
        </div>
        <CardDescription className="line-clamp-2">
          {project.description || "No description"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          className="w-full gap-2 group-hover:gap-3 transition-all" 
          variant="outline"
        >
          Open Project
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
};
