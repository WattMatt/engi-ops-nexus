import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { DiaryFormData } from "../DiaryEntryFormDialog";

interface SafetySectionProps {
  formData: DiaryFormData;
  updateFormData: (updates: Partial<DiaryFormData>) => void;
}

const SAFETY_PROMPTS = [
  "Were there any near-misses or incidents today?",
  "Any safety concerns observed on site?",
  "Toolbox talks or safety briefings conducted?",
  "PPE compliance observations?",
  "Hazards identified and mitigated?",
];

export const SafetySection = ({
  formData,
  updateFormData,
}: SafetySectionProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Safety Observations
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Document health and safety observations, incidents, and compliance for the day
        </p>
      </div>

      {/* Safety Prompt Card */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Consider documenting:
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            {SAFETY_PROMPTS.map((prompt, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                {prompt}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="safetyObservations" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Safety Observations & Notes
          </Label>
          <Textarea
            id="safetyObservations"
            placeholder="Document any safety observations, incidents, near-misses, toolbox talks conducted, PPE compliance, or hazards identified today...

Example:
- Morning toolbox talk conducted on working at heights (12 attendees)
- Near-miss reported: unsecured ladder in Block B - immediately corrected
- All workers observed wearing correct PPE
- New scaffolding inspected and tagged for use"
            value={formData.safetyObservations}
            onChange={(e) =>
              updateFormData({ safetyObservations: e.target.value })
            }
            rows={10}
            className="resize-none"
          />
        </div>
      </div>

      {/* Safety Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-400">
                Good Practice
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Note positive safety behaviors and compliance observed
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-amber-700 dark:text-amber-400">
                Near Misses
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Record close calls that could have resulted in injury
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-700 dark:text-red-400">
                Incidents
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Document any injuries, accidents, or serious hazards
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
