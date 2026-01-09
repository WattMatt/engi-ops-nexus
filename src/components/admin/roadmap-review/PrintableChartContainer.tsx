import { useEffect, useRef, useState } from "react";
import { ProjectComparisonChart } from "./ProjectComparisonChart";
import { PriorityHeatMap } from "./PriorityHeatMap";
import { TeamWorkloadChart } from "./TeamWorkloadChart";
import { EnhancedProjectSummary } from "@/utils/roadmapReviewCalculations";

interface PrintableChartContainerProps {
  projects: EnhancedProjectSummary[];
  onChartsReady?: () => void;
}

/**
 * Hidden container that renders charts for PDF capture.
 * Charts are rendered at a fixed size for consistent PDF output.
 */
export function PrintableChartContainer({ 
  projects, 
  onChartsReady 
}: PrintableChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for charts to fully render
    const timer = setTimeout(() => {
      setIsReady(true);
      onChartsReady?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onChartsReady]);

  return (
    <div
      ref={containerRef}
      className="fixed left-[-9999px] top-0 bg-white"
      style={{ width: '800px' }}
      aria-hidden="true"
    >
      {/* Project Comparison Chart */}
      <div 
        id="project-comparison-chart-printable"
        className="p-4"
        style={{ width: '780px', height: '400px' }}
      >
        <ProjectComparisonChart projects={projects} />
      </div>

      {/* Priority Heat Map */}
      <div 
        id="priority-heat-map-printable"
        className="p-4"
        style={{ width: '780px', height: '350px' }}
      >
        <PriorityHeatMap projects={projects} />
      </div>

      {/* Team Workload Chart */}
      <div 
        id="team-workload-chart-printable"
        className="p-4"
        style={{ width: '780px', height: '350px' }}
      >
        <TeamWorkloadChart projects={projects} />
      </div>

      {/* Ready indicator for debugging */}
      {isReady && (
        <div data-testid="charts-ready" className="hidden">
          Charts rendered
        </div>
      )}
    </div>
  );
}
