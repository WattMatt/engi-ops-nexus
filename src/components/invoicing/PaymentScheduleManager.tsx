import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PaymentScheduleManagerProps {
  projectId: string;
}

export function PaymentScheduleManager({ projectId }: PaymentScheduleManagerProps) {
  const [newPayment, setNewPayment] = useState({ month: "", amount: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payments = [] } = useQuery({
    queryKey: ["monthly-payments", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_payments")
        .select("*")
        .eq("project_id", projectId)
        .order("payment_month", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("monthly_payments").insert({
        project_id: projectId,
        payment_month: newPayment.month,
        amount: parseFloat(newPayment.amount),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-payments", projectId] });
      setNewPayment({ month: "", amount: "" });
      toast({ title: "Payment scheduled successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from("monthly_payments")
        .delete()
        .eq("id", paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-payments", projectId] });
      toast({ title: "Payment removed" });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const totalScheduled = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold">Monthly Payment Schedule</h4>
          <p className="text-sm text-muted-foreground">
            Total Scheduled: {formatCurrency(totalScheduled)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          type="month"
          value={newPayment.month}
          onChange={(e) => setNewPayment({ ...newPayment, month: e.target.value })}
          placeholder="Select month"
        />
        <Input
          type="number"
          step="0.01"
          value={newPayment.amount}
          onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
          placeholder="Amount"
        />
        <Button
          onClick={() => addPaymentMutation.mutate()}
          disabled={!newPayment.month || !newPayment.amount}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No payment schedule yet
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment: any) => (
              <TableRow key={payment.id}>
                <TableCell>
                  {format(new Date(payment.payment_month), "MMMM yyyy")}
                </TableCell>
                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePaymentMutation.mutate(payment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
