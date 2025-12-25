import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Edit, Trash2, Zap, ChevronRight, ChevronDown } from "lucide-react";
import { useDistributionBoards, useCreateDistributionBoard, useUpdateDistributionBoard, useDeleteDistributionBoard, DistributionBoard } from "./hooks/useDistributionBoards";
import { CircuitList } from "./CircuitList";
import { cn } from "@/lib/utils";

interface DistributionBoardManagerProps {
  projectId: string;
  floorPlanId?: string;
}

export function DistributionBoardManager({ projectId, floorPlanId }: DistributionBoardManagerProps) {
  const { data: boards = [], isLoading } = useDistributionBoards(projectId);
  const createBoard = useCreateDistributionBoard();
  const updateBoard = useUpdateDistributionBoard();
  const deleteBoard = useDeleteDistributionBoard();

  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBoard, setEditingBoard] = useState<DistributionBoard | null>(null);
  const [formData, setFormData] = useState({ name: "", location: "", description: "" });

  const toggleBoard = (id: string) => {
    const newExpanded = new Set(expandedBoards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedBoards(newExpanded);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    await createBoard.mutateAsync({
      project_id: projectId,
      name: formData.name,
      location: formData.location || undefined,
      description: formData.description || undefined,
      floor_plan_id: floorPlanId,
    });
    setFormData({ name: "", location: "", description: "" });
    setShowCreateDialog(false);
  };

  const handleUpdate = async () => {
    if (!editingBoard || !formData.name.trim()) return;
    await updateBoard.mutateAsync({
      id: editingBoard.id,
      projectId,
      name: formData.name,
      location: formData.location || undefined,
      description: formData.description || undefined,
    });
    setEditingBoard(null);
    setFormData({ name: "", location: "", description: "" });
  };

  const handleDelete = async (board: DistributionBoard) => {
    if (confirm(`Delete "${board.name}" and all its circuits?`)) {
      await deleteBoard.mutateAsync({ id: board.id, projectId });
    }
  };

  const openEditDialog = (board: DistributionBoard) => {
    setEditingBoard(board);
    setFormData({
      name: board.name,
      location: board.location || "",
      description: board.description || "",
    });
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading distribution boards...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Distribution Boards</h3>
          <p className="text-sm text-muted-foreground">
            Create distribution boards and add circuits with materials
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add DB
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Distribution Board</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="db-name">Name *</Label>
                <Input
                  id="db-name"
                  placeholder="e.g., DB-1, DB-1A"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="db-location">Location</Label>
                <Input
                  id="db-location"
                  placeholder="e.g., Shop 1, Common Area"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="db-desc">Description</Label>
                <Input
                  id="db-desc"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!formData.name.trim() || createBoard.isPending}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {boards.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No distribution boards yet.</p>
            <p className="text-sm">Create a DB to start adding circuits and materials.</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <div className="space-y-2">
            {boards.map((board) => (
              <Card key={board.id} className="overflow-hidden">
                <div
                  className={cn(
                    "flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                    expandedBoards.has(board.id) && "bg-muted/30"
                  )}
                  onClick={() => toggleBoard(board.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedBoards.has(board.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Zap className="h-5 w-5 text-primary" />
                    <div>
                      <span className="font-medium">{board.name}</span>
                      {board.location && (
                        <span className="text-sm text-muted-foreground ml-2">
                          — {board.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(board); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(board); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {expandedBoards.has(board.id) && (
                  <CardContent className="pt-0 pb-4 border-t">
                    <CircuitList boardId={board.id} projectId={projectId} />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingBoard} onOpenChange={(open) => !open && setEditingBoard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Distribution Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-db-name">Name *</Label>
              <Input
                id="edit-db-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-db-location">Location</Label>
              <Input
                id="edit-db-location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-db-desc">Description</Label>
              <Input
                id="edit-db-desc"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBoard(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!formData.name.trim() || updateBoard.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
