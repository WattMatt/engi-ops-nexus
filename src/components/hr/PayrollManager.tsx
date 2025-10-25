import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PayrollManager() {
  const { data: payrollRecords = [], isLoading } = useQuery({
    queryKey: ["payroll-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_records")
        .select(`
          *,
          employees!payroll_records_employee_id_fkey (
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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Payroll Records</h3>
        <p className="text-sm text-muted-foreground">View employee compensation details</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Salary Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Effective Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payrollRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                <TableCell>
                  {record.end_date ? new Date(record.end_date).toLocaleDateString() : "Ongoing"}
                </TableCell>
                <TableCell>{getStatusBadge(record.end_date)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
