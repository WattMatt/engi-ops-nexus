import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, FileText, MoreHorizontal, Trash2, CheckCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, addMonths, parseISO } from "date-fns";

interface ScheduleEntry {
  month: string;
  amount: number;
  description: string;
}

export function InvoiceScheduleManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // Bulk add form state
  const [bulkForm, setBulkForm] = useState({
    projectId: "",
    startMonth: new Date().toISOString().slice(0, 7),
    monthlyAmount: "",
    numberOfMonths: "10",
    finalAmount: "",
    includeFinalPayment: true,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["invoice-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_projects")
        .select("*")
        .order("project_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["monthly-payments-with-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_payments")
        .select(`
          *,
          invoice_projects (
            project_name,
            client_name,
            agreed_fee
          ),
          invoices (
            invoice_number,
            status
          )
        `)
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

  const getStatusBadge = (payment: any) => {
    if (payment.invoices?.invoice_number) {
      if (payment.invoices.status === "paid") {
        return <Badge className="bg-green-500">Paid</Badge>;
      }
      return <Badge className="bg-blue-500">Invoiced</Badge>;
    }
    const paymentDate = new Date(payment.payment_month);
    const today = new Date();
    if (paymentDate < today) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="outline">Scheduled</Badge>;
  };

  const generateBulkSchedule = () => {
    const entries: ScheduleEntry[] = [];
    const monthlyAmount = parseFloat(bulkForm.monthlyAmount) || 0;
    const numMonths = parseInt(bulkForm.numberOfMonths) || 0;
    const finalAmount = parseFloat(bulkForm.finalAmount) || 0;
    const startDate = new Date(bulkForm.startMonth + "-01");

    for (let i = 0; i < numMonths; i++) {
      const monthDate = addMonths(startDate, i);
      entries.push({
        month: format(monthDate, "yyyy-MM"),
        amount: monthlyAmount,
        description: `Draw ${i + 1} - ${format(monthDate, "MMMM yyyy")}`,
      });
    }

    if (bulkForm.includeFinalPayment && finalAmount > 0) {
      entries.push({
        month: format(addMonths(startDate, numMonths), "yyyy-MM"),
        amount: finalAmount,
        description: "Final Completion Payment",
      });
    }

    setScheduleEntries(entries);
  };

  const handleSaveBulkSchedule = async () => {
    if (!bulkForm.projectId || scheduleEntries.length === 0) {
      toast.error("Please select a project and generate a schedule");
      return;
    }

    setLoading(true);
    try {
      const paymentsToInsert = scheduleEntries.map((entry) => ({
        project_id: bulkForm.projectId,
        payment_month: entry.month + "-01",
        amount: entry.amount,
      }));

      const { error } = await supabase.from("monthly_payments").insert(paymentsToInsert);

      if (error) throw error;

      toast.success(`Added ${scheduleEntries.length} payment schedules`);
      setBulkDialogOpen(false);
      setScheduleEntries([]);
      setBulkForm({
        projectId: "",
        startMonth: new Date().toISOString().slice(0, 7),
        monthlyAmount: "",
        numberOfMonths: "10",
        finalAmount: "",
        includeFinalPayment: true,
      });
      queryClient.invalidateQueries({ queryKey: ["monthly-payments-with-projects"] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from("monthly_payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;
      toast.success("Payment schedule removed");
      queryClient.invalidateQueries({ queryKey: ["monthly-payments-with-projects"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Group payments by project
  const paymentsByProject = payments.reduce((acc: any, payment: any) => {
    const projectId = payment.project_id;
    if (!acc[projectId]) {
      acc[projectId] = {
        project: payment.invoice_projects,
        payments: [],
        totalScheduled: 0,
        totalInvoiced: 0,
      };
    }
    acc[projectId].payments.push(payment);
    acc[projectId].totalScheduled += payment.amount;
    if (payment.invoice_id) {
      acc[projectId].totalInvoiced += payment.amount;
    }
    return acc;
  }, {});

  const totalScheduled = scheduleEntries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Invoice Schedules</h3>
          <p className="text-sm text-muted-foreground">
            Manage payment schedules from Letters of Appointment
          </p>
        </div>
        <Button onClick={() => setBulkDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment Schedule
        </Button>
      </div>

      {/* Project Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(paymentsByProject).map(([projectId, data]: [string, any]) => (
          <Card key={projectId} className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedProject(selectedProject === projectId ? null : projectId)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{data.project?.project_name}</CardTitle>
              <CardDescription>{data.project?.client_name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Agreed Fee:</span>
                  <span className="font-medium">{formatCurrency(data.project?.agreed_fee || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Scheduled:</span>
                  <span className="font-medium">{formatCurrency(data.totalScheduled)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Invoiced:</span>
                  <span className="font-medium text-green-600">{formatCurrency(data.totalInvoiced)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining:</span>
                  <span className="font-medium text-orange-600">
                    {formatCurrency(data.totalScheduled - data.totalInvoiced)}
                  </span>
                </div>
                <div className="pt-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ 
                        width: `${data.totalScheduled > 0 ? (data.totalInvoiced / data.totalScheduled) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.payments.length} scheduled payments
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {Object.keys(paymentsByProject).length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment schedules yet.</p>
              <p className="text-sm">Add a schedule from a Letter of Appointment to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Payment Table for Selected Project */}
      {selectedProject && paymentsByProject[selectedProject] && (
        <Card>
          <CardHeader>
            <CardTitle>{paymentsByProject[selectedProject].project?.project_name}</CardTitle>
            <CardDescription>Payment schedule details</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsByProject[selectedProject].payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {format(new Date(payment.payment_month), "MMMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{getStatusBadge(payment)}</TableCell>
                    <TableCell>
                      {payment.invoices?.invoice_number || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!payment.invoice_id && (
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              Generate Invoice
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeletePayment(payment.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bulk Add Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Payment Schedule from LOA</DialogTitle>
            <DialogDescription>
              Enter the fee schedule from your Letter of Appointment
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={bulkForm.projectId}
                  onValueChange={(value) => setBulkForm({ ...bulkForm, projectId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name} - {project.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Month</Label>
                <Input
                  type="month"
                  value={bulkForm.startMonth}
                  onChange={(e) => setBulkForm({ ...bulkForm, startMonth: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Monthly Amount (excl. VAT)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 104500"
                  value={bulkForm.monthlyAmount}
                  onChange={(e) => setBulkForm({ ...bulkForm, monthlyAmount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Number of Months</Label>
                <Input
                  type="number"
                  value={bulkForm.numberOfMonths}
                  onChange={(e) => setBulkForm({ ...bulkForm, numberOfMonths: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Final Completion Amount</Label>
                <Input
                  type="number"
                  placeholder="e.g. 55000"
                  value={bulkForm.finalAmount}
                  onChange={(e) => setBulkForm({ ...bulkForm, finalAmount: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={generateBulkSchedule} variant="secondary">
              Generate Schedule Preview
            </Button>

            {scheduleEntries.length > 0 && (
              <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">Schedule Preview</h4>
                  <Badge variant="secondary">
                    Total: {formatCurrency(totalScheduled)}
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleEntries.map((entry, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{format(new Date(entry.month + "-01"), "MMMM yyyy")}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBulkSchedule} disabled={loading || scheduleEntries.length === 0}>
              {loading ? "Saving..." : `Save ${scheduleEntries.length} Payments`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
