import { useEffect, useState } from "react";
import { ProjectRoadmapWidget } from "@/components/dashboard/roadmap/ProjectRoadmapWidget";

export default function ProjectRoadmap() {
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    const storedProjectId = localStorage.getItem("selectedProjectId");
    if (storedProjectId) {
      setProjectId(storedProjectId);
    }
  }, []);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No project selected. Please select a project first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Project Roadmap</h1>
        <p className="text-muted-foreground">
          Track project milestones, phases, and deliverables
        </p>
      </div>
      
      <ProjectRoadmapWidget projectId={projectId} />
    </div>
  );
}
