import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Building2, Copy, Trash2, Plus, Link2, ExternalLink, Users, RefreshCw, Send, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Mail, User, Bell, Link } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, formatDistanceToNow } from "date-fns";
import { TokenNotificationContacts } from "./TokenNotificationContacts";

interface ContractorPortalSettingsProps {
  projectId: string;
}

// Token health status helper
function getTokenHealthStatus(token: { is_active: boolean; expires_at: string; access_count: number }) {
  const isExpired = new Date(token.expires_at) < new Date();
  const isActive = token.is_active && !isExpired;
  const expiresIn = new Date(token.expires_at).getTime() - Date.now();
  const expiresSoon = expiresIn > 0 && expiresIn < 7 * 24 * 60 * 60 * 1000; // 7 days
  
  if (!token.is_active) return { status: 'revoked', color: 'text-muted-foreground', icon: XCircle };
  if (isExpired) return { status: 'expired', color: 'text-destructive', icon: XCircle };
  if (expiresSoon) return { status: 'expiring', color: 'text-amber-600', icon: Clock };
  return { status: 'active', color: 'text-green-600', icon: CheckCircle };
}

const CONTRACTOR_TYPES = [
  { value: 'main_contractor', label: 'Main Contractor' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'electrical_contractor', label: 'Electrical Contractor' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'client', label: 'Client' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'other', label: 'Other' },
];

