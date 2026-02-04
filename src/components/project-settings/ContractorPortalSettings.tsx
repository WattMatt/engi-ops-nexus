import { useState } from "react";
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
import { Building2, Copy, Trash2, Plus, Link2, ExternalLink, Users } from "lucide-react";
import { format } from "date-fns";

interface ContractorPortalSettingsProps {
  projectId: string;
}

const DOCUMENT_CATEGORIES = [
  { id: 'sow', label: 'Scope of Work' },
  { id: 'layouts', label: 'Shop Layouts' },
  { id: 'lighting', label: 'Lighting Orders' },
  { id: 'db_orders', label: 'DB Orders' },
  { id: 'as_built', label: 'As-Built Drawings' },
  { id: 'generators', label: 'Generators' },
  { id: 'transformers', label: 'Transformers' },
  { id: 'manuals', label: 'Manuals' },
  { id: 'certificates', label: 'Certificates' },
  // Phase 1: New electrical categories
  { id: 'switchgear', label: 'Switchgear' },
  { id: 'earthing_bonding', label: 'Earthing & Bonding' },
  { id: 'surge_protection', label: 'Surge Protection' },
  { id: 'metering', label: 'Metering' },
  { id: 'cable_installation', label: 'Cable Installation' },
  { id: 'emergency_systems', label: 'Emergency Systems' },
  { id: 'protection_settings', label: 'Protection Settings' },
  { id: 'arc_flash_studies', label: 'Arc Flash Studies' },
  { id: 'energy_management', label: 'Energy Management' },
];

export function ContractorPortalSettings({ projectId }: ContractorPortalSettingsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    contractorType: 'main_contractor',
    contractorName: '',
    contractorEmail: '',
    companyName: '',
    expiryDays: '30',
    documentCategories: [] as string[]
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
          contractor_name: formData.contractorName,
          contractor_email: formData.contractorEmail,
          company_name: formData.companyName || null,
          document_categories: formData.documentCategories,
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
        contractorName: '',
        contractorEmail: '',
        companyName: '',
        expiryDays: '30',
        documentCategories: []
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

  const copyLink = (token: string) => {
    // Always use the current origin so the link matches where the user is working
    const portalPath = `/contractor-portal?token=${token}`;
    const url = `${window.location.origin}${portalPath}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      documentCategories: prev.documentCategories.includes(categoryId)
        ? prev.documentCategories.filter(c => c !== categoryId)
        : [...prev.documentCategories, categoryId]
    }));
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
                <div className="space-y-2">
                  <Label>Contractor Type</Label>
                  <Select
                    value={formData.contractorType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, contractorType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main_contractor">Main Contractor</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name *</Label>
                    <Input
                      placeholder="John Smith"
                      value={formData.contractorName}
                      onChange={(e) => setFormData(prev => ({ ...prev, contractorName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="john@company.com"
                      value={formData.contractorEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, contractorEmail: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      placeholder="ABC Construction"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    />
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

                <div className="space-y-2">
                  <Label>Document Categories to Share</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg max-h-48 overflow-y-auto">
                    {DOCUMENT_CATEGORIES.map(cat => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <Checkbox
                          id={cat.id}
                          checked={formData.documentCategories.includes(cat.id)}
                          onCheckedChange={() => toggleCategory(cat.id)}
                        />
                        <Label htmlFor={cat.id} className="text-sm font-normal cursor-pointer">
                          {cat.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to show all available documents
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => createTokenMutation.mutate()}
                  disabled={!formData.contractorName || !formData.contractorEmail || createTokenMutation.isPending}
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
                <TableHead>Contractor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Access Count</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map(token => {
                const isExpired = new Date(token.expires_at) < new Date();
                const isActive = token.is_active && !isExpired;
                
                return (
                  <TableRow key={token.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{token.contractor_name}</p>
                        <p className="text-sm text-muted-foreground">{token.contractor_email}</p>
                        {token.company_name && (
                          <p className="text-xs text-muted-foreground">{token.company_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Building2 className="h-3 w-3 mr-1" />
                        {token.contractor_type === 'main_contractor' ? 'Main' : 'Sub'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? 'Active' : isExpired ? 'Expired' : 'Revoked'}
                      </Badge>
                    </TableCell>
                    <TableCell>{token.access_count}</TableCell>
                    <TableCell>
                      <span className={isExpired ? 'text-destructive' : ''}>
                        {format(new Date(token.expires_at), 'dd MMM yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isActive && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyLink(token.token)}
                              title="Copy Link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`/contractor-portal?token=${token.token}`, '_blank')}
                              title="Open Portal"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteTokenMutation.mutate(token.id)}
                          title="Revoke Access"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
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
    </Card>
  );
}
