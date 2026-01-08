import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Plus, Trash2, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { DiaryFormData, SubEntry } from "../DiaryEntryFormDialog";

interface ActionItemsSectionProps {
  formData: DiaryFormData;
  updateFormData: (updates: Partial<DiaryFormData>) => void;
}

const PRIORITY_OPTIONS = [
  { value: "note", label: "📝 Note (No Priority)", color: "bg-gray-100 text-gray-800" },
  { value: "low", label: "🟢 Low", color: "bg-green-100 text-green-800" },
  { value: "medium", label: "🟡 Medium", color: "bg-amber-100 text-amber-800" },
  { value: "high", label: "🔴 High", color: "bg-red-100 text-red-800" },
];

const CATEGORY_OPTIONS = [
  "General",
  "Safety",
  "Quality",
  "Design",
  "Material",
  "Subcontractor",
  "Client Request",
  "Documentation",
];

export const ActionItemsSection = ({
  formData,
  updateFormData,
}: ActionItemsSectionProps) => {
  const addSubEntry = () => {
    const newSubEntry: SubEntry = {
      id: `sub_${Date.now()}`,
      description: "",
      assignedTo: [],
      priority: "medium",
      timestamp: new Date().toISOString(),
      completed: false,
      category: "General",
    };
    updateFormData({ subEntries: [...formData.subEntries, newSubEntry] });
  };

  const updateSubEntry = (
    id: string,
    field: keyof SubEntry,
    value: string | boolean | string[]
  ) => {
    updateFormData({
      subEntries: formData.subEntries.map((entry) => {
        if (entry.id === id) {
          const updated = { ...entry, [field]: value };
          if (field === "completed" && value === true) {
            updated.completedAt = new Date().toISOString();
          }
          if (field === "completed" && value === false) {
            delete updated.completedAt;
          }
          return updated;
        }
        return entry;
      }),
    });
  };

  const removeSubEntry = (id: string) => {
    updateFormData({
      subEntries: formData.subEntries.filter((entry) => entry.id !== id),
    });
  };

  const getPriorityBadge = (priority: string) => {
    const option = PRIORITY_OPTIONS.find((p) => p.value === priority);
    return (
      <Badge variant="secondary" className={option?.color}>
        {priority === "note" ? "Note" : priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const pendingCount = formData.subEntries.filter((e) => !e.completed).length;
  const completedCount = formData.subEntries.filter((e) => e.completed).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Action Items & Assignments
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Track tasks, follow-ups, and responsibilities. These items will appear in your
          task board for tracking.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            Pending: {pendingCount}
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            Completed: {completedCount}
          </span>
        </div>
      </div>

      <Button type="button" onClick={addSubEntry} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Action Item
      </Button>

      {formData.subEntries.length > 0 ? (
        <div className="space-y-4">
          {formData.subEntries.map((subEntry, index) => (
            <div
              key={subEntry.id}
              className={`border rounded-lg p-4 space-y-4 transition-all ${
                subEntry.completed ? "bg-muted/30 opacity-75" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={subEntry.completed}
                  onCheckedChange={(checked) =>
                    updateSubEntry(subEntry.id, "completed", checked as boolean)
                  }
                  className="mt-1"
                />
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">Item {index + 1}</span>
                      <span>•</span>
                      <span>{format(new Date(subEntry.timestamp), "h:mm a")}</span>
                      {subEntry.completed && subEntry.completedAt && (
                        <>
                          <span>•</span>
                          <span className="text-green-600">
                            ✓ Completed{" "}
                            {format(new Date(subEntry.completedAt), "MMM d, h:mm a")}
                          </span>
                        </>
                      )}
                    </div>
                    {getPriorityBadge(subEntry.priority)}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Description</Label>
                    <Textarea
                      placeholder="Describe the action item or task..."
                      value={subEntry.description}
                      onChange={(e) =>
                        updateSubEntry(subEntry.id, "description", e.target.value)
                      }
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Assigned To
                      </Label>
                      <Textarea
                        placeholder="Enter names, one per line..."
                        value={subEntry.assignedTo.join("\n")}
                        onChange={(e) => {
                          const names = e.target.value
                            .split("\n")
                            .filter((n) => n.trim());
                          updateSubEntry(subEntry.id, "assignedTo", names);
                        }}
                        rows={2}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Priority</Label>
                      <Select
                        value={subEntry.priority}
                        onValueChange={(value) =>
                          updateSubEntry(subEntry.id, "priority", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Category</Label>
                      <Select
                        value={subEntry.category || "General"}
                        onValueChange={(value) =>
                          updateSubEntry(subEntry.id, "category", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due Date (Optional)
                    </Label>
                    <Input
                      type="date"
                      value={subEntry.dueDate || ""}
                      onChange={(e) =>
                        updateSubEntry(subEntry.id, "dueDate", e.target.value)
                      }
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSubEntry(subEntry.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No action items yet. Add tasks and follow-ups that need tracking.
          </p>
        </div>
      )}
    </div>
  );
};
