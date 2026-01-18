import { ReactNode } from "react";
import { InfoTooltip } from "@/components/ui/rich-tooltip";
import { Search, Filter, X, RefreshCw, LucideIcon } from "lucide-react";

interface SearchTooltipProps {
  children: ReactNode;
  placeholder?: string;
  tips?: string[];
  shortcuts?: { key: string; action: string }[];
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Tooltip for search input fields with tips and shortcuts
 */
export function SearchTooltip({
  children,
  placeholder = "Search...",
  tips = [
    "Type to filter results instantly",
    "Use quotes for exact match",
    "Press Escape to clear",
  ],
  shortcuts,
  side = "bottom",
}: SearchTooltipProps) {
  const formattedShortcuts = shortcuts?.map((s) => ({
    key: s.key,
    label: s.action,
  })) || [
    { key: "Ctrl", label: "" },
    { key: "K", label: "to focus" },
  ];

  return (
    <InfoTooltip
      title="Search"
      description={`${placeholder}\n\nTips:\n${tips.map((t) => `• ${t}`).join("\n")}`}
      icon={Search}
      iconColor="text-blue-600"
      shortcuts={formattedShortcuts}
      side={side}
      delayDuration={500}
    >
      {children}
    </InfoTooltip>
  );
}

interface FilterTooltipProps {
  children: ReactNode;
  filterTypes?: string[];
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Tooltip for filter controls
 */
export function FilterTooltip({
  children,
  filterTypes = ["Status", "Date", "Category", "Owner"],
  side = "bottom",
}: FilterTooltipProps) {
  return (
    <InfoTooltip
      title="Filter Results"
      description={`Narrow down results by:\n${filterTypes.map((f) => `• ${f}`).join("\n")}\n\nCombine multiple filters for precise results.`}
      icon={Filter}
      iconColor="text-purple-600"
      side={side}
      delayDuration={400}
    >
      {children}
    </InfoTooltip>
  );
}

interface RefreshTooltipProps {
  children: ReactNode;
  lastUpdated?: string;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Tooltip for refresh/reload buttons
 */
export function RefreshTooltip({
  children,
  lastUpdated,
  side = "bottom",
}: RefreshTooltipProps) {
  return (
    <InfoTooltip
      title="Refresh Data"
      description={`Reload the latest data from the server.${lastUpdated ? `\n\nLast updated: ${lastUpdated}` : ""}`}
      icon={RefreshCw}
      iconColor="text-green-600"
      shortcuts={[{ key: "Ctrl" }, { key: "R" }]}
      side={side}
      delayDuration={300}
    >
      {children}
    </InfoTooltip>
  );
}


