import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface MeetingMinutesProps {
  value: string;
  attendees: string[];
  onChange: (value: string) => void;
  onAttendeesChange: (attendees: string[]) => void;
}

export const MeetingMinutes = ({ value, attendees, onChange, onAttendeesChange }: MeetingMinutesProps) => {
  const [newAttendee, setNewAttendee] = useState("");

  const addAttendee = () => {
    if (newAttendee.trim() && !attendees.includes(newAttendee.trim())) {
      onAttendeesChange([...attendees, newAttendee.trim()]);
      setNewAttendee("");
    }
  };

  const removeAttendee = (attendee: string) => {
    onAttendeesChange(attendees.filter((a) => a !== attendee));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="attendees">Meeting Attendees</Label>
        <div className="flex gap-2">
          <Input
            id="attendees"
            value={newAttendee}
            onChange={(e) => setNewAttendee(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAttendee())}
            placeholder="Enter name and press Enter"
          />
          <Button type="button" size="sm" onClick={addAttendee}>
            Add
          </Button>
        </div>
        {attendees.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attendees.map((attendee) => (
              <Badge key={attendee} variant="secondary" className="pl-3 pr-1">
                {attendee}
                <button
                  type="button"
                  onClick={() => removeAttendee(attendee)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="minutes">Meeting Minutes</Label>
        <Textarea
          id="minutes"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Record key discussion points, decisions made, and action items..."
          rows={8}
        />
      </div>
    </div>
  );
};