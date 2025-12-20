import { Badge } from "@/components/ui/badge";
import { Clock, Send, Eye, AlertTriangle, CheckCircle2 } from "lucide-react";

type ReviewStatus = "draft" | "sent_for_review" | "under_review" | "disputed" | "approved";

interface SectionReviewStatusBadgeProps {
  status?: ReviewStatus | string | null;
}

const statusConfig: Record<ReviewStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  draft: {
    label: "Draft",
    variant: "secondary",
    icon: <Clock className="h-3 w-3" />,
  },
  sent_for_review: {
    label: "Sent for Review",
    variant: "default",
    icon: <Send className="h-3 w-3" />,
  },
  under_review: {
    label: "Under Review",
    variant: "outline",
    icon: <Eye className="h-3 w-3" />,
  },
  disputed: {
    label: "Disputed",
    variant: "destructive",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  approved: {
    label: "Approved",
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
};

export function SectionReviewStatusBadge({ status }: SectionReviewStatusBadgeProps) {
  const validStatus = (status as ReviewStatus) || "draft";
  const config = statusConfig[validStatus] || statusConfig.draft;

  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1 ${
        validStatus === "approved" ? "bg-green-600 hover:bg-green-700" : ""
      }`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
