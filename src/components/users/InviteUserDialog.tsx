import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useActivityLogger } from "@/hooks/useActivityLogger";

const inviteSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "moderator", "user"], {
    required_error: "Please select a role",
  }),
  temporaryPassword: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters")
    .optional()
    .or(z.literal("")),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  onInvited?: () => void;
}

export const InviteUserDialog = ({ onInvited }: InviteUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { logActivity } = useActivityLogger();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "user",
      temporaryPassword: "",
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error("You must be logged in to invite users");
        return;
      }

      // Get current user's profile for the "invited by" name
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", currentUser.id)
        .single();

      // Use Edge Function to create user (doesn't affect current session)
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke("invite-user", {
        body: {
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          temporaryPassword: data.temporaryPassword || undefined,
        },
      });

      if (inviteError) throw inviteError;
      if (!inviteData?.success) throw new Error("Failed to create user");

      toast.success(`Invitation sent successfully`, {
        description: `${data.fullName} will receive a password setup email at ${data.email}.`
      });

      // Log the invite activity
      await logActivity(
        'create',
        `Invited new user: ${data.fullName}`,
        { email: data.email, role: data.role }
      );

      form.reset();
      setOpen(false);
      onInvited?.();
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error(error.message || "Failed to invite user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new team member. They'll receive a link to set up their password.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="temporaryPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary Password (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Leave blank for auto-generated" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    If left blank, a secure password will be generated automatically.
                  </p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
