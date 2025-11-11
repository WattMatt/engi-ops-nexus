import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building2, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export function DepartmentsManager() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });
  
  // Positions state
  const [addPositionDialogOpen, setAddPositionDialogOpen] = useState(false);
  const [editPositionDialogOpen, setEditPositionDialogOpen] = useState(false);
  const [deletePositionDialogOpen, setDeletePositionDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [positionFormData, setPositionFormData] = useState({
    title: "",
    code: "",
    description: "",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const handleAdd = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("departments").insert([formData]);
      if (error) throw error;

      toast({ title: "Success", description: "Department added successfully" });
      setAddDialogOpen(false);
      setFormData({ name: "", code: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("departments")
        .update(formData)
        .eq("id", selectedDept.id);
      if (error) throw error;

      toast({ title: "Success", description: "Department updated successfully" });
      setEditDialogOpen(false);
      setSelectedDept(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", selectedDept.id);
      if (error) throw error;

      toast({ title: "Success", description: "Department deleted successfully" });
      setDeleteDialogOpen(false);
      setSelectedDept(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Position handlers
  const handleAddPosition = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("positions").insert([positionFormData]);
      if (error) throw error;

      toast({ title: "Success", description: "Position added successfully" });
      setAddPositionDialogOpen(false);
      setPositionFormData({ title: "", code: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPosition = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("positions")
        .update(positionFormData)
        .eq("id", selectedPosition.id);
      if (error) throw error;

      toast({ title: "Success", description: "Position updated successfully" });
      setEditPositionDialogOpen(false);
      setSelectedPosition(null);
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePosition = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("positions")
        .delete()
        .eq("id", selectedPosition.id);
      if (error) throw error;

      toast({ title: "Success", description: "Position deleted successfully" });
      setDeletePositionDialogOpen(false);
      setSelectedPosition(null);
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="departments" className="space-y-4">
      <TabsList>
        <TabsTrigger value="departments">Departments</TabsTrigger>
        <TabsTrigger value="positions">Positions</TabsTrigger>
      </TabsList>

      <TabsContent value="departments" className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Departments</h3>
            <p className="text-sm text-muted-foreground">Manage organizational departments</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>

        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((dept: any) => (
            <TableRow key={dept.id}>
              <TableCell className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {dept.name}
              </TableCell>
              <TableCell>{dept.code}</TableCell>
              <TableCell className="max-w-md truncate">{dept.description || "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDept(dept);
                      setFormData({
                        name: dept.name,
                        code: dept.code,
                        description: dept.description || "",
                      });
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDept(dept);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </TabsContent>

      <TabsContent value="positions" className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Positions</h3>
            <p className="text-sm text-muted-foreground">Manage job positions and roles</p>
          </div>
          <Button onClick={() => setAddPositionDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Position
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position: any) => (
              <TableRow key={position.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  {position.title}
                </TableCell>
                <TableCell>{position.code}</TableCell>
                <TableCell className="max-w-md truncate">{position.description || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPosition(position);
                        setPositionFormData({
                          title: position.title,
                          code: position.code,
                          description: position.description || "",
                        });
                        setEditPositionDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPosition(position);
                        setDeletePositionDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
            <DialogDescription>Create a new department</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="ENG"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Department description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={loading}>
              {loading ? "Adding..." : "Add Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading ? "Updating..." : "Update Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDept?.name}"? This action cannot be undone.
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

      {/* Position Dialogs */}
      {/* Add Position Dialog */}
      <Dialog open={addPositionDialogOpen} onOpenChange={setAddPositionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Position</DialogTitle>
            <DialogDescription>Create a new job position</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={positionFormData.title}
                onChange={(e) => setPositionFormData({ ...positionFormData, title: e.target.value })}
                placeholder="Receptionist"
              />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={positionFormData.code}
                onChange={(e) => setPositionFormData({ ...positionFormData, code: e.target.value })}
                placeholder="REC"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={positionFormData.description}
                onChange={(e) => setPositionFormData({ ...positionFormData, description: e.target.value })}
                placeholder="Position description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPositionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPosition} disabled={loading}>
              {loading ? "Adding..." : "Add Position"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Position Dialog */}
      <Dialog open={editPositionDialogOpen} onOpenChange={setEditPositionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Position</DialogTitle>
            <DialogDescription>Update position details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={positionFormData.title}
                onChange={(e) => setPositionFormData({ ...positionFormData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={positionFormData.code}
                onChange={(e) => setPositionFormData({ ...positionFormData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={positionFormData.description}
                onChange={(e) => setPositionFormData({ ...positionFormData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPositionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPosition} disabled={loading}>
              {loading ? "Updating..." : "Update Position"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Position Dialog */}
      <AlertDialog open={deletePositionDialogOpen} onOpenChange={setDeletePositionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPosition?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePosition} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
