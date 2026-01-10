import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  RotateCcw, FileText, CheckCircle2, Clock, AlertCircle, 
  ChevronDown, ChevronRight, FileCode, ArrowRight, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { pdfMigrationPhases, getMigrationStats, MigrationFile, MigrationPhase } from "./pdfMigrationData";
import { usePdfMigrationProgress, MigrationStatus } from "./usePdfMigrationProgress";
import { cn } from "@/lib/utils";

const statusColors: Record<MigrationStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  blocked: "bg-red-500/10 text-red-600 border-red-500/20",
};

const statusIcons: Record<MigrationStatus, typeof CheckCircle2> = {
  pending: AlertCircle,
  in_progress: Loader2,
  completed: CheckCircle2,
  blocked: AlertCircle,
};

const complexityColors: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

interface PhaseCardProps {
  phase: MigrationPhase;
  progress: ReturnType<typeof usePdfMigrationProgress>;
  dependenciesMet: boolean;
}

function PhaseCard({ phase, progress, dependenciesMet }: PhaseCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const phaseProgress = progress.getPhaseProgress(phase.id);
  
  const completedCount = phase.files.filter(
    f => progress.getFileProgress(phase.id, f.id).status === "completed"
  ).length;
  const progressPercent = phase.files.length > 0 ? Math.round((completedCount / phase.files.length) * 100) : 0;

  const StatusIcon = statusIcons[phaseProgress.status];

  return (
    <Card className={cn(
      "transition-all",
      !dependenciesMet && "opacity-60"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  phaseProgress.status === "completed" ? "bg-green-500 text-white" :
                  phaseProgress.status === "in_progress" ? "bg-yellow-500 text-white" :
                  "bg-muted text-muted-foreground"
                )}>
                  {phase.number}
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {phase.name}
                    <Badge variant="outline" className="text-xs">
                      {phase.category}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm mt-0.5">
                    {phase.description}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium">{completedCount}/{phase.files.length} files</div>
                  <Progress value={progressPercent} className="w-24 h-2" />
                </div>
                <Badge className={statusColors[phaseProgress.status]}>
                  <StatusIcon className={cn("h-3 w-3 mr-1", phaseProgress.status === "in_progress" && "animate-spin")} />
                  {phaseProgress.status}
                </Badge>
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {!dependenciesMet && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-700">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Dependencies not met. Complete phases: {phase.dependencies.join(", ")}
              </div>
            )}
            
            {/* Files List */}
            <div className="space-y-2">
              {phase.files.map(file => {
                const fileProgress = progress.getFileProgress(phase.id, file.id);
                const FileStatusIcon = statusIcons[fileProgress.status];
                
                return (
                  <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <FileCode className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono truncate">{file.path}</div>
                      <div className="text-xs text-muted-foreground">{file.description}</div>
                    </div>
                    <Badge className={complexityColors[file.complexity]} variant="outline">
                      {file.complexity}
                    </Badge>
                    <Select
                      value={fileProgress.status}
                      onValueChange={(value) => progress.setFileStatus(phase.id, file.id, value as MigrationStatus)}
                      disabled={!dependenciesMet}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            {/* Phase Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Phase Notes</label>
              <Textarea
                value={phaseProgress.notes}
                onChange={(e) => progress.setPhaseNotes(phase.id, e.target.value)}
                placeholder="Add notes about this migration phase..."
                className="min-h-[80px]"
              />
            </div>

            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  progress.resetPhase(phase.id);
                  toast.success(`Phase ${phase.number} reset`);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Phase
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function PdfMigrationTab() {
  const progress = usePdfMigrationProgress();
  const stats = getMigrationStats();

  // Calculate overall progress
  const totalFiles = pdfMigrationPhases.reduce((sum, p) => sum + p.files.length, 0);
  const completedFiles = pdfMigrationPhases.reduce((sum, phase) => 
    sum + phase.files.filter(f => progress.getFileProgress(phase.id, f.id).status === "completed").length, 0
  );
  const overallProgress = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;

  const completedPhases = pdfMigrationPhases.filter(
    p => progress.getPhaseProgress(p.id).status === "completed"
  ).length;
  const inProgressPhases = pdfMigrationPhases.filter(
    p => progress.getPhaseProgress(p.id).status === "in_progress"
  ).length;
  const pendingPhases = pdfMigrationPhases.filter(
    p => progress.getPhaseProgress(p.id).status === "pending"
  ).length;

  const checkDependenciesMet = (phaseId: string): boolean => {
    const phase = pdfMigrationPhases.find(p => p.id === phaseId);
    if (!phase || phase.dependencies.length === 0) return true;
    
    return phase.dependencies.every(depId => {
      const depProgress = progress.getPhaseProgress(depId);
      return depProgress.status === "completed";
    });
  };

  const handleResetAll = () => {
    if (window.confirm("Are you sure you want to reset all migration progress? This cannot be undone.")) {
      progress.resetAllProgress();
      toast.success("All migration progress reset");
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
                PDF Migration: jsPDF → pdfmake
              </CardTitle>
              <CardDescription className="mt-1">
                Migrate all PDF generation from jsPDF to pdfmake across {totalFiles} files in {pdfMigrationPhases.length} phases
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
                <span className="font-medium">{completedFiles}/{totalFiles} files ({overallProgress}%)</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{completedPhases}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{inProgressPhases}</div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{pendingPhases}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border">
                <FileCode className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{totalFiles}</div>
                  <div className="text-sm text-muted-foreground">Total Files</div>
                </div>
              </div>
            </div>

            {/* Complexity Summary */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Complexity:</span>
              <Badge className={complexityColors.low}>{stats.lowComplexity} Low</Badge>
              <Badge className={complexityColors.medium}>{stats.mediumComplexity} Medium</Badge>
              <Badge className={complexityColors.high}>{stats.highComplexity} High</Badge>
            </div>

            {/* Phase Flow Diagram */}
            <div className="flex items-center justify-center gap-2 py-4 overflow-x-auto">
              {pdfMigrationPhases.map((phase, index) => {
                const phaseProgress = progress.getPhaseProgress(phase.id);
                const bgColor = 
                  phaseProgress.status === "completed" ? "bg-green-500" :
                  phaseProgress.status === "in_progress" ? "bg-yellow-500" :
                  "bg-muted";
                const textColor = 
                  phaseProgress.status === "completed" || phaseProgress.status === "in_progress"
                    ? "text-white"
                    : "text-muted-foreground";

                return (
                  <div key={phase.id} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        bgColor,
                        textColor
                      )}
                      title={phase.name}
                    >
                      {phase.number}
                    </div>
                    {index < pdfMigrationPhases.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
        {pdfMigrationPhases.map(phase => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            progress={progress}
            dependenciesMet={checkDependenciesMet(phase.id)}
          />
        ))}
      </div>
    </div>
  );
}
