import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X, Mail, Calendar as CalendarIcon, FileText, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ReportTypeConfig, ReportTypeId } from "./reportTypes";
import { getDefaultReportConfig } from "./reportTypes";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addDays, addWeeks, addMonths } from "date-fns";

interface ReportConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  reportType: ReportTypeConfig;
  existingSettings?: any;
  onSave: (settings: any) => Promise<void>;
}


export function ReportConfigModal({
  open,
  onOpenChange,
  projectId,
  reportType,
  existingSettings,
  onSave,
}: ReportConfigModalProps) {
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [projectContacts, setProjectContacts] = useState<any[]>([]);
  const [portalContacts, setPortalContacts] = useState<string[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  
  // Form state
  const [scheduleType, setScheduleType] = useState<string>(existingSettings?.schedule_type || 'weekly');
  const [scheduleTime, setScheduleTime] = useState<string>(existingSettings?.schedule_time || '09:00');
  const [startDate, setStartDate] = useState<Date | undefined>(
    existingSettings?.next_run_at ? new Date(existingSettings.next_run_at) : undefined
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState<string[]>(existingSettings?.recipient_emails || []);
  const [documentId, setDocumentId] = useState<string>(existingSettings?.document_id || '');
  const [contactId, setContactId] = useState<string>(existingSettings?.contact_id || '');
  const [reportConfig, setReportConfig] = useState<Record<string, boolean>>(
    existingSettings?.report_config || getDefaultReportConfig(reportType.id)
  );

  useEffect(() => {
    if (open) {
      loadProjectContacts();
      if (reportType.requiresDocument && reportType.documentType) {
        loadDocuments();
      }
      if (reportType.id === 'portal_summary') {
        loadPortalContacts();
      }
    }
  }, [open, projectId, reportType]);

  useEffect(() => {
    if (existingSettings) {
      setScheduleType(existingSettings.schedule_type || 'weekly');
      setScheduleTime(existingSettings.schedule_time || '09:00');
      setStartDate(existingSettings.next_run_at ? new Date(existingSettings.next_run_at) : undefined);
      setRecipientEmails(existingSettings.recipient_emails || []);
      setDocumentId(existingSettings.document_id || '');
      setContactId(existingSettings.contact_id || '');
      setReportConfig(existingSettings.report_config || getDefaultReportConfig(reportType.id));
    } else {
      setReportConfig(getDefaultReportConfig(reportType.id));
    }
  }, [existingSettings, reportType]);

  const loadProjectContacts = async () => {
    const { data } = await supabase
      .from('project_contacts')
      .select('id, contact_person_name, email, organization_name')
      .eq('project_id', projectId)
      .not('email', 'is', null);
    setProjectContacts(data || []);
  };

  const loadPortalContacts = async () => {
    // Fetch active portal tokens for this project
    const { data: tokens } = await supabase
      .from('contractor_portal_tokens')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (!tokens?.length) {
      setPortalContacts([]);
      return;
    }

    const tokenIds = tokens.map(t => t.id);
    const { data: contacts } = await supabase
      .from('token_notification_contacts')
      .select('email, name')
      .in('token_id', tokenIds);

    const emails = (contacts || []).map(c => c.email).filter(Boolean);
    setPortalContacts([...new Set(emails)]);
  };

  const loadDocuments = async () => {
    if (!reportType.documentType) return;
    setLoadingDocs(true);
    
    try {
      let query;
      if (reportType.documentType === 'cost_reports') {
        query = supabase
          .from('cost_reports')
          .select('id, report_name, report_number, revision')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
      } else if (reportType.documentType === 'cable_schedules') {
        query = supabase
          .from('cable_schedules')
          .select('id, schedule_name, schedule_number, revision')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
      }
      
      if (query) {
        const { data } = await query;
        setDocuments(data || []);
      }
    } finally {
      setLoadingDocs(false);
    }
  };

  const addEmail = (email: string) => {
    if (!email || recipientEmails.includes(email)) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;
    setRecipientEmails([...recipientEmails, email]);
    setNewEmail("");
  };

  const removeEmail = (email: string) => {
    setRecipientEmails(recipientEmails.filter(e => e !== email));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        schedule_type: scheduleType,
        schedule_day: startDate ? startDate.getDay() : 1,
        schedule_time: scheduleTime,
        recipient_emails: recipientEmails,
        document_id: documentId || null,
        contact_id: contactId || null,
        report_config: reportConfig,
        start_date: startDate?.toISOString() || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const Icon = reportType.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${reportType.bgColor}`}>
              <Icon className={`h-5 w-5 ${reportType.iconColor}`} />
            </div>
            <div>
              <DialogTitle>Configure {reportType.name}</DialogTitle>
              <DialogDescription>
                Set up automated delivery for this report
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Document Selection (if required) */}
          {reportType.requiresDocument && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {reportType.documentLabel}
              </Label>
              <Select value={documentId} onValueChange={setDocumentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingDocs ? (
                    <div className="p-2 text-center text-muted-foreground">Loading...</div>
                  ) : documents.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">No documents found</div>
                  ) : (
                    documents.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.report_name || doc.schedule_name} ({doc.report_number || doc.schedule_number})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Schedule Configuration */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Schedule
            </Label>

            {/* Start Date Calendar */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">First Send Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Repeat Every</Label>
                <Select value={scheduleType} onValueChange={setScheduleType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi_weekly">Bi-Weekly (14 days)</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Time</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            {/* Preview of upcoming sends */}
            {startDate && (
              <div className="rounded-md border p-3 bg-muted/30 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Upcoming sends</Label>
                {(() => {
                  const upcoming: Date[] = [];
                  let d = new Date(startDate);
                  const [h, m] = scheduleTime.split(':').map(Number);
                  d.setHours(h, m, 0, 0);
                  for (let i = 0; i < 4; i++) {
                    upcoming.push(new Date(d));
                    if (scheduleType === 'weekly') d = addWeeks(d, 1);
                    else if (scheduleType === 'bi_weekly') d = addWeeks(d, 2);
                    else d = addMonths(d, 1);
                  }
                  return upcoming.map((date, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {format(date, "EEE, MMM d, yyyy")} at {scheduleTime}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Recipients */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Recipients
            </Label>

            {/* Portal contacts auto-populated */}
            {reportType.id === 'portal_summary' && portalContacts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  Auto-populated from portal notification contacts
                </div>
                <div className="flex flex-wrap gap-2">
                  {portalContacts.map(email => (
                    <Badge key={email} variant="outline" className="gap-1 py-1 bg-indigo-50 border-indigo-200 text-indigo-700">
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {reportType.id === 'portal_summary' && portalContacts.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                <Info className="h-3.5 w-3.5" />
                No portal notification contacts found. Add contacts in the portal token settings, or add manual recipients below.
              </div>
            )}

            {projectContacts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Add from contacts</Label>
                <div className="flex flex-wrap gap-2">
                  {projectContacts
                    .filter(c => c.email && !recipientEmails.includes(c.email))
                    .slice(0, 5)
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
              <Button type="button" variant="secondary" onClick={() => addEmail(newEmail)}>
                Add
              </Button>
            </div>

            {recipientEmails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipientEmails.map(email => (
                  <Badge key={email} variant="secondary" className="gap-1 py-1">
                    {email}
                    <button type="button" onClick={() => removeEmail(email)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Content Options */}
          <div className="space-y-4">
            <Label>Report Content</Label>
            <div className="space-y-3">
              {reportType.contentOptions.map(option => (
                <div key={option.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.key}
                    checked={reportConfig[option.key] ?? option.defaultValue}
                    onCheckedChange={(checked) => 
                      setReportConfig(prev => ({ ...prev, [option.key]: checked as boolean }))
                    }
                  />
                  <Label htmlFor={option.key} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
