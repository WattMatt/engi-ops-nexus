import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, MessageSquare, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Approval {
  id: string;
  section_type: string | null;
  status: string | null;
  comments: string | null;
  approved_at: string | null;
  created_at: string;
  tenant_id: string | null;
  tenant_shop_name?: string | null;
  tenant_shop_number?: string | null;
}

interface ApprovalTrackingSectionProps {
  projectId: string | null;
}

export const ApprovalTrackingSection: React.FC<ApprovalTrackingSectionProps> = ({
  projectId,
}) => {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [comment, setComment] = useState('');
  const [newApproval, setNewApproval] = useState({
    section_type: 'schedule',
    tenant_id: '',
  });
  const [tenants, setTenants] = useState<{ id: string; shop_name: string; shop_number: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchApprovals();
      fetchTenants();
    }
  }, [projectId]);

  const fetchApprovals = async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lighting_approvals')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch tenant info separately for each approval with a tenant_id
      const approvalsWithTenants: Approval[] = await Promise.all(
        (data || []).map(async (approval) => {
          if (approval.tenant_id) {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('shop_name, shop_number')
              .eq('id', approval.tenant_id)
              .single();
            
            return {
              ...approval,
              tenant_shop_name: tenant?.shop_name || null,
              tenant_shop_number: tenant?.shop_number || null,
            };
          }
          return approval;
        })
      );

      setApprovals(approvalsWithTenants);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    if (!projectId) return;
    
    const { data, error } = await supabase
      .from('tenants')
      .select('id, shop_name, shop_number')
      .eq('project_id', projectId);

    if (error) {
      console.error('Error fetching tenants:', error);
      return;
    }
    setTenants((data || []).map(t => ({
      id: t.id,
      shop_name: t.shop_name || '',
      shop_number: t.shop_number || '',
    })));
  };

  const handleStatusChange = async (approvalId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'approved') {
        const { data: { user } } = await supabase.auth.getUser();
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('lighting_approvals')
        .update(updates)
        .eq('id', approvalId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Approval status changed to ${newStatus}`,
      });

      fetchApprovals();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update approval status",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async () => {
    if (!selectedApproval || !comment.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('lighting_approvals')
        .update({ comments: comment })
        .eq('id', selectedApproval.id);

      if (error) throw error;

      toast({
        title: "Comment Added",
        description: "Your comment has been saved",
      });

      setShowCommentDialog(false);
      setComment('');
      setSelectedApproval(null);
      fetchApprovals();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateApproval = async () => {
    if (!projectId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('lighting_approvals')
        .insert({
          project_id: projectId,
          section_type: newApproval.section_type,
          tenant_id: newApproval.tenant_id || null,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Approval Created",
        description: "New approval tracking item created",
      });

      setShowAddDialog(false);
      setNewApproval({ section_type: 'schedule', tenant_id: '' });
      fetchApprovals();
    } catch (error) {
      console.error('Error creating approval:', error);
      toast({
        title: "Error",
        description: "Failed to create approval",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'changes_requested':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_review':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400">Approved</Badge>;
      case 'changes_requested':
        return <Badge className="bg-red-500/20 text-red-400">Changes Requested</Badge>;
      case 'in_review':
        return <Badge className="bg-blue-500/20 text-blue-400">In Review</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
    }
  };

  const sectionTypeLabels: Record<string, string> = {
    schedule: 'Lighting Schedule',
    specification: 'Specification',
    cost: 'Cost Summary',
    energy: 'Energy Analysis',
  };

  if (isLoading) {
    return (
      <Card className="py-12">
        <CardContent className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Approval Tracking</CardTitle>
              <CardDescription>Track approval status for lighting sections</CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Approval Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {approvals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No approval items yet. Click "Add Approval Item" to start tracking.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map(approval => (
                  <TableRow key={approval.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(approval.status)}
                        {sectionTypeLabels[approval.section_type || ''] || approval.section_type}
                      </div>
                    </TableCell>
                    <TableCell>
                      {approval.tenant_shop_number
                        ? `${approval.tenant_shop_number} - ${approval.tenant_shop_name}`
                        : 'All Tenants'}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(approval.status)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(approval.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      {approval.approved_at
                        ? format(new Date(approval.approved_at), 'dd MMM yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Select
                          value={approval.status || 'pending'}
                          onValueChange={(value) => handleStatusChange(approval.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_review">In Review</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="changes_requested">Changes Requested</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setComment(approval.comments || '');
                            setShowCommentDialog(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Approval Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Approval Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Section Type</label>
              <Select
                value={newApproval.section_type}
                onValueChange={(value) => setNewApproval(prev => ({ ...prev, section_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="schedule">Lighting Schedule</SelectItem>
                  <SelectItem value="specification">Specification</SelectItem>
                  <SelectItem value="cost">Cost Summary</SelectItem>
                  <SelectItem value="energy">Energy Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tenant (optional)</label>
              <Select
                value={newApproval.tenant_id}
                onValueChange={(value) => setNewApproval(prev => ({ ...prev, tenant_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All tenants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Tenants</SelectItem>
                  {tenants.map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.shop_number} - {tenant.shop_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateApproval} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter your comment..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddComment} disabled={isSubmitting || !comment.trim()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
