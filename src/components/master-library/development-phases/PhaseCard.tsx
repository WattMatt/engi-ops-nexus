import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RotateCcw,
  FileCode,
  Database,
  CheckCircle2,
  Clock,
  Circle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { DevelopmentPhase } from "./phaseData";
import { PhaseStatus } from "./usePhaseProgress";

interface PhaseCardProps {
  phase: DevelopmentPhase;
  checkedItems: string[];
  status: PhaseStatus;
  notes: string;
  onToggleItem: (itemId: string) => void;
  onSetStatus: (status: PhaseStatus) => void;
  onSetNotes: (notes: string) => void;
  onReset: () => void;
  dependenciesMet: boolean;
}

export function PhaseCard({
  phase,
  checkedItems,
  status,
  notes,
  onToggleItem,
  onSetStatus,
  onSetNotes,
  onReset,
  dependenciesMet,
}: PhaseCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedQuery, setCopiedQuery] = useState(false);

  const completedCount = checkedItems.length;
  const totalCount = phase.checklist.length;
  const completionPercent = Math.round((completedCount / totalCount) * 100);

  const copyToClipboard = async (text: string, type: "prompt" | "query") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "prompt") {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
      } else {
        setCopiedQuery(true);
        setTimeout(() => setCopiedQuery(false), 2000);
      }
      toast.success(`${type === "prompt" ? "Prompt" : "Query"} copied to clipboard`);
    } catch (e) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "verified":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Verified</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">In Progress</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Untested</Badge>;
    }
  };

  return (
    <Card className={`transition-all ${!dependenciesMet ? "opacity-60" : ""}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <CardTitle className="text-lg">
                    Phase {phase.number}: {phase.title}
                  </CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge()}
                <Badge variant="secondary">
                  {completedCount}/{totalCount} checks
                </Badge>
                {completionPercent > 0 && (
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-10">
              {phase.goal}
            </p>
            {phase.dependencies.length > 0 && (
              <div className="flex items-center gap-1 ml-10 mt-1">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Depends on: Phase {phase.dependencies.map(d => d.split('-')[1]).join(', ')}
                </span>
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Development Prompt Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Development Prompt</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(phase.prompt, "prompt")}
                >
                  {copiedPrompt ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copiedPrompt ? "Copied!" : "Copy Prompt"}
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
                {phase.prompt}
              </pre>
            </div>

            {/* Testing Checklist Section */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Testing Checklist
              </h4>
              <div className="space-y-2">
                {phase.checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={item.id}
                      checked={checkedItems.includes(item.id)}
                      onCheckedChange={() => onToggleItem(item.id)}
                    />
                    <label
                      htmlFor={item.id}
                      className={`text-sm cursor-pointer flex-1 ${
                        checkedItems.includes(item.id)
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Query Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Verification Query</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(phase.verificationQuery, "query")}
                >
                  {copiedQuery ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copiedQuery ? "Copied!" : "Copy SQL"}
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto font-mono text-green-600 dark:text-green-400">
                {phase.verificationQuery}
              </pre>
              <p className="text-xs text-muted-foreground">
                Replace [UPLOAD_ID] or [ACCOUNT_ID] with actual values when testing.
              </p>
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <h4 className="font-semibold">Testing Notes</h4>
              <Textarea
                placeholder="Add notes about testing results, issues found, etc..."
                value={notes}
                onChange={(e) => onSetNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Status Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant={status === "untested" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSetStatus("untested")}
                >
                  Untested
                </Button>
                <Button
                  variant={status === "in_progress" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSetStatus("in_progress")}
                >
                  In Progress
                </Button>
                <Button
                  variant={status === "verified" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSetStatus("verified")}
                  className={status === "verified" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Verified
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-destructive hover:text-destructive"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset Phase
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
