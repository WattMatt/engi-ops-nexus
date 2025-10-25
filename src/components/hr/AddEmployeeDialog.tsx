import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";

const employeeSchema = z.object({
  employee_number: z.string()
    .min(1, "Employee number is required")
    .max(20, "Employee number must be less than 20 characters")
    .regex(/^[A-Z0-9]+$/, "Employee number must contain only uppercase letters and numbers"),
  first_name: z.string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  last_name: z.string()
    .trim()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters"),
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  phone: z.string()
    .max(20, "Phone number must be less than 20 characters")
    .optional(),
  hire_date: z.string().min(1, "Hire date is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
});

interface AddEmployeeDialogProps {
  onSuccess?: () => void;
}

export function AddEmployeeDialog({ onSuccess }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createAuthAccount, setCreateAuthAccount] = useState(false);
  const [nextEmployeeNumber, setNextEmployeeNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      // Use the database function instead of querying directly
      const { data, error } = await supabase
        .rpc('get_next_employee_number');
      
      if (error) throw error;
      
      setNextEmployeeNumber(data || "EM001");
    } catch (error) {
      console.error("Error loading employee number:", error);
      setNextEmployeeNumber("EM001");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Capture form element before async operations
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const rawData = {
      employee_number: formData.get("employee_number") as string,
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      hire_date: formData.get("hire_date") as string,
      password: formData.get("password") as string,
    };

    try {
      // Validate input
      const validated = employeeSchema.parse({
        ...rawData,
        phone: rawData.phone || undefined,
        password: createAuthAccount ? rawData.password : undefined,
      });

      // Check if employee number already exists
      const { data: existingEmployee } = await supabase
        .from("employees")
        .select("employee_number")
        .eq("employee_number", validated.employee_number)
        .maybeSingle();

      if (existingEmployee) {
        throw new Error("This employee number is already in use. Please use a different number.");
      }

      // Check if email already exists in employees
      const { data: existingEmail } = await supabase
        .from("employees")
        .select("email")
        .eq("email", validated.email)
        .maybeSingle();

      if (existingEmail) {
        throw new Error("This email is already registered in the system.");
      }

      let userId: string | null = null;

      // Only create auth account if checkbox is checked
      if (createAuthAccount) {
        if (!validated.password) {
          throw new Error("Password is required when creating a login account");
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: validated.email,
          password: validated.password,
          options: {
            data: {
              full_name: `${validated.first_name} ${validated.last_name}`,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (authError) {
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
        employee_number: validated.employee_number,
        first_name: validated.first_name,
        last_name: validated.last_name,
        email: validated.email,
        phone: validated.phone || null,
        hire_date: validated.hire_date,
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

      if (employeeError) {
        // If employee creation fails and we created an auth user, we should ideally delete the auth user
        // but that requires admin privileges, so we just show the error
        throw employeeError;
      }

      toast({
        title: "Success",
        description: createAuthAccount 
          ? "Employee added with login account successfully" 
          : "Employee added successfully (no login access)",
      });

      // Reset form and close dialog
      form.reset();
      setCreateAuthAccount(false);
      setError(null);
      setOpen(false);
      
      // Call onSuccess to refresh the employee list
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Handle specific error cases
      if (error instanceof z.ZodError) {
        errorMessage = error.errors[0].message;
      } else if (errorMessage.includes("23505")) {
        // PostgreSQL unique violation error code
        if (errorMessage.includes("employee_number")) {
          errorMessage = "This employee number is already in use. Please use a different number.";
        } else if (errorMessage.includes("email")) {
          errorMessage = "This email is already registered in the system.";
        }
      }
      
      setError(errorMessage);
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
      setError(null);
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
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_number">Employee Number</Label>
                <Input
                  id="employee_number"
                  name="employee_number"
                  required
                  maxLength={20}
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
                  maxLength={100}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  required
                  maxLength={100}
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
                maxLength={255}
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
                  minLength={8}
                  required={createAuthAccount}
                  placeholder="Min. 8 characters"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                maxLength={20}
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
