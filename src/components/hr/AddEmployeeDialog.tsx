import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";

interface AddEmployeeDialogProps {
  onSuccess?: () => void;
}

export function AddEmployeeDialog({ onSuccess }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createAuthAccount, setCreateAuthAccount] = useState(false);
  const [nextEmployeeNumber, setNextEmployeeNumber] = useState("");
  const { toast } = useToast();

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("positions").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Load next employee number when dialog opens
  const loadNextEmployeeNumber = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("employee_number")
        .order("employee_number", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Extract number from last employee number (e.g., "EM001" -> 1)
        const lastNumber = data[0].employee_number;
        const match = lastNumber.match(/\d+$/);
        if (match) {
          const nextNum = parseInt(match[0]) + 1;
          setNextEmployeeNumber(`EM${String(nextNum).padStart(3, '0')}`);
        } else {
          setNextEmployeeNumber("EM001");
        }
      } else {
        setNextEmployeeNumber("EM001");
      }
    } catch (error) {
      console.error("Error loading employee number:", error);
      setNextEmployeeNumber("EM001");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      let userId: string | null = null;

      // Only create auth account if checkbox is checked
      if (createAuthAccount) {
        const password = formData.get("password") as string;
        
        if (!password) {
          throw new Error("Password is required when creating an auth account");
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: `${formData.get("first_name")} ${formData.get("last_name")}`,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (authError) {
          // Handle user already exists more gracefully
          if (authError.message.includes("already registered")) {
            throw new Error("This email is already registered. Uncheck 'Create Login Account' to add as employee only.");
          }
          throw authError;
        }

        if (!authData.user) {
          throw new Error("User creation failed");
        }

        userId = authData.user.id;
      }

      // Create employee record
      const employeeData: any = {
        employee_number: formData.get("employee_number") as string,
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
        email,
        phone: formData.get("phone") as string || null,
        hire_date: formData.get("hire_date") as string,
        department_id: formData.get("department_id") || null,
        position_id: formData.get("position_id") || null,
        employment_status: "active",
      };

      // Only add user_id if we created an auth account
      if (userId) {
        employeeData.user_id = userId;
      }

      const { error: employeeError } = await supabase
        .from("employees")
        .insert(employeeData);

      if (employeeError) throw employeeError;

      toast({
        title: "Success",
        description: createAuthAccount 
          ? "Employee added with login account successfully" 
          : "Employee added successfully (no login access)",
      });

      // Reset form before closing dialog
      e.currentTarget.reset();
      setCreateAuthAccount(false);
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Better error messages
      if (errorMessage.includes("employee_number")) {
        errorMessage = "This employee number is already in use. Please use a different number.";
      } else if (errorMessage.includes("email")) {
        errorMessage = "This email is already registered in the system.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) {
        loadNextEmployeeNumber();
      }
    }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Create a new employee account and profile
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_number">Employee Number</Label>
                <Input
                  id="employee_number"
                  name="employee_number"
                  required
                  defaultValue={nextEmployeeNumber}
                  placeholder="EM001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hire_date">Hire Date</Label>
                <Input
                  id="hire_date"
                  name="hire_date"
                  type="date"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  required
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  required
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="john.doe@company.com"
              />
            </div>

            <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
              <Checkbox
                id="create_auth"
                checked={createAuthAccount}
                onCheckedChange={(checked) => setCreateAuthAccount(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="create_auth" className="cursor-pointer">
                  Create login account for this employee
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable if this employee needs to access the system
                </p>
              </div>
            </div>

            {createAuthAccount && (
              <div className="space-y-2">
                <Label htmlFor="password">Initial Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required={createAuthAccount}
                  placeholder="••••••••"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <Select name="department_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position_id">Position</Label>
                <Select name="position_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos: any) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
