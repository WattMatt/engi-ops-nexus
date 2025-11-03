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

  const handleResetPassword = async () => {
    setLoading(true);
    try {
      // Use edge function to send reset link
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: {
          userId: user.id,
          userEmail: user.email,
        },
      });

      if (error) {
        // Check if it's a domain verification error
        if (error.message?.includes('domain not verified') || error.message?.includes('verify a domain')) {
          toast.error("Email domain not verified", {
            description: "Please verify your domain at resend.com/domains to send emails to other users. For testing, emails can only be sent to your registered Resend email address.",
            duration: 8000,
          });
        } else {
          throw error;
        }
        return;
      }

      await logActivity(
        'update',
        `Sent password reset link to ${user.full_name}`,
        { userId: user.id }
      );

      toast.success("Password reset link sent successfully", {
        description: `An email has been sent to ${user.email}`,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
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
              <Label>Password Reset</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Send a secure password reset link to the user's email.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Send Password Reset Link
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
