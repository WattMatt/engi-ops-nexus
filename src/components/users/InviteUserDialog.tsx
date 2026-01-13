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
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  onInvited?: () => void;
}

export const InviteUserDialog = ({ onInvited }: InviteUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string>("");
  const [emailSent, setEmailSent] = useState(false);
  const { logActivity } = useActivityLogger();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "user",
      password: "",
    },
  });

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    form.setValue("password", password);
  };

  const onSubmit = async (data: InviteFormData) => {
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error("You must be logged in to invite users");
        return;
      }

      // Use Edge Function to create user
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke("invite-user", {
        body: {
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          password: data.password,
        },
      });

      if (inviteError) throw inviteError;
      if (!inviteData?.success) throw new Error(inviteData?.error || "Failed to create user");

      setCreatedPassword(data.password);
      setEmailSent(inviteData?.emailSent || false);
      
      const wasEmailSent = inviteData?.emailSent;
      toast.success(`User created successfully`, {
        description: wasEmailSent 
          ? `A welcome email with login credentials has been sent to ${data.email}`
          : `Share the password with ${data.fullName}. They can change it after logging in.`
      });

      // Log the invite activity
      await logActivity(
        'create',
        `Invited new user: ${data.fullName}`,
        { email: data.email, role: data.role }
      );

      onInvited?.();
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error(error.message || "Failed to invite user");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCreatedPassword("");
    setEmailSent(false);
    form.reset();
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
        {!createdPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Create a new user account with a custom password that you can share with them.
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Enter or generate password" 
                            {...field} 
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generatePassword}
                        >
                          Generate
                        </Button>
                      </div>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        User can change this password after first login.
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
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                ✅ User Created Successfully
              </DialogTitle>
              <DialogDescription>
                {emailSent 
                  ? "A welcome email with login credentials has been sent to the user."
                  : "Share this password with the user. They should change it after logging in."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {emailSent && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                    📧 Welcome email sent with login credentials
                  </p>
                </div>
              )}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Temporary Password:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded border text-lg font-mono">
                    {createdPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(createdPassword);
                      toast.success("Password copied to clipboard");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {emailSent 
                  ? "The password is included in the welcome email. Save it securely as backup."
                  : "Make sure to save this password securely. It won't be shown again."}
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
