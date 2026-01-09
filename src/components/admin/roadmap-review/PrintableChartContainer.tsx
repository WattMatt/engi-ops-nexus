import { useEffect, useRef, useState } from "react";
import { ProjectComparisonChart } from "./ProjectComparisonChart";
import { PriorityHeatMap } from "./PriorityHeatMap";
import { TeamWorkloadChart } from "./TeamWorkloadChart";
import { PrintableProjectRoadmapChart } from "./PrintableProjectRoadmapChart";
import { EnhancedProjectSummary } from "@/utils/roadmapReviewCalculations";

interface PrintableChartContainerProps {
  projects: EnhancedProjectSummary[];
  onChartsReady?: () => void;
  visible?: boolean;
  includeProjectCharts?: boolean;
}

/**
 * Hidden container that renders charts for PDF capture.
 * Charts are rendered at a fixed size for consistent PDF output.
 * The chart component IDs are used directly - no wrapper IDs needed.
 */
export function PrintableChartContainer({ 
  projects, 
  onChartsReady,
  visible = false,
  includeProjectCharts = true
}: PrintableChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for charts to fully render before signaling ready
    // Longer wait when project charts are included
    const waitTime = includeProjectCharts ? 2500 : 1500;
    const timer = setTimeout(() => {
      setIsReady(true);
      onChartsReady?.();
    }, waitTime);

    return () => clearTimeout(timer);
  }, [onChartsReady, includeProjectCharts]);

  // When not visible, hide off-screen but still render for capture
  const containerStyle = visible 
    ? { width: '900px', padding: '20px' }
    : { position: 'fixed' as const, left: '-9999px', top: '0', width: '900px' };

  return (
    <div
      ref={containerRef}
      className="bg-white"
      style={containerStyle}
      aria-hidden={!visible}
    >
      {/* 
        Each chart component already has its own ID on the Card element.
        - ProjectComparisonChart has id="project-comparison-chart"
        - PriorityHeatMap has id="priority-heat-map"  
        - TeamWorkloadChart has id="team-workload-chart"
        - PrintableProjectRoadmapChart has id="project-roadmap-chart-{index}"
        
        We just need to render them at fixed sizes for consistent capture.
      */}
      
      {/* Project Comparison Chart - Full width */}
      <div 
        className="mb-6"
        style={{ width: '860px', minHeight: '450px' }}
      >
        <ProjectComparisonChart projects={projects} />
      </div>

      {/* Priority Heat Map */}
      <div 
        className="mb-6"
        style={{ width: '860px', minHeight: '350px' }}
      >
        <PriorityHeatMap projects={projects} />
      </div>

      {/* Team Workload Chart */}
      <div 
        className="mb-6"
        style={{ width: '860px', minHeight: '400px' }}
      >
        <TeamWorkloadChart projects={projects} />
      </div>

      {/* Individual Project Roadmap Charts for PDF embedding */}
      {includeProjectCharts && projects.map((project, index) => (
        <div 
          key={project.projectId}
          className="mb-4"
          style={{ width: '460px' }}
        >
          <PrintableProjectRoadmapChart 
            project={project} 
            projectIndex={index} 
          />
        </div>
      ))}

      {/* Ready indicator for debugging */}
      {isReady && (
        <div data-testid="charts-ready" className="hidden">
          Charts rendered and ready for capture
        </div>
      )}
    </div>
  );
}
