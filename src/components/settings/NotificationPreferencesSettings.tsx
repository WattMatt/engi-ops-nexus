import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, Mail, Clock, Save, Loader2 } from "lucide-react";

interface NotificationPreferences {
  id?: string;
  user_id: string;
  email_roadmap_reminders: boolean;
  email_due_date_days: number;
  email_frequency: string;
  email_comment_notifications: boolean;
  email_status_updates: boolean;
  email_digest_time: string;
}

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, "user_id"> = {
  email_roadmap_reminders: true,
  email_due_date_days: 3,
  email_frequency: "daily",
  email_comment_notifications: true,
  email_status_updates: true,
  email_digest_time: "08:00:00",
};

export function NotificationPreferencesSettings() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Fetch existing preferences
  const { data: existingPrefs, isLoading } = useQuery({
    queryKey: ["notification-preferences", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Initialize preferences from fetched data or defaults
  useEffect(() => {
    if (userId) {
      if (existingPrefs) {
        setPreferences(existingPrefs as NotificationPreferences);
      } else {
        setPreferences({
          ...DEFAULT_PREFERENCES,
          user_id: userId,
        });
      }
    }
  }, [existingPrefs, userId]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (prefs: NotificationPreferences) => {
      if (existingPrefs?.id) {
        const { error } = await supabase
          .from("notification_preferences")
          .update({
            email_roadmap_reminders: prefs.email_roadmap_reminders,
            email_due_date_days: prefs.email_due_date_days,
            email_frequency: prefs.email_frequency,
            email_comment_notifications: prefs.email_comment_notifications,
            email_status_updates: prefs.email_status_updates,
            email_digest_time: prefs.email_digest_time,
          })
          .eq("id", existingPrefs.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: prefs.user_id,
            email_roadmap_reminders: prefs.email_roadmap_reminders,
            email_due_date_days: prefs.email_due_date_days,
            email_frequency: prefs.email_frequency,
            email_comment_notifications: prefs.email_comment_notifications,
            email_status_updates: prefs.email_status_updates,
            email_digest_time: prefs.email_digest_time,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Notification preferences saved");
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
    onError: (error) => {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    },
  });

  const handleSave = () => {
    if (preferences) {
      saveMutation.mutate(preferences);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (preferences) {
      setPreferences({ ...preferences, [key]: value });
    }
  };

  if (isLoading || !preferences) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Manage how and when you receive email notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Roadmap Notifications */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Roadmap Notifications
          </h3>
          
          <div className="grid gap-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Due Date Reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when roadmap items are approaching their due date
                </p>
              </div>
              <Switch
                checked={preferences.email_roadmap_reminders}
                onCheckedChange={(checked) => updatePreference("email_roadmap_reminders", checked)}
              />
            </div>

            {preferences.email_roadmap_reminders && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Days Before Due Date</Label>
                  <p className="text-xs text-muted-foreground">
                    How many days in advance to receive reminders
                  </p>
                </div>
                <Select
                  value={String(preferences.email_due_date_days)}
                  onValueChange={(value) => updatePreference("email_due_date_days", parseInt(value))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="2">2 days</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="5">5 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Comment Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when someone comments on a roadmap item
                </p>
              </div>
              <Switch
                checked={preferences.email_comment_notifications}
                onCheckedChange={(checked) => updatePreference("email_comment_notifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Status Updates</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when roadmap item status changes
                </p>
              </div>
              <Switch
                checked={preferences.email_status_updates}
                onCheckedChange={(checked) => updatePreference("email_status_updates", checked)}
              />
            </div>
          </div>
        </div>

        {/* Email Frequency */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Delivery Settings
          </h3>
          
          <div className="grid gap-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Frequency</Label>
                <p className="text-xs text-muted-foreground">
                  How often to receive notification emails
                </p>
              </div>
              <Select
                value={preferences.email_frequency}
                onValueChange={(value) => updatePreference("email_frequency", value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {preferences.email_frequency === "daily" && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily Digest Time</Label>
                  <p className="text-xs text-muted-foreground">
                    When to receive your daily summary email
                  </p>
                </div>
                <Select
                  value={preferences.email_digest_time}
                  onValueChange={(value) => updatePreference("email_digest_time", value)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="06:00:00">6:00 AM</SelectItem>
                    <SelectItem value="08:00:00">8:00 AM</SelectItem>
                    <SelectItem value="09:00:00">9:00 AM</SelectItem>
                    <SelectItem value="12:00:00">12:00 PM</SelectItem>
                    <SelectItem value="17:00:00">5:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
