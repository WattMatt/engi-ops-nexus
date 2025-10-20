import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, Cloud } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SiteDiaryEntry {
  id: string;
  entry_date: string;
  weather_conditions: string | null;
  site_progress: string | null;
  queries: string | null;
  notes: string | null;
  created_at: string;
}

const SiteDiary = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<SiteDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weather, setWeather] = useState("");
  const [progress, setProgress] = useState("");
  const [queries, setQueries] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) {
      navigate("/projects");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("site_diary_entries")
        .select("*")
        .eq("project_id", projectId)
        .order("entry_date", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      toast.error("Failed to load diary entries");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const projectId = localStorage.getItem("selectedProjectId");
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !projectId) return;

    try {
      const { error } = await supabase.from("site_diary_entries").insert({
        project_id: projectId,
        created_by: session.user.id,
        entry_date: entryDate,
        weather_conditions: weather,
        site_progress: progress,
        queries: queries,
        notes: notes,
      });

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
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Site Diary</h1>
          <p className="text-muted-foreground">
            Daily site progress, weather conditions, and notes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Site Diary Entry</DialogTitle>
              <DialogDescription>
                Record today's site activities, weather, and progress
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
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
                <div className="space-y-2">
                  <Label htmlFor="weather">Weather Conditions</Label>
                  <Input
                    id="weather"
                    placeholder="Sunny, 25°C, light wind..."
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="progress">Site Progress</Label>
                  <Textarea
                    id="progress"
                    placeholder="Describe work completed today..."
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="queries">Queries & Issues</Label>
                  <Textarea
                    id="queries"
                    placeholder="Any queries or issues that arose..."
                    value={queries}
                    onChange={(e) => setQueries(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any other notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Entry"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>


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
              Start documenting your site activities by creating your first entry
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
                  <div>
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
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), "h:mm a")}
                  </span>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiteDiary;