import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { TaskCard } from "./TaskCard";
import { CreateTaskDialog } from "./CreateTaskDialog";

interface EisenhowerMatrixProps {
  projectId: string;
}

export const EisenhowerMatrix = ({ projectId }: EisenhowerMatrixProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedQuadrant, setSelectedQuadrant] = useState<{
    urgent: boolean;
    important: boolean;
  } | null>(null);

  const { data: tasks, refetch } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const openCreateDialog = (urgent: boolean, important: boolean) => {
    setSelectedQuadrant({ urgent, important });
    setShowCreateDialog(true);
  };

  const urgentImportant = tasks?.filter((t) => t.is_urgent && t.is_important) || [];
  const notUrgentImportant = tasks?.filter((t) => !t.is_urgent && t.is_important) || [];
  const urgentNotImportant = tasks?.filter((t) => t.is_urgent && !t.is_important) || [];
  const notUrgentNotImportant = tasks?.filter((t) => !t.is_urgent && !t.is_important) || [];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quadrant 1: Do First (Urgent + Important) */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="bg-red-50 dark:bg-red-950/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-red-700 dark:text-red-400">Do First</CardTitle>
                <CardDescription>Urgent & Important</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openCreateDialog(true, true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-3 max-h-96 overflow-y-auto">
            {urgentImportant.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={refetch} />
            ))}
            {urgentImportant.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No tasks</p>
            )}
          </CardContent>
        </Card>

        {/* Quadrant 2: Schedule (Not Urgent + Important) */}
        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardHeader className="bg-yellow-50 dark:bg-yellow-950/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-yellow-700 dark:text-yellow-400">Schedule</CardTitle>
                <CardDescription>Not Urgent & Important</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openCreateDialog(false, true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-3 max-h-96 overflow-y-auto">
            {notUrgentImportant.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={refetch} />
            ))}
            {notUrgentImportant.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No tasks</p>
            )}
          </CardContent>
        </Card>

        {/* Quadrant 3: Delegate (Urgent + Not Important) */}
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-blue-700 dark:text-blue-400">Delegate</CardTitle>
                <CardDescription>Urgent & Not Important</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openCreateDialog(true, false)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-3 max-h-96 overflow-y-auto">
            {urgentNotImportant.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={refetch} />
            ))}
            {urgentNotImportant.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No tasks</p>
            )}
          </CardContent>
        </Card>

        {/* Quadrant 4: Eliminate (Not Urgent + Not Important) */}
        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader className="bg-gray-50 dark:bg-gray-950/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-700 dark:text-gray-400">Eliminate</CardTitle>
                <CardDescription>Not Urgent & Not Important</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openCreateDialog(false, false)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-3 max-h-96 overflow-y-auto">
            {notUrgentNotImportant.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={refetch} />
            ))}
            {notUrgentNotImportant.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No tasks</p>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={projectId}
        initialQuadrant={selectedQuadrant}
        onSuccess={() => {
          refetch();
          setShowCreateDialog(false);
        }}
      />
    </>
  );
};