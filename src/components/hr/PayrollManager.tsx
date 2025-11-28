import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText, History, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddPayrollDialog } from "./AddPayrollDialog";
import { GeneratePayslipDialog } from "./GeneratePayslipDialog";
import { PayslipHistory } from "./PayslipHistory";

export function PayrollManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: payrollRecords = [], isLoading } = useQuery({
    queryKey: ["payroll-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_records")
        .select(`
          *,
          employees!payroll_records_employee_id_fkey (
            id,
            first_name,
            last_name,
            employee_number
          )
        `)
        .order("effective_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get payslip counts per employee
  const { data: payslipCounts = {} } = useQuery({
    queryKey: ["payslip-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pay_slips")
        .select("employee_id");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((slip: any) => {
        counts[slip.employee_id] = (counts[slip.employee_id] || 0) + 1;
      });
      return counts;
    },
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: currency || "ZAR",
    }).format(amount);
  };

  const getStatusBadge = (endDate: string | null) => {
    if (!endDate) return <Badge className="bg-green-500">Active</Badge>;
    if (new Date(endDate) > new Date()) return <Badge className="bg-green-500">Active</Badge>;
    return <Badge variant="outline">Inactive</Badge>;
  };

  const handleGeneratePayslip = (record: any) => {
    setSelectedRecord(record);
    setPayslipDialogOpen(true);
  };

  const handleViewHistory = (record: any) => {
    setSelectedRecord(record);
    setHistoryDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Payroll Records</h3>
          <p className="text-sm text-muted-foreground">View employee compensation details and generate payslips</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Payroll Record
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Salary Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Effective Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payslips</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payrollRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No payroll records found
              </TableCell>
            </TableRow>
          ) : (
            payrollRecords.map((record: any) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">
                  {record.employees?.first_name} {record.employees?.last_name}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {record.employees?.employee_number}
                  </span>
                </TableCell>
                <TableCell>
                  {formatCurrency(record.salary_amount, record.salary_currency)}
                </TableCell>
                <TableCell className="capitalize">{record.payment_frequency}</TableCell>
                <TableCell>{new Date(record.effective_date).toLocaleDateString()}</TableCell>
                <TableCell>{getStatusBadge(record.end_date)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {payslipCounts[record.employee_id] || 0} generated
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleGeneratePayslip(record)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Payslip
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewHistory(record)}>
                        <History className="mr-2 h-4 w-4" />
                        View Payslip History
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AddPayrollDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["payroll-records"] })}
      />

      <GeneratePayslipDialog
        open={payslipDialogOpen}
        onOpenChange={setPayslipDialogOpen}
        payrollRecord={selectedRecord}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["payslip-counts"] })}
      />

      {selectedRecord && (
        <PayslipHistory
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          employeeId={selectedRecord.employee_id}
          employeeName={`${selectedRecord.employees?.first_name} ${selectedRecord.employees?.last_name}`}
        />
      )}
    </div>
  );
}
