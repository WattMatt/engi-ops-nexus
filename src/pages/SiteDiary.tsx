import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, Cloud, ListTodo, GanttChart, Bell, X, User, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TasksManager } from "@/components/site-diary/TasksManager";
import { EnhancedTasksManager } from "@/components/site-diary/task-views/EnhancedTasksManager";
import { MeetingMinutes } from "@/components/site-diary/MeetingMinutes";
import { TasksGanttChart } from "@/components/site-diary/TasksGanttChart";
import { RemindersPanel } from "@/components/site-diary/RemindersPanel";

interface SubEntry {
  id: string;
  description: string;
  assignedTo: string;
  priority: "low" | "medium" | "high";
  timestamp: string;
}

interface SiteDiaryEntry {
  id: string;
  entry_date: string;
  weather_conditions: string | null;
  site_progress: string | null;
  queries: string | null;
  notes: string | null;
  meeting_minutes: string | null;
  attendees: any;
  sub_entries: SubEntry[] | null;
  created_at: string;
}

const SiteDiary = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<SiteDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // Form state
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weather, setWeather] = useState("");
  const [progress, setProgress] = useState("");
  const [queries, setQueries] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingMinutes, setMeetingMinutes] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [subEntries, setSubEntries] = useState<SubEntry[]>([]);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const storedProjectId = localStorage.getItem("selectedProjectId");
    if (!storedProjectId) {
      navigate("/projects");
      return;
    }

    setProjectId(storedProjectId);

    try {
      const { data, error } = await supabase
        .from("site_diary_entries")
        .select("*")
        .eq("project_id", storedProjectId)
        .order("entry_date", { ascending: false });

      if (error) throw error;
      setEntries(data as any as SiteDiaryEntry[]);
    } catch (error: any) {
      toast.error("Failed to load diary entries");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !projectId) {
      toast.error("You must be logged in to create entries");
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from("site_diary_entries").insert({
        project_id: projectId,
        created_by: session.user.id,
        entry_date: entryDate,
        weather_conditions: weather,
        site_progress: progress,
        queries: queries,
        notes: notes,
        meeting_minutes: meetingMinutes,
        attendees: attendees,
        sub_entries: subEntries.length > 0 ? subEntries : null,
      } as any);

      if (error) throw error;

      toast.success("Entry added successfully");
      setDialogOpen(false);
      resetForm();
      loadEntries();
    } catch (error: any) {
      toast.error(error.message || "Failed to add entry");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEntryDate(format(new Date(), "yyyy-MM-dd"));
    setWeather("");
    setProgress("");
    setQueries("");
    setNotes("");
    setMeetingMinutes("");
    setAttendees([]);
    setSubEntries([]);
  };

  const addSubEntry = () => {
    const newSubEntry: SubEntry = {
      id: `sub_${Date.now()}`,
      description: "",
      assignedTo: "",
      priority: "medium",
      timestamp: new Date().toISOString(),
    };
    setSubEntries([...subEntries, newSubEntry]);
  };

  const updateSubEntry = (id: string, field: keyof SubEntry, value: string) => {
    setSubEntries(subEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const removeSubEntry = (id: string) => {
    setSubEntries(subEntries.filter(entry => entry.id !== id));
  };

  const exportToPDF = async (entry: SiteDiaryEntry) => {
    try {
      const doc = new jsPDF();
      let yPosition = 20;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("Site Diary Entry", 20, yPosition);
      yPosition += 15;

      // Date and Time
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(format(new Date(entry.entry_date), "EEEE, MMMM d, yyyy"), 20, yPosition);
      yPosition += 6;
      doc.text(`Created: ${format(new Date(entry.created_at), "h:mm a")}`, 20, yPosition);
      yPosition += 15;

      // Weather (if exists)
      if (entry.weather_conditions) {
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Weather Conditions", 20, yPosition);
        yPosition += 8;
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        const weatherLines = doc.splitTextToSize(entry.weather_conditions, 170);
        doc.text(weatherLines, 20, yPosition);
        yPosition += weatherLines.length * 6 + 10;
      }

      // Site Progress
      if (entry.site_progress) {
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Daily Log", 20, yPosition);
        yPosition += 8;
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        const progressLines = doc.splitTextToSize(entry.site_progress, 170);
        doc.text(progressLines, 20, yPosition);
        yPosition += progressLines.length * 6 + 10;
      }

      // Issues & Concerns
      if (entry.queries) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Issues & Concerns", 20, yPosition);
        yPosition += 8;
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        const queriesLines = doc.splitTextToSize(entry.queries, 170);
        doc.text(queriesLines, 20, yPosition);
        yPosition += queriesLines.length * 6 + 10;
      }

      // Additional Notes
      if (entry.notes) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Additional Observations", 20, yPosition);
        yPosition += 8;
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        const notesLines = doc.splitTextToSize(entry.notes, 170);
        doc.text(notesLines, 20, yPosition);
        yPosition += notesLines.length * 6 + 10;
      }

      // Action Items
      if (entry.sub_entries && entry.sub_entries.length > 0) {
        if (yPosition > 220) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Action Items & Assignments", 20, yPosition);
        yPosition += 10;

        const actionItemsData = entry.sub_entries.map((item: SubEntry, index: number) => [
          `${index + 1}`,
          item.description,
          item.assignedTo || "-",
          item.priority.toUpperCase(),
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["#", "Description", "Assigned To", "Priority"]],
          body: actionItemsData,
          theme: "grid",
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          styles: { fontSize: 10 },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 85 },
            2: { cellWidth: 45 },
            3: { cellWidth: 30 },
          },
        });
      }

      // Save the PDF
      const fileName = `Site-Diary-${format(new Date(entry.entry_date), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Site Diary</h1>
          <p className="text-muted-foreground">
            Daily progress, tasks, meetings, and project timeline
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Site Diary Entry - {format(new Date(entryDate), "EEEE, MMMM d, yyyy")}</DialogTitle>
              <DialogDescription>
                Document today's activities in diary format
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-3 border-l-4 border-primary/30 pl-4 bg-muted/20 p-4 rounded-r">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Daily Log
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="progress" className="text-sm font-normal text-muted-foreground">
                    What happened on site today?
                  </Label>
                  <Textarea
                    id="progress"
                    placeholder="Example: Started the day with morning briefing at 7:30 AM. Excavation works continued in the northern section. Concrete pour completed for foundation Block A. Electrical team began conduit installation..."
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="space-y-3 border-l-4 border-destructive/30 pl-4 bg-destructive/5 p-4 rounded-r">
                <h3 className="font-semibold text-base">Issues & Concerns</h3>
                <div className="space-y-2">
                  <Label htmlFor="queries" className="text-sm font-normal text-muted-foreground">
                    Any problems or questions that came up?
                  </Label>
                  <Textarea
                    id="queries"
                    placeholder="Example: Delay in steel delivery - expected tomorrow. Need clarification on window specifications from architect. Safety concern noted regarding scaffolding in west wing..."
                    value={queries}
                    onChange={(e) => setQueries(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base">Additional Observations</h3>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-normal text-muted-foreground">
                    Anything else worth noting?
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Example: Site morale is high. New workers settled in well. Reminded team about safety protocols. Site cleaned and secured for the night..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">Action Items & Assignments</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addSubEntry}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Action Item
                  </Button>
                </div>
                {subEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
                    Add action items with assigned responsibilities
                  </p>
                ) : (
                  <div className="space-y-3">
                    {subEntries.map((subEntry, index) => (
                      <div key={subEntry.id} className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">Item {index + 1}</span>
                              <span>•</span>
                              <span>{format(new Date(subEntry.timestamp), "h:mm a")}</span>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Description</Label>
                              <Textarea
                                placeholder="Describe the action item or task..."
                                value={subEntry.description}
                                onChange={(e) => updateSubEntry(subEntry.id, "description", e.target.value)}
                                rows={2}
                                className="resize-none"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-sm flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Assigned To
                                </Label>
                                <Input
                                  placeholder="Name or role..."
                                  value={subEntry.assignedTo}
                                  onChange={(e) => updateSubEntry(subEntry.id, "assignedTo", e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Priority</Label>
                                <Select
                                  value={subEntry.priority}
                                  onValueChange={(value) => updateSubEntry(subEntry.id, "priority", value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSubEntry(subEntry.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving Entry..." : "Save Diary Entry"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="entries" className="w-full">
        <TabsList>
          <TabsTrigger value="entries">
            <Calendar className="h-4 w-4 mr-2" />
            Diary Entries
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ListTodo className="h-4 w-4 mr-2" />
            All Tasks
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <GanttChart className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="reminders">
            <Bell className="h-4 w-4 mr-2" />
            Reminders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <p className="text-muted-foreground">Loading entries...</p>
            </div>
          ) : entries.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Entries Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start documenting your site activities
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Entry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {entries.map((entry) => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {format(new Date(entry.entry_date), "EEEE, MMMM d, yyyy")}
                        </CardTitle>
                        {entry.weather_conditions && (
                          <CardDescription className="flex items-center gap-2 mt-2">
                            <Cloud className="h-4 w-4" />
                            {entry.weather_conditions}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportToPDF(entry)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export PDF
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "h:mm a")}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {entry.site_progress && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Site Progress</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {entry.site_progress}
                        </p>
                      </div>
                    )}
                    {entry.queries && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Queries & Issues</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {entry.queries}
                        </p>
                      </div>
                    )}
                    {entry.notes && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Additional Notes</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {entry.notes}
                        </p>
                      </div>
                    )}
                    {entry.meeting_minutes && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Meeting Minutes</h4>
                        {entry.attendees && entry.attendees.length > 0 && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Attendees: {entry.attendees.join(", ")}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {entry.meeting_minutes}
                        </p>
                      </div>
                    )}
                    {entry.sub_entries && entry.sub_entries.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-3">Action Items & Assignments</h4>
                        <div className="space-y-2">
                          {entry.sub_entries.map((subEntry: SubEntry, index: number) => (
                            <div key={subEntry.id} className="border rounded-lg p-3 bg-muted/20">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-medium">Item {index + 1}</span>
                                  <span>•</span>
                                  <span className="text-muted-foreground">
                                    {format(new Date(subEntry.timestamp), "h:mm a")}
                                  </span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  subEntry.priority === "high" ? "bg-destructive/20 text-destructive" :
                                  subEntry.priority === "medium" ? "bg-orange-500/20 text-orange-700" :
                                  "bg-muted text-muted-foreground"
                                }`}>
                                  {subEntry.priority}
                                </span>
                              </div>
                              <p className="text-sm mb-2 whitespace-pre-wrap">
                                {subEntry.description}
                              </p>
                              {subEntry.assignedTo && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  <span>{subEntry.assignedTo}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="pt-4 border-t">
                      <TasksManager projectId={projectId!} diaryEntryId={entry.id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          {projectId && <EnhancedTasksManager projectId={projectId} />}
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          {projectId && <TasksGanttChart projectId={projectId} />}
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <RemindersPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteDiary;