import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, Save, TestTube } from "lucide-react";

interface TenantNotificationSettingsProps {
  projectId: string;
}

export function TenantNotificationSettings({ projectId }: TenantNotificationSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["tenant-notification-settings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_notification_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;

      // Return defaults if no settings exist yet
      return data || {
        project_id: projectId,
        bo_critical_days: 7,
        bo_warning_days: 14,
        bo_info_days: 30,
        cost_entry_warning_days: 7,
        cost_entry_critical_days: 14,
        inactive_tenant_days: 30,
        notifications_enabled: true,
        email_notifications_enabled: true,
        email_frequency: 'immediate',
        notification_email: null,
        notification_cooldown_hours: 24,
      };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if ('id' in settings && settings.id) {
        const { error } = await supabase
          .from("tenant_notification_settings")
          .update(values)
          .eq("id", settings.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tenant_notification_settings")
          .insert({ ...values, project_id: projectId });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-notification-settings", projectId] });
      toast({
        title: "Settings saved",
        description: "Notification settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testNotificationsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("check-tenant-notifications");
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Test completed",
        description: "Notification check has been run. Check your notifications.",
      });
      setIsTesting(false);
    },
    onError: (error: any) => {
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive",
      });
      setIsTesting(false);
    },
  });

  const handleSave = () => {
    if (settings) {
      saveMutation.mutate(settings);
    }
  };

  const handleTestNotifications = () => {
    setIsTesting(true);
    testNotificationsMutation.mutate();
  };

  const updateSetting = (key: string, value: any) => {
    if (settings) {
      queryClient.setQueryData(
        ["tenant-notification-settings", projectId],
        { ...settings, [key]: value }
      );
    }
  };

  if (isLoading || !settings) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Automated Notifications
          </CardTitle>
          <CardDescription>
            Configure automated alerts for incomplete tenants and missing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Turn on automated tenant monitoring
              </div>
            </div>
            <Switch
              checked={settings.notifications_enabled}
              onCheckedChange={(checked) => updateSetting("notifications_enabled", checked)}
            />
          </div>

          {/* BO Deadline Thresholds */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Beneficial Occupation Deadline Alerts</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bo_critical_days">Critical (days)</Label>
                <Input
                  id="bo_critical_days"
                  type="number"
                  value={settings.bo_critical_days}
                  onChange={(e) => updateSetting("bo_critical_days", parseInt(e.target.value))}
                  disabled={!settings.notifications_enabled}
                />
                <p className="text-xs text-muted-foreground">🚨 Urgent alerts</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bo_warning_days">Warning (days)</Label>
                <Input
                  id="bo_warning_days"
                  type="number"
                  value={settings.bo_warning_days}
                  onChange={(e) => updateSetting("bo_warning_days", parseInt(e.target.value))}
                  disabled={!settings.notifications_enabled}
                />
                <p className="text-xs text-muted-foreground">⚠️ Important alerts</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bo_info_days">Info (days)</Label>
                <Input
                  id="bo_info_days"
                  type="number"
                  value={settings.bo_info_days}
                  onChange={(e) => updateSetting("bo_info_days", parseInt(e.target.value))}
                  disabled={!settings.notifications_enabled}
                />
                <p className="text-xs text-muted-foreground">📋 General reminders</p>
              </div>
            </div>
          </div>

          {/* Cost Entry Reminders */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Cost Entry Reminders</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cost_entry_warning_days">Warning after (days)</Label>
                <Input
                  id="cost_entry_warning_days"
                  type="number"
                  value={settings.cost_entry_warning_days}
                  onChange={(e) => updateSetting("cost_entry_warning_days", parseInt(e.target.value))}
                  disabled={!settings.notifications_enabled}
                />
                <p className="text-xs text-muted-foreground">Days after order to send reminder</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_entry_critical_days">Critical after (days)</Label>
                <Input
                  id="cost_entry_critical_days"
                  type="number"
                  value={settings.cost_entry_critical_days}
                  onChange={(e) => updateSetting("cost_entry_critical_days", parseInt(e.target.value))}
                  disabled={!settings.notifications_enabled}
                />
                <p className="text-xs text-muted-foreground">Days after order for urgent alert</p>
              </div>
            </div>
          </div>

          {/* Inactive Tenant Alert */}
          <div className="space-y-2">
            <Label htmlFor="inactive_tenant_days">Inactive Tenant Alert (days)</Label>
            <Input
              id="inactive_tenant_days"
              type="number"
              value={settings.inactive_tenant_days}
              onChange={(e) => updateSetting("inactive_tenant_days", parseInt(e.target.value))}
              disabled={!settings.notifications_enabled}
            />
            <p className="text-xs text-muted-foreground">
              Alert when incomplete tenant hasn't been updated
            </p>
          </div>

          {/* Cooldown Period */}
          <div className="space-y-2">
            <Label htmlFor="notification_cooldown_hours">Notification Cooldown (hours)</Label>
            <Input
              id="notification_cooldown_hours"
              type="number"
              value={settings.notification_cooldown_hours}
              onChange={(e) => updateSetting("notification_cooldown_hours", parseInt(e.target.value))}
              disabled={!settings.notifications_enabled}
            />
            <p className="text-xs text-muted-foreground">
              Minimum time between notifications for the same tenant
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Configure email delivery for notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Email Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Send notifications via email
              </div>
            </div>
            <Switch
              checked={settings.email_notifications_enabled}
              onCheckedChange={(checked) => updateSetting("email_notifications_enabled", checked)}
              disabled={!settings.notifications_enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_frequency">Email Frequency</Label>
            <Select
              value={settings.email_frequency}
              onValueChange={(value) => updateSetting("email_frequency", value)}
              disabled={!settings.email_notifications_enabled}
            >
              <SelectTrigger id="email_frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Digest</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often to send email notifications
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification_email">Additional Email (Optional)</Label>
            <Input
              id="notification_email"
              type="email"
              placeholder="additional@email.com"
              value={settings.notification_email || ""}
              onChange={(e) => updateSetting("notification_email", e.target.value || null)}
              disabled={!settings.email_notifications_enabled}
            />
            <p className="text-xs text-muted-foreground">
              Send copies to this email address (in addition to project members)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
        <Button 
          variant="outline" 
          onClick={handleTestNotifications}
          disabled={isTesting || !settings.notifications_enabled}
        >
          <TestTube className="mr-2 h-4 w-4" />
          {isTesting ? "Testing..." : "Test Notifications"}
        </Button>
      </div>
    </div>
  );
}
