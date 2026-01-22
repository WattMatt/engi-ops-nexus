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

interface BrowserInfo {
  userAgent: string;
  screenResolution: string;
  viewportSize: string;
  timestamp: string;
}

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
  attachments: Array<{ url: string; filename: string; type: string }> | null;
  console_logs: string | null;
  additional_context: string | null;
  page_url: string;
  browser_info: BrowserInfo | null;
  resolved_at: string | null;
  admin_notes: string | null;
  admin_response: string | null;
  responded_at: string | null;
  user_verified: boolean;
  user_verification_response: string | null;
  user_verified_at: string | null;
  needs_user_attention: boolean;
  verification_requested_at: string | null;
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
  attachments: Array<{ url: string; filename: string; type: string }> | null;
  console_logs: string | null;
  additional_context: string | null;
  page_url: string;
  browser_info: BrowserInfo | null;
  resolved_at: string | null;
  admin_notes: string | null;
  admin_response: string | null;
  responded_at: string | null;
  user_verified: boolean;
  user_verification_response: string | null;
  user_verified_at: string | null;
  needs_user_attention: boolean;
  verification_requested_at: string | null;
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

      // Transform the data to match our interfaces
      setIssues((issuesRes.data || []).map((issue: any) => ({
        ...issue,
        attachments: Array.isArray(issue.attachments) ? issue.attachments : []
      })));
      setSuggestions((suggestionsRes.data || []).map((suggestion: any) => ({
        ...suggestion,
        attachments: Array.isArray(suggestion.attachments) ? suggestion.attachments : []
      })));
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

  const copyIssueForAI = (issue: Issue) => {
    const sections = [];
    
    // Header
    sections.push("=== ISSUE REPORT ===");
    sections.push(`Severity: ${issue.severity.toUpperCase()}`);
    sections.push(`Category: ${issue.category}`);
    sections.push(`Status: ${issue.status}`);
    sections.push(`Reported: ${new Date(issue.created_at).toLocaleString()}`);
    sections.push(`Reporter: ${issue.user_name} (${issue.user_email})`);
    sections.push("");
    
    // Description
    sections.push("DESCRIPTION:");
    sections.push(issue.description);
    sections.push("");
    
    // Page Context
    sections.push("PAGE CONTEXT:");
    sections.push(`URL: ${issue.page_url}`);
    if (issue.browser_info) {
      sections.push(`Browser: ${issue.browser_info.userAgent}`);
      sections.push(`Screen: ${issue.browser_info.screenResolution}`);
      sections.push(`Viewport: ${issue.browser_info.viewportSize}`);
    }
    sections.push("");
    
    // Console Logs
    if (issue.console_logs) {
      sections.push("CONSOLE LOGS / ERROR MESSAGES:");
      sections.push(issue.console_logs);
      sections.push("");
    }
    
    // Additional Context
    if (issue.additional_context) {
      sections.push("ADDITIONAL CONTEXT:");
      sections.push(issue.additional_context);
      sections.push("");
    }
    
    // Attachments
    if (issue.attachments && issue.attachments.length > 0) {
      sections.push(`ATTACHMENTS (${issue.attachments.length}):`);
      issue.attachments.forEach((att, idx) => {
        sections.push(`${idx + 1}. ${att.filename} (${att.type})`);
        sections.push(`   URL: ${att.url}`);
      });
      sections.push("");
    }
    
    // Screenshot (legacy field)
    if (issue.screenshot_url) {
      sections.push("SCREENSHOT:");
      sections.push(issue.screenshot_url);
      sections.push("");
    }
    
    // Admin Notes
    if (issue.admin_notes) {
      sections.push("ADMIN NOTES:");
      sections.push(issue.admin_notes);
      sections.push("");
    }
    
    const fullText = sections.join("\n");
    copyToClipboard(fullText, "Complete issue report");
  };

  const copySuggestionForAI = (suggestion: Suggestion) => {
    const sections = [];
    
    // Header
    sections.push("=== FEATURE SUGGESTION ===");
    sections.push(`Title: ${suggestion.title}`);
    sections.push(`Category: ${suggestion.category}`);
    sections.push(`Priority: ${suggestion.priority.toUpperCase()}`);
    sections.push(`Status: ${suggestion.status}`);
    sections.push(`Submitted: ${new Date(suggestion.created_at).toLocaleString()}`);
    sections.push(`Submitted by: ${suggestion.user_name} (${suggestion.user_email})`);
    sections.push("");
    
    // Description
    sections.push("DESCRIPTION:");
    sections.push(suggestion.description);
    sections.push("");
    
    // Page Context
    sections.push("CONTEXT:");
    sections.push(`Page: ${suggestion.page_url}`);
    if (suggestion.browser_info) {
      sections.push(`Browser: ${suggestion.browser_info.userAgent}`);
      sections.push(`Screen: ${suggestion.browser_info.screenResolution}`);
      sections.push(`Viewport: ${suggestion.browser_info.viewportSize}`);
    }
    sections.push("");
    
    // Additional Context
    if (suggestion.additional_context) {
      sections.push("ADDITIONAL CONTEXT:");
      sections.push(suggestion.additional_context);
      sections.push("");
    }
    
    // Attachments
    if (suggestion.attachments && suggestion.attachments.length > 0) {
      sections.push(`ATTACHMENTS (${suggestion.attachments.length}):`);
      suggestion.attachments.forEach((att, idx) => {
        sections.push(`${idx + 1}. ${att.filename} (${att.type})`);
        sections.push(`   URL: ${att.url}`);
      });
      sections.push("");
    }
    
    // Screenshot (legacy field)
    if (suggestion.screenshot_url) {
      sections.push("SCREENSHOT:");
      sections.push(suggestion.screenshot_url);
      sections.push("");
    }
    
    // Admin Notes
    if (suggestion.admin_notes) {
      sections.push("ADMIN NOTES:");
      sections.push(suggestion.admin_notes);
      sections.push("");
    }
    
    const fullText = sections.join("\n");
    copyToClipboard(fullText, "Complete suggestion");
  };

  const updateStatus = async (
    table: "issue_reports" | "suggestions",
    id: string,
    status: string
  ) => {
    const updates: any = { 
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
      resolved_by: status === "resolved" ? (await supabase.auth.getUser()).data.user?.id : null
    };

    // If changing to pending_verification, set needs_user_attention
    if (status === "pending_verification") {
      updates.needs_user_attention = true;
      updates.verification_requested_at = new Date().toISOString();
    }

    // If changing to in_progress or reopened, clear user attention flag
    if (["in_progress", "reopened"].includes(status)) {
      updates.needs_user_attention = false;
    }

    const { error } = await supabase
      .from(table)
      .update(updates)
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
      .update({
        admin_response: response,
        responded_at: new Date().toISOString(),
        responded_by: (await supabase.auth.getUser()).data.user?.id,
        status: "pending_verification",
        needs_user_attention: true,
        verification_requested_at: new Date().toISOString(),
      })
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
      new: { variant: "secondary" as const, icon: Clock },
      pending: { variant: "secondary" as const, icon: Clock },
      in_progress: { variant: "default" as const, icon: MessageSquare },
      "in-progress": { variant: "default" as const, icon: MessageSquare },
      pending_verification: { variant: "destructive" as const, icon: AlertCircle },
      resolved: { variant: "outline" as const, icon: CheckCircle2 },
      reopened: { variant: "destructive" as const, icon: AlertCircle },
    };
    const item = config[status as keyof typeof config] || config.pending;
    const Icon = item.icon;
    return (
      <Badge variant={item.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace(/[-_]/g, " ")}
      </Badge>
    );
  };

  const getVerificationBadge = (item: Issue | Suggestion) => {
    if (item.user_verified) {
      return (
        <Badge variant="default">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          User Verified
        </Badge>
      );
    }
    if (item.needs_user_attention) {
      return (
        <Badge variant="destructive">
          <Clock className="h-3 w-3 mr-1" />
          Awaiting User
        </Badge>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading feedback...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full overflow-auto pb-8">
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
                        {getVerificationBadge(issue)}
                      </div>
                      <CardDescription>
                        Reported by {issue.user_name} ({issue.user_email}) •{" "}
                        {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyIssueForAI(issue)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy All for AI
                      </Button>
                      <Select
                        value={issue.status}
                        onValueChange={(value) => updateStatus("issue_reports", issue.id, value)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="pending_verification">Pending Verification</SelectItem>
                          <SelectItem value="reopened">Reopened</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Description</p>
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

                  {/* Attachments */}
                  {issue.attachments && issue.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Attachments ({issue.attachments.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {issue.attachments.map((attachment, idx) => (
                          <div key={idx} className="relative group">
                            {attachment.type.startsWith('image/') ? (
                              <img
                                src={attachment.url}
                                alt={attachment.filename}
                                className="rounded-md border w-full aspect-video object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedImage(attachment.url)}
                              />
                            ) : (
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center p-4 border rounded-md hover:bg-accent transition-colors aspect-video"
                              >
                                <ExternalLink className="h-6 w-6 mb-2 text-muted-foreground" />
                                <p className="text-xs text-center truncate w-full px-2">{attachment.filename}</p>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Console Logs */}
                  {issue.console_logs && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Console Logs / Error Messages</p>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap rounded-md bg-muted p-3 font-mono overflow-x-auto">
                        {issue.console_logs}
                      </pre>
                    </div>
                  )}

                  {/* Additional Context */}
                  {issue.additional_context && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Additional Context</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted p-3">
                        {issue.additional_context}
                      </p>
                    </div>
                  )}

                  {/* Browser Info */}
                  {issue.browser_info && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Browser & Environment</p>
                      <div className="text-xs text-muted-foreground rounded-md bg-muted p-3 space-y-1 font-mono">
                        <p><span className="font-semibold">Browser:</span> {issue.browser_info.userAgent}</p>
                        <p><span className="font-semibold">Screen:</span> {issue.browser_info.screenResolution}</p>
                        <p><span className="font-semibold">Viewport:</span> {issue.browser_info.viewportSize}</p>
                      </div>
                    </div>
                  )}

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
                        {getVerificationBadge(suggestion)}
                      </div>
                      <CardDescription>
                        Suggested by {suggestion.user_name} ({suggestion.user_email}) •{" "}
                        {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copySuggestionForAI(suggestion)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy All for AI
                      </Button>
                      <Select
                        value={suggestion.status}
                        onValueChange={(value) => updateStatus("suggestions", suggestion.id, value)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="pending_verification">Pending Verification</SelectItem>
                          <SelectItem value="reopened">Reopened</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Description</p>
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

                  {/* Attachments */}
                  {suggestion.attachments && suggestion.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Attachments ({suggestion.attachments.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {suggestion.attachments.map((attachment, idx) => (
                          <div key={idx} className="relative group">
                            {attachment.type.startsWith('image/') ? (
                              <img
                                src={attachment.url}
                                alt={attachment.filename}
                                className="rounded-md border w-full aspect-video object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedImage(attachment.url)}
                              />
                            ) : (
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center p-4 border rounded-md hover:bg-accent transition-colors aspect-video"
                              >
                                <ExternalLink className="h-6 w-6 mb-2 text-muted-foreground" />
                                <p className="text-xs text-center truncate w-full px-2">{attachment.filename}</p>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Console Logs */}
                  {suggestion.console_logs && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Console Logs / Error Messages</p>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap rounded-md bg-muted p-3 font-mono overflow-x-auto">
                        {suggestion.console_logs}
                      </pre>
                    </div>
                  )}

                  {/* Additional Context */}
                  {suggestion.additional_context && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Additional Context</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted p-3">
                        {suggestion.additional_context}
                      </p>
                    </div>
                  )}

                  {/* Browser Info */}
                  {suggestion.browser_info && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Browser & Environment</p>
                      <div className="text-xs text-muted-foreground rounded-md bg-muted p-3 space-y-1 font-mono">
                        <p><span className="font-semibold">Browser:</span> {suggestion.browser_info.userAgent}</p>
                        <p><span className="font-semibold">Screen:</span> {suggestion.browser_info.screenResolution}</p>
                        <p><span className="font-semibold">Viewport:</span> {suggestion.browser_info.viewportSize}</p>
                      </div>
                    </div>
                  )}

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
