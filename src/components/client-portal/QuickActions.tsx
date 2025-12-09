import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, AlertCircle, FileText, HelpCircle, MessageSquare, Calendar } from "lucide-react";

interface QuickActionsProps {
  onAction: (action: string) => void;
}

const QUICK_ACTIONS = [
  { 
    id: 'request_call', 
    label: 'Request a Call', 
    icon: Phone, 
    description: 'Schedule a call with the project team',
    color: 'text-blue-500'
  },
  { 
    id: 'report_issue', 
    label: 'Report an Issue', 
    icon: AlertCircle, 
    description: 'Flag a problem or concern',
    color: 'text-destructive'
  },
  { 
    id: 'request_document', 
    label: 'Request Document', 
    icon: FileText, 
    description: 'Request additional documents',
    color: 'text-green-500'
  },
  { 
    id: 'ask_question', 
    label: 'Ask a Question', 
    icon: HelpCircle, 
    description: 'Get clarification on any topic',
    color: 'text-yellow-500'
  },
  { 
    id: 'general_feedback', 
    label: 'General Feedback', 
    icon: MessageSquare, 
    description: 'Share your thoughts',
    color: 'text-primary'
  },
  { 
    id: 'schedule_meeting', 
    label: 'Schedule Meeting', 
    icon: Calendar, 
    description: 'Request a project meeting',
    color: 'text-purple-500'
  },
];

export const QuickActions = ({ onAction }: QuickActionsProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className="h-auto py-3 px-3 flex flex-col items-center gap-1 hover:border-primary/50"
              onClick={() => onAction(action.id)}
            >
              <action.icon className={`h-5 w-5 ${action.color}`} />
              <span className="text-xs font-medium text-center">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
