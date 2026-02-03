/**
 * Phase configuration for Gantt chart styling
 * Provides consistent colors and icons for roadmap phases
 */

import { 
  Clipboard, 
  PencilRuler, 
  HardHat, 
  Settings2, 
  FileImage, 
  CheckSquare, 
  FileQuestion,
  Briefcase,
  Zap,
  FileText,
  type LucideIcon
} from "lucide-react";

export interface PhaseConfig {
  bgColor: string;
  barColor: string;
  textColor: string;
  borderColor: string;
  icon: LucideIcon;
  label: string;
}

export const PHASE_CONFIGS: Record<string, PhaseConfig> = {
  "Planning & Preparation": {
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    barColor: "bg-gradient-to-r from-blue-500 to-blue-600",
    textColor: "text-blue-800 dark:text-blue-200",
    borderColor: "border-blue-300 dark:border-blue-700",
    icon: Clipboard,
    label: "Planning & Preparation",
  },
  "Planning": {
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    barColor: "bg-gradient-to-r from-blue-500 to-blue-600",
    textColor: "text-blue-800 dark:text-blue-200",
    borderColor: "border-blue-300 dark:border-blue-700",
    icon: Clipboard,
    label: "Planning",
  },
  "Budget & Assessment": {
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    barColor: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    textColor: "text-emerald-800 dark:text-emerald-200",
    borderColor: "border-emerald-300 dark:border-emerald-700",
    icon: Briefcase,
    label: "Budget & Assessment",
  },
  "Tender & Procurement": {
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    barColor: "bg-gradient-to-r from-violet-500 to-violet-600",
    textColor: "text-violet-800 dark:text-violet-200",
    borderColor: "border-violet-300 dark:border-violet-700",
    icon: FileText,
    label: "Tender & Procurement",
  },
  "Design": {
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    barColor: "bg-gradient-to-r from-purple-500 to-purple-600",
    textColor: "text-purple-800 dark:text-purple-200",
    borderColor: "border-purple-300 dark:border-purple-700",
    icon: PencilRuler,
    label: "Design",
  },
  "Drawings": {
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    barColor: "bg-gradient-to-r from-pink-500 to-pink-600",
    textColor: "text-pink-800 dark:text-pink-200",
    borderColor: "border-pink-300 dark:border-pink-700",
    icon: FileImage,
    label: "Drawings",
  },
  "Documentation": {
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    barColor: "bg-gradient-to-r from-indigo-500 to-indigo-600",
    textColor: "text-indigo-800 dark:text-indigo-200",
    borderColor: "border-indigo-300 dark:border-indigo-700",
    icon: FileText,
    label: "Documentation",
  },
  "Construction": {
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    barColor: "bg-gradient-to-r from-orange-500 to-orange-600",
    textColor: "text-orange-800 dark:text-orange-200",
    borderColor: "border-orange-300 dark:border-orange-700",
    icon: HardHat,
    label: "Construction",
  },
  "Commissioning": {
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    barColor: "bg-gradient-to-r from-amber-500 to-amber-600",
    textColor: "text-amber-800 dark:text-amber-200",
    borderColor: "border-amber-300 dark:border-amber-700",
    icon: Zap,
    label: "Commissioning",
  },
  "Handover": {
    bgColor: "bg-teal-100 dark:bg-teal-900/30",
    barColor: "bg-gradient-to-r from-teal-500 to-teal-600",
    textColor: "text-teal-800 dark:text-teal-200",
    borderColor: "border-teal-300 dark:border-teal-700",
    icon: CheckSquare,
    label: "Handover",
  },
  "Unlinked": {
    bgColor: "bg-gray-100 dark:bg-gray-800/30",
    barColor: "bg-gradient-to-r from-gray-400 to-gray-500",
    textColor: "text-gray-600 dark:text-gray-300",
    borderColor: "border-gray-300 dark:border-gray-600",
    icon: FileQuestion,
    label: "Unlinked",
  },
};

export const DEFAULT_PHASE_CONFIG: PhaseConfig = {
  bgColor: "bg-slate-100 dark:bg-slate-800/30",
  barColor: "bg-gradient-to-r from-slate-400 to-slate-500",
  textColor: "text-slate-800 dark:text-slate-200",
  borderColor: "border-slate-300 dark:border-slate-600",
  icon: Settings2,
  label: "Other",
};

export function getPhaseConfig(phase: string | null): PhaseConfig {
  if (!phase) return PHASE_CONFIGS["Unlinked"];
  return PHASE_CONFIGS[phase] || DEFAULT_PHASE_CONFIG;
}

export function getBarColorForPhase(phase: string | null, status: string): string {
  const config = getPhaseConfig(phase);
  
  // Completed tasks have a success overlay
  if (status === "completed") {
    return "bg-gradient-to-r from-green-500 to-green-600";
  }
  
  // Cancelled tasks are grayed out
  if (status === "cancelled") {
    return "bg-gradient-to-r from-gray-400 to-gray-500";
  }
  
  // In progress tasks get a pulse effect (handled via CSS)
  return config.barColor;
}
