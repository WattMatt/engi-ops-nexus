import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, FolderOpen, Plus } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";

interface Project {
  id: string;
  project_number: string;
  name: string;
}

export const ProjectDropdown = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadProjects();
    loadSelectedProject();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_number, name")
        .order("project_number");

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const loadSelectedProject = async () => {
    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) return;

    const { data } = await supabase
      .from("projects")
      .select("id, project_number, name")
      .eq("id", projectId)
      .single();

    if (data) {
      setSelectedProject(data);
    }
  };

  const handleProjectSelect = (project: Project) => {
    localStorage.setItem("selectedProjectId", project.id);
    setSelectedProject(project);
    window.location.reload(); // Reload to update all components
  };

  const handleManageProjects = () => {
    navigate("/projects");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 min-w-[200px] justify-between">
            <span className="truncate">
              {selectedProject
                ? `${selectedProject.project_number}: ${selectedProject.name}`
                : "Select Project"}
            </span>
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[300px] bg-popover">
          <div className="px-2 py-1.5 text-sm font-semibold">
            Select Project
          </div>
          <DropdownMenuSeparator />
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => handleProjectSelect(project)}
              className={
                selectedProject?.id === project.id
                  ? "bg-primary/10 font-medium"
                  : ""
              }
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{project.project_number}</span>
                <span className="text-xs text-muted-foreground">{project.name}</span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleManageProjects}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Manage Projects
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onProjectCreated={() => {
          loadProjects();
          setCreateDialogOpen(false);
        }}
      />
    </>
  );
};
