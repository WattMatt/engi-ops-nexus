import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, CalendarClock, HelpCircle } from "lucide-react";
import { InfoTooltip } from "@/components/ui/rich-tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { REPORT_TYPES, type ReportTypeId } from "./reportTypes";
import { ReportTypeCard } from "./ReportTypeCard";
import { ReportConfigModal } from "./ReportConfigModal";
import { addDays, addMonths, setHours, setMinutes } from "date-fns";

interface ReportAutomationHubProps {
  projectId: string;
}

interface AutomationSetting {
  id: string;
  report_type: string;
  enabled: boolean;
  schedule_type: string | null;
  schedule_day: number | null;
  schedule_time: string | null;
  recipient_emails: string[] | null;
  next_run_at: string | null;
  last_run_at: string | null;
  document_id: string | null;
  contact_id: string | null;
  report_config: Record<string, any> | null;
}

export function ReportAutomationHub({ projectId }: ReportAutomationHubProps) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, AutomationSetting>>({});
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportTypeId | null>(null);

  useEffect(() => {
    loadAllSettings();
  }, [projectId]);

  const loadAllSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('report_automation_settings')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      const settingsMap: Record<string, AutomationSetting> = {};
      (data || []).forEach(s => {
        // Type assertion for report_config since it comes as Json from DB
        settingsMap[s.report_type] = {
          ...s,
          report_config: s.report_config as Record<string, any> | null
        };
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Failed to load automation settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateNextRunAt = (scheduleType: string, scheduleDay: number, scheduleTime: string): string => {
    const now = new Date();
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    let nextRun = new Date();
    nextRun = setHours(nextRun, hours);
    nextRun = setMinutes(nextRun, minutes);

    if (scheduleType === 'weekly') {
      const currentDay = now.getDay();
      let daysUntil = scheduleDay - currentDay;
      if (daysUntil < 0 || (daysUntil === 0 && nextRun <= now)) {
        daysUntil += 7;
      }
      nextRun = addDays(now, daysUntil);
      nextRun = setHours(nextRun, hours);
      nextRun = setMinutes(nextRun, minutes);
    } else if (scheduleType === 'monthly') {
      nextRun.setDate(scheduleDay);
      if (nextRun <= now) {
        nextRun = addMonths(nextRun, 1);
      }
    }

    return nextRun.toISOString();
  };

  const handleToggle = async (reportType: ReportTypeId, enabled: boolean) => {
    const existing = settings[reportType];
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (existing?.id) {
        const { error } = await supabase
          .from('report_automation_settings')
          .update({ enabled, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Create new settings with defaults
        const nextRunAt = enabled ? calculateNextRunAt('weekly', 1, '09:00') : null;
        const { error } = await supabase
          .from('report_automation_settings')
          .insert({
            project_id: projectId,
            report_type: reportType,
            enabled,
            schedule_type: 'weekly',
            schedule_day: 1,
            schedule_time: '09:00',
            recipient_emails: [],
            next_run_at: nextRunAt,
            created_by: user?.id,
          });
        if (error) throw error;
      }
      
      await loadAllSettings();
      toast.success(enabled ? 'Report automation enabled' : 'Report automation disabled');
    } catch (error: any) {
      console.error('Failed to toggle automation:', error);
      toast.error(error.message || 'Failed to update settings');
    }
  };

  const handleConfigure = (reportType: ReportTypeId) => {
    setSelectedReportType(reportType);
    setConfigModalOpen(true);
  };

  const handleSaveConfig = async (newSettings: any) => {
    if (!selectedReportType) return;
    
    const existing = settings[selectedReportType];
    const { data: { user } } = await supabase.auth.getUser();
    
    const nextRunAt = newSettings.start_date 
      ? newSettings.start_date 
      : calculateNextRunAt(
          newSettings.schedule_type,
          newSettings.schedule_day,
          newSettings.schedule_time
        );

    const settingsData = {
      project_id: projectId,
      report_type: selectedReportType,
      enabled: existing?.enabled ?? false,
      schedule_type: newSettings.schedule_type,
      schedule_day: newSettings.schedule_day,
      schedule_time: newSettings.schedule_time,
      recipient_emails: newSettings.recipient_emails,
      document_id: newSettings.document_id,
      contact_id: newSettings.contact_id,
      report_config: newSettings.report_config,
      next_run_at: nextRunAt,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase
        .from('report_automation_settings')
        .update(settingsData)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('report_automation_settings')
        .insert({ ...settingsData, created_by: user?.id });
      if (error) throw error;
    }

    await loadAllSettings();
    toast.success('Configuration saved');
  };

  const handleSendTest = async (reportType: ReportTypeId) => {
    const setting = settings[reportType];
    if (!setting?.recipient_emails?.length) {
      toast.error('Please configure recipients first');
      handleConfigure(reportType);
      return;
    }

    setSendingTest(reportType);
    try {
      const reportConfig = REPORT_TYPES.find(r => r.id === reportType);
      if (!reportConfig) throw new Error('Unknown report type');

      const { error } = await supabase.functions.invoke('send-scheduled-report', {
        body: {
          mode: 'manual',
          reportType,
          projectId,
          recipientEmails: setting.recipient_emails,
          documentId: setting.document_id,
          contactId: setting.contact_id,
          reportConfig: setting.report_config,
        },
      });

      if (error) throw error;
      toast.success(`Test ${reportConfig.name} sent to ${setting.recipient_emails.join(', ')}`);
    } catch (error: any) {
      console.error('Failed to send test report:', error);
      toast.error(error.message || 'Failed to send test report');
    } finally {
      setSendingTest(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedConfig = selectedReportType 
    ? REPORT_TYPES.find(r => r.id === selectedReportType) 
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Report Automation Hub
                <InfoTooltip
                  title="Report Automation"
                  description="Configure automated report generation and email delivery. Enable reports, set schedules with start/end dates, and add recipients. Reports are generated as PDFs and emailed on the configured schedule."
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </InfoTooltip>
              </CardTitle>
              <CardDescription>
                Configure automatic report generation and email delivery for each report type
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1">
            {REPORT_TYPES.map(config => {
              const setting = settings[config.id];
              return (
                <ReportTypeCard
                  key={config.id}
                  config={config}
                  isEnabled={setting?.enabled ?? false}
                  scheduleType={setting?.schedule_type}
                  lastRunAt={setting?.last_run_at}
                  nextRunAt={setting?.next_run_at}
                  onToggle={(enabled) => handleToggle(config.id, enabled)}
                  onConfigure={() => handleConfigure(config.id)}
                  onSendTest={() => handleSendTest(config.id)}
                  isSending={sendingTest === config.id}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedConfig && (
        <ReportConfigModal
          open={configModalOpen}
          onOpenChange={setConfigModalOpen}
          projectId={projectId}
          reportType={selectedConfig}
          existingSettings={settings[selectedConfig.id]}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  );
}
