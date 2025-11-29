import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Mail, Calendar, Loader2, Send, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface NotificationSettings {
  id?: string;
  notification_email: string;
  notification_day: number;
  notifications_enabled: boolean;
  days_before_reminder: number;
  include_schedule_summary: boolean;
}

const defaultSettings: NotificationSettings = {
  notification_email: "",
  notification_day: 1,
  notifications_enabled: true,
  days_before_reminder: 7,
  include_schedule_summary: true,
};

export const InvoiceNotificationSettings = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isTesting, setIsTesting] = useState(false);

  const { data: fetchedSettings, isLoading } = useQuery({
    queryKey: ["invoice-notification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_notification_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Update local state when data is fetched
  useState(() => {
    if (fetchedSettings) {
      setSettings(fetchedSettings);
    }
  });

  // Keep settings in sync with fetched data
  if (fetchedSettings && settings.id !== fetchedSettings.id) {
    setSettings(fetchedSettings);
  }

  const { data: notificationLogs } = useQuery({
    queryKey: ["invoice-notification-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_notification_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newSettings: NotificationSettings) => {
      if (newSettings.id) {
        const { error } = await supabase
          .from("invoice_notification_settings")
          .update(newSettings)
          .eq("id", newSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("invoice_notification_settings")
          .insert(newSettings);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-notification-settings"] });
      toast.success("Notification settings saved");
    },
    onError: (error) => {
      toast.error("Failed to save settings: " + error.message);
    },
  });

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { data, error } = await supabase.functions.invoke("send-invoice-reminder", {
        body: { targetMonth: nextMonth.toISOString() },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Test email sent! ${data.invoiceCount} invoices found.`);
      } else {
        toast.info(data.message || "No pending invoices found");
      }

      queryClient.invalidateQueries({ queryKey: ["invoice-notification-logs"] });
    } catch (error: any) {
      toast.error("Failed to send test: " + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Invoice Notification Settings
          </CardTitle>
          <CardDescription>
            Configure automated email reminders for scheduled invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send automated reminders for scheduled invoices
              </p>
            </div>
            <Switch
              checked={settings.notifications_enabled}
              onCheckedChange={(checked) => updateSetting("notifications_enabled", checked)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notification_email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Notification Email
              </Label>
              <Input
                id="notification_email"
                type="email"
                placeholder="admin@company.com"
                value={settings.notification_email}
                onChange={(e) => updateSetting("notification_email", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Email address to receive invoice reminders
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification_day" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Day of Month
              </Label>
              <Select
                value={settings.notification_day.toString()}
                onValueChange={(value) => updateSetting("notification_day", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day === 1 ? "1st" : day === 2 ? "2nd" : day === 3 ? "3rd" : `${day}th`} of each month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Day to send reminder for next month's invoices
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="days_before" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Days Before
              </Label>
              <Select
                value={settings.days_before_reminder.toString()}
                onValueChange={(value) => updateSetting("days_before_reminder", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="5">5 days before</SelectItem>
                  <SelectItem value="7">7 days before (1 week)</SelectItem>
                  <SelectItem value="14">14 days before (2 weeks)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How many days before month-end to send reminder
              </p>
            </div>

            <div className="flex items-center justify-between pt-6">
              <div className="space-y-0.5">
                <Label>Include Schedule Summary</Label>
                <p className="text-sm text-muted-foreground">
                  Show project breakdown in email
                </p>
              </div>
              <Switch
                checked={settings.include_schedule_summary}
                onCheckedChange={(checked) => updateSetting("include_schedule_summary", checked)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => saveMutation.mutate(settings)}
              disabled={saveMutation.isPending || !settings.notification_email}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestNotification}
              disabled={isTesting || !settings.notification_email}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {notificationLogs && notificationLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Notification History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notificationLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {log.status === "sent" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <p className="font-medium">
                        {format(new Date(log.notification_month), "MMMM yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {log.projects_count} projects · R{" "}
                        {Number(log.total_scheduled_amount).toLocaleString("en-ZA", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(log.sent_at), "dd MMM yyyy HH:mm")}
                    </p>
                    <p className="text-xs text-muted-foreground">{log.recipient_email}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
