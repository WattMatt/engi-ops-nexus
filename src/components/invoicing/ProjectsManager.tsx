import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Upload, Calendar, Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { CreateInvoiceDialog } from "./CreateInvoiceDialog";
import { ImportExcelDialog } from "./ImportExcelDialog";
import { ProjectDetailsDialog } from "./ProjectDetailsDialog";
import { EditProjectDialog } from "./EditProjectDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export function ProjectsManager() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["invoice-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_projects")
        .select("*")
        .order("created_at", { ascending: false });
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-500",
      completed: "bg-blue-500",
      on_hold: "bg-yellow-500",
    };
    return (
      <Badge className={variants[status] || "bg-gray-500"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("invoice_projects")
        .delete()
        .eq("id", selectedProject.id);

      if (error) throw error;

      toast({ title: "Project deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["invoice-projects"] });
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Projects</h3>
            <p className="text-sm text-muted-foreground">
              Manage projects and generate invoices
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
            <Button onClick={() => setCreateProjectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Agreed Fee</TableHead>
              <TableHead>Invoiced</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No projects yet. Create your first project to get started.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project: any) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.project_name}</TableCell>
                  <TableCell>{project.client_name}</TableCell>
                  <TableCell>{formatCurrency(project.agreed_fee)}</TableCell>
                  <TableCell>{formatCurrency(project.total_invoiced)}</TableCell>
                  <TableCell>{formatCurrency(project.outstanding_amount)}</TableCell>
                  <TableCell>{getStatusBadge(project.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProject(project);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProject(project);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProject(project);
                          setCreateInvoiceOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProject(project);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["invoice-projects"] })}
      />

      {selectedProject && (
        <CreateInvoiceDialog
          open={createInvoiceOpen}
          onOpenChange={setCreateInvoiceOpen}
          project={selectedProject}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["invoice-projects"] });
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
          }}
        />
      )}

      <ImportExcelDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["invoice-projects"] })}
      />

      {selectedProject && (
        <>
          <ProjectDetailsDialog
            project={selectedProject}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
          />

          <EditProjectDialog
            project={selectedProject}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["invoice-projects"] })}
          />
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProject?.project_name}"? This action cannot be undone and will also delete all associated invoices and payment schedules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
