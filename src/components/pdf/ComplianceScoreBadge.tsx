import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface ComplianceScoreBadgeProps {
  score: number;
  className?: string;
  showIcon?: boolean;
}

export function ComplianceScoreBadge({ 
  score, 
  className,
  showIcon = true 
}: ComplianceScoreBadgeProps) {
  const getScoreStyle = () => {
    if (score >= 90) return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      icon: CheckCircle
    };
    if (score >= 70) return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-800 dark:text-amber-300',
      icon: AlertTriangle
    };
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
      icon: XCircle
    };
  };
  
  const style = getScoreStyle();
  const Icon = style.icon;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
      style.bg,
      style.text,
      className
    )}>
      {showIcon && <Icon className="h-3 w-3" />}
      {score}% Compliant
    </span>
  );
}
