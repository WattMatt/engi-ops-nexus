import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { differenceInDays, format } from "date-fns";

interface AgingBucket {
  label: string;
  min: number;
  max: number;
  color: string;
  icon: React.ReactNode;
}

const AGING_BUCKETS: AgingBucket[] = [
  { label: "Current", min: -Infinity, max: 0, color: "bg-green-500", icon: <CheckCircle2 className="h-4 w-4" /> },
  { label: "1-30 Days", min: 1, max: 30, color: "bg-yellow-500", icon: <Clock className="h-4 w-4" /> },
  { label: "31-60 Days", min: 31, max: 60, color: "bg-orange-500", icon: <AlertCircle className="h-4 w-4" /> },
  { label: "61-90 Days", min: 61, max: 90, color: "bg-red-500", icon: <AlertTriangle className="h-4 w-4" /> },
  { label: "90+ Days", min: 91, max: Infinity, color: "bg-red-700", icon: <AlertTriangle className="h-4 w-4" /> },
];

export function AgingReport() {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["aging-report-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_payments")
        .select(`
          *,
          invoice_projects (
            id,
            project_name,
            client_name
          ),
          invoices (
            invoice_number,
            status
          )
        `)
        .is("invoice_id", null)
        .order("payment_month", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const agingData = useMemo(() => {
    const today = new Date();
    
    const buckets = AGING_BUCKETS.map(bucket => ({
      ...bucket,
      payments: [] as any[],
      total: 0,
    }));

    payments.forEach(payment => {
      const paymentDate = new Date(payment.payment_month);
      const daysOverdue = differenceInDays(today, paymentDate);
      
      const bucket = buckets.find(b => daysOverdue >= b.min && daysOverdue <= b.max);
      if (bucket) {
        bucket.payments.push({
          ...payment,
          daysOverdue,
        });
        bucket.total += payment.amount;
      }
    });

    return buckets;
  }, [payments]);

  const totalOverdue = agingData
    .filter(b => b.min > 0)
    .reduce((sum, b) => sum + b.total, 0);

  const overduePayments = agingData
    .filter(b => b.min > 0)
    .flatMap(b => b.payments)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading aging data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aging Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {agingData.map((bucket) => (
          <Card key={bucket.label} className={bucket.total > 0 && bucket.min > 0 ? "border-destructive/50" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${bucket.color}`} />
                  {bucket.label}
                </CardDescription>
                {bucket.min > 0 && bucket.total > 0 && bucket.icon}
              </div>
              <CardTitle className="text-xl">
                {formatCurrency(bucket.total)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {bucket.payments.length} payment{bucket.payments.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Overdue Alert */}
      {totalOverdue > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Total Overdue</CardTitle>
            </div>
            <CardDescription>Payments past their scheduled date requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{formatCurrency(totalOverdue)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {overduePayments.length} overdue payment{overduePayments.length !== 1 ? "s" : ""} across{" "}
              {new Set(overduePayments.map(p => p.project_id)).size} project{new Set(overduePayments.map(p => p.project_id)).size !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detailed Overdue Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Payment Details</CardTitle>
          <CardDescription>All scheduled payments past their due date</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overduePayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    No overdue payments - excellent!
                  </TableCell>
                </TableRow>
              ) : (
                overduePayments.map((payment) => {
                  const bucket = AGING_BUCKETS.find(
                    b => payment.daysOverdue >= b.min && payment.daysOverdue <= b.max
                  );
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.invoice_projects?.project_name}
                      </TableCell>
                      <TableCell>{payment.invoice_projects?.client_name}</TableCell>
                      <TableCell>
                        {format(new Date(payment.payment_month), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="font-mono">
                          {payment.daysOverdue} days
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={bucket?.color}>
                          {bucket?.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Aging by Client */}
      <Card>
        <CardHeader>
          <CardTitle>Aging by Client</CardTitle>
          <CardDescription>Overdue amounts grouped by client</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">1-30 Days</TableHead>
                <TableHead className="text-right">31-60 Days</TableHead>
                <TableHead className="text-right">61-90 Days</TableHead>
                <TableHead className="text-right">90+ Days</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const clientAging = overduePayments.reduce((acc: Record<string, any>, payment) => {
                  const clientName = payment.invoice_projects?.client_name || "Unknown";
                  if (!acc[clientName]) {
                    acc[clientName] = { "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total: 0 };
                  }
                  
                  if (payment.daysOverdue <= 30) acc[clientName]["1-30"] += payment.amount;
                  else if (payment.daysOverdue <= 60) acc[clientName]["31-60"] += payment.amount;
                  else if (payment.daysOverdue <= 90) acc[clientName]["61-90"] += payment.amount;
                  else acc[clientName]["90+"] += payment.amount;
                  
                  acc[clientName].total += payment.amount;
                  return acc;
                }, {});

                const sortedClients = Object.entries(clientAging)
                  .sort(([, a], [, b]) => (b as any).total - (a as any).total);

                if (sortedClients.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No overdue amounts by client
                      </TableCell>
                    </TableRow>
                  );
                }

                return sortedClients.map(([client, amounts]: [string, any]) => (
                  <TableRow key={client}>
                    <TableCell className="font-medium">{client}</TableCell>
                    <TableCell className="text-right">{amounts["1-30"] > 0 ? formatCurrency(amounts["1-30"]) : "-"}</TableCell>
                    <TableCell className="text-right">{amounts["31-60"] > 0 ? formatCurrency(amounts["31-60"]) : "-"}</TableCell>
                    <TableCell className="text-right">{amounts["61-90"] > 0 ? formatCurrency(amounts["61-90"]) : "-"}</TableCell>
                    <TableCell className="text-right">{amounts["90+"] > 0 ? formatCurrency(amounts["90+"]) : "-"}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(amounts.total)}</TableCell>
                  </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
