import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, CheckCircle2, AlertTriangle, User, Building2, Briefcase } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ReviewerCredentials {
  fullName: string;
  position: string;
  company: string;
  idOrEmployeeNumber: string;
  confirmed: boolean;
}

interface ReviewerCredentialsFormProps {
  defaultName?: string;
  defaultEmail?: string;
  onApprove: (credentials: ReviewerCredentials) => void;
  onDispute: (credentials: ReviewerCredentials) => void;
  isPending: boolean;
}

export function ReviewerCredentialsForm({
  defaultName = "",
  defaultEmail = "",
  onApprove,
  onDispute,
  isPending,
}: ReviewerCredentialsFormProps) {
  const [credentials, setCredentials] = useState<ReviewerCredentials>({
    fullName: defaultName,
    position: "",
    company: "",
    idOrEmployeeNumber: "",
    confirmed: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ReviewerCredentials, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ReviewerCredentials, string>> = {};

    if (!credentials.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!credentials.position.trim()) {
      newErrors.position = "Position/Title is required";
    }
    if (!credentials.company.trim()) {
      newErrors.company = "Company name is required";
    }
    if (!credentials.confirmed) {
      newErrors.confirmed = "You must confirm you are authorized";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApprove = () => {
    if (validate()) {
      onApprove(credentials);
    }
  };

  const handleDispute = () => {
    if (validate()) {
      onDispute(credentials);
    }
  };

  return (
    <Card className="shadow-lg border-2">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Reviewer Authorization</CardTitle>
        </div>
        <CardDescription>
          Please enter your credentials to confirm you are authorized to sign off on this review
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Credentials Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Full Name *
            </Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              value={credentials.fullName}
              onChange={(e) => setCredentials({ ...credentials, fullName: e.target.value })}
              className={errors.fullName ? "border-destructive" : ""}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="position" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Position / Title *
            </Label>
            <Input
              id="position"
              placeholder="e.g. Project Manager, Director"
              value={credentials.position}
              onChange={(e) => setCredentials({ ...credentials, position: e.target.value })}
              className={errors.position ? "border-destructive" : ""}
            />
            {errors.position && (
              <p className="text-xs text-destructive">{errors.position}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Company Name *
            </Label>
            <Input
              id="company"
              placeholder="Enter your company name"
              value={credentials.company}
              onChange={(e) => setCredentials({ ...credentials, company: e.target.value })}
              className={errors.company ? "border-destructive" : ""}
            />
            {errors.company && (
              <p className="text-xs text-destructive">{errors.company}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="idNumber" className="flex items-center gap-2">
              ID / Employee Number
              <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="idNumber"
              placeholder="For verification purposes"
              value={credentials.idOrEmployeeNumber}
              onChange={(e) => setCredentials({ ...credentials, idOrEmployeeNumber: e.target.value })}
            />
          </div>
        </div>

        {/* Authorization Confirmation */}
        <div className={`p-4 rounded-lg border ${errors.confirmed ? 'border-destructive bg-destructive/5' : 'bg-muted/30'}`}>
          <div className="flex items-start space-x-3">
            <Checkbox
              id="authorization"
              checked={credentials.confirmed}
              onCheckedChange={(checked) => 
                setCredentials({ ...credentials, confirmed: checked as boolean })
              }
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="authorization" className="cursor-pointer font-medium">
                I confirm that I am authorized to sign off on this review
              </Label>
              <p className="text-xs text-muted-foreground">
                By checking this box, I declare that I have the authority to approve or dispute this section 
                on behalf of my company, and that the information provided above is accurate.
              </p>
            </div>
          </div>
          {errors.confirmed && (
            <p className="text-xs text-destructive mt-2 ml-7">{errors.confirmed}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4">
          <h3 className="text-lg font-semibold text-center mb-6">Review Decision</h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 flex-1 h-14 text-lg"
                  onClick={handleApprove}
                  disabled={isPending}
                >
                  <CheckCircle2 className="h-6 w-6 mr-2" />
                  Approve Section
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Confirm that you agree with all items and values in this section</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  variant="destructive"
                  className="flex-1 h-14 text-lg"
                  onClick={handleDispute}
                  disabled={isPending}
                >
                  <AlertTriangle className="h-6 w-6 mr-2" />
                  Raise Dispute
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Flag concerns that require discussion with the project team</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Your credentials will be recorded with your review decision for audit purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
