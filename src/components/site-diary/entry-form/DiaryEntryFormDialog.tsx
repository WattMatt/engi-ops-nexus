import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Cloud,
  Users,
  Truck,
  Shield,
  Lightbulb,
  FileText,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Save,
  X,
} from "lucide-react";

import { BasicInfoSection } from "./sections/BasicInfoSection";
import { DailyLogSection } from "./sections/DailyLogSection";
import { WorkforceSection } from "./sections/WorkforceSection";
import { DeliveriesSection } from "./sections/DeliveriesSection";
import { SafetySection } from "./sections/SafetySection";
import { DesignDecisionsSection } from "./sections/DesignDecisionsSection";
import { InstructionsSection } from "./sections/InstructionsSection";
import { ActionItemsSection } from "./sections/ActionItemsSection";

export interface SubEntry {
  id: string;
  description: string;
  assignedTo: string[];
  priority: "note" | "low" | "medium" | "high";
  timestamp: string;
  completed: boolean;
  completedAt?: string;
  dueDate?: string;
  category?: string;
}

export interface WorkforceEntry {
  trade: string;
  count: number;
  contractor?: string;
}

export interface DeliveryEntry {
  id: string;
  description: string;
  supplier?: string;
  quantity?: string;
  status: "received" | "partial" | "rejected" | "pending";
  notes?: string;
}

export interface DesignDecision {
  id: string;
  description: string;
  decidedBy?: string;
  reference?: string;
  impact?: string;
  linkedDocuments?: string[];
}

export interface InstructionEntry {
  id: string;
  reference: string;
  description: string;
  issuedBy?: string;
  receivedFrom?: string;
  date: string;
  status: "pending" | "acknowledged" | "actioned" | "closed";
}

export interface DiaryFormData {
  entryDate: string;
  entryType: string;
  shiftType: string;
  weather: string;
  progress: string;
  queries: string;
  notes: string;
  meetingMinutes: string;
  attendees: string[];
  subEntries: SubEntry[];
  workforceDetails: WorkforceEntry[];
  deliveries: DeliveryEntry[];
  safetyObservations: string;
  designDecisions: DesignDecision[];
  instructionsReceived: InstructionEntry[];
  instructionsIssued: InstructionEntry[];
  delaysDisruptions: string;
  qualityIssues: string;
}

interface DiaryEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  editingEntry?: any;
  onSuccess: () => void;
}

const SECTION_TABS = [
  { id: "basic", label: "Basic Info", icon: Calendar },
  { id: "daily", label: "Daily Log", icon: FileText },
  { id: "workforce", label: "Workforce", icon: Users },
  { id: "deliveries", label: "Deliveries", icon: Truck },
  { id: "safety", label: "Safety", icon: Shield },
  { id: "design", label: "Design Decisions", icon: Lightbulb },
  { id: "instructions", label: "Instructions", icon: MessageSquare },
  { id: "actions", label: "Action Items", icon: CheckCircle2 },
];

