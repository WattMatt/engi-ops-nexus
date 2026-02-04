import { ClipboardCheck } from "lucide-react";
import { ProjectInspectionItems } from "@/components/procurement/inspections/ProjectInspectionItems";
import { useProject } from "@/hooks/useProject";
import { EmptyState } from "@/components/common/FeedbackStates";

export default function Inspections() {
  const { projectId } = useProject();

  if (!projectId) {
    return (
      <div className="flex-1 p-6">
        <EmptyState
          icon={ClipboardCheck}
          title="No project selected"
          description="Select a project to view inspection items"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6" />
          Inspections
        </h1>
        <p className="text-muted-foreground">
          Manage and track QC inspections for this project
        </p>
      </div>

      {/* Inspection Items Component */}
      <ProjectInspectionItems projectId={projectId} />
    </div>
  );
}
