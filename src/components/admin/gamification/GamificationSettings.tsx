import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Calendar, Crown, Bell, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface SettingValue {
  enabled?: boolean;
  day?: string | number;
  time?: string;
  email_subject?: string;
  notify_all_users?: boolean;
  show_weekly_badge?: boolean;
  show_monthly_badge?: boolean;
  weekly_badge_duration_days?: number;
  monthly_badge_duration_days?: number;
  types?: string[];
}

interface GamificationSetting {
  id: string;
  setting_key: string;
  setting_value: SettingValue;
  description: string | null;
}

const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export function GamificationSettings() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<string, SettingValue>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["gamification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gamification_settings")
        .select("*");

      if (error) throw error;
      return data as GamificationSetting[];
    },
  });

  useEffect(() => {
    if (settings) {
      const settingsMap: Record<string, SettingValue> = {};
      settings.forEach((s) => {
        settingsMap[s.setting_key] = s.setting_value as SettingValue;
      });
      setLocalSettings(settingsMap);
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const [key, value] of Object.entries(localSettings)) {
        const { error } = await supabase
          .from("gamification_settings")
          .update({ 
            setting_value: value as any,
            updated_by: user?.id,
          })
          .eq("setting_key", key);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification-settings"] });
      toast.success("Settings saved successfully!");
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast.error("Failed to save settings: " + error.message);
    },
  });

  const updateSetting = (key: string, field: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  const weeklySettings = localSettings["weekly_announcement"] || {};
  const monthlySettings = localSettings["monthly_announcement"] || {};
  const badgeSettings = localSettings["badge_settings"] || {};

  return (
    <div className="space-y-6">
      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
            {saveSettings.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      )}

      {/* Weekly Announcement Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Announcement
          </CardTitle>
          <CardDescription>
            Configure when and how weekly winners are announced
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Weekly Announcements</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send winner emails each week
              </p>
            </div>
            <Switch
              checked={weeklySettings.enabled || false}
              onCheckedChange={(v) => updateSetting("weekly_announcement", "enabled", v)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={weeklySettings.day as string || "friday"}
                onValueChange={(v) => updateSetting("weekly_announcement", "day", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time (24h)</Label>
              <Input
                type="time"
                value={weeklySettings.time || "16:00"}
                onChange={(e) => updateSetting("weekly_announcement", "time", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email Subject</Label>
            <Input
              value={weeklySettings.email_subject || ""}
              onChange={(e) => updateSetting("weekly_announcement", "email_subject", e.target.value)}
              placeholder="🏆 Weekly Winner Announcement!"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Notify All Users</Label>
              <p className="text-sm text-muted-foreground">
                Send announcement to all team members, not just the winner
              </p>
            </div>
            <Switch
              checked={weeklySettings.notify_all_users || false}
              onCheckedChange={(v) => updateSetting("weekly_announcement", "notify_all_users", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Monthly Announcement Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Monthly Announcement
          </CardTitle>
          <CardDescription>
            Configure when and how monthly champions are announced
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Monthly Announcements</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send champion emails each month
              </p>
            </div>
            <Switch
              checked={monthlySettings.enabled || false}
              onCheckedChange={(v) => updateSetting("monthly_announcement", "enabled", v)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Day of Month</Label>
              <Select
                value={String(monthlySettings.day || 1)}
                onValueChange={(v) => updateSetting("monthly_announcement", "day", parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time (24h)</Label>
              <Input
                type="time"
                value={monthlySettings.time || "09:00"}
                onChange={(e) => updateSetting("monthly_announcement", "time", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email Subject</Label>
            <Input
              value={monthlySettings.email_subject || ""}
              onChange={(e) => updateSetting("monthly_announcement", "email_subject", e.target.value)}
              placeholder="🎉 Monthly Champion Crowned!"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Notify All Users</Label>
              <p className="text-sm text-muted-foreground">
                Send announcement to all team members
              </p>
            </div>
            <Switch
              checked={monthlySettings.notify_all_users || false}
              onCheckedChange={(v) => updateSetting("monthly_announcement", "notify_all_users", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Badge Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Winner Badges
          </CardTitle>
          <CardDescription>
            Configure how winner badges appear in the UI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Weekly Winner Badge</Label>
              <p className="text-sm text-muted-foreground">
                Display a crown icon next to the weekly winner's name
              </p>
            </div>
            <Switch
              checked={badgeSettings.show_weekly_badge || false}
              onCheckedChange={(v) => updateSetting("badge_settings", "show_weekly_badge", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Monthly Winner Badge</Label>
              <p className="text-sm text-muted-foreground">
                Display a trophy icon next to the monthly champion's name
              </p>
            </div>
            <Switch
              checked={badgeSettings.show_monthly_badge || false}
              onCheckedChange={(v) => updateSetting("badge_settings", "show_monthly_badge", v)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Weekly Badge Duration (days)</Label>
              <Input
                type="number"
                min="1"
                max="14"
                value={badgeSettings.weekly_badge_duration_days || 7}
                onChange={(e) => updateSetting("badge_settings", "weekly_badge_duration_days", parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Monthly Badge Duration (days)</Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={badgeSettings.monthly_badge_duration_days || 30}
                onChange={(e) => updateSetting("badge_settings", "monthly_badge_duration_days", parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
