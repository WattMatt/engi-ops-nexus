/**
 * Cable Schedule Verification Settings
 * Component for generating and managing verification access links
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Send, 
  Link2, 
  Copy, 
  Check, 
  UserCheck,
  Building2,
  Mail,
  Calendar,
  Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addDays, format } from "date-fns";

const formSchema = z.object({
  electrician_name: z.string().min(2, "Name must be at least 2 characters"),
  electrician_email: z.string().email("Invalid email address"),
  company_name: z.string().optional(),
  registration_number: z.string().optional(),
  expiry_days: z.string(),
  send_email: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface CableScheduleVerificationSettingsProps {
  schedule: {
    id: string;
    name: string;
    project_id: string;
  };
  onTokenCreated?: () => void;
}

export function CableScheduleVerificationSettings({ 
  schedule,
  onTokenCreated 
}: CableScheduleVerificationSettingsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      electrician_name: "",
      electrician_email: "",
      company_name: "",
      registration_number: "",
      expiry_days: "30",
      send_email: true,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setGeneratedLink(null);

    try {
      const expiresAt = addDays(new Date(), parseInt(values.expiry_days));
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create verification token
      const { data: tokenData, error: tokenError } = await supabase
        .from('cable_schedule_verification_tokens')
        .insert({
          schedule_id: schedule.id,
          project_id: schedule.project_id,
          electrician_name: values.electrician_name,
          electrician_email: values.electrician_email,
          company_name: values.company_name || null,
          registration_number: values.registration_number || null,
          expires_at: expiresAt.toISOString(),
          created_by: user?.id,
        })
        .select('token')
        .single();

      if (tokenError) throw tokenError;

      const verificationUrl = `${window.location.origin}/cable-verification?token=${tokenData.token}`;
      setGeneratedLink(verificationUrl);

      // Send email if requested
      if (values.send_email) {
        const { error: emailError } = await supabase.functions.invoke('send-cable-verification-email', {
          body: {
            to: values.electrician_email,
            electrician_name: values.electrician_name,
            schedule_name: schedule.name,
            verification_url: verificationUrl,
            expires_at: expiresAt.toISOString(),
          },
        });

        if (emailError) {
          console.error('Email error:', emailError);
          toast({
            title: "Link created, but email failed",
            description: "The verification link was created but the email could not be sent. Please share the link manually.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Verification link created and sent",
            description: `Email sent to ${values.electrician_email}`,
          });
        }
      } else {
        toast({
          title: "Verification link created",
          description: "Copy the link below to share with the electrician",
        });
      }

      onTokenCreated?.();
      form.reset();
    } catch (error) {
      console.error('Error creating verification token:', error);
      toast({
        title: "Failed to create verification link",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!generatedLink) return;
    
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link copied",
        description: "Verification link copied to clipboard",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please select and copy the link manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Generate Verification Link
        </CardTitle>
        <CardDescription>
          Create a secure link for a site electrician to verify cable installations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="electrician_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5" />
                      Electrician Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="electrician_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@electrical.co.za" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      Company Name
                      <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="ABC Electrical (Pty) Ltd" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registration_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      ECSA/SAIEE Registration
                      <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="ECSA-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expiry_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Link Expiry
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Select expiry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Link expires: {format(addDays(new Date(), parseInt(form.watch('expiry_days'))), 'PPP')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="send_email"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Send email invitation
                    </FormLabel>
                    <FormDescription>
                      Automatically send an email to the electrician with the verification link
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>Creating link...</>
              ) : form.watch('send_email') ? (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Create & Send Link
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Create Link
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Generated Link Display */}
        {generatedLink && (
          <div className="mt-6 rounded-lg border bg-muted/50 p-4">
            <Label className="text-sm font-medium">Verification Link</Label>
            <div className="mt-2 flex gap-2">
              <Input 
                value={generatedLink} 
                readOnly 
                className="bg-background font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Share this link with the electrician for cable verification access
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
