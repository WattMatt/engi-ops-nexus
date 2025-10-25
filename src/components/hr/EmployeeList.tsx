import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, FileText } from "lucide-react";
import { EmployeeDocuments } from "./EmployeeDocuments";
import { EditEmployeeDialog } from "./EditEmployeeDialog";

export function EmployeeList() {
  const queryClient = useQueryClient();
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [documentsEmployee, setDocumentsEmployee] = useState<any>(null);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  
  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          *,
          departments!employees_department_id_fkey (name),
          positions (title)
        `)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error loading employees:", error);
        throw error;
      }
      return data || [];
    },
  });

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
  };

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading employees: {error.message}
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No employees found. Add your first employee to get started.
      </div>
    );
  }

  return (
    <>
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee #</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Position</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Hire Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee: any) => (
          <TableRow key={employee.id}>
            <TableCell className="font-medium">{employee.employee_number}</TableCell>
            <TableCell>
              {employee.first_name} {employee.last_name}
            </TableCell>
            <TableCell>{employee.email}</TableCell>
            <TableCell>{employee.departments?.name || "-"}</TableCell>
            <TableCell>{employee.positions?.title || "-"}</TableCell>
            <TableCell>
              <Badge
                variant={
                  employee.employment_status === "active"
                    ? "default"
                    : employee.employment_status === "terminated"
                    ? "destructive"
                    : "secondary"
                }
              >
                {employee.employment_status}
              </Badge>
            </TableCell>
            <TableCell>{new Date(employee.hire_date).toLocaleDateString()}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDocumentsEmployee(employee);
                    setDocumentsDialogOpen(true);
                  }}
                  title="View Documents"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(employee)}
                  title="Edit Employee"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>

    {editingEmployee && (
      <EditEmployeeDialog
        employee={editingEmployee}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />
    )}

    {documentsEmployee && (
      <Dialog open={documentsDialogOpen} onOpenChange={setDocumentsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Documents - {documentsEmployee.first_name} {documentsEmployee.last_name}
            </DialogTitle>
          </DialogHeader>
          <EmployeeDocuments employeeId={documentsEmployee.id} />
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
