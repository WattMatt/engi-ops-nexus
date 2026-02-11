import { CircuitBoard } from "lucide-react";
import { DBLegendCardsDashboard } from "@/components/db-legend-cards/DBLegendCardsDashboard";
import { useProject } from "@/hooks/useProject";
import { EmptyState } from "@/components/common/FeedbackStates";

export default function DBLegendCards() {
  const { projectId } = useProject();

  if (!projectId) {
    return (
      <div className="flex-1 p-6">
        <EmptyState
          icon={CircuitBoard}
          title="No project selected"
          description="Select a project to view DB legend cards"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CircuitBoard className="h-6 w-6" />
          DB Legend Cards
        </h1>
        <p className="text-muted-foreground">
          Review and approve distribution board legend cards submitted by contractors
        </p>
      </div>
      <DBLegendCardsDashboard projectId={projectId} />
    </div>
  );
}
