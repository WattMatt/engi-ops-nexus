/**
 * Electrician Credentials Form Component
 * Form for collecting sign-off credentials and digital signature
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SignatureCanvas } from "./SignatureCanvas";
import { User, Building2, Shield, FileCheck, Loader2, AlertTriangle } from "lucide-react";
import { ElectricianCredentialsForm as CredentialsFormType } from "@/types/cableVerification";
import { useState } from "react";

const credentialsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  position: z.string().min(2, "Position is required"),
  company: z.string().min(2, "Company name is required"),
  registration_number: z.string().optional(),
  overall_notes: z.string().optional(),
  authorization_confirmed: z.boolean().refine(val => val === true, {
    message: "You must confirm authorization to submit",
  }),
});

type FormValues = z.infer<typeof credentialsSchema>;

interface ElectricianCredentialsFormProps {
  defaultValues?: Partial<CredentialsFormType>;
  onSubmit: (data: FormValues & { signature: string }) => Promise<void>;
  isSubmitting?: boolean;
  verificationStats: {
    total: number;
    verified: number;
    issues: number;
    pending: number;
  };
}

export function ElectricianCredentialsForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  verificationStats,
}: ElectricianCredentialsFormProps) {
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      position: defaultValues?.position || '',
      company: defaultValues?.company || '',
      registration_number: defaultValues?.registration_number || '',
      overall_notes: '',
      authorization_confirmed: false,
    },
  });

  const handleSubmit = async (data: FormValues) => {
    if (!signature) {
      setSignatureError("Please provide your digital signature");
      return;
    }
    setSignatureError(null);
    await onSubmit({ ...data, signature });
  };

  const canSubmit = verificationStats.pending === 0;
  const hasIssues = verificationStats.issues > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Verification Summary */}
        <Card className={hasIssues ? "border-amber-500 dark:border-amber-600" : undefined}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Verification Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="text-xl font-bold">{verificationStats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <div className="text-xl font-bold text-green-700 dark:text-green-400">
                  {verificationStats.verified}
                </div>
                <div className="text-xs text-muted-foreground">Verified</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
                <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  {verificationStats.issues}
                </div>
                <div className="text-xs text-muted-foreground">Issues</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="text-xl font-bold">{verificationStats.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>

            {!canSubmit && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Please verify all {verificationStats.pending} pending cable(s) before submitting the sign-off.
                  </span>
                </div>
              </div>
            )}

            {hasIssues && canSubmit && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    {verificationStats.issues} cable(s) have been flagged with issues. 
                    The project team will be notified.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credentials Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Credentials
            </CardTitle>
            <CardDescription>
              Provide your professional details for the verification record
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position / Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Site Electrician" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Company *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="ABC Electrical Contractors" {...field} />
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
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    ECSA / SAIEE Registration (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Registration number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your professional registration number if applicable
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overall Notes</CardTitle>
            <CardDescription>
              Any general observations or comments about this verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="overall_notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Add any overall observations, site conditions, or comments..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Digital Signature</CardTitle>
            <CardDescription>
              Provide your digital signature to complete the verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignatureCanvas
              onSignatureChange={setSignature}
              width={Math.min(400, window.innerWidth - 80)}
              height={150}
            />
            {signatureError && (
              <p className="text-sm font-medium text-destructive">{signatureError}</p>
            )}
          </CardContent>
        </Card>

        {/* Authorization */}
        <Card>
          <CardContent className="pt-6">
            <FormField
              control={form.control}
              name="authorization_confirmed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      I confirm that I am authorized to perform this verification *
                    </FormLabel>
                    <FormDescription>
                      By checking this box, you confirm that you have personally verified 
                      the cable installations listed above and that the information provided 
                      is accurate to the best of your knowledge.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting Verification...
            </>
          ) : (
            <>
              <FileCheck className="h-4 w-4 mr-2" />
              Submit Verification Sign-off
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
