import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const inviteSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "moderator", "user"], {
    required_error: "Please select a role",
  }),
  // Delivery mode (Onboarding Standard B1/B4):
  //  - "email": branded email with a single-use set-password link (default)
  //  - "relay": server-generated CSPRNG temp password shown ONCE to the admin
  delivery: z.enum(["email", "relay"]),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteResult {
  delivery: "email" | "relay";
  email: string;
  emailSent?: boolean;
  actionLink?: string | null;
  tempPassword?: string | null;
}

interface InviteUserDialogProps {
  onInvited?: () => void;
}

export const InviteUserDialog = ({ onInvited }: InviteUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "user",
      delivery: "email",
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

      // Use Edge Function to create user. The server generates any temp
      // password itself (CSPRNG) and never emails credentials — email
      // delivery carries a set-password link instead.
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke("invite-user", {
        body: {
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          delivery: data.delivery,
        },
      });

      if (inviteError) throw inviteError;
      if (!inviteData?.success) throw new Error(inviteData?.error || "Failed to create user");

      setResult({
        delivery: inviteData.delivery === "relay" ? "relay" : "email",
        email: data.email,
        emailSent: inviteData.emailSent ?? false,
        actionLink: inviteData.actionLink ?? null,
        tempPassword: inviteData.tempPassword ?? null,
      });

      if (inviteData.delivery === "relay") {
        toast.success("User created", {
          description: `Share the temporary password with ${data.fullName} securely. They must change it on first login.`,
        });
      } else if (inviteData.emailSent) {
        toast.success("User created", {
          description: `A set-password link has been emailed to ${data.email}`,
        });
      } else {
        toast.warning("User created, but the email could not be sent", {
          description: "Copy the setup link below and deliver it to the user yourself.",
        });
      }

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
    setResult(null);
    form.reset();
  };

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard`);
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
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Send a set-password link by email, or hand over a one-time temporary password yourself.
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
            <FormField
              control={form.control}
              name="delivery"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="space-y-1"
                    >
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="email" id="delivery-email" className="mt-0.5" />
                        <Label htmlFor="delivery-email" className="font-normal cursor-pointer">
                          Email a set-password link
                          <span className="block text-xs text-muted-foreground">
                            The user chooses their own password. No credentials are emailed.
                          </span>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="relay" id="delivery-relay" className="mt-0.5" />
                        <Label htmlFor="delivery-relay" className="font-normal cursor-pointer">
                          Temporary password (shown to you once)
                          <span className="block text-xs text-muted-foreground">
                            For users without reliable email. You relay the password yourself.
                          </span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
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
                {result.delivery === "relay"
                  ? "Share this temporary password with the user securely. They must change it on first login."
                  : result.emailSent
                    ? "A set-password link has been emailed to the user."
                    : "The invite email could not be sent. Copy the setup link below and deliver it to the user yourself."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {result.delivery === "email" && result.emailSent && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                    📧 Set-password link emailed to {result.email}
                  </p>
                </div>
              )}
              {result.delivery === "email" && !result.emailSent && result.actionLink && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">One-time setup link:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-background rounded border text-xs font-mono break-all">
                      {result.actionLink}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(result.actionLink!, "Setup link")}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Valid for 24 hours, single use. It won't be shown again.
                  </p>
                </div>
              )}
              {result.delivery === "relay" && result.tempPassword && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Temporary Password:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-background rounded border text-lg font-mono">
                      {result.tempPassword}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(result.tempPassword!, "Password")}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    It won't be shown again — not even in an email.
                  </p>
                </div>
              )}
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
