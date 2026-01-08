import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Plus, Trash2, FileText } from "lucide-react";
import { DiaryFormData, DesignDecision } from "../DiaryEntryFormDialog";

interface DesignDecisionsSectionProps {
  formData: DiaryFormData;
  updateFormData: (updates: Partial<DiaryFormData>) => void;
}

export const DesignDecisionsSection = ({
  formData,
  updateFormData,
}: DesignDecisionsSectionProps) => {
  const [newDecision, setNewDecision] = useState({
    description: "",
    decidedBy: "",
    reference: "",
    impact: "",
  });

  const addDecision = () => {
    if (!newDecision.description) return;

    const entry: DesignDecision = {
      id: `dd_${Date.now()}`,
      ...newDecision,
    };

    updateFormData({
      designDecisions: [...formData.designDecisions, entry],
    });

    setNewDecision({
      description: "",
      decidedBy: "",
      reference: "",
      impact: "",
    });
  };

  const removeDecision = (id: string) => {
    updateFormData({
      designDecisions: formData.designDecisions.filter((d) => d.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Design Decisions & Variations
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Record any design decisions made on site. This is crucial for project handover
          and maintaining a clear audit trail of changes.
        </p>
      </div>

      <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
        <CardContent className="pt-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Important:</strong> Document all design changes, variations from
            drawings, and decisions made with consultants. These records are essential
            for project handover and dispute resolution.
          </p>
        </CardContent>
      </Card>

      {/* Add New Decision */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Decision Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the design decision or variation made today..."
              value={newDecision.description}
              onChange={(e) =>
                setNewDecision({ ...newDecision, description: e.target.value })
              }
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="decidedBy">Decided By</Label>
              <Input
                id="decidedBy"
                placeholder="e.g., Architect, Engineer"
                value={newDecision.decidedBy}
                onChange={(e) =>
                  setNewDecision({ ...newDecision, decidedBy: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (RFI/SI No.)</Label>
              <Input
                id="reference"
                placeholder="e.g., RFI-045, SI-012"
                value={newDecision.reference}
                onChange={(e) =>
                  setNewDecision({ ...newDecision, reference: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impact">Cost/Time Impact</Label>
              <Input
                id="impact"
                placeholder="e.g., +2 days, +R10,000"
                value={newDecision.impact}
                onChange={(e) =>
                  setNewDecision({ ...newDecision, impact: e.target.value })
                }
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={addDecision}
            disabled={!newDecision.description}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Design Decision
          </Button>
        </CardContent>
      </Card>

      {/* Decisions List */}
      {formData.designDecisions.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Recorded Design Decisions</Label>
          <div className="space-y-3">
            {formData.designDecisions.map((decision, index) => (
              <Card key={decision.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium">{decision.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {decision.decidedBy && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">By:</span> {decision.decidedBy}
                            </span>
                          )}
                          {decision.reference && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {decision.reference}
                            </span>
                          )}
                          {decision.impact && (
                            <span className="text-amber-600 font-medium">
                              Impact: {decision.impact}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDecision(decision.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No design decisions recorded yet. Document any variations or decisions made today.
          </p>
        </div>
      )}
    </div>
  );
};
