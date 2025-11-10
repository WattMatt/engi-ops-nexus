import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SalaryHistoryDialogProps {
  employee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalaryHistoryDialog({
  employee,
  open,
  onOpenChange,
}: SalaryHistoryDialogProps) {
  const { data: salaryHistory = [], isLoading } = useQuery({
    queryKey: ["salary-history", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return [];
      
      const { data, error } = await supabase
        .from("payroll_records")
        .select("*")
        .eq("employee_id", employee.id)
        .order("effective_date", { ascending: false });

      if (error) {
        console.error("Error loading salary history:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!employee?.id && open,
  });

  const formatCurrency = (amount: number | null | undefined, currency: string = "ZAR") => {
    if (!amount) return "-";
    const symbol = currency === "ZAR" ? "R" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;
    return `${symbol}${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateChange = (current: number, previous: number | null) => {
    if (!previous) return null;
    const change = current - previous;
    const percentChange = ((change / previous) * 100).toFixed(1);
    return { amount: change, percent: percentChange };
  };

  const currentSalary = salaryHistory.find(record => !record.end_date);
  const totalRecords = salaryHistory.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Salary History - {employee?.first_name} {employee?.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Salary Summary */}
          {currentSalary && (
            <Card className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Current Salary</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(currentSalary.salary_amount, currentSalary.salary_currency)}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {currentSalary.payment_frequency}
                  </p>
                </div>
                <Badge variant="default" className="bg-emerald-500">Active</Badge>
              </div>
            </Card>
          )}

          {/* Summary Stats */}
          {salaryHistory.length > 1 && (
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Changes</p>
                <p className="text-xl font-bold">{totalRecords}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">First Salary</p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    salaryHistory[salaryHistory.length - 1]?.salary_amount,
                    salaryHistory[salaryHistory.length - 1]?.salary_currency
                  )}
                </p>
              </Card>
              {salaryHistory.length > 1 && currentSalary && (
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Total Increase</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {(() => {
                      const firstSalary = salaryHistory[salaryHistory.length - 1]?.salary_amount;
                      const change = calculateChange(currentSalary.salary_amount, firstSalary);
                      return change ? `${change.percent}%` : "-";
                    })()}
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Salary History Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading salary history...
            </div>
          ) : salaryHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No salary records found for this employee.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Salary Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryHistory.map((record, index) => {
                  const previousRecord = salaryHistory[index + 1];
                  const change = calculateChange(
                    record.salary_amount,
                    previousRecord?.salary_amount || null
                  );

                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.effective_date), "PPP")}
                      </TableCell>
                      <TableCell>
                        {record.end_date ? (
                          format(new Date(record.end_date), "PPP")
                        ) : (
                          <Badge variant="secondary">Current</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(record.salary_amount, record.salary_currency)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {record.payment_frequency}
                      </TableCell>
                      <TableCell>
                        {change ? (
                          <div className="flex items-center gap-2">
                            {change.amount > 0 ? (
                              <>
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                <span className="text-emerald-600 font-medium">
                                  +{formatCurrency(Math.abs(change.amount), record.salary_currency)} ({change.percent}%)
                                </span>
                              </>
                            ) : change.amount < 0 ? (
                              <>
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                <span className="text-red-600 font-medium">
                                  {formatCurrency(change.amount, record.salary_currency)} ({change.percent}%)
                                </span>
                              </>
                            ) : (
                              <>
                                <Minus className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">No change</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Initial salary</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!record.end_date ? (
                          <Badge variant="default" className="bg-emerald-500">Active</Badge>
                        ) : (
                          <Badge variant="outline">Historical</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
