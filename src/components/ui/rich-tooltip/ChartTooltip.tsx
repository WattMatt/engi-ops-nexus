import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChartData {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}

interface ChartTooltipProps {
  children: ReactNode;
  title?: string;
  description?: string;
  chartType?: "bar" | "pie" | "line" | "progress";
  data: ChartData[];
  showPercentages?: boolean;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
  maxWidth?: string;
}

/**
 * Tooltip with embedded charts/diagrams/SVG infographics
 */
export function ChartTooltip({
  children,
  title,
  description,
  chartType = "bar",
  data,
  showPercentages = true,
  side = "top",
  align = "center",
  delayDuration = 300,
  className,
  maxWidth = "280px",
}: ChartTooltipProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...data.map((d) => d.value));

  const defaultColors = [
    "bg-primary",
    "bg-blue-500",
    "bg-green-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-pink-500",
  ];

  const getColor = (index: number, customColor?: string) =>
    customColor || defaultColors[index % defaultColors.length];

  const renderBarChart = () => (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium text-foreground">
              {item.value}
              {showPercentages && total > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({Math.round((item.value / total) * 100)}%)
                </span>
              )}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", getColor(index, item.color))}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderPieChart = () => {
    let cumulativePercentage = 0;

    return (
      <div className="flex items-center gap-4">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            className="stroke-muted"
            strokeWidth="3"
          />
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            const dashArray = `${percentage} ${100 - percentage}`;
            const dashOffset = -cumulativePercentage;
            cumulativePercentage += percentage;

            return (
              <circle
                key={index}
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                className={cn(
                  item.color
                    ? ""
                    : defaultColors[index % defaultColors.length].replace("bg-", "stroke-")
                )}
                style={item.color ? { stroke: item.color } : undefined}
                strokeWidth="3"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="flex-1 space-y-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className={cn("w-2 h-2 rounded-full", getColor(index, item.color))}
              />
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground ml-auto">
                {showPercentages && total > 0
                  ? `${Math.round((item.value / total) * 100)}%`
                  : item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProgressChart = () => (
    <div className="space-y-2">
      {data.map((item, index) => {
        const percentage = item.percentage ?? Math.min((item.value / maxValue) * 100, 100);
        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground">{Math.round(percentage)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", getColor(index, item.color))}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderChart = () => {
    switch (chartType) {
      case "pie":
        return renderPieChart();
      case "progress":
        return renderProgressChart();
      case "bar":
      default:
        return renderBarChart();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={cn(
            "p-3 bg-popover border border-border shadow-lg",
            className
          )}
          style={{ maxWidth }}
        >
          <div className="space-y-3">
            {title && (
              <h4 className="font-semibold text-sm text-foreground">{title}</h4>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {renderChart()}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ChartTooltip;
