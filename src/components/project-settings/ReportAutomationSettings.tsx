import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, 
  Calendar, 
  Clock, 
  Mail, 
  Save, 
  Send, 
  Loader2,
  X,
  Plus
} from "lucide-react";
import { format, addDays, addWeeks, addMonths, setDay, setDate, setHours, setMinutes } from "date-fns";

interface ReportAutomationSettingsProps {
  projectId: string;
}

interface AutomationSettings {
  id?: string;
  enabled: boolean;
  schedule_type: 'weekly' | 'monthly' | 'specific_date';
  schedule_day: number | null;
  schedule_time: string;
  recipient_emails: string[];
  include_cover_page: boolean;
  include_kpi_page: boolean;
  include_tenant_schedule: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
}

const defaultSettings: AutomationSettings = {
  enabled: false,
  schedule_type: 'weekly',
  schedule_day: 1, // Monday
  schedule_time: '09:00',
  recipient_emails: [],
  include_cover_page: true,
  include_kpi_page: true,
  include_tenant_schedule: true,
  next_run_at: null,
  last_run_at: null,
};

const weekDays = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export function ReportAutomationSettings({ projectId }: ReportAutomationSettingsProps) {
  const [settings, setSettings] = useState<AutomationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [projectContacts, setProjectContacts] = useState<{ id: string; contact_person_name: string | null; email: string | null }[]>([]);

  useEffect(() => {
    loadSettings();
    loadProjectContacts();
  }, [projectId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('report_automation_settings')
        .select('*')
        .eq('project_id', projectId)
        .eq('report_type', 'tenant_tracker')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          enabled: data.enabled,
          schedule_type: data.schedule_type as 'weekly' | 'monthly' | 'specific_date',
          schedule_day: data.schedule_day,
          schedule_time: data.schedule_time || '09:00',
          recipient_emails: data.recipient_emails || [],
          include_cover_page: data.include_cover_page,
          include_kpi_page: data.include_kpi_page,
          include_tenant_schedule: data.include_tenant_schedule,
          next_run_at: data.next_run_at,
          last_run_at: data.last_run_at,
        });
      }
    } catch (error) {
      console.error('Failed to load automation settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('project_contacts')
        .select('id, contact_person_name, email')
        .eq('project_id', projectId)
        .not('email', 'is', null);

      if (error) throw error;
      setProjectContacts(data || []);
    } catch (error) {
      console.error('Failed to load project contacts:', error);
    }
  };

  const calculateNextRunAt = (): string | null => {
    if (!settings.enabled) return null;

    const now = new Date();
    const [hours, minutes] = settings.schedule_time.split(':').map(Number);
    let nextRun = new Date();
    nextRun = setHours(nextRun, hours);
    nextRun = setMinutes(nextRun, minutes);

    if (settings.schedule_type === 'weekly' && settings.schedule_day !== null) {
      // Find next occurrence of the specified weekday
      const targetDay = settings.schedule_day;
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0 || (daysUntil === 0 && nextRun <= now)) {
        daysUntil += 7;
      }
      nextRun = addDays(now, daysUntil);
      nextRun = setHours(nextRun, hours);
      nextRun = setMinutes(nextRun, minutes);
    } else if (settings.schedule_type === 'monthly' && settings.schedule_day !== null) {
      // Find next occurrence of the specified day of month
      nextRun = setDate(nextRun, settings.schedule_day);
      if (nextRun <= now) {
        nextRun = addMonths(nextRun, 1);
      }
    }

    return nextRun.toISOString();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const nextRunAt = calculateNextRunAt();

      const settingsData = {
        project_id: projectId,
        report_type: 'tenant_tracker',
        enabled: settings.enabled,
        schedule_type: settings.schedule_type,
        schedule_day: settings.schedule_day,
        schedule_time: settings.schedule_time,
        recipient_emails: settings.recipient_emails,
        include_cover_page: settings.include_cover_page,
        include_kpi_page: settings.include_kpi_page,
        include_tenant_schedule: settings.include_tenant_schedule,
        next_run_at: nextRunAt,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (settings.id) {
        const { error } = await supabase
          .from('report_automation_settings')
          .update(settingsData)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('report_automation_settings')
          .insert(settingsData)
          .select()
          .single();
        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id, next_run_at: nextRunAt }));
      }

      setSettings(prev => ({ ...prev, next_run_at: nextRunAt }));
      toast.success('Automation settings saved');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestReport = async () => {
    if (settings.recipient_emails.length === 0) {
      toast.error('Please add at least one recipient email');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-scheduled-report', {
        body: {
          mode: 'manual',
          projectId,
          recipientEmails: settings.recipient_emails,
          includeCoverPage: settings.include_cover_page,
          includeKpiPage: settings.include_kpi_page,
          includeTenantSchedule: settings.include_tenant_schedule,
        },
      });

      if (error) throw error;

      toast.success(`Test report sent to ${settings.recipient_emails.join(', ')}`);
    } catch (error: any) {
      console.error('Failed to send test report:', error);
      toast.error(error.message || 'Failed to send test report');
    } finally {
      setSending(false);
    }
  };

  const addEmail = (email: string) => {
    if (!email || settings.recipient_emails.includes(email)) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSettings(prev => ({
      ...prev,
      recipient_emails: [...prev.recipient_emails, email],
    }));
    setNewEmail("");
  };

  const removeEmail = (email: string) => {
    setSettings(prev => ({
      ...prev,
      recipient_emails: prev.recipient_emails.filter(e => e !== email),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Tenant Tracker Report</CardTitle>
                <CardDescription>
                  Automatically generate and email tenant tracker reports
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Schedule Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Schedule
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={settings.schedule_type}
                  onValueChange={(value: 'weekly' | 'monthly' | 'specific_date') => 
                    setSettings(prev => ({ ...prev, schedule_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {settings.schedule_type === 'weekly' ? 'Day of Week' : 'Day of Month'}
                </Label>
                {settings.schedule_type === 'weekly' ? (
                  <Select
                    value={settings.schedule_day?.toString() ?? '1'}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, schedule_day: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weekDays.map(day => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={settings.schedule_day?.toString() ?? '1'}
                    onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, schedule_day: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </Label>
                <Input
                  type="time"
                  value={settings.schedule_time}
                  onChange={(e) => setSettings(prev => ({ ...prev, schedule_time: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Recipients */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4" />
              Recipients
            </div>

            {/* Add from contacts */}
            {projectContacts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Add from project contacts</Label>
                <div className="flex flex-wrap gap-2">
                  {projectContacts
                    .filter(contact => contact.email && !settings.recipient_emails.includes(contact.email))
                    .map(contact => (
                      <Button
                        key={contact.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => contact.email && addEmail(contact.email)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {contact.contact_person_name || contact.email}
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {/* Manual email entry */}
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEmail(newEmail);
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => addEmail(newEmail)}
              >
                Add
              </Button>
            </div>

            {/* Selected recipients */}
            {settings.recipient_emails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {settings.recipient_emails.map(email => (
                  <Badge key={email} variant="secondary" className="gap-1 py-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Report Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Report Content</Label>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cover-page"
                  checked={settings.include_cover_page}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, include_cover_page: checked as boolean }))
                  }
                />
                <Label htmlFor="cover-page" className="text-sm font-normal">
                  Include Cover Page
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="kpi-page"
                  checked={settings.include_kpi_page}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, include_kpi_page: checked as boolean }))
                  }
                />
                <Label htmlFor="kpi-page" className="text-sm font-normal">
                  Include KPI Dashboard
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tenant-schedule"
                  checked={settings.include_tenant_schedule}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, include_tenant_schedule: checked as boolean }))
                  }
                />
                <Label htmlFor="tenant-schedule" className="text-sm font-normal">
                  Include Tenant Schedule
                </Label>
              </div>
            </div>
          </div>

          {/* Status Display */}
          {(settings.last_run_at || settings.next_run_at) && (
            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              {settings.last_run_at && (
                <p className="text-muted-foreground">
                  Last sent: {format(new Date(settings.last_run_at), 'PPp')}
                </p>
              )}
              {settings.next_run_at && settings.enabled && (
                <p className="text-muted-foreground">
                  Next scheduled: {format(new Date(settings.next_run_at), 'PPp')}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
            <Button
              variant="secondary"
              onClick={handleSendTestReport}
              disabled={sending || settings.recipient_emails.length === 0}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Test Report Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
