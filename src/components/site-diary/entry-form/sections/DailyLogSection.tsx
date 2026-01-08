import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, X } from "lucide-react";
import { DiaryFormData } from "../DiaryEntryFormDialog";

interface DailyLogSectionProps {
  formData: DiaryFormData;
  updateFormData: (updates: Partial<DiaryFormData>) => void;
}

export const DailyLogSection = ({
  formData,
  updateFormData,
}: DailyLogSectionProps) => {
  const addAttendee = (name: string) => {
    if (name.trim() && !formData.attendees.includes(name.trim())) {
      updateFormData({ attendees: [...formData.attendees, name.trim()] });
    }
  };

  const removeAttendee = (name: string) => {
    updateFormData({
      attendees: formData.attendees.filter((a) => a !== name),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Daily Log
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Record the day's activities, progress, issues, and observations
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="progress" className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            Site Progress & Activities
          </Label>
          <p className="text-xs text-muted-foreground">
            What work was completed today? Document all significant activities.
          </p>
          <Textarea
            id="progress"
            placeholder="Example: Started the day with morning briefing at 7:30 AM. Excavation works continued in the northern section. Concrete pour completed for foundation Block A. Electrical team began conduit installation..."
            value={formData.progress}
            onChange={(e) => updateFormData({ progress: e.target.value })}
            rows={5}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="queries" className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            Issues & Concerns
          </Label>
          <p className="text-xs text-muted-foreground">
            Any problems, delays, or questions that came up today?
          </p>
          <Textarea
            id="queries"
            placeholder="Example: Delay in steel delivery - expected tomorrow. Need clarification on window specifications from architect. Safety concern noted regarding scaffolding in west wing..."
            value={formData.queries}
            onChange={(e) => updateFormData({ queries: e.target.value })}
            rows={4}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="delays" className="flex items-center gap-2">
            <span className="text-lg">⏱️</span>
            Delays & Disruptions
          </Label>
          <p className="text-xs text-muted-foreground">
            Document any time lost and the causes (important for claims and records)
          </p>
          <Textarea
            id="delays"
            placeholder="Example: 2-hour delay due to late concrete delivery. Rain stopped work between 14:00-15:30..."
            value={formData.delaysDisruptions}
            onChange={(e) => updateFormData({ delaysDisruptions: e.target.value })}
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quality" className="flex items-center gap-2">
            <span className="text-lg">✓</span>
            Quality Issues
          </Label>
          <p className="text-xs text-muted-foreground">
            Any quality concerns or defects identified today?
          </p>
          <Textarea
            id="quality"
            placeholder="Example: Minor honeycombing noted in column C3 - remedial work scheduled. Paint finish in room 201 requires touch-up..."
            value={formData.qualityIssues}
            onChange={(e) => updateFormData({ qualityIssues: e.target.value })}
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            Additional Observations
          </Label>
          <p className="text-xs text-muted-foreground">
            Anything else worth noting for the record?
          </p>
          <Textarea
            id="notes"
            placeholder="Example: Site morale is high. New workers settled in well. Reminded team about safety protocols. Site cleaned and secured for the night..."
            value={formData.notes}
            onChange={(e) => updateFormData({ notes: e.target.value })}
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <span className="text-lg">👥</span>
            Meeting Attendees
          </Label>
          <p className="text-xs text-muted-foreground">
            Who attended site meetings today?
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Add attendee name and press Enter"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAttendee(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
            />
          </div>
          {formData.attendees.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.attendees.map((attendee) => (
                <Badge key={attendee} variant="secondary" className="gap-1">
                  {attendee}
                  <button
                    type="button"
                    onClick={() => removeAttendee(attendee)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="meetingMinutes" className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            Meeting Minutes
          </Label>
          <p className="text-xs text-muted-foreground">
            Record key discussion points and decisions from site meetings
          </p>
          <Textarea
            id="meetingMinutes"
            placeholder="Meeting summary, key decisions, action items discussed..."
            value={formData.meetingMinutes}
            onChange={(e) => updateFormData({ meetingMinutes: e.target.value })}
            rows={4}
            className="resize-none"
          />
        </div>
      </div>
    </div>
  );
};
