import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, ExternalLink } from "lucide-react";

interface PayslipHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
}

export function PayslipHistory({ 
  open, 
  onOpenChange, 
  employeeId,
  employeeName 
}: PayslipHistoryProps) {
  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ["payslips", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pay_slips")
        .select("*")
        .eq("employee_id", employeeId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!employeeId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Payslip History</DialogTitle>
          <DialogDescription>
            Payslip records for {employeeName}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <p className="text-center py-4 text-muted-foreground">Loading...</p>
        ) : payslips.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No payslips found for this employee
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pay Period</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map((slip: any) => {
                const deductionsObj = typeof slip.deductions === 'object' ? slip.deductions : {};
                const totalDeductions = Object.values(deductionsObj as Record<string, number>)
                  .reduce((a: number, b: number) => a + (b || 0), 0);
                
                return (
                  <TableRow key={slip.id}>
                    <TableCell>
                      {new Date(slip.pay_period_start).toLocaleDateString()} -{" "}
                      {new Date(slip.pay_period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(slip.payment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(slip.gross_pay)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(totalDeductions)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(slip.net_pay)}
                    </TableCell>
                    <TableCell className="text-right">
                      {slip.file_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(slip.file_url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
