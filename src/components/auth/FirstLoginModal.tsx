import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";
import { validatePassword } from "@/lib/passwordValidation";
import { useActivityLogger } from "@/hooks/useActivityLogger";

interface FirstLoginModalProps {
  onPasswordChanged: () => void;
}

export const FirstLoginModal = ({ onPasswordChanged }: FirstLoginModalProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { logActivity } = useActivityLogger();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password strength
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Update profile flags
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            first_login: false,
            must_change_password: false,
            password_changed_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (profileError) throw profileError;

        await logActivity("password_change", "Changed password on first login");
      }

      toast.success("Password changed successfully");
      onPasswordChanged();
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set Your Password</DialogTitle>
          <DialogDescription>
            For security, you must set a new password before accessing the application.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            {newPassword && <PasswordStrengthIndicator password={newPassword} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Changing Password..." : "Change Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
