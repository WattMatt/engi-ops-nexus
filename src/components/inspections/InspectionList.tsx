import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ClipboardCheck, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { z } from "zod";
import { useOfflineInspections } from "@/hooks/useOfflineInspections";
import { offlineDB } from "@/services/db";

// Minimal schema for now
const inspectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["Pending", "In Progress", "Completed"]),
  inspection_date: z.string().optional(),
  site_id: z.string().min(1, "Site is required"),
});

interface Inspection {
  id: string;
  title: string;
  description: string | null;
  status: string;
  inspection_date: string | null;
  site_id: string;
  // wm-office uses 'projects' not 'sites', but we keep site_id for now as per instructions to port logic.
  // We might need to map this to 'project_id' or 'site_id' if sites table exists.
  sites?: {
    id: string;
    name: string;
  };
}

interface Site {
  id: string;
  name: string;
}

export const InspectionList = () => {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "Pending",
    inspection_date: "",
    site_id: "",
  });

  const { createInspection, deleteInspection, isOnline } = useOfflineInspections();

  useEffect(() => {
    fetchData();
  }, [isOnline]); // Re-fetch when connectivity changes

  const fetchData = async () => {
    try {
      // In a real integration, we would likely fetch 'projects' here if 'sites' don't exist
      // But we will try to fetch 'sites' assuming the schema migration happened or we are using projects as sites
      
      const { data: sitesData, error: sitesError } = await (supabase
        .from("sites" as any) as any)
        .select("id, name");

      if (sitesError) {
          console.warn("Could not fetch sites, maybe table missing or using projects?", sitesError);
          // Fallback to projects if sites fail?
          // For now, let's assume we might be offline or table missing
      }

      setSites(sitesData || []);

      let allInspections: Inspection[] = [];

      if (isOnline) {
        const { data, error } = await (supabase
          .from("inspections" as any) as any)
          .select("*, sites(id, name)")
          .order("created_at", { ascending: false });
        
        if (!error && data) {
            allInspections = data as any[];
        }
      }

      // Merge with offline
      const offlineInspections = await offlineDB.getUnsyncedInspections();
      const offlineMapped = offlineInspections.map(offline => {
        const site = sitesData?.find(s => s.id === offline.site_id);
        return {
          id: offline.id,
          title: offline.title,
          description: offline.description,
          status: offline.status,
          inspection_date: offline.inspection_date,
          site_id: offline.site_id,
          sites: site ? { id: site.id, name: site.name } : { id: offline.site_id, name: 'Offline Site' }
        };
      });

      // Simple merge: offline ones on top if not already in list
      const onlineIds = new Set(allInspections.map(i => i.id));
      const uniqueOffline = offlineMapped.filter(i => !onlineIds.has(i.id));
      
      setInspections([...uniqueOffline, ...allInspections]);

    } catch (error) {
      console.error("Error fetching data:", error);
      // If error, try to load just offline data
       const offlineInspections = await offlineDB.getUnsyncedInspections();
       const offlineMapped: Inspection[] = offlineInspections.map(offline => ({
            id: offline.id,
            title: offline.title,
            description: offline.description,
            status: offline.status,
            inspection_date: offline.inspection_date,
            site_id: offline.site_id,
            sites: { id: offline.site_id, name: 'Offline Data' }
       }));
       setInspections(offlineMapped);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = inspectionSchema.parse(formData);
      
      const { data: { user } } = await supabase.auth.getUser();

      await createInspection({
        title: validated.title,
        description: validated.description || null,
        status: validated.status,
        inspection_date: validated.inspection_date || null,
        site_id: validated.site_id,
        inspector_id: user?.id,
      });

      setDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        status: "Pending",
        inspection_date: "",
        site_id: "",
      });
      fetchData();
    } catch (error: any) {
       console.error("Error creating inspection:", error);
       toast.error(error.message || "Failed to create inspection");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inspection?")) return;
    try {
      await deleteInspection(id);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "In Progress": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Pending": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inspections (Offline Capable)</h1>
          {!isOnline && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 mt-2">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline Mode
            </Badge>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Inspection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Inspection</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Site</Label>
                <Select 
                    value={formData.site_id} 
                    onValueChange={(v) => setFormData({...formData, site_id: v})}
                >
                    <SelectTrigger><SelectValue placeholder="Select Site" /></SelectTrigger>
                    <SelectContent>
                        {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              </div>
              <div>
                 <Label>Status</Label>
                 <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
              <Button type="submit">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>All Inspections</CardTitle></CardHeader>
        <CardContent>
            {inspections.length === 0 ? <p>No inspections found.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell>
                        {inspection.title}
                        {inspection.id.startsWith('offline_') && <Badge className="ml-2">Offline</Badge>}
                    </TableCell>
                    <TableCell>{inspection.sites?.name || 'Unknown'}</TableCell>
                    <TableCell>{inspection.inspection_date ? format(new Date(inspection.inspection_date), "MMM dd, yyyy") : "-"}</TableCell>
                    <TableCell><Badge className={getStatusColor(inspection.status)}>{inspection.status}</Badge></TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(inspection.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
};
