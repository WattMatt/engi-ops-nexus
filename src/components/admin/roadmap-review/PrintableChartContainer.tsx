import { useEffect, useRef, useState } from "react";
import { ProjectComparisonChart } from "./ProjectComparisonChart";
import { PriorityHeatMap } from "./PriorityHeatMap";
import { TeamWorkloadChart } from "./TeamWorkloadChart";
import { PrintableProjectRoadmapChart } from "./PrintableProjectRoadmapChart";
import { PortfolioHealthGauge } from "./PortfolioHealthGauge";
import { EnhancedProjectSummary, PortfolioMetrics, calculatePortfolioMetrics } from "@/utils/roadmapReviewCalculations";

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
 * 
 * Chart IDs captured:
 * - portfolio-health-gauge
 * - project-comparison-chart
 * - priority-heatmap-chart
 * - team-workload-chart
 */
export function PrintableChartContainer({ 
  projects, 
  onChartsReady,
  visible = false,
  includeProjectCharts = false // Disabled by default to prevent timeout
}: PrintableChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Calculate portfolio metrics for the health gauge
  const metrics = calculatePortfolioMetrics(projects);

  useEffect(() => {
    // Wait for charts to fully render before signaling ready
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
        Each chart component has its own ID on the Card element.
        - PortfolioHealthGauge has id="portfolio-health-gauge"
        - ProjectComparisonChart has id="project-comparison-chart"
        - PriorityHeatMap has id="priority-heatmap-chart"  
        - TeamWorkloadChart has id="team-workload-chart"
      */}
      
      {/* Portfolio Health Gauge - Compact */}
      <div 
        className="mb-6"
        style={{ width: '400px', minHeight: '200px' }}
      >
        <PortfolioHealthGauge score={metrics.totalHealthScore} size="md" />
      </div>

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

      {/* Individual Project Roadmap Charts - DISABLED by default for performance */}
      {includeProjectCharts && projects.slice(0, 5).map((project, index) => (
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
