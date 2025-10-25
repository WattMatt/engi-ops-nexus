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
import { Award, Target } from "lucide-react";

export function PerformanceManager() {
  const { data: performanceGoals = [], isLoading } = useQuery({
    queryKey: ["performance-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_goals")
        .select(`
          *,
          employees!performance_goals_employee_id_fkey (
            first_name,
            last_name,
            employee_number
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-blue-500",
      in_progress: "bg-yellow-500",
      completed: "bg-green-500",
      on_hold: "bg-gray-500",
    };
    return (
      <Badge className={variants[status] || "bg-gray-500"}>
        {status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Award className="h-5 w-5" />
          Performance Goals
        </h3>
        <p className="text-sm text-muted-foreground">Track employee performance and objectives</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Goal</TableHead>
            <TableHead>Target Date</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {performanceGoals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No performance goals found
              </TableCell>
            </TableRow>
          ) : (
            performanceGoals.map((goal: any) => (
              <TableRow key={goal.id}>
                <TableCell className="font-medium">
                  {goal.employees?.first_name} {goal.employees?.last_name}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {goal.employees?.employee_number}
                  </span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{goal.title}</p>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {goal.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {goal.target_date ? new Date(goal.target_date).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={goal.progress || 0} className="w-24" />
                    <span className="text-sm text-muted-foreground">{goal.progress || 0}%</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(goal.status)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
