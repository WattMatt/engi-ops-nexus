import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectOverview } from "./ProjectOverview";
import { ProjectOverviewSidebar, OverviewSection } from "./ProjectOverviewSidebar";
import { UserRoadmapReview } from "./UserRoadmapReview";
import { ProjectAnalytics } from "./ProjectAnalytics";
import { ProjectDocuments } from "./ProjectDocuments";

interface ProjectOverviewWithSidebarProps {
  projectId: string;
  onNavigate?: (tab: string) => void;
}

export function ProjectOverviewWithSidebar({ 
  projectId, 
  onNavigate 
}: ProjectOverviewWithSidebarProps) {
  const [activeSection, setActiveSection] = useState<OverviewSection>("overview");

  // Fetch project name for sidebar
  const { data: project } = useQuery({
    queryKey: ["project-name", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <ProjectOverview projectId={projectId} onNavigate={onNavigate} />;
      case "roadmap-review":
        return <UserRoadmapReview projectId={projectId} />;
      case "analytics":
        return <ProjectAnalytics projectId={projectId} />;
      case "documents":
        return <ProjectDocuments projectId={projectId} />;
      default:
        return <ProjectOverview projectId={projectId} onNavigate={onNavigate} />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-16rem)] min-h-[600px] bg-background rounded-lg border overflow-hidden">
      {/* Sidebar */}
      <ProjectOverviewSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        projectName={project?.name}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {renderContent()}
      </div>
    </div>
  );
}
