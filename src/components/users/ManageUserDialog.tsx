import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { validatePassword } from "@/lib/passwordValidation";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { KeyRound } from "lucide-react";

interface ManageUserDialogProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    role?: string;
  };
  onUpdated: () => void;
  children: React.ReactNode;
}

export function ManageUserDialog({ user, onUpdated, children }: ManageUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [role, setRole] = useState(user.role || "user");
  const { logActivity } = useActivityLogger();

  const handleUpdateRole = async () => {
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Prevent admin from demoting themselves
      if (currentUser?.id === user.id && role !== 'admin') {
        toast.error("You cannot change your own admin role");
        setLoading(false);
        return;
      }

      // Delete existing role
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert([{
          user_id: user.id,
          role: role as "admin" | "moderator" | "user",
        }]);

      if (insertError) throw insertError;

      // Log the role update activity
      await logActivity(
        'update',
        `Updated role for ${user.full_name} to ${role}`,
        { userId: user.id, oldRole: user.role, newRole: role }
      );

      toast.success("User role updated");
      setOpen(false);
      onUpdated();
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    // Validate password strength using the same validation as SetPassword page
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("set-user-password", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        },
        body: {
          userId: user.id,
          password: newPassword
        },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || 'Failed to set password');
      }

      await logActivity(
        'update',
        `Set initial password for ${user.full_name}`,
        { userId: user.id }
      );

      toast.success("Password Set!", {
        description: `Initial password has been set for ${user.email}. They will be required to change it on first login.`,
        duration: 10000,
      });
      
      setNewPassword("");
      onUpdated();
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to set password",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setLoading(true);
    try {
      // Note: In production, you'd want to use an admin API or edge function
      // to properly delete users from auth.users
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (error) throw error;

      toast.success("User removed");
      setDeleteOpen(false);
      setOpen(false);
      onUpdated();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User</DialogTitle>
            <DialogDescription>
              Update permissions for {user.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Set Initial Password</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Set a temporary password. User will be required to change it on first login.
              </p>
              <Input
                type="password"
                placeholder="Min 12 chars, uppercase, lowercase, number, special char"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
              {newPassword && <PasswordStrengthIndicator password={newPassword} />}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSetPassword}
                disabled={loading || !newPassword}
                className="w-full"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Set Initial Password
              </Button>
            </div>

            <div className="flex justify-between gap-2 pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={loading}
              >
                Remove User
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateRole} disabled={loading}>
                  {loading ? "Updating..." : "Update Role"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {user.full_name} from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
