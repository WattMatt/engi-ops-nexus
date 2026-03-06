import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useCreateDefectPin, useUpdateDefectPin, useDeleteDefectPin, DefectPin } from "@/hooks/useDefectPins";
import { useDefectLists } from "@/hooks/useDefectLists";
import { ResponsiveSheet } from "./ResponsiveSheet";
import { DefectActivityTimeline } from "./DefectActivityTimeline";
import { DefectPhotoUpload } from "./DefectPhotoUpload";
import { Loader2, Trash2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  drawingId: string;
  pin?: DefectPin | null;
  clickCoords?: { x: number; y: number } | null;
  userName: string;
  userEmail?: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-destructive",
  in_progress: "bg-orange-500",
  resolved: "bg-blue-500",
  closed: "bg-green-500",
};

export function DefectPinDialog({
  open,
  onClose,
  projectId,
  drawingId,
  pin,
  clickCoords,
  userName,
  userEmail,
}: Props) {
  const isEdit = !!pin;
  const { data: lists } = useDefectLists(projectId);
  const createPin = useCreateDefectPin();
  const updatePin = useUpdateDefectPin();
  const deletePin = useDeleteDefectPin();

  const [title, setTitle] = useState(pin?.title || "");
  const [description, setDescription] = useState(pin?.description || "");
  const [priority, setPriority] = useState<string>(pin?.priority || "medium");
  const [status, setStatus] = useState<string>(pin?.status || "open");
  const [pkg, setPkg] = useState(pin?.package || "");
  const [listId, setListId] = useState<string>(pin?.list_id || "none");
  const [locationArea, setLocationArea] = useState(pin?.location_area || "");
  const [assigneeInput, setAssigneeInput] = useState("");
  const [assignees, setAssignees] = useState<string[]>(pin?.assignee_names || []);

  const handleAddAssignee = () => {
    const name = assigneeInput.trim();
    if (name && !assignees.includes(name)) {
      setAssignees([...assignees, name]);
      setAssigneeInput("");
    }
  };

  const handleRemoveAssignee = (name: string) => {
    setAssignees(assignees.filter((a) => a !== name));
  };

  const handleSave = () => {
    if (!title.trim()) return;

    if (isEdit && pin) {
      updatePin.mutate(
        {
          id: pin.id,
          project_id: projectId,
          updates: {
            title: title.trim(),
            description: description.trim() || null,
            priority: priority as DefectPin["priority"],
            status: status as DefectPin["status"],
            package: pkg.trim() || null,
            list_id: listId === "none" ? null : listId,
            location_area: locationArea.trim() || null,
            assignee_names: assignees,
          },
          user_name: userName,
          user_email: userEmail,
        },
        { onSuccess: onClose }
      );
    } else if (clickCoords) {
      createPin.mutate(
        {
          project_id: projectId,
          drawing_id: drawingId,
          x_percent: clickCoords.x,
          y_percent: clickCoords.y,
          title: title.trim(),
          description: description.trim() || undefined,
          priority: priority as DefectPin["priority"],
          package: pkg.trim() || undefined,
          created_by_name: userName,
          created_by_email: userEmail,
          list_id: listId === "none" ? null : listId,
          location_area: locationArea.trim() || undefined,
          assignee_names: assignees,
        },
        { onSuccess: onClose }
      );
    }
  };

  const handleDelete = () => {
    if (!pin) return;
    deletePin.mutate(
      { id: pin.id, project_id: projectId },
      { onSuccess: onClose }
    );
  };

  const isPending = createPin.isPending || updatePin.isPending;

  const titleNode = isEdit ? (
    <span className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[pin.status]}`} />
      Pin #{pin.number_id}
    </span>
  ) : (
    "New Status Pin"
  );

  const footerNode = (
    <div className="flex w-full justify-between">
      {isEdit ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={deletePin.isPending}>
              {deletePin.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Pin #{pin.number_id}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this pin along with all its photos, comments, and activity history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Pin
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : <div />}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!title.trim() || isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {isEdit ? "Save" : "Create"}
        </Button>
      </div>
    </div>
  );

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={titleNode}
      footer={footerNode}
    >
      <Tabs defaultValue="details">
        <TabsList className="w-full">
          <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
          {isEdit && <TabsTrigger value="photos" className="flex-1">Photos</TabsTrigger>}
          {isEdit && <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>}
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief description" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed notes..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isEdit && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={locationArea} onChange={(e) => setLocationArea(e.target.value)} placeholder="e.g. Kitchen" />
            </div>
            <div className="space-y-2">
              <Label>Package</Label>
              <Input value={pkg} onChange={(e) => setPkg(e.target.value)} placeholder="e.g. Electrical" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observation List</Label>
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {lists?.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assignees</Label>
            <div className="flex gap-2">
              <Input
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                placeholder="Name or role"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAssignee())}
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddAssignee} disabled={!assigneeInput.trim()}>
                Add
              </Button>
            </div>
            {assignees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {assignees.map((a) => (
                  <Badge key={a} variant="secondary" className="gap-1 pr-1">
                    {a}
                    <button onClick={() => handleRemoveAssignee(a)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {isEdit && (
            <div className="text-xs text-muted-foreground">
              Created by {pin.created_by_name} · {new Date(pin.created_at).toLocaleDateString()}
            </div>
          )}
        </TabsContent>

        {isEdit && (
          <TabsContent value="photos" className="mt-4">
            <DefectPhotoUpload pinId={pin.id} projectId={projectId} uploaderName={userName} />
          </TabsContent>
        )}

        {isEdit && (
          <TabsContent value="activity" className="mt-4">
            <DefectActivityTimeline pinId={pin.id} userName={userName} userEmail={userEmail} />
          </TabsContent>
        )}
      </Tabs>
    </ResponsiveSheet>
  );
}
