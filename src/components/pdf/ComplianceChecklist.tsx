import { Check, AlertTriangle, Info, X } from "lucide-react";
import { ComplianceResult } from "@/utils/pdfComplianceChecker";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ComplianceChecklistProps {
  results: ComplianceResult[];
  className?: string;
}

export function ComplianceChecklist({ results, className }: ComplianceChecklistProps) {
  const getIcon = (result: ComplianceResult) => {
    if (result.passed) {
      return <Check className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
    
    switch (result.rule.severity) {
      case 'error':
        return <X className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
  };
  
  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'error': return 'Error';
      case 'warning': return 'Warning';
      default: return 'Info';
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {results.map((result) => (
        <div 
          key={result.rule.id}
          className={cn(
            "flex items-start gap-2 p-2 rounded-md text-sm transition-colors",
            result.passed 
              ? "bg-green-50/50 dark:bg-green-950/20" 
              : result.rule.severity === 'error'
                ? "bg-red-50/50 dark:bg-red-950/20"
                : "bg-amber-50/50 dark:bg-amber-950/20"
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(result)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-medium",
                !result.passed && "text-foreground"
              )}>
                {result.rule.name}
              </span>
              {!result.passed && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium uppercase",
                  result.rule.severity === 'error' 
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                )}>
                  {getSeverityLabel(result.rule.severity)}
                </span>
              )}
            </div>
            
            {result.details && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {result.details}
              </p>
            )}
            
            {!result.passed && result.actualValue && result.expectedValue && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-xs text-muted-foreground mt-1 underline decoration-dotted underline-offset-2 hover:text-foreground">
                      View details
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                      <p><span className="font-medium">Actual:</span> {result.actualValue}</p>
                      <p><span className="font-medium">Expected:</span> {result.expectedValue}</p>
                      <p className="text-muted-foreground italic">Ref: {result.rule.reference}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
