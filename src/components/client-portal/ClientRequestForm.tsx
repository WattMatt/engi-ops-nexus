import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ClientRequestFormProps {
  projectId: string;
  existingRequests?: any[];
  onSubmitSuccess?: () => void;
}

const REQUEST_TYPES = [
  { value: 'change_request', label: 'Change Request', description: 'Request modifications to the project scope or specifications' },
  { value: 'information_request', label: 'Information Request', description: 'Request additional information or clarification' },
  { value: 'document_request', label: 'Document Request', description: 'Request specific documents or reports' },
  { value: 'meeting_request', label: 'Meeting Request', description: 'Request a meeting or call with the team' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const ClientRequestForm = ({ projectId, existingRequests = [], onSubmitSuccess }: ClientRequestFormProps) => {
  const [requestType, setRequestType] = useState<string>('information_request');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case 'in_review':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertCircle className="h-3 w-3 mr-1" />In Review</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('client_requests')
        .insert({
          project_id: projectId,
          client_user_id: (await supabase.auth.getUser()).data.user?.id || 'anonymous',
          request_type: requestType,
          subject: subject,
          description: description,
          priority: priority,
          status: 'open',
        });

      if (error) throw error;

      toast.success("Request submitted successfully");
      setSubject('');
      setDescription('');
      setRequestType('information_request');
      setPriority('normal');
      setShowForm(false);
      onSubmitSuccess?.();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error("Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Formal Requests
        </CardTitle>
        <CardDescription>
          Submit formal requests for changes, information, or meetings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showForm ? (
          <>
            <Button onClick={() => setShowForm(true)} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Submit New Request
            </Button>

            {existingRequests.length > 0 && (
              <div className="space-y-3 mt-4">
                <h4 className="text-sm font-medium text-muted-foreground">Your Requests</h4>
                {existingRequests.map((request: any) => (
                  <div key={request.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{request.subject}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {request.request_type.replace('_', ' ')} • {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Request Type</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <p>{type.label}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {REQUEST_TYPES.find(t => t.value === requestType)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your request"
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide detailed information about your request..."
                className="min-h-[100px]"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !subject.trim() || !description.trim()}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
