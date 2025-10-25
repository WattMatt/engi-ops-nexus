import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { AddAttendanceDialog } from "./AddAttendanceDialog";

export function AttendanceManager() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ["attendance", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          *,
          employees!attendance_records_employee_id_fkey (
            first_name,
            last_name,
            employee_number
          )
        `)
        .eq("record_date", selectedDate)
        .order("clock_in", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const calculateDuration = (clockIn: string | null, clockOut: string | null) => {
    if (!clockIn) return "-";
    if (!clockOut) return "In Progress";
    
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getAttendanceStatus = (record: any) => {
    if (!record.clock_in) return <Badge variant="outline">Not Clocked In</Badge>;
    if (!record.clock_out) return <Badge className="bg-blue-500">Active</Badge>;
    return <Badge className="bg-green-500">Completed</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Attendance Records</h3>
          <p className="text-sm text-muted-foreground">Track employee attendance and hours</p>
        </div>
        <div className="flex items-center gap-2">
          <Label>Date:</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Break Start</TableHead>
            <TableHead>Break End</TableHead>
            <TableHead>Total Hours</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendanceRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                No attendance records for {format(new Date(selectedDate), "PPP")}
              </TableCell>
            </TableRow>
          ) : (
            attendanceRecords.map((record: any) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">
                  {record.employees?.first_name} {record.employees?.last_name}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {record.employees?.employee_number}
                  </span>
                </TableCell>
                <TableCell>
                  {record.clock_in ? format(new Date(record.clock_in), "HH:mm") : "-"}
                </TableCell>
                <TableCell>
                  {record.clock_out ? format(new Date(record.clock_out), "HH:mm") : "-"}
                </TableCell>
                <TableCell>
                  {record.break_start ? format(new Date(record.break_start), "HH:mm") : "-"}
                </TableCell>
                <TableCell>
                  {record.break_end ? format(new Date(record.break_end), "HH:mm") : "-"}
                </TableCell>
                <TableCell>{calculateDuration(record.clock_in, record.clock_out)}</TableCell>
                <TableCell>{getAttendanceStatus(record)}</TableCell>
                <TableCell className="max-w-xs truncate">{record.notes || "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AddAttendanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["attendance", selectedDate] })}
      />
    </div>
  );
}
