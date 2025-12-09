import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface SectionReviewStatusProps {
  status: 'pending' | 'reviewed' | 'approved' | 'needs_changes';
  approvedDate?: string;
}

export const SectionReviewStatus = ({ status, approvedDate }: SectionReviewStatusProps) => {
  switch (status) {
    case 'approved':
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved{approvedDate ? ` on ${approvedDate}` : ''}
        </Badge>
      );
    case 'reviewed':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Reviewed
        </Badge>
      );
    case 'needs_changes':
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Needs Changes
        </Badge>
      );
    case 'pending':
    default:
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          Awaiting Review
        </Badge>
      );
  }
};
