import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCheck, Calendar } from "lucide-react";

export function OnboardingManager() {
  const { data: onboardingProgress = [], isLoading } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_progress")
        .select(`
          *,
          employees!onboarding_progress_employee_id_fkey (
            first_name,
            last_name,
            employee_number,
            hire_date
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      not_started: "bg-gray-500",
      in_progress: "bg-blue-500",
      completed: "bg-green-500",
    };
    return (
      <Badge className={variants[status] || "bg-gray-500"}>
        {status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
      </Badge>
    );
  };

  const calculateProgress = (tasksCompleted: any[]) => {
    if (!tasksCompleted || tasksCompleted.length === 0) return 0;
    // Assuming tasks_completed is an array of task IDs
    return Math.round((tasksCompleted.length / 10) * 100); // Adjust based on your task count
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Onboarding Progress
        </h3>
        <p className="text-sm text-muted-foreground">Track new employee onboarding process</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Hire Date</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Completion Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {onboardingProgress.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No onboarding records found
              </TableCell>
            </TableRow>
          ) : (
            onboardingProgress.map((record: any) => {
              const progress = calculateProgress(record.tasks_completed);
              return (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.employees?.first_name} {record.employees?.last_name}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {record.employees?.employee_number}
                    </span>
                  </TableCell>
                  <TableCell>
                    {record.employees?.hire_date
                      ? new Date(record.employees.hire_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {record.start_date ? new Date(record.start_date).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="w-24" />
                      <span className="text-sm text-muted-foreground">{progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>
                    {record.completion_date
                      ? new Date(record.completion_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
