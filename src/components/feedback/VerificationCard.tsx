import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface VerificationCardProps {
  item: any;
  type: "issue" | "suggestion";
  onVerified: () => void;
}

export const VerificationCard = ({ item, type, onVerified }: VerificationCardProps) => {
  const [verificationResponse, setVerificationResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (isFixed: boolean) => {
    setLoading(true);
    try {
      const table = type === "issue" ? "issue_reports" : "suggestions";
      const updates = isFixed
        ? {
            user_verified: true,
            user_verified_at: new Date().toISOString(),
            needs_user_attention: false,
            status: "resolved",
            user_verification_response: verificationResponse || "Confirmed as fixed",
          }
        : {
            status: "reopened",
            needs_user_attention: false,
            user_verification_response: verificationResponse || "Issue still persists",
          };

      const { error } = await supabase.from(table).update(updates).eq("id", item.id);

      if (error) throw error;

      toast.success(isFixed ? "Thank you for confirming!" : "We'll take another look");
      setVerificationResponse("");
      onVerified();
    } catch (error: any) {
      console.error("Error verifying:", error);
      toast.error("Failed to submit verification");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      new: { icon: Clock, label: "New", variant: "secondary" as const },
      in_progress: { icon: Clock, label: "In Progress", variant: "default" as const },
      pending_verification: { icon: AlertCircle, label: "Awaiting Your Review", variant: "destructive" as const },
      resolved: { icon: CheckCircle2, label: "Resolved", variant: "default" as const },
      reopened: { icon: XCircle, label: "Reopened", variant: "destructive" as const },
    };

    const config = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.new;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const needsVerification = item.needs_user_attention && item.admin_response;

  return (
    <Card className={needsVerification ? "border-destructive" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">
            {type === "suggestion" ? item.title : "Issue Report"}
          </CardTitle>
          {getStatusBadge()}
        </div>
        <p className="text-sm text-muted-foreground">
          Submitted {format(new Date(item.created_at), "PPp")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Your Report:</p>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>

        {item.admin_response && (
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-medium mb-1 flex items-center gap-2">
              Admin Response
              {item.responded_at && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({format(new Date(item.responded_at), "PPp")})
                </span>
              )}
            </p>
            <p className="text-sm">{item.admin_response}</p>
          </div>
        )}

        {item.user_verification_response && !needsVerification && (
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-medium mb-1">Your Feedback:</p>
            <p className="text-sm">{item.user_verification_response}</p>
          </div>
        )}

        {needsVerification && (
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium text-destructive">
              Did this resolve your {type === "issue" ? "issue" : "suggestion"}?
            </p>
            <Textarea
              placeholder="Add any additional comments (optional)..."
              value={verificationResponse}
              onChange={(e) => setVerificationResponse(e.target.value)}
              rows={3}
              disabled={loading}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleVerify(true)}
                disabled={loading}
                className="flex-1"
                variant="default"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Yes, Fixed!
              </Button>
              <Button
                onClick={() => handleVerify(false)}
                disabled={loading}
                className="flex-1"
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Still Not Working
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
