import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Plus, MoreHorizontal, Pencil, Trash2, FileText, Search, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { FinanceProjectDialog } from "./FinanceProjectDialog";
import { FinanceProjectDocuments } from "./FinanceProjectDocuments";

interface InvoiceProject {
  id: string;
  project_name: string;
  client_name: string;
  client_vat_number: string | null;
  client_address: string | null;
  agreed_fee: number;
  total_invoiced: number | null;
  outstanding_amount: number;
  status: string | null;
  created_at: string;
}

export function FinanceProjectList() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<InvoiceProject | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["finance-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InvoiceProject[];
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const handleEdit = (project: InvoiceProject) => {
    setSelectedProject(project);
    setDialogOpen(true);
  };

  const handleDocuments = (project: InvoiceProject) => {
    setSelectedProject(project);
    setDocumentsOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? This will also delete all associated documents and payment schedules.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("invoice_projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
      toast.success("Project deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["finance-projects"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedProject(null);
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAgreedFees = projects.reduce((sum, p) => sum + p.agreed_fee, 0);
  const totalInvoiced = projects.reduce((sum, p) => sum + (p.total_invoiced || 0), 0);
  const totalOutstanding = projects.reduce((sum, p) => sum + p.outstanding_amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Agreed Fees</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalAgreedFees)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoiced</CardDescription>
            <CardTitle className="text-2xl text-green-600">{formatCurrency(totalInvoiced)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{formatCurrency(totalOutstanding)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Finance Projects</CardTitle>
              <CardDescription>Manage your invoicing projects and client information</CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading projects...</div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No projects match your search" : "No finance projects yet"}
              </p>
              {!searchQuery && (
                <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first project
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Agreed Fee</TableHead>
                  <TableHead className="text-right">Invoiced</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.project_name}</TableCell>
                    <TableCell>{project.client_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(project.agreed_fee)}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(project.total_invoiced || 0)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(project.outstanding_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={project.status === "active" ? "default" : "secondary"}
                      >
                        {project.status || "active"}
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
                          <DropdownMenuItem onClick={() => handleDocuments(project)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Documents
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(project)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(project.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FinanceProjectDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        project={selectedProject}
      />

      {selectedProject && (
        <FinanceProjectDocuments
          open={documentsOpen}
          onOpenChange={setDocumentsOpen}
          project={selectedProject}
        />
      )}
    </div>
  );
}
