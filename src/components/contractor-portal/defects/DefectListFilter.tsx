import { useDefectLists, useCreateDefectList } from "@/hooks/useDefectLists";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface Props {
  projectId: string;
  selectedListId: string | null;
  onListChange: (listId: string | null) => void;
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
  userName: string;
  userEmail?: string;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open", color: "bg-red-500" },
  { value: "in_progress", label: "In Progress", color: "bg-orange-500" },
  { value: "resolved", label: "Resolved", color: "bg-blue-500" },
  { value: "closed", label: "Closed", color: "bg-green-500" },
];

export function DefectListFilter({
  projectId,
  selectedListId,
  onListChange,
  selectedStatus,
  onStatusChange,
  userName,
  userEmail,
}: Props) {
  const { data: lists } = useDefectLists(projectId);
  const createList = useCreateDefectList();
  const [newListName, setNewListName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = () => {
    if (!newListName.trim()) return;
    createList.mutate(
      { project_id: projectId, name: newListName.trim(), created_by_name: userName, created_by_email: userEmail },
      { onSuccess: () => { setNewListName(""); setShowCreate(false); } }
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={selectedListId || "all"} onValueChange={(v) => onListChange(v === "all" ? null : v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All lists" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Lists</SelectItem>
          {lists?.map((list) => (
            <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-1">
        {STATUS_OPTIONS.map((s) => (
          <Badge
            key={s.value}
            variant={selectedStatus === s.value ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => onStatusChange(selectedStatus === s.value ? null : s.value)}
          >
            <span className={`w-2 h-2 rounded-full ${s.color} mr-1`} />
            {s.label}
          </Badge>
        ))}
      </div>

      {showCreate ? (
        <div className="flex gap-1">
          <Input
            placeholder="List name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            className="h-8 w-[140px]"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button size="sm" variant="outline" onClick={handleCreate} disabled={createList.isPending}>
            {createList.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setShowCreate(true)}>
          <Plus className="h-3 w-3 mr-1" /> List
        </Button>
      )}
    </div>
  );
}