export function ContractorPortalSettings({ projectId }: ContractorPortalSettingsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notificationContactsTokenId, setNotificationContactsTokenId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contractorType: 'main_contractor',
    companyName: '',
    expiryDays: '30'
  });

  const queryClient = useQueryClient();

  // Fetch existing tokens
  const { data: tokens, isLoading } = useQuery({
    queryKey: ['contractor-tokens', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contractor_portal_tokens')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch registered portal users for all tokens
  const { data: portalUsers } = useQuery({
    queryKey: ['portal-users', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_user_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('last_accessed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Group portal users by token_id
  const usersByToken = portalUsers?.reduce((acc, user) => {
    const key = user.token_id || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(user);
    return acc;
  }, {} as Record<string, typeof portalUsers>) || {};

  // Create token mutation
  const createTokenMutation = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(formData.expiryDays));

      const { data, error } = await supabase
        .from('contractor_portal_tokens')
        .insert({
          project_id: projectId,
          contractor_type: formData.contractorType,
          contractor_name: formData.companyName || 'Open Access',
          contractor_email: 'portal@open.access',
          company_name: formData.companyName || null,
          document_categories: [],
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-tokens', projectId] });
      toast.success('Contractor access link generated');
      setDialogOpen(false);
      setFormData({
        contractorType: 'main_contractor',
        companyName: '',
        expiryDays: '30'
      });
    },
    onError: (error) => {
      console.error('Failed to create token:', error);
      toast.error('Failed to generate access link');
    }
  });

  // Delete token mutation
  const deleteTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('contractor_portal_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-tokens', projectId] });
      toast.success('Access link revoked');
    },
    onError: (error) => {
      console.error('Failed to delete token:', error);
      toast.error('Failed to revoke access');
    }
  });

  // Reactivate token mutation (extend expiry by 30 days)
  const reactivateTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);
      
      const { error } = await supabase
        .from('contractor_portal_tokens')
        .update({ 
          is_active: true,
          expires_at: newExpiry.toISOString()
        })
        .eq('id', tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-tokens', projectId] });
      toast.success('Access link reactivated for 30 days');
    },
    onError: (error) => {
      console.error('Failed to reactivate token:', error);
      toast.error('Failed to reactivate access');
    }
  });

  const copyLink = (token: string, shortCode?: string | null) => {
    // Prefer short URL if available
    const portalPath = shortCode 
      ? `/p/${shortCode}`
      : `/contractor-portal?token=${token}`;
    const url = `${window.location.origin}${portalPath}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const copyFullLink = (token: string) => {
    const portalPath = `/contractor-portal?token=${token}`;
    const url = `${window.location.origin}${portalPath}`;
    navigator.clipboard.writeText(url);
    toast.success('Full link copied to clipboard');
  };

  const sendLinkEmail = (email: string, token: string, shortCode?: string | null) => {
    const portalPath = shortCode 
      ? `/p/${shortCode}`
      : `/contractor-portal?token=${token}`;
    const url = `${window.location.origin}${portalPath}`;
    const subject = encodeURIComponent('Your Contractor Portal Access Link');
    const body = encodeURIComponent(`Here is your access link to the Contractor Portal:\n\n${url}\n\nThis link is personal and should not be shared.`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  // Get contractor type label
  const getContractorTypeLabel = (value: string) => {
    return CONTRACTOR_TYPES.find(t => t.value === value)?.label || value;
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contractor Portal Access
            </CardTitle>
            <CardDescription>
              Generate secure access links for main contractors and subcontractors
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate Access Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Generate Contractor Access</DialogTitle>
                <DialogDescription>
                  Create a secure access link for contractors to view project status and submit RFIs.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Open Access Link</p>
                  <p>Anyone with this link can access the portal. Each user will be prompted to enter their own name and email on first visit, which will be logged for tracking and notifications.</p>
                </div>

                <div className="space-y-2">
                  <Label>Portal Type</Label>
                  <Select
                    value={formData.contractorType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, contractorType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACTOR_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Company / Link Name</Label>
                  <Input
                    placeholder="e.g. ABC Construction or 'Main Contractor Access'"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to identify this link in the list
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Link Expires In</Label>
                  <Select
                    value={formData.expiryDays}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, expiryDays: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">6 months</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => createTokenMutation.mutate()}
                  disabled={createTokenMutation.isPending}
                >
                  {createTokenMutation.isPending ? 'Generating...' : 'Generate Link'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {tokens && tokens.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Access Link</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered Users</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map(token => {
                const health = getTokenHealthStatus(token);
                const isExpired = new Date(token.expires_at) < new Date();
                const isActive = token.is_active && !isExpired;
                const StatusIcon = health.icon;
                const registeredUsers = usersByToken[token.id] || [];
                const isOpenAccess = token.contractor_email === 'portal@open.access';
                
                return (
                  <React.Fragment key={token.id}>
                  <TableRow>
                    <TableCell>
                      <div>
                        {isOpenAccess ? (
                          <p className="font-medium text-primary">Open Access Link</p>
                        ) : (
                          <>
                            <p className="font-medium">{token.contractor_name}</p>
                            <p className="text-sm text-muted-foreground">{token.contractor_email}</p>
                          </>
                        )}
                        {token.company_name && (
                          <p className="text-xs text-muted-foreground">{token.company_name}</p>
                        )}
                        {/* Show short URL if available */}
                        {(token as any).short_code && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Link className="h-3 w-3 text-muted-foreground" />
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              /p/{(token as any).short_code}
                            </code>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Building2 className="h-3 w-3 mr-1" />
                        {getContractorTypeLabel(token.contractor_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`h-4 w-4 ${health.color}`} />
                        <span className={`text-sm capitalize ${health.color}`}>
                          {health.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{registeredUsers.length} user{registeredUsers.length !== 1 ? 's' : ''}</span>
                        {registeredUsers.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {registeredUsers.slice(0, 3).map((user, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground truncate max-w-[180px]" title={user.user_email}>
                                {user.user_name}
                              </p>
                            ))}
                            {registeredUsers.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{registeredUsers.length - 3} more</p>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={isExpired ? 'text-destructive' : ''}>
                        {format(new Date(token.expires_at), 'dd MMM yyyy')}
                      </span>
                      {!isExpired && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(token.expires_at), { addSuffix: true })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Reactivate button for expired/revoked tokens */}
                        {!isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => reactivateTokenMutation.mutate(token.id)}
                            title="Reactivate (extend 30 days)"
                            disabled={reactivateTokenMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Copy and open for active tokens */}
                        {isActive && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyLink(token.token, (token as any).short_code)}
                              title="Copy Link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open((token as any).short_code ? `/p/${(token as any).short_code}` : `/contractor-portal?token=${token.token}`, '_blank')}
                              title="Open Portal"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {/* Notification contacts */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setNotificationContactsTokenId(token.id)}
                          title="Manage Notification Contacts"
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                        {/* Resend link via email */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => sendLinkEmail(token.contractor_email, token.token, (token as any).short_code)}
                          title="Resend Link via Email"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteTokenMutation.mutate(token.id)}
                          title="Delete Access"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Expandable user registry */}
                  {registeredUsers.length > 0 && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={6} className="p-0">
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-none h-8">
                              <Users className="h-3.5 w-3.5" />
                              <span className="text-xs">View {registeredUsers.length} registered user{registeredUsers.length !== 1 ? 's' : ''}</span>
                              <ChevronDown className="h-3.5 w-3.5 ml-auto transition-transform group-data-[state=open]:rotate-180" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-3 pt-1">
                              <div className="grid gap-2">
                                {registeredUsers.map((user, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm bg-background rounded-md px-3 py-2 border">
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-4 w-4 text-primary" />
                                      </div>
                                      <div>
                                        <p className="font-medium">{user.user_name}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Mail className="h-3 w-3" />
                                          {user.user_email}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                      <p>Last access</p>
                                      <p>{formatDistanceToNow(new Date(user.last_accessed_at), { addSuffix: true })}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No contractor access links generated yet</p>
            <p className="text-sm">Click "Generate Access Link" to create one</p>
          </div>
        )}
      </CardContent>

      {/* Notification Contacts Dialog */}
      {notificationContactsTokenId && (
        <TokenNotificationContacts
          tokenId={notificationContactsTokenId}
          projectId={projectId}
          open={!!notificationContactsTokenId}
          onOpenChange={(open) => !open && setNotificationContactsTokenId(null)}
        />
      )}
    </Card>
  );
}
