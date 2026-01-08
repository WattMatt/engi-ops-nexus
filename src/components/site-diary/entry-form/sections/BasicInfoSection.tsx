import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Cloud, Sun, CloudRain, CloudSnow, Wind } from "lucide-react";
import { DiaryFormData } from "../DiaryEntryFormDialog";

interface BasicInfoSectionProps {
  formData: DiaryFormData;
  updateFormData: (updates: Partial<DiaryFormData>) => void;
}

const WEATHER_OPTIONS = [
  { value: "sunny", label: "Sunny", icon: Sun },
  { value: "cloudy", label: "Cloudy", icon: Cloud },
  { value: "rainy", label: "Rainy", icon: CloudRain },
  { value: "windy", label: "Windy", icon: Wind },
  { value: "snowy", label: "Snowy", icon: CloudSnow },
];

const ENTRY_TYPES = [
  { value: "standard", label: "Standard Daily Entry" },
  { value: "handover", label: "Project Handover" },
  { value: "inspection", label: "Inspection Record" },
  { value: "milestone", label: "Milestone Achievement" },
  { value: "incident", label: "Incident Report" },
];

const SHIFT_TYPES = [
  { value: "day", label: "Day Shift" },
  { value: "night", label: "Night Shift" },
  { value: "extended", label: "Extended Hours" },
];

export const BasicInfoSection = ({
  formData,
  updateFormData,
}: BasicInfoSectionProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Basic Information
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Set the date, type, and conditions for this diary entry
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="entryDate">Entry Date</Label>
          <Input
            id="entryDate"
            type="date"
            value={formData.entryDate}
            onChange={(e) => updateFormData({ entryDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="entryType">Entry Type</Label>
          <Select
            value={formData.entryType}
            onValueChange={(value) => updateFormData({ entryType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select entry type" />
            </SelectTrigger>
            <SelectContent>
              {ENTRY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose "Handover" for project transition documentation
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="shiftType">Shift Type</Label>
          <Select
            value={formData.shiftType}
            onValueChange={(value) => updateFormData({ shiftType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select shift" />
            </SelectTrigger>
            <SelectContent>
              {SHIFT_TYPES.map((shift) => (
                <SelectItem key={shift.value} value={shift.value}>
                  {shift.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Weather Conditions</Label>
          <div className="flex flex-wrap gap-2">
            {WEATHER_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = formData.weather === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    updateFormData({
                      weather: isSelected ? "" : option.value,
                    })
                  }
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {formData.entryType === "handover" && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">
            Handover Entry
          </h4>
          <p className="text-sm text-muted-foreground">
            This entry will be marked as a handover document. Make sure to complete
            all relevant sections thoroughly to ensure a comprehensive project
            transition record.
          </p>
        </div>
      )}
    </div>
  );
};
