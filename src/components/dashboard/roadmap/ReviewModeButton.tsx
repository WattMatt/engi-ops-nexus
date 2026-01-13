import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ReviewModeButton() {
  const navigate = useNavigate();

  const handleStartReview = () => {
    navigate("/dashboard/roadmap-review");
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleStartReview}>
          <ClipboardCheck className="h-4 w-4 mr-2" />
          Start Review
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Enter review mode to address items and send updates to stakeholders</p>
      </TooltipContent>
    </Tooltip>
  );
}
