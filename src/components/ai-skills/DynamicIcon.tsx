import {
  Zap,
  FileText,
  Calculator,
  ShieldCheck,
  FolderKanban,
  HardHat,
  BarChart3,
  FileSignature,
  Sparkles,
  Brain,
  Code,
  Lightbulb,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  zap: Zap,
  "file-text": FileText,
  calculator: Calculator,
  "shield-check": ShieldCheck,
  "folder-kanban": FolderKanban,
  "hard-hat": HardHat,
  "bar-chart-3": BarChart3,
  "file-signature": FileSignature,
  sparkles: Sparkles,
  brain: Brain,
  code: Code,
  lightbulb: Lightbulb,
  settings: Settings,
  wrench: Wrench,
};

interface DynamicIconProps {
  name: string;
  className?: string;
}

export function DynamicIcon({ name, className }: DynamicIconProps) {
  const IconComponent = iconMap[name] || Sparkles;
  return <IconComponent className={cn("h-4 w-4", className)} />;
}
