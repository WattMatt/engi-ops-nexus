import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ProjectRoadmapWidget } from "@/components/dashboard/roadmap/ProjectRoadmapWidget";
import { RoadmapProgressChart } from "@/components/dashboard/roadmap/RoadmapProgressChart";
import { RoadmapExportPDFButton } from "@/components/dashboard/roadmap/RoadmapExportPDFButton";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { ReviewModeButton } from "@/components/dashboard/roadmap/ReviewModeButton";
import { toast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function ProjectRoadmap() {
  const [searchParams] = useSearchParams();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  useEffect(() => {
    const storedProjectId = localStorage.getItem("selectedProjectId");
    if (storedProjectId) {
      setProjectId(storedProjectId);
    }
    
    // Check for highlighted item from deep link
    const highlightId = searchParams.get("highlight");
    if (highlightId) {
      setHighlightedItemId(highlightId);
      
      // Show toast notification
      toast({
        title: "Roadmap Item Found",
        description: "The linked item is highlighted below.",
      });
      
      // Clear the highlight after a delay
      setTimeout(() => setHighlightedItemId(null), 5000);
    }
  }, [searchParams]);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No project selected. Please select a project first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Roadmap</h1>
          <p className="text-muted-foreground">
            Track project milestones, phases, and deliverables
          </p>
        </div>
        <div className="flex gap-2">
          <ReviewModeButton />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <RoadmapExportPDFButton projectId={projectId} />
        </div>
      </div>

      <Collapsible open={showAnalytics} onOpenChange={setShowAnalytics}>
        <CollapsibleContent>
          <RoadmapProgressChart projectId={projectId} />
        </CollapsibleContent>
      </Collapsible>
      
      <ProjectRoadmapWidget projectId={projectId} highlightedItemId={highlightedItemId} />
    </div>
  );
}
