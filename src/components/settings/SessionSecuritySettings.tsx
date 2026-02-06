import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, Clock, Globe, Save, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SessionSettings {
  auto_logout_enabled: boolean;
  auto_logout_time: string;
  auto_logout_timezone: string;
}

// Common timezones for South Africa and international
const TIMEZONES = [
  { value: "Africa/Johannesburg", label: "South Africa (SAST)" },
  { value: "Africa/Lagos", label: "West Africa (WAT)" },
  { value: "Africa/Nairobi", label: "East Africa (EAT)" },
  { value: "Africa/Cairo", label: "Egypt (EET)" },
  { value: "Europe/London", label: "UK (GMT/BST)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
  { value: "America/New_York", label: "US Eastern (EST/EDT)" },
  { value: "America/Los_Angeles", label: "US Pacific (PST/PDT)" },
  { value: "Asia/Dubai", label: "UAE (GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

export const SessionSecuritySettings = () => {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [logoutTime, setLogoutTime] = useState("02:00");
  const [timezone, setTimezone] = useState("Africa/Johannesburg");
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["session-security-settings-admin"],
    queryFn: async (): Promise<SessionSettings | null> => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("auto_logout_enabled, auto_logout_time, auto_logout_timezone")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching session settings:", error);
        throw error;
      }

      return data as SessionSettings | null;
    },
  });

  // Update local state when settings are fetched
  useEffect(() => {
    if (settings) {
      setEnabled(settings.auto_logout_enabled ?? false);
      // Convert time string (HH:MM:SS) to input format (HH:MM)
      const timeValue = settings.auto_logout_time?.slice(0, 5) ?? "02:00";
      setLogoutTime(timeValue);
      setTimezone(settings.auto_logout_timezone ?? "Africa/Johannesburg");
      setHasChanges(false);
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // First check if company_settings exists
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      const settingsData = {
        auto_logout_enabled: enabled,
        auto_logout_time: `${logoutTime}:00`, // Convert to HH:MM:SS
        auto_logout_timezone: timezone,
      };

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("company_settings")
          .update(settingsData)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("company_settings")
          .insert({
            ...settingsData,
            company_name: "Default Company",
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Session security settings saved");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["session-security-settings"] });
      queryClient.invalidateQueries({ queryKey: ["session-security-settings-admin"] });
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    },
  });

  const handleEnabledChange = (value: boolean) => {
    setEnabled(value);
    setHasChanges(true);
  };

  const handleTimeChange = (value: string) => {
    setLogoutTime(value);
    setHasChanges(true);
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load session security settings</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Session Security</CardTitle>
        </div>
        <CardDescription>
          Configure automatic session expiry to enhance security. Users will be logged out 
          and their local cache will be cleared at the scheduled time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="auto-logout-toggle" className="text-base font-medium">
              Enable Daily Auto-Logout
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically log out all users at a scheduled time each day
            </p>
          </div>
          <Switch
            id="auto-logout-toggle"
            checked={enabled}
            onCheckedChange={handleEnabledChange}
          />
        </div>

        {/* Time Configuration */}
        <div className={`space-y-4 ${!enabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Logout Time */}
            <div className="space-y-2">
              <Label htmlFor="logout-time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Logout Time
              </Label>
              <Input
                id="logout-time"
                type="time"
                value={logoutTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="max-w-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                Time when all users will be logged out
              </p>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Timezone
              </Label>
              <Select value={timezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger id="timezone" className="max-w-[250px]">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The logout time will be based on this timezone
              </p>
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Grace period:</strong> If a user is actively using the app during the 
              scheduled logout time, the logout will be delayed by 30 minutes. This prevents 
              disruption during active work.
            </AlertDescription>
          </Alert>

          {/* What gets cleared */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <h4 className="font-medium mb-2">What happens on auto-logout:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>User session is terminated</li>
              <li>Local storage is cleared</li>
              <li>Offline data cache is cleared</li>
              <li>PWA cached data is removed</li>
              <li>User must log in again to continue</li>
            </ul>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
