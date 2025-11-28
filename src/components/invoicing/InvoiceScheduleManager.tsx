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
import { Plus, FileText, MoreHorizontal, Trash2, CheckCircle, Calendar, Sparkles, Upload, FolderOpen, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format, addMonths, parseISO } from "date-fns";
import { AppointmentLetterExtractor } from "@/components/finance/AppointmentLetterExtractor";
import { FinanceProjectDocuments } from "@/components/finance/FinanceProjectDocuments";
import { ExcelScheduleImporter } from "@/components/finance/ExcelScheduleImporter";
import { Checkbox } from "@/components/ui/checkbox";

interface ScheduleEntry {
  month: string;
  amount: number;
  description: string;
}

export function InvoiceScheduleManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [extractorOpen, setExtractorOpen] = useState(false);
  const [excelImporterOpen, setExcelImporterOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [documentsProject, setDocumentsProject] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [extractedProjectData, setExtractedProjectData] = useState<any>(null);
  const [createNewProject, setCreateNewProject] = useState(false);
  const queryClient = useQueryClient();

  // New project form state (from extracted data)
  const [newProjectForm, setNewProjectForm] = useState({
    projectName: "",
    clientName: "",
    clientAddress: "",
    clientVatNumber: "",
    agreedFee: "",
  });

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
    let projectId = bulkForm.projectId;

    // Validate - either select existing project or create new one
    if (!createNewProject && !projectId) {
      toast.error("Please select a project or create a new one");
      return;
    }

    if (createNewProject && (!newProjectForm.projectName || !newProjectForm.clientName)) {
      toast.error("Please enter project and client name");
      return;
    }

    if (scheduleEntries.length === 0) {
      toast.error("Please generate a payment schedule first");
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Create new project if needed
      if (createNewProject) {
        const agreedFee = parseFloat(newProjectForm.agreedFee) || scheduleEntries.reduce((sum, e) => sum + e.amount, 0);
        
        const { data: newProject, error: projectError } = await supabase
          .from("invoice_projects")
          .insert({
            project_name: newProjectForm.projectName,
            client_name: newProjectForm.clientName,
            client_address: newProjectForm.clientAddress || null,
            client_vat_number: newProjectForm.clientVatNumber || null,
            agreed_fee: agreedFee,
            outstanding_amount: agreedFee,
            created_by: userData.user.id,
          })
          .select()
          .single();

        if (projectError) throw projectError;
        projectId = newProject.id;
        
        toast.success(`Project "${newProjectForm.projectName}" created`);
        queryClient.invalidateQueries({ queryKey: ["invoice-projects"] });
      }

      // Save the source document if available
      if (sourceFile && projectId) {
        const fileExt = sourceFile.name.split('.').pop();
        const fileName = `${projectId}/appointment-letter-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("finance-documents")
          .upload(fileName, sourceFile);

        if (uploadError) {
          console.error("Document upload error:", uploadError);
          // Don't fail the whole operation, just warn
          toast.warning("Schedule saved but document upload failed");
        } else {
          // Save document reference
          await supabase.from("finance_documents").insert({
            project_id: projectId,
            file_name: sourceFile.name,
            file_path: fileName,
            document_type: "appointment_letter",
            file_size: sourceFile.size,
            uploaded_by: userData.user.id,
            description: "Source document for payment schedule",
          });
        }
      }

      // Insert payment schedules
      const paymentsToInsert = scheduleEntries.map((entry) => ({
        project_id: projectId,
        payment_month: entry.month + "-01",
        amount: entry.amount,
      }));

      const { error } = await supabase.from("monthly_payments").insert(paymentsToInsert);

      if (error) throw error;

      toast.success(`Added ${scheduleEntries.length} payment schedules`);
      
      // Reset all state
      setBulkDialogOpen(false);
      setScheduleEntries([]);
      setSourceFile(null);
      setExtractedProjectData(null);
      setCreateNewProject(false);
      setNewProjectForm({
        projectName: "",
        clientName: "",
        clientAddress: "",
        clientVatNumber: "",
        agreedFee: "",
      });
      setBulkForm({
        projectId: "",
        startMonth: new Date().toISOString().slice(0, 7),
        monthlyAmount: "",
        numberOfMonths: "10",
        finalAmount: "",
        includeFinalPayment: true,
      });
      queryClient.invalidateQueries({ queryKey: ["monthly-payments-with-projects"] });
      queryClient.invalidateQueries({ queryKey: ["finance-projects"] });
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

  // Handle extracted data from AI
  const handleExtractedData = (data: any, file: File) => {
    // Store the file for later upload
    setSourceFile(file);
    setExtractedProjectData(data);

    // Pre-fill the new project form with extracted data
    setNewProjectForm({
      projectName: data.project_name || "",
      clientName: data.client_name || "",
      clientAddress: data.client_address || "",
      clientVatNumber: data.client_vat_number || "",
      agreedFee: data.agreed_fee ? String(data.agreed_fee) : "",
    });

    // Pre-fill the bulk form with extracted data
    if (data.start_date) {
      setBulkForm(prev => ({
        ...prev,
        startMonth: data.start_date.slice(0, 7),
      }));
    }

    // Convert payment schedule to our format
    if (data.payment_schedule && data.payment_schedule.length > 0) {
      const entries: ScheduleEntry[] = data.payment_schedule.map((p: any, idx: number) => ({
        month: p.date ? (p.date.length === 7 ? p.date : p.date.slice(0, 7)) : format(addMonths(new Date(), idx), "yyyy-MM"),
        amount: p.amount || 0,
        description: p.description || `Payment ${idx + 1}`,
      }));
      setScheduleEntries(entries);
    }

    // If project data was extracted, suggest creating a new project
    if (data.project_name || data.client_name) {
      setCreateNewProject(true);
    }

    setExtractorOpen(false);
    setBulkDialogOpen(true);
    toast.success("Data extracted! Review the details and save.");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Invoice Schedules</h3>
          <p className="text-sm text-muted-foreground">
            Manage payment schedules from Letters of Appointment
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setExcelImporterOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Import from Excel
          </Button>
          <Button variant="outline" onClick={() => setExtractorOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Extract from Document
          </Button>
          <Button onClick={() => setBulkDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Payment Schedule
          </Button>
        </div>
      </div>

      {/* Project Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(paymentsByProject).map(([projectId, data]: [string, any]) => (
          <Card key={projectId} className="hover:border-primary transition-colors">
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setSelectedProject(selectedProject === projectId ? null : projectId)}>
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
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {data.payments.length} scheduled payments
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocumentsProject(data.project);
                        setDocumentsOpen(true);
                      }}
                    >
                      <FolderOpen className="h-4 w-4 mr-1" />
                      Docs
                    </Button>
                  </div>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {sourceFile ? "Import Payment Schedule" : "Add Payment Schedule from LOA"}
            </DialogTitle>
            <DialogDescription>
              {sourceFile 
                ? `Importing from: ${sourceFile.name}` 
                : "Enter the fee schedule from your Letter of Appointment"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Project Selection / Creation Toggle */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
              <Checkbox
                id="createNew"
                checked={createNewProject}
                onCheckedChange={(checked) => {
                  setCreateNewProject(!!checked);
                  if (checked) {
                    setBulkForm(prev => ({ ...prev, projectId: "" }));
                  }
                }}
              />
              <Label htmlFor="createNew" className="text-sm font-medium cursor-pointer">
                Create a new project for this schedule
              </Label>
            </div>

            {/* New Project Form */}
            {createNewProject && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">New Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project Name *</Label>
                      <Input
                        placeholder="e.g. Office Building Phase 2"
                        value={newProjectForm.projectName}
                        onChange={(e) => setNewProjectForm({ ...newProjectForm, projectName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Name *</Label>
                      <Input
                        placeholder="e.g. ABC Developers (Pty) Ltd"
                        value={newProjectForm.clientName}
                        onChange={(e) => setNewProjectForm({ ...newProjectForm, clientName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Client Address</Label>
                      <Input
                        placeholder="Full address"
                        value={newProjectForm.clientAddress}
                        onChange={(e) => setNewProjectForm({ ...newProjectForm, clientAddress: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client VAT Number</Label>
                      <Input
                        placeholder="e.g. 4123456789"
                        value={newProjectForm.clientVatNumber}
                        onChange={(e) => setNewProjectForm({ ...newProjectForm, clientVatNumber: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Agreed Fee (excl. VAT)</Label>
                    <Input
                      type="number"
                      placeholder="Total contract value"
                      value={newProjectForm.agreedFee}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, agreedFee: e.target.value })}
                    />
                    {!newProjectForm.agreedFee && totalScheduled > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Will default to schedule total: {formatCurrency(totalScheduled)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Project Selection */}
            {!createNewProject && (
              <div className="space-y-2">
                <Label>Select Existing Project</Label>
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
                {projects.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No projects yet. Enable "Create a new project" above.
                  </p>
                )}
              </div>
            )}

            {/* Source Document Indicator */}
            {sourceFile && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <Upload className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Document <span className="font-medium">{sourceFile.name}</span> will be saved with this schedule
                </span>
              </div>
            )}

            {/* Manual Schedule Generation (only if no extracted schedule) */}
            {scheduleEntries.length === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
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
              </>
            )}

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

      {/* AI Document Extractor Dialog */}
      <Dialog open={extractorOpen} onOpenChange={setExtractorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Extract Payment Schedule from Document</DialogTitle>
            <DialogDescription>
              Upload an appointment letter, fee proposal, or payment schedule to automatically extract project and payment information.
            </DialogDescription>
          </DialogHeader>
          <AppointmentLetterExtractor 
            onDataExtracted={handleExtractedData}
            onClose={() => setExtractorOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Project Documents Dialog */}
      {documentsProject && (
        <FinanceProjectDocuments
          open={documentsOpen}
          onOpenChange={setDocumentsOpen}
          project={documentsProject}
        />
      )}

      {/* Excel Schedule Importer */}
      <ExcelScheduleImporter
        open={excelImporterOpen}
        onOpenChange={setExcelImporterOpen}
      />
    </div>
  );
}
