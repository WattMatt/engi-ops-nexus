import { useState } from "react";
import { usePRDs, useCreatePRD, useDeletePRD, PRD } from "@/hooks/usePRDs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, FileText, Trash2, GitBranch, Clock } from "lucide-react";
import { format } from "date-fns";

interface PRDListProps {
  onSelectPRD: (prd: PRD) => void;
}

export function PRDList({ onSelectPRD }: PRDListProps) {
  const { data: prds, isLoading } = usePRDs();
  const createPRD = useCreatePRD();
  const deletePRD = useDeletePRD();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPRD, setNewPRD] = useState({ title: '', description: '', branch_name: '' });

  const handleCreate = async () => {
    if (!newPRD.title.trim()) return;
    await createPRD.mutateAsync(newPRD);
    setNewPRD({ title: '', description: '', branch_name: '' });
    setIsCreateOpen(false);
  };

  const getStatusColor = (status: PRD['status']) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'in_progress': return 'default';
      case 'completed': return 'outline';
      case 'archived': return 'secondary';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading PRDs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Development PRDs</h2>
          <p className="text-muted-foreground">Manage your product requirements documents</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New PRD
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New PRD</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="e.g., User Authentication System"
                  value={newPRD.title}
                  onChange={(e) => setNewPRD({ ...newPRD, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Brief description of the feature..."
                  value={newPRD.description}
                  onChange={(e) => setNewPRD({ ...newPRD, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Branch Name (optional)</label>
                <Input
                  placeholder="e.g., feature/auth-system"
                  value={newPRD.branch_name}
                  onChange={(e) => setNewPRD({ ...newPRD, branch_name: e.target.value })}
                />
              </div>
              <Button onClick={handleCreate} disabled={!newPRD.title.trim() || createPRD.isPending} className="w-full">
                Create PRD
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {prds?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No PRDs yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mt-2">
              Create your first PRD to start organizing development requirements.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {prds?.map((prd) => (
            <Card key={prd.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => onSelectPRD(prd)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">{prd.title}</CardTitle>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete PRD?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{prd.title}" and all its stories.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePRD.mutate(prd.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <CardDescription className="line-clamp-2">{prd.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getStatusColor(prd.status)}>{prd.status.replace('_', ' ')}</Badge>
                  {prd.branch_name && (
                    <Badge variant="outline" className="gap-1">
                      <GitBranch className="h-3 w-3" />
                      {prd.branch_name}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(prd.created_at), 'MMM d, yyyy')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
