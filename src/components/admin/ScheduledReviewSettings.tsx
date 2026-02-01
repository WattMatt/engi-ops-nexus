import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  Mail, 
  Settings, 
  Play, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  X,
  Plus
} from "lucide-react";
import { format } from "date-fns";

interface ScheduledReviewSettings {
  id: string;
  is_enabled: boolean;
  schedule_frequency: string;
  schedule_day: number;
  schedule_time: string;
  recipient_emails: string[];
  focus_areas: string[];
  last_run_at: string | null;
  next_run_at: string | null;
}

const FOCUS_AREA_OPTIONS = [
  { id: "ui", label: "UI/UX Design" },
  { id: "performance", label: "Performance" },
  { id: "security", label: "Security" },
  { id: "database", label: "Database" },
  { id: "components", label: "Components" },
  { id: "operational", label: "Operational" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function ScheduledReviewSettings() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [isRunningManual, setIsRunningManual] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["scheduled-review-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_review_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data as ScheduledReviewSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ScheduledReviewSettings>) => {
      if (!settings?.id) throw new Error("No settings found");
      
      const { error } = await supabase
        .from("scheduled_review_settings")
        .update(updates)
        .eq("id", settings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-review-settings"] });
      toast.success("Settings updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const handleToggleEnabled = (enabled: boolean) => {
    updateMutation.mutate({ is_enabled: enabled });
  };

  const handleFrequencyChange = (frequency: string) => {
    updateMutation.mutate({ schedule_frequency: frequency });
  };

  const handleDayChange = (day: string) => {
    updateMutation.mutate({ schedule_day: parseInt(day) });
  };

  const handleTimeChange = (time: string) => {
    updateMutation.mutate({ schedule_time: time });
  };

  const handleFocusAreaToggle = (areaId: string, checked: boolean) => {
    if (!settings) return;
    
    const newAreas = checked
      ? [...settings.focus_areas, areaId]
      : settings.focus_areas.filter((a) => a !== areaId);
    
    updateMutation.mutate({ focus_areas: newAreas });
  };

  const handleAddEmail = () => {
    if (!settings || !newEmail.trim()) return;
    
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Invalid email address");
      return;
    }
    
    if (settings.recipient_emails.includes(email)) {
      toast.error("Email already added");
      return;
    }

    updateMutation.mutate({ 
      recipient_emails: [...settings.recipient_emails, email] 
    });
    setNewEmail("");
  };

  const handleRemoveEmail = (email: string) => {
    if (!settings) return;
    updateMutation.mutate({
      recipient_emails: settings.recipient_emails.filter((e) => e !== email),
    });
  };

  const handleRunNow = async () => {
    setIsRunningManual(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-scheduled-review", {
        body: { manual: true },
      });

      if (error) throw error;

      toast.success(`Review complete! Score: ${data.overallScore}/100`);
      queryClient.invalidateQueries({ queryKey: ["scheduled-review-settings"] });
      queryClient.invalidateQueries({ queryKey: ["application-reviews"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to run review");
    } finally {
      setIsRunningManual(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Scheduled Reviews
        </CardTitle>
        <CardDescription>
          Configure automatic application reviews with email notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Scheduled Reviews</Label>
            <p className="text-sm text-muted-foreground">
              Automatically run reviews and send email notifications
            </p>
          </div>
          <Switch
            checked={settings.is_enabled}
            onCheckedChange={handleToggleEnabled}
          />
        </div>

        {/* Schedule Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Frequency
            </Label>
            <Select
              value={settings.schedule_frequency}
              onValueChange={handleFrequencyChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(settings.schedule_frequency === "weekly" || 
            settings.schedule_frequency === "biweekly") && (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={String(settings.schedule_day)}
                onValueChange={handleDayChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {settings.schedule_frequency === "monthly" && (
            <div className="space-y-2">
              <Label>Day of Month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={settings.schedule_day}
                onChange={(e) => handleDayChange(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time
            </Label>
            <Input
              type="time"
              value={settings.schedule_time.slice(0, 5)}
              onChange={(e) => handleTimeChange(e.target.value + ":00")}
            />
          </div>
        </div>

        {/* Last/Next Run Info */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30">
          <div>
            <p className="text-sm text-muted-foreground">Last Run</p>
            <p className="font-medium">
              {settings.last_run_at
                ? format(new Date(settings.last_run_at), "MMM dd, yyyy 'at' h:mm a")
                : "Never"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Next Scheduled</p>
            <p className="font-medium">
              {settings.is_enabled && settings.next_run_at
                ? format(new Date(settings.next_run_at), "MMM dd, yyyy 'at' h:mm a")
                : "Not scheduled"}
            </p>
          </div>
        </div>

        {/* Focus Areas */}
        <div className="space-y-3">
          <Label>Review Focus Areas</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {FOCUS_AREA_OPTIONS.map((area) => (
              <div key={area.id} className="flex items-center space-x-2">
                <Checkbox
                  id={area.id}
                  checked={settings.focus_areas.includes(area.id)}
                  onCheckedChange={(checked) =>
                    handleFocusAreaToggle(area.id, checked === true)
                  }
                />
                <Label htmlFor={area.id} className="text-sm cursor-pointer">
                  {area.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Email Recipients */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Recipients
          </Label>
          
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Add email address..."
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
            />
            <Button onClick={handleAddEmail} size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {settings.recipient_emails.map((email) => (
              <Badge key={email} variant="secondary" className="gap-1 pr-1">
                {email}
                <button
                  onClick={() => handleRemoveEmail(email)}
                  className="ml-1 hover:bg-muted rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {settings.recipient_emails.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No recipients added. Add emails to receive review notifications.
              </p>
            )}
          </div>
        </div>

        {/* Manual Trigger */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleRunNow}
            disabled={isRunningManual}
            className="w-full"
          >
            {isRunningManual ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Review...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Review Now
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Manually trigger a review and send notifications to all recipients
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
