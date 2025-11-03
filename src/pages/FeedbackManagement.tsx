import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Copy, 
  ExternalLink, 
  Lightbulb,
  MessageSquare 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Issue {
  id: string;
  created_at: string;
  user_name: string;
  user_email: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  screenshot_url: string | null;
  page_url: string;
  resolved_at: string | null;
  admin_notes: string | null;
  admin_response: string | null;
  responded_at: string | null;
}

interface Suggestion {
  id: string;
  created_at: string;
  user_name: string;
  user_email: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  screenshot_url: string | null;
  page_url: string;
  resolved_at: string | null;
  admin_notes: string | null;
  admin_response: string | null;
  responded_at: string | null;
}

const FeedbackManagement = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      const [issuesRes, suggestionsRes] = await Promise.all([
        supabase.from("issue_reports").select("*").order("created_at", { ascending: false }),
        supabase.from("suggestions").select("*").order("created_at", { ascending: false }),
      ]);

      if (issuesRes.error) throw issuesRes.error;
      if (suggestionsRes.error) throw suggestionsRes.error;

      setIssues(issuesRes.data || []);
      setSuggestions(suggestionsRes.data || []);
    } catch (error) {
      console.error("Error loading feedback:", error);
      toast.error("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const updateStatus = async (
    table: "issue_reports" | "suggestions",
    id: string,
    status: string
  ) => {
    const { error } = await supabase
      .from(table)
      .update({ 
        status,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
        resolved_by: status === "resolved" ? (await supabase.auth.getUser()).data.user?.id : null
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success("Status updated");
    loadFeedback();
  };

  const updateNotes = async (
    table: "issue_reports" | "suggestions",
    id: string,
    notes: string
  ) => {
    const { error } = await supabase
      .from(table)
      .update({ admin_notes: notes })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save notes");
      return;
    }

    toast.success("Notes saved");
  };

  const sendResponse = async (
    table: "issue_reports" | "suggestions",
    id: string,
    response: string,
    userEmail: string,
    userName: string,
    itemTitle: string
  ) => {
    const { error } = await supabase
      .from(table)
      .update({ admin_response: response })
      .eq("id", id);

    if (error) {
      toast.error("Failed to send response");
      return;
    }

    // Send email notification
    try {
      await supabase.functions.invoke('send-feedback-response', {
        body: {
          userEmail,
          userName,
          itemTitle,
          response,
          type: table === 'issue_reports' ? 'issue' : 'suggestion'
        }
      });
    } catch (emailError) {
      console.error("Email notification failed:", emailError);
      // Don't fail the whole operation if email fails
    }

    toast.success("Response sent to user");
    loadFeedback();
  };

  const getSeverityBadge = (severity: string) => {
    const config = {
      critical: { variant: "destructive" as const, label: "Critical" },
      high: { variant: "destructive" as const, label: "High" },
      medium: { variant: "default" as const, label: "Medium" },
      low: { variant: "secondary" as const, label: "Low" },
    };
    const item = config[severity as keyof typeof config] || config.medium;
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: "secondary" as const, icon: Clock },
      "in-progress": { variant: "default" as const, icon: MessageSquare },
      resolved: { variant: "outline" as const, icon: CheckCircle2 },
    };
    const item = config[status as keyof typeof config] || config.pending;
    const Icon = item.icon;
    return (
      <Badge variant={item.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace("-", " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading feedback...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Feedback Management</h1>
        <p className="text-muted-foreground">
          Review and manage user-submitted issues and suggestions
        </p>
      </div>

      <Tabs defaultValue="issues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="issues" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Issues ({issues.filter(i => i.status !== "resolved").length})
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Suggestions ({suggestions.filter(s => s.status !== "resolved").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-4">
          {issues.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No issues reported yet
              </CardContent>
            </Card>
          ) : (
            issues.map((issue) => (
              <Card key={issue.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">Issue Report</CardTitle>
                        {getSeverityBadge(issue.severity)}
                        <Badge variant="outline">{issue.category}</Badge>
                        {getStatusBadge(issue.status)}
                      </div>
                      <CardDescription>
                        Reported by {issue.user_name} ({issue.user_email}) •{" "}
                        {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    <Select
                      value={issue.status}
                      onValueChange={(value) => updateStatus("issue_reports", issue.id, value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Description</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(issue.description, "Description")}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy for AI
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted p-3">
                      {issue.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {issue.screenshot_url && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Screenshot</p>
                        <img
                          src={issue.screenshot_url}
                          alt="Issue screenshot"
                          className="rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage(issue.screenshot_url)}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Page URL</p>
                      <a
                        href={issue.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {issue.page_url}
                      </a>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Admin Notes (Internal Only)</p>
                    <Textarea
                      placeholder="Add internal notes about this issue..."
                      defaultValue={issue.admin_notes || ""}
                      onBlur={(e) => updateNotes("issue_reports", issue.id, e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Response to User</p>
                      {issue.responded_at && (
                        <p className="text-xs text-muted-foreground">
                          Sent {formatDistanceToNow(new Date(issue.responded_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <Textarea
                      placeholder="Write a response that will be sent to the user via email..."
                      defaultValue={issue.admin_response || ""}
                      rows={3}
                      className={issue.admin_response ? "bg-muted/50" : ""}
                    />
                    <Button
                      onClick={(e) => {
                        const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                        if (textarea?.value.trim()) {
                          sendResponse(
                            "issue_reports",
                            issue.id,
                            textarea.value,
                            issue.user_email,
                            issue.user_name,
                            "Issue Report"
                          );
                        } else {
                          toast.error("Please enter a response");
                        }
                      }}
                      size="sm"
                    >
                      Send Response to User
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No suggestions submitted yet
              </CardContent>
            </Card>
          ) : (
            suggestions.map((suggestion) => (
              <Card key={suggestion.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                        <Badge variant="outline">{suggestion.category}</Badge>
                        <Badge variant="secondary">{suggestion.priority} priority</Badge>
                        {getStatusBadge(suggestion.status)}
                      </div>
                      <CardDescription>
                        Suggested by {suggestion.user_name} ({suggestion.user_email}) •{" "}
                        {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    <Select
                      value={suggestion.status}
                      onValueChange={(value) => updateStatus("suggestions", suggestion.id, value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Description</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            `${suggestion.title}\n\n${suggestion.description}`,
                            "Suggestion"
                          )
                        }
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy for AI
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted p-3">
                      {suggestion.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {suggestion.screenshot_url && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Screenshot</p>
                        <img
                          src={suggestion.screenshot_url}
                          alt="Suggestion screenshot"
                          className="rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage(suggestion.screenshot_url)}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Page URL</p>
                      <a
                        href={suggestion.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {suggestion.page_url}
                      </a>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Admin Notes (Internal Only)</p>
                    <Textarea
                      placeholder="Add internal notes about this suggestion..."
                      defaultValue={suggestion.admin_notes || ""}
                      onBlur={(e) => updateNotes("suggestions", suggestion.id, e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Response to User</p>
                      {suggestion.responded_at && (
                        <p className="text-xs text-muted-foreground">
                          Sent {formatDistanceToNow(new Date(suggestion.responded_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <Textarea
                      placeholder="Write a response that will be sent to the user via email..."
                      defaultValue={suggestion.admin_response || ""}
                      rows={3}
                      className={suggestion.admin_response ? "bg-muted/50" : ""}
                    />
                    <Button
                      onClick={(e) => {
                        const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                        if (textarea?.value.trim()) {
                          sendResponse(
                            "suggestions",
                            suggestion.id,
                            textarea.value,
                            suggestion.user_email,
                            suggestion.user_name,
                            suggestion.title
                          );
                        } else {
                          toast.error("Please enter a response");
                        }
                      }}
                      size="sm"
                    >
                      Send Response to User
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Screenshot</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img src={selectedImage} alt="Full screenshot" className="w-full h-auto" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackManagement;
