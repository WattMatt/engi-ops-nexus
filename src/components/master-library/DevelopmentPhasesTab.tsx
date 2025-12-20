import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RotateCcw, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { developmentPhases } from "./development-phases/phaseData";
import { usePhaseProgress } from "./development-phases/usePhaseProgress";
import { PhaseCard } from "./development-phases/PhaseCard";

export function DevelopmentPhasesTab() {
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

  const checkDependenciesMet = (phaseId: string): boolean => {
    const phase = developmentPhases.find((p) => p.id === phaseId);
    if (!phase || phase.dependencies.length === 0) return true;

    return phase.dependencies.every((depId) => {
      const depProgress = getPhaseProgress(depId);
      return depProgress.status === "verified";
    });
  };

  const handleResetAll = () => {
    if (window.confirm("Are you sure you want to reset all phase progress? This cannot be undone.")) {
      resetAllPhases();
      toast.success("All phases reset");
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                BOQ Processing Development Phases
              </CardTitle>
              <CardDescription className="mt-1">
                Complete development workflow for BOQ Upload → Master Library → Final Account
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetAll}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span className="font-medium">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
                  <div className="text-sm text-muted-foreground">Verified</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{inProgressCount}</div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{untestedCount}</div>
                  <div className="text-sm text-muted-foreground">Untested</div>
                </div>
              </div>
            </div>

            {/* Phase Flow Diagram */}
            <div className="flex items-center justify-center gap-2 py-4 overflow-x-auto">
              {developmentPhases.map((phase, index) => {
                const progress = getPhaseProgress(phase.id);
                const bgColor =
                  progress.status === "verified"
                    ? "bg-green-500"
                    : progress.status === "in_progress"
                    ? "bg-yellow-500"
                    : "bg-muted";
                const textColor =
                  progress.status === "verified" || progress.status === "in_progress"
                    ? "text-white"
                    : "text-muted-foreground";

                return (
                  <div key={phase.id} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${bgColor} ${textColor}`}
                    >
                      {phase.number}
                    </div>
                    {index < developmentPhases.length - 1 && (
                      <div className="w-8 h-0.5 bg-muted" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Cards */}
      <div className="space-y-4">
        {developmentPhases.map((phase) => {
          const progress = getPhaseProgress(phase.id);
          const dependenciesMet = checkDependenciesMet(phase.id);

          return (
            <PhaseCard
              key={phase.id}
              phase={phase}
              checkedItems={progress.checkedItems}
              status={progress.status}
              notes={progress.notes}
              onToggleItem={(itemId) => toggleChecklistItem(phase.id, itemId)}
              onSetStatus={(status) => setPhaseStatus(phase.id, status)}
              onSetNotes={(notes) => setPhaseNotes(phase.id, notes)}
              onReset={() => resetPhase(phase.id)}
              dependenciesMet={dependenciesMet}
            />
          );
        })}
      </div>
    </div>
  );
}
