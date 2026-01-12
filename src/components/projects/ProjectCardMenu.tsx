import { useState } from "react";
import { MoreVertical, Info, Trash2, MapPin, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  project_number: string;
  name: string;
  description: string | null;
  status: string;
  project_logo_url: string | null;
  client_logo_url: string | null;
  city?: string | null;
  province?: string | null;
}

interface ProjectCardMenuProps {
  project: Project;
  onDeleted?: () => void;
}

export const ProjectCardMenu = ({ project, onDeleted }: ProjectCardMenuProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);

      if (error) throw error;

      toast.success(`Project "${project.name}" deleted successfully`);
      onDeleted?.();
    } catch (error: any) {
      toast.error(`Failed to delete project: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600",
    proposal: "bg-amber-500/10 text-amber-600",
    completed: "bg-blue-500/10 text-blue-600",
    on_hold: "bg-slate-500/10 text-slate-600",
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => setShowInfoDialog(true)}>
            <Info className="mr-2 h-4 w-4" />
            Project Info
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Project Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {project.name}
            </DialogTitle>
            <DialogDescription>
              Project details and information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Project Number</p>
                <p className="font-medium">{project.project_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={statusColors[project.status] || statusColors.active}>
                  {project.status}
                </Badge>
              </div>
            </div>
            
            {project.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{project.description}</p>
              </div>
            )}
            
            {(project.city || project.province) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {[project.city, project.province].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            
            {(project.project_logo_url || project.client_logo_url) && (
              <div className="flex items-center gap-4 pt-2 border-t">
                {project.project_logo_url && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Project Logo</p>
                    <img 
                      src={project.project_logo_url} 
                      alt="Project Logo" 
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                )}
                {project.client_logo_url && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Client Logo</p>
                    <img 
                      src={project.client_logo_url} 
                      alt="Client Logo" 
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>{project.name}</strong> ({project.project_number})?
              </p>
              <p className="text-destructive">
                This action cannot be undone. All project data including tenants, documents, and schedules will be permanently deleted.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
