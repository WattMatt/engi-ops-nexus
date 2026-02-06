import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MessageSquarePlus, Plus, Clock, CheckCircle2, AlertCircle, MessageCircle, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ContractorRFISectionProps {
  projectId: string;
  contractorName: string;
  contractorEmail: string;
  companyName: string | null;
  token: string;
}

interface RFI {
  id: string;
  rfi_number: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  category: string | null;
  due_date: string | null;
  created_at: string;
  responses?: RFIResponse[];
}

interface RFIResponse {
  id: string;
  response_text: string;
  responded_by_name: string | null;
  is_official_response: boolean;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'bg-blue-500/10 text-blue-600', icon: <Clock className="h-3 w-3" /> },
  in_review: { label: 'In Review', color: 'bg-amber-500/10 text-amber-600', icon: <MessageCircle className="h-3 w-3" /> },
  answered: { label: 'Answered', color: 'bg-green-500/10 text-green-600', icon: <CheckCircle2 className="h-3 w-3" /> },
  closed: { label: 'Closed', color: 'bg-gray-500/10 text-gray-600', icon: <CheckCircle2 className="h-3 w-3" /> },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600' },
};

export function ContractorRFISection({ projectId, contractorName, contractorEmail, companyName, token }: ContractorRFISectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRFI, setSelectedRFI] = useState<RFI | null>(null);
  const [newRFI, setNewRFI] = useState({
    subject: '',
    description: '',
    priority: 'normal',
    category: ''
  });
  
  const queryClient = useQueryClient();

  // Fetch RFIs for this project
  const { data: rfis, isLoading } = useQuery({
    queryKey: ['contractor-rfis', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfis')
        .select(`
          id, rfi_number, subject, description, priority, status, category, due_date, created_at,
          rfi_responses(id, response_text, responded_by_name, is_official_response, created_at)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RFI[];
    }
  });

  // Create new RFI
  const createRFIMutation = useMutation({
    mutationFn: async () => {
      // Get next RFI number
      const { data: rfiNumber } = await supabase.rpc('generate_rfi_number', { p_project_id: projectId });
      
      const { data, error } = await supabase
        .from('rfis')
        .insert({
          project_id: projectId,
          rfi_number: rfiNumber,
          subject: newRFI.subject,
          description: newRFI.description,
          priority: newRFI.priority,
          category: newRFI.category || null,
          submitted_by_name: contractorName,
          submitted_by_email: contractorEmail,
          submitted_by_company: companyName
        })
        .select()
        .single();

      if (error) throw error;
      
      // Send notification email
      try {
        await supabase.functions.invoke('send-rfi-notification', {
          body: {
            projectId,
            rfiId: data.id,
            rfiNumber: data.rfi_number,
            subject: newRFI.subject,
            description: newRFI.description,
            priority: newRFI.priority,
            submittedBy: contractorName,
            submittedByEmail: contractorEmail,
            companyName,
            tokenId: token // Pass token to include notification contacts
          }
        });
      } catch (emailError) {
        console.error('Failed to send RFI notification:', emailError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-rfis', projectId] });
      toast.success('RFI submitted successfully');
      setDialogOpen(false);
      setNewRFI({ subject: '', description: '', priority: 'normal', category: '' });
    },
    onError: (error) => {
      console.error('Failed to create RFI:', error);
      toast.error('Failed to submit RFI');
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Stats
  const openCount = rfis?.filter(r => r.status === 'open').length || 0;
  const answeredCount = rfis?.filter(r => r.status === 'answered' || r.status === 'closed').length || 0;

  return (
    <div className="space-y-6">
      {/* Summary & Create */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5" />
                Request for Information (RFI)
              </CardTitle>
              <CardDescription>
                Submit and track information requests
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New RFI
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Submit New RFI</DialogTitle>
                  <DialogDescription>
                    Create a new Request for Information. The project team will be notified.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your query"
                      value={newRFI.subject}
                      onChange={(e) => setNewRFI(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Provide detailed information about your request..."
                      className="min-h-[120px]"
                      value={newRFI.description}
                      onChange={(e) => setNewRFI(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={newRFI.priority}
                        onValueChange={(value) => setNewRFI(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category (Optional)</Label>
                      <Input
                        placeholder="e.g., Electrical, Drawings"
                        value={newRFI.category}
                        onChange={(e) => setNewRFI(prev => ({ ...prev, category: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={() => createRFIMutation.mutate()}
                    disabled={!newRFI.subject || !newRFI.description || createRFIMutation.isPending}
                  >
                    {createRFIMutation.isPending ? 'Submitting...' : 'Submit RFI'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{rfis?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total RFIs</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">{openCount}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50">
              <p className="text-2xl font-bold text-green-600">{answeredCount}</p>
              <p className="text-xs text-muted-foreground">Answered</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RFI List */}
      <Card>
        <CardHeader>
          <CardTitle>Your RFIs</CardTitle>
        </CardHeader>
        <CardContent>
          {rfis && rfis.length > 0 ? (
            <div className="divide-y">
              {rfis.map(rfi => {
                const status = statusConfig[rfi.status] || statusConfig.open;
                const priority = priorityConfig[rfi.priority] || priorityConfig.normal;
                const responseCount = rfi.responses?.length || 0;
                
                return (
                  <div 
                    key={rfi.id} 
                    className="py-4 cursor-pointer hover:bg-muted/50 -mx-4 px-4 transition-colors"
                    onClick={() => setSelectedRFI(rfi)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-muted-foreground">{rfi.rfi_number}</span>
                          <Badge className={status.color}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                          <Badge variant="outline" className={priority.color}>
                            {priority.label}
                          </Badge>
                        </div>
                        <p className="font-medium">{rfi.subject}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{rfi.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(rfi.created_at), 'dd MMM yyyy')}
                          </span>
                          {responseCount > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {responseCount} response{responseCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No RFIs submitted yet</p>
              <p className="text-sm">Click "New RFI" to submit your first request</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RFI Detail Dialog */}
      <Dialog open={!!selectedRFI} onOpenChange={(open) => !open && setSelectedRFI(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          {selectedRFI && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedRFI.rfi_number}</span>
                  <Badge className={statusConfig[selectedRFI.status]?.color || ''}>
                    {statusConfig[selectedRFI.status]?.label || selectedRFI.status}
                  </Badge>
                </div>
                <DialogTitle>{selectedRFI.subject}</DialogTitle>
                <DialogDescription>
                  Submitted on {format(new Date(selectedRFI.created_at), 'dd MMMM yyyy, HH:mm')}
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[50vh]">
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Request:</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedRFI.description}</p>
                  </div>

                  {selectedRFI.responses && selectedRFI.responses.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Responses:</p>
                      {selectedRFI.responses.map(response => (
                        <div 
                          key={response.id} 
                          className={`p-4 rounded-lg border ${response.is_official_response ? 'border-green-200 bg-green-50' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              {response.responded_by_name || 'Project Team'}
                            </span>
                            {response.is_official_response && (
                              <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                                Official Response
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{response.response_text}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(response.created_at), 'dd MMM yyyy, HH:mm')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!selectedRFI.responses || selectedRFI.responses.length === 0) && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Awaiting response from project team</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
