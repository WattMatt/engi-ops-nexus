import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileCode,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { developmentPhases } from "@/components/master-library/development-phases/phaseData";
import { usePhaseProgress } from "@/components/master-library/development-phases/usePhaseProgress";
import { cn } from "@/lib/utils";

export function DevelopmentRoadmapWidget() {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const {
    getPhaseProgress,
    toggleChecklistItem,
    setPhaseStatus,
    setPhaseNotes,
    resetPhase,
    resetAllPhases,
  } = usePhaseProgress();

  // Calculate overall progress
  const totalChecks = developmentPhases.reduce((sum, p) => sum + p.checklist.length, 0);
  const completedChecks = developmentPhases.reduce(
    (sum, p) => sum + getPhaseProgress(p.id).checkedItems.length,
    0
  );
  const overallProgress = Math.round((completedChecks / totalChecks) * 100);

  const verifiedCount = developmentPhases.filter(
    (p) => getPhaseProgress(p.id).status === "verified"
  ).length;
  const inProgressCount = developmentPhases.filter(
    (p) => getPhaseProgress(p.id).status === "in_progress"
  ).length;
  const untestedCount = developmentPhases.filter(
    (p) => getPhaseProgress(p.id).status === "untested"
  ).length;

  const copyPrompt = async (phaseId: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(phaseId);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy prompt");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Verified</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Untested</Badge>;
    }
  };

  const handleResetAll = () => {
    if (window.confirm("Are you sure you want to reset all phase progress? This cannot be undone.")) {
      resetAllPhases();
      toast.success("All phases reset");
    }
  };

  // Group phases: Core Development (1-3) and Visualization & Export (4-5)
  const coreDevelopmentPhases = developmentPhases.filter(p => p.number <= 3);
  const visualizationExportPhases = developmentPhases.filter(p => p.number >= 4);

  const renderPhaseGroup = (phases: typeof developmentPhases, title: string, description: string) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            {phases.filter(p => getPhaseProgress(p.id).status === "verified").length}
          </span>
          <span className="flex items-center gap-1 text-yellow-600">
            <Clock className="h-3 w-3" />
            {phases.filter(p => getPhaseProgress(p.id).status === "in_progress").length}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            {phases.filter(p => getPhaseProgress(p.id).status === "untested").length}
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        {phases.map((phase) => {
          const progress = getPhaseProgress(phase.id);
          const isExpanded = expandedPhase === phase.id;
          const checkedCount = progress.checkedItems.length;
          const totalCount = phase.checklist.length;
          const phaseProgress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

          return (
            <Collapsible
              key={phase.id}
              open={isExpanded}
              onOpenChange={() => setExpandedPhase(isExpanded ? null : phase.id)}
            >
              <div className={cn(
                "border rounded-lg overflow-hidden transition-colors",
                progress.status === "verified" && "border-green-500/30 bg-green-500/5",
                progress.status === "in_progress" && "border-yellow-500/30 bg-yellow-500/5"
              )}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      progress.status === "verified" && "bg-green-500 text-white",
                      progress.status === "in_progress" && "bg-yellow-500 text-white",
                      progress.status === "untested" && "bg-muted text-muted-foreground"
                    )}>
                      {phase.number}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{phase.title}</span>
                        {getStatusBadge(progress.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={phaseProgress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground shrink-0">
                          {checkedCount}/{totalCount}
                        </span>
                      </div>
                    </div>
                    
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t p-3 space-y-4">
                    {/* Goal */}
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Goal:</span>
                      <p className="text-sm mt-1">{phase.goal}</p>
                    </div>

                    {/* Prompt with Copy Button */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Prompt:</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => copyPrompt(phase.id, phase.prompt)}
                        >
                          {copiedId === phase.id ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy Prompt
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="bg-muted/50 rounded-md p-2 max-h-40 overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                          {phase.prompt.slice(0, 500)}
                          {phase.prompt.length > 500 && "..."}
                        </pre>
                      </div>
                    </div>

                    {/* Checklist */}
                    <div>
                      <span className="text-xs font-medium text-muted-foreground mb-2 block">
                        Checklist ({checkedCount}/{totalCount}):
                      </span>
                      <div className="space-y-1">
                        {phase.checklist.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={progress.checkedItems.includes(item.id)}
                              onChange={() => toggleChecklistItem(phase.id, item.id)}
                              className="rounded border-muted-foreground/30"
                            />
                            <span className={cn(
                              progress.checkedItems.includes(item.id) && "line-through text-muted-foreground"
                            )}>
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Status Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground">Status:</span>
                      <div className="flex gap-1">
                        <Button
                          variant={progress.status === "untested" ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setPhaseStatus(phase.id, "untested")}
                        >
                          Untested
                        </Button>
                        <Button
                          variant={progress.status === "in_progress" ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setPhaseStatus(phase.id, "in_progress")}
                        >
                          In Progress
                        </Button>
                        <Button
                          variant={progress.status === "verified" ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setPhaseStatus(phase.id, "verified")}
                        >
                          Verified
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs ml-auto"
                        onClick={() => {
                          resetPhase(phase.id);
                          toast.success(`Phase ${phase.number} reset`);
                        }}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    </div>

                    {/* Notes */}
                    <div>
                      <span className="text-xs font-medium text-muted-foreground mb-1 block">Notes:</span>
                      <Textarea
                        value={progress.notes}
                        onChange={(e) => setPhaseNotes(phase.id, e.target.value)}
                        placeholder="Add notes about this phase..."
                        className="text-xs min-h-[60px]"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Drawing Sheet View Development
            </CardTitle>
            <CardDescription>
              Track progress for Enhanced Drawing Sheet View implementation
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetAll}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {verifiedCount} Verified
            </span>
            <span className="flex items-center gap-1 text-yellow-600">
              <Clock className="h-3 w-3" />
              {inProgressCount} In Progress
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              {untestedCount} Untested
            </span>
          </div>
        </div>

        {/* Phase Groups */}
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {renderPhaseGroup(
              coreDevelopmentPhases, 
              "Core Development (1-3)", 
              "Cable schedules, schedule enhancements, room sizing"
            )}
            {renderPhaseGroup(
              visualizationExportPhases, 
              "Visualization & Export (4-5)", 
              "3D isometric view and PDF generator"
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
