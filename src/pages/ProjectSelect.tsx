import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Folder, LogOut, Map, LayoutGrid } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectFilters } from "@/components/projects/ProjectFilters";
import { ProjectSkeleton } from "@/components/projects/ProjectSkeleton";
import { ProjectsMap } from "@/components/projects/ProjectsMap";
import { DocumentationTab } from "@/components/documentation/DocumentationTab";
import { ProjectsSidebar, ProjectsSection } from "@/components/projects/ProjectsSidebar";
import { RoadmapReviewContent } from "@/components/projects/RoadmapReviewContent";
import { GlobalAnalytics } from "@/components/projects/GlobalAnalytics";
import { cn } from "@/lib/utils";
import { ContractorPortalWidget } from "@/components/admin/ContractorPortalWidget";

interface Project {
  id: string;
  project_number: string;
  name: string;
  description: string | null;
  status: string;
  project_logo_url: string | null;
  client_logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  province: string | null;
}

const ProjectSelect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [activeSection, setActiveSection] = useState<ProjectsSection>("projects");
  const { isAdmin, loading: roleLoading } = useUserRole();
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_number, name, description, status, project_logo_url, client_logo_url, latitude, longitude, city, province")
        .order("project_number", { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationUpdate = (projectId: string, lat: number, lng: number) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, latitude: lat, longitude: lng } : p
    ));
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.project_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const handleProjectSelect = (projectId: string) => {
    localStorage.setItem("selectedProjectId", projectId);
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const renderContent = () => {
    switch (activeSection) {
      case "projects":
        return (
          <>
            {isAdminRoute && <ContractorPortalWidget />}
            {loading || roleLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ProjectSkeleton />
              </div>
            ) : projects.length === 0 ? (
              <Card className="text-center py-16 animate-fade-in">
                <CardContent className="flex flex-col items-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Folder className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Contact your administrator to be added to a project, or create a new one to get started.
                  </p>
                  <CreateProjectDialog onProjectCreated={loadProjects} />
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <ProjectFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    viewMode={viewMode === "map" ? "grid" : viewMode}
                    onViewModeChange={(mode) => setViewMode(mode as "grid" | "list" | "map")}
                    totalCount={projects.length}
                    filteredCount={filteredProjects.length}
                  />
                  
                  {/* Map View Toggle */}
                  <Button
                    variant={viewMode === "map" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode(viewMode === "map" ? "grid" : "map")}
                    className="gap-2 shrink-0"
                  >
                    {viewMode === "map" ? (
                      <>
                        <LayoutGrid className="h-4 w-4" />
                        Cards View
                      </>
                    ) : (
                      <>
                        <Map className="h-4 w-4" />
                        Map View
                      </>
                    )}
                  </Button>
                </div>
                
                {viewMode === "map" ? (
                  <ProjectsMap 
                    projects={filteredProjects}
                    onProjectSelect={handleProjectSelect}
                    onLocationUpdate={handleLocationUpdate}
                  />
                ) : filteredProjects.length === 0 ? (
                  <Card className="text-center py-12 animate-fade-in">
                    <CardContent className="flex flex-col items-center">
                      <div className="p-3 rounded-full bg-muted mb-3">
                        <Folder className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">No matching projects</h3>
                      <p className="text-muted-foreground text-sm">
                        Try adjusting your search or filter criteria
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className={cn(
                    viewMode === "grid" 
                      ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" 
                      : "flex flex-col gap-3"
                  )}>
                    {filteredProjects.map((project, index) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onSelect={handleProjectSelect}
                        onDeleted={loadProjects}
                        index={index}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        );
      case "roadmap-review":
        return <RoadmapReviewContent />;
      case "analytics":
        return <GlobalAnalytics />;
      case "documentation":
        return <DocumentationTab />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gradient-to-b from-background via-background to-muted/20 flex">
      {/* Sidebar */}
      <ProjectsSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b bg-background/80 backdrop-blur-sm shrink-0 z-10">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {activeSection === "projects" && "All Projects"}
                  {activeSection === "roadmap-review" && "Roadmap Review"}
                  {activeSection === "analytics" && "Analytics"}
                  {activeSection === "documentation" && "Documentation"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {activeSection === "projects" && `${projects.length} projects available`}
                  {activeSection === "roadmap-review" && "Track progress across all projects"}
                  {activeSection === "analytics" && "Cross-project insights and metrics"}
                  {activeSection === "documentation" && "Guides and resources"}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <CreateProjectDialog onProjectCreated={loadProjects} />
                
                <Separator orientation="vertical" className="h-6" />
                
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ProjectSelect;
