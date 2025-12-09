import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, HelpCircle, ClipboardCheck, ThumbsUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReviewChecklistProps {
  projectId: string;
  section: 'tenant' | 'generator' | 'documents' | 'dashboard';
  onSubmitSuccess?: () => void;
}

const CHECKLIST_ITEMS: Record<string, { question: string; key: string }[]> = {
  tenant: [
    { question: "Are all tenant names and shop numbers accurate?", key: "tenant_names" },
    { question: "Is the shop area information correct for each tenant?", key: "tenant_areas" },
    { question: "Are the tenant categories assigned correctly?", key: "tenant_categories" },
    { question: "Have all required deliverables been received?", key: "tenant_deliverables" },
  ],
  generator: [
    { question: "Are the generator zone allocations correct?", key: "zone_allocation" },
    { question: "Is the power loading calculation accurate?", key: "power_loading" },
    { question: "Are the generator sizes appropriate for the load?", key: "generator_sizes" },
    { question: "Are there any missing tenants in the allocation?", key: "missing_tenants" },
  ],
  documents: [
    { question: "Are all required project documents present?", key: "required_docs" },
    { question: "Are the document versions current?", key: "doc_versions" },
    { question: "Are there any additional documents you require?", key: "additional_docs" },
  ],
  dashboard: [
    { question: "Does the project overview accurately reflect the current status?", key: "project_status" },
    { question: "Are the KPI metrics displaying correctly?", key: "kpi_metrics" },
    { question: "Is there any information missing from the dashboard?", key: "missing_info" },
  ],
};

type ChecklistResponse = 'yes' | 'no' | 'unsure' | null;

export const ReviewChecklist = ({ projectId, section, onSubmitSuccess }: ReviewChecklistProps) => {
  const [responses, setResponses] = useState<Record<string, ChecklistResponse>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const items = CHECKLIST_ITEMS[section] || [];

  const handleResponse = (key: string, response: ChecklistResponse) => {
    setResponses(prev => ({ ...prev, [key]: response }));
  };

  const handleCommentChange = (key: string, comment: string) => {
    setComments(prev => ({ ...prev, [key]: comment }));
  };

  const handleQuickApprove = async () => {
    const allYes: Record<string, ChecklistResponse> = {};
    items.forEach(item => { allYes[item.key] = 'yes'; });
    setResponses(allYes);
    await submitReview(allYes, {});
  };

  const submitReview = async (finalResponses: Record<string, ChecklistResponse>, finalComments: Record<string, string>) => {
    setIsSubmitting(true);
    try {
      const reviewData = items.map(item => ({
        question: item.question,
        response: finalResponses[item.key] || 'unsure',
        comment: finalComments[item.key] || '',
      }));

      const hasIssues = Object.values(finalResponses).some(r => r === 'no' || r === 'unsure');
      const commentText = `[Review Checklist - ${section.toUpperCase()}]\n\n` +
        reviewData.map(r => `Q: ${r.question}\nA: ${r.response?.toUpperCase()}${r.comment ? `\nComment: ${r.comment}` : ''}`).join('\n\n') +
        `\n\nOverall: ${hasIssues ? 'Needs Attention' : 'All Good'}`;

      const { error } = await supabase
        .from('client_comments')
        .insert({
          project_id: projectId,
          comment_text: commentText,
          report_type: section === 'dashboard' ? 'general' : section === 'tenant' ? 'tenant_report' : section === 'generator' ? 'generator_report' : 'project_documents',
          user_id: (await supabase.auth.getUser()).data.user?.id || 'anonymous',
        });

      if (error) throw error;

      toast.success("Review submitted successfully");
      setIsSubmitted(true);
      onSubmitSuccess?.();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReview = () => submitReview(responses, comments);

  const getResponseIcon = (response: ChecklistResponse) => {
    switch (response) {
      case 'yes': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'no': return <XCircle className="h-5 w-5 text-destructive" />;
      case 'unsure': return <HelpCircle className="h-5 w-5 text-yellow-500" />;
      default: return null;
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="py-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-lg">Review Submitted</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Thank you for reviewing this section. Your feedback has been recorded.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsSubmitted(false)}>
            Review Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Review Checklist
        </CardTitle>
        <CardDescription>
          Please review the following items and provide your feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2 pb-4 border-b">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleQuickApprove}>
            <ThumbsUp className="h-4 w-4 mr-2" />
            All Looks Good
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-orange-500 border-orange-500/20 hover:bg-orange-500/10">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Needs Attention
          </Button>
        </div>

        {/* Checklist Items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.key} className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium">{item.question}</p>
                <div className="flex gap-1">
                  {responses[item.key] && getResponseIcon(responses[item.key])}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={responses[item.key] === 'yes' ? 'default' : 'outline'}
                  onClick={() => handleResponse(item.key, 'yes')}
                  className="text-xs"
                >
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant={responses[item.key] === 'no' ? 'destructive' : 'outline'}
                  onClick={() => handleResponse(item.key, 'no')}
                  className="text-xs"
                >
                  No
                </Button>
                <Button
                  size="sm"
                  variant={responses[item.key] === 'unsure' ? 'secondary' : 'outline'}
                  onClick={() => handleResponse(item.key, 'unsure')}
                  className="text-xs"
                >
                  Unsure
                </Button>
              </div>

              {(responses[item.key] === 'no' || responses[item.key] === 'unsure') && (
                <Textarea
                  placeholder="Please provide details..."
                  value={comments[item.key] || ''}
                  onChange={(e) => handleCommentChange(item.key, e.target.value)}
                  className="text-sm min-h-[60px]"
                />
              )}
            </div>
          ))}
        </div>

        <Button 
          onClick={handleSubmitReview} 
          disabled={isSubmitting || Object.keys(responses).length === 0}
          className="w-full"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </CardContent>
    </Card>
  );
};