export const DiaryEntryFormDialog = ({
  open,
  onOpenChange,
  projectId,
  editingEntry,
  onSuccess,
}: DiaryEntryFormDialogProps) => {
  const [activeTab, setActiveTab] = useState("basic");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<DiaryFormData>({
    entryDate: format(new Date(), "yyyy-MM-dd"),
    entryType: "standard",
    shiftType: "day",
    weather: "",
    progress: "",
    queries: "",
    notes: "",
    meetingMinutes: "",
    attendees: [],
    subEntries: [],
    workforceDetails: [],
    deliveries: [],
    safetyObservations: "",
    designDecisions: [],
    instructionsReceived: [],
    instructionsIssued: [],
    delaysDisruptions: "",
    qualityIssues: "",
  });

  // Load editing entry data
  useEffect(() => {
    if (editingEntry) {
      setFormData({
        entryDate: editingEntry.entry_date || format(new Date(), "yyyy-MM-dd"),
        entryType: editingEntry.entry_type || "standard",
        shiftType: editingEntry.shift_type || "day",
        weather: editingEntry.weather_conditions || "",
        progress: editingEntry.site_progress || "",
        queries: editingEntry.queries || "",
        notes: editingEntry.notes || "",
        meetingMinutes: editingEntry.meeting_minutes || "",
        attendees: editingEntry.attendees || [],
        subEntries: normalizeSubEntries(editingEntry.sub_entries || []),
        workforceDetails: editingEntry.workforce_details?.entries || [],
        deliveries: editingEntry.deliveries || [],
        safetyObservations: editingEntry.safety_observations || "",
        designDecisions: editingEntry.design_decisions || [],
        instructionsReceived: editingEntry.instructions_received || [],
        instructionsIssued: editingEntry.instructions_issued || [],
        delaysDisruptions: editingEntry.delays_disruptions || "",
        qualityIssues: editingEntry.quality_issues || "",
      });
    } else {
      resetForm();
    }
  }, [editingEntry, open]);

  const normalizeSubEntries = (entries: any[]): SubEntry[] => {
    return entries.map((entry) => ({
      ...entry,
      assignedTo: Array.isArray(entry.assignedTo)
        ? entry.assignedTo
        : entry.assignedTo
        ? [entry.assignedTo]
        : [],
    }));
  };

  const resetForm = () => {
    setFormData({
      entryDate: format(new Date(), "yyyy-MM-dd"),
      entryType: "standard",
      shiftType: "day",
      weather: "",
      progress: "",
      queries: "",
      notes: "",
      meetingMinutes: "",
      attendees: [],
      subEntries: [],
      workforceDetails: [],
      deliveries: [],
      safetyObservations: "",
      designDecisions: [],
      instructionsReceived: [],
      instructionsIssued: [],
      delaysDisruptions: "",
      qualityIssues: "",
    });
    setActiveTab("basic");
  };

  const updateFormData = (updates: Partial<DiaryFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session || !projectId) {
      toast.error("You must be logged in to create entries");
      setSubmitting(false);
      return;
    }

    try {
      const entryData = {
        project_id: projectId,
        created_by: session.user.id,
        entry_date: formData.entryDate,
        entry_type: formData.entryType,
        shift_type: formData.shiftType,
        weather_conditions: formData.weather || null,
        site_progress: formData.progress || null,
        queries: formData.queries || null,
        notes: formData.notes || null,
        meeting_minutes: formData.meetingMinutes || null,
        attendees: formData.attendees.length > 0 ? formData.attendees : null,
        sub_entries:
          formData.subEntries.length > 0 ? formData.subEntries : null,
        workforce_details:
          formData.workforceDetails.length > 0
            ? { entries: formData.workforceDetails }
            : {},
        deliveries:
          formData.deliveries.length > 0 ? formData.deliveries : [],
        safety_observations: formData.safetyObservations || null,
        design_decisions:
          formData.designDecisions.length > 0 ? formData.designDecisions : [],
        instructions_received:
          formData.instructionsReceived.length > 0
            ? formData.instructionsReceived
            : [],
        instructions_issued:
          formData.instructionsIssued.length > 0
            ? formData.instructionsIssued
            : [],
        delays_disruptions: formData.delaysDisruptions || null,
        quality_issues: formData.qualityIssues || null,
      };

      if (editingEntry) {
        const { error } = await supabase
          .from("site_diary_entries")
          .update(entryData as any)
          .eq("id", editingEntry.id);

        if (error) throw error;
        toast.success("Entry updated successfully");
      } else {
        const { error } = await supabase
          .from("site_diary_entries")
          .insert(entryData as any);

        if (error) throw error;
        toast.success("Entry added successfully");
      }

      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save entry");
    } finally {
      setSubmitting(false);
    }
  };

  const getSectionStatus = (sectionId: string): "empty" | "partial" | "complete" => {
    switch (sectionId) {
      case "basic":
        return formData.entryDate ? "complete" : "empty";
      case "daily":
        if (formData.progress && formData.queries) return "complete";
        if (formData.progress || formData.queries || formData.notes) return "partial";
        return "empty";
      case "workforce":
        return formData.workforceDetails.length > 0 ? "complete" : "empty";
      case "deliveries":
        return formData.deliveries.length > 0 ? "complete" : "empty";
      case "safety":
        return formData.safetyObservations ? "complete" : "empty";
      case "design":
        return formData.designDecisions.length > 0 ? "complete" : "empty";
      case "instructions":
        if (formData.instructionsReceived.length > 0 && formData.instructionsIssued.length > 0) return "complete";
        if (formData.instructionsReceived.length > 0 || formData.instructionsIssued.length > 0) return "partial";
        return "empty";
      case "actions":
        return formData.subEntries.length > 0 ? "complete" : "empty";
      default:
        return "empty";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">
                {editingEntry ? "Edit Site Diary Entry" : "New Site Diary Entry"} -{" "}
                {format(new Date(formData.entryDate), "EEEE, MMMM d, yyyy")}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Document today's activities in diary format for project records and handover
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {formData.entryType !== "standard" && (
                <Badge variant="secondary" className="capitalize">
                  {formData.entryType}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Section Navigation */}
          <div className="w-48 border-r bg-muted/30 p-2 overflow-y-auto">
            <nav className="space-y-1">
              {SECTION_TABS.map((tab) => {
                const status = getSectionStatus(tab.id);
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{tab.label}</span>
                    {status === "complete" && (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    )}
                    {status === "partial" && (
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Form Content */}
          <ScrollArea className="flex-1 h-[60vh]">
            <div className="p-6">
              {activeTab === "basic" && (
                <BasicInfoSection
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "daily" && (
                <DailyLogSection
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "workforce" && (
                <WorkforceSection
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "deliveries" && (
                <DeliveriesSection
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "safety" && (
                <SafetySection
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "design" && (
                <DesignDecisionsSection
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "instructions" && (
                <InstructionsSection
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              {activeTab === "actions" && (
                <ActionItemsSection
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {SECTION_TABS.filter((t) => getSectionStatus(t.id) !== "empty").length} of{" "}
              {SECTION_TABS.length} sections completed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              <Save className="h-4 w-4 mr-2" />
              {submitting
                ? editingEntry
                  ? "Updating..."
                  : "Saving..."
                : editingEntry
                ? "Update Entry"
                : "Save Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
