import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClientFeedbackFormProps {
  projectId: string;
  tenants?: any[];
  zones?: any[];
  onSubmitSuccess?: () => void;
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'tenant_schedule', label: 'Tenant Schedule' },
  { value: 'generator', label: 'Generator Allocation' },
  { value: 'documents', label: 'Documents' },
  { value: 'technical', label: 'Technical' },
  { value: 'design', label: 'Design' },
];

const FEEDBACK_TYPES = [
  { value: 'question', label: 'Question' },
  { value: 'concern', label: 'Concern' },
  { value: 'change_request', label: 'Change Request' },
  { value: 'approval_query', label: 'Approval Query' },
  { value: 'compliment', label: 'Compliment' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-muted-foreground' },
  { value: 'normal', label: 'Normal', color: 'text-foreground' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'text-destructive' },
];

export const ClientFeedbackForm = ({ projectId, tenants, zones, onSubmitSuccess }: ClientFeedbackFormProps) => {
  const [category, setCategory] = useState<string>('general');
  const [feedbackType, setFeedbackType] = useState<string>('question');
  const [priority, setPriority] = useState<string>('normal');
  const [relatedItem, setRelatedItem] = useState<string>('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getPlaceholderText = () => {
    switch (feedbackType) {
      case 'question':
        return 'What would you like to know? Please be specific about which section or item your question relates to...';
      case 'concern':
        return 'Please describe your concern in detail. What issue have you identified and what impact might it have?';
      case 'change_request':
        return 'What changes would you like to request? Please specify the current state and your desired outcome...';
      case 'approval_query':
        return 'What do you need clarified before you can approve? Please be specific...';
      default:
        return 'Share your feedback here. The more detail you provide, the better we can assist you...';
    }
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setIsSubmitting(true);
    try {
      const feedbackText = `[${CATEGORIES.find(c => c.value === category)?.label}] [${FEEDBACK_TYPES.find(t => t.value === feedbackType)?.label}] [Priority: ${priority.toUpperCase()}]${relatedItem ? ` [Related: ${relatedItem}]` : ''}\n\n${comment}`;

      const { error } = await supabase
        .from('client_comments')
        .insert({
          project_id: projectId,
          comment_text: feedbackText,
          report_type: category === 'general' ? 'general' : category,
          user_id: (await supabase.auth.getUser()).data.user?.id || 'anonymous',
          reference_id: relatedItem && relatedItem !== 'none' ? relatedItem : null,
        });

      if (error) throw error;

      toast.success("Feedback submitted successfully");
      setComment('');
      setCategory('general');
      setFeedbackType('question');
      setPriority('normal');
      setRelatedItem('');
      onSubmitSuccess?.();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Submit Feedback
        </CardTitle>
        <CardDescription>
          Share your questions, concerns, or change requests with the project team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={feedbackType} onValueChange={setFeedbackType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className={p.color}>{p.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Related Item (Optional)</Label>
            <Select value={relatedItem} onValueChange={setRelatedItem}>
              <SelectTrigger>
                <SelectValue placeholder="Select item..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {tenants?.map(tenant => (
                  <SelectItem key={tenant.id} value={`tenant:${tenant.shop_number}`}>
                    Tenant: {tenant.shop_number} - {tenant.shop_name}
                  </SelectItem>
                ))}
                {zones?.map(zone => (
                  <SelectItem key={zone.id} value={`zone:${zone.zone_name}`}>
                    Zone: {zone.zone_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Your Feedback</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={getPlaceholderText()}
            className="min-h-[120px]"
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !comment.trim()}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </CardContent>
    </Card>
  );
};
