/**
 * Cable Schedule Verification History
 * Lists all verification tokens and their status
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  MoreHorizontal, Copy, Trash2, ExternalLink, Eye, Mail,
  Clock, CheckCircle2, XCircle, RefreshCw, FileText, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { CableVerificationStatusBadge } from "./CableVerificationStatusBadge";
import { VerificationStatus } from "@/types/cableVerification";
import { EmptyState, LoadingState } from "@/components/common";
import { svgPagesToPdfBlob } from "@/utils/svg-pdf/svgToPdfEngine";
import { buildVerificationCertPdf, type VerificationCertPdfData } from "@/utils/svg-pdf/verificationCertPdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";
import { imageToBase64 } from "@/utils/pdfmake/helpers";

interface TokenWithVerification {
  id: string;
  schedule_id: string;
  project_id: string;
  token: string;
  electrician_name: string;
  electrician_email: string;
  company_name: string | null;
  registration_number: string | null;
  expires_at: string;
  accessed_at: string | null;
  access_count: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  verification: {
    id: string;
    status: string;
    completed_at: string | null;
    signoff_name: string | null;
  } | null;
  schedule?: {
    name: string;
    revision: string | null;
  };
}

interface CableScheduleVerificationHistoryProps {
  scheduleId: string;
}

export function CableScheduleVerificationHistory({ scheduleId }: CableScheduleVerificationHistoryProps) {
  const [deleteTokenId, setDeleteTokenId] = useState<string | null>(null);
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tokens, isLoading, error } = useQuery({
    queryKey: ['cable-verification-tokens', scheduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cable_schedule_verification_tokens')
        .select(`*, cable_schedule_verifications (id, status, completed_at, signoff_name)`)
        .eq('schedule_id', scheduleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(token => ({
        ...token,
        verification: token.cable_schedule_verifications?.[0] ? {
          id: token.cable_schedule_verifications[0].id,
          status: token.cable_schedule_verifications[0].status,
          completed_at: token.cable_schedule_verifications[0].completed_at,
          signoff_name: token.cable_schedule_verifications[0].signoff_name,
        } : null,
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('cable_schedule_verification_tokens')
        .delete()
        .eq('id', tokenId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cable-verification-tokens', scheduleId] });
      toast({ title: "Verification link deleted", description: "The verification link has been revoked" });
      setDeleteTokenId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete", description: "Please try again", variant: "destructive" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (token: TokenWithVerification) => {
      const verificationUrl = `${window.location.origin}/cable-verification?token=${token.token}`;
      const { error } = await supabase.functions.invoke('send-cable-verification-email', {
        body: {
          to: token.electrician_email,
          electrician_name: token.electrician_name,
          schedule_name: token.schedule?.name || 'Cable Schedule',
          verification_url: verificationUrl,
          expires_at: token.expires_at,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Email sent", description: "Verification link email has been resent" });
    },
    onError: () => {
      toast({ title: "Failed to send email", description: "Please try again", variant: "destructive" });
    },
  });

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/cable-verification?token=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const openLink = (token: string) => {
    const url = `${window.location.origin}/cable-verification?token=${token}`;
    window.open(url, '_blank');
  };

  const downloadCertificate = async (verificationId: string) => {
    setDownloadingCertificateId(verificationId);
    try {
      // Fetch verification data
      const { data: verification, error: vErr } = await (supabase
        .from('cable_schedule_verifications') as any)
        .select('*')
        .eq('id', verificationId)
        .single();
      if (vErr) throw vErr;

      // Fetch verification items
      const { data: items } = await (supabase
        .from('cable_schedule_verification_items' as any) as any)
        .select('*')
        .eq('verification_id', verificationId);

      // Fetch schedule info
      const { data: schedule } = await supabase
        .from('cable_schedules')
        .select('*, projects(name, project_number)')
        .eq('id', scheduleId)
        .single();

      // Company data
      const { data: company } = await supabase
        .from('company_settings')
        .select('company_name, company_logo_url')
        .limit(1)
        .maybeSingle();

      let companyLogoBase64: string | null = null;
      if (company?.company_logo_url) {
        try { companyLogoBase64 = await imageToBase64(company.company_logo_url); } catch {}
      }

      const coverData: StandardCoverPageData = {
        reportTitle: "Verification Certificate",
        reportSubtitle: `Schedule: ${(schedule as any)?.schedule_name || 'Cable Schedule'}`,
        projectName: (schedule as any)?.projects?.name || 'Project',
        projectNumber: (schedule as any)?.projects?.project_number,
        date: format(new Date(), "dd MMMM yyyy"),
        companyName: company?.company_name || undefined,
        companyLogoBase64,
      };

      const verifiedItems = (items || []).filter((i: any) => i.status === 'verified').length;
      const issueItems = (items || []).filter((i: any) => i.status === 'issue').length;
      const notInstalledItems = (items || []).filter((i: any) => i.status === 'not_installed').length;

      const certData: VerificationCertPdfData = {
        coverData,
        projectName: (schedule as any)?.projects?.name || 'Project',
        projectNumber: (schedule as any)?.projects?.project_number || '',
        scheduleName: (schedule as any)?.schedule_name || 'Cable Schedule',
        scheduleRevision: (schedule as any)?.revision,
        electrician: {
          name: verification.signoff_name || 'Unknown',
          company: verification.signoff_company || '',
          registration: verification.signoff_registration || '',
        },
        stats: {
          total: (items || []).length,
          verified: verifiedItems,
          issues: issueItems,
          not_installed: notInstalledItems,
        },
        items: (items || []).map((i: any) => ({
          cable_tag: i.cable_tag || '',
          from_location: i.from_location || '',
          to_location: i.to_location || '',
          cable_size: i.cable_size || '',
          status: i.status || 'pending',
          notes: i.notes,
          measured_length: i.measured_length,
        })),
        completedAt: verification.completed_at || new Date().toISOString(),
        certId: verificationId,
      };

      const pages = buildVerificationCertPdf(certData);
      const { blob } = await svgPagesToPdfBlob(pages);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Verification_Certificate_${format(new Date(), 'yyyyMMdd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Certificate downloaded" });
    } catch (err: any) {
      console.error('Failed to download certificate:', err);
      toast({ title: "Failed to generate certificate", description: "Please try again later", variant: "destructive" });
    } finally {
      setDownloadingCertificateId(null);
    }
  };

  if (isLoading) return <LoadingState message="Loading verification history..." />;
  if (error) return <Card><CardContent className="py-8"><p className="text-center text-destructive">Failed to load verification history</p></CardContent></Card>;
  if (!tokens?.length) return <EmptyState title="No verification links" description="Create a verification link above to allow site electricians to verify cable installations" icon={CheckCircle2} />;

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Electrician</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Access</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((token) => {
              const isExpired = isPast(new Date(token.expires_at));
              const verificationStatus = token.verification?.status as VerificationStatus || 'pending';
              
              return (
                <TableRow key={token.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{token.electrician_name}</span>
                      <span className="text-sm text-muted-foreground">{token.electrician_email}</span>
                      {token.company_name && <span className="text-xs text-muted-foreground">{token.company_name}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isExpired && !token.verification?.completed_at ? (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        <XCircle className="mr-1 h-3 w-3" />Expired
                      </Badge>
                    ) : (
                      <CableVerificationStatusBadge status={verificationStatus} />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {isExpired ? (
                        <span className="text-muted-foreground">Expired {formatDistanceToNow(new Date(token.expires_at))} ago</span>
                      ) : (
                        <span>{formatDistanceToNow(new Date(token.expires_at))} left</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {token.access_count > 0 ? (
                        <>
                          {token.access_count} visit{token.access_count !== 1 ? 's' : ''}
                          {token.accessed_at && <span className="block text-xs">Last: {format(new Date(token.accessed_at), 'MMM d, HH:mm')}</span>}
                        </>
                      ) : 'Not accessed'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => copyLink(token.token)}><Copy className="mr-2 h-4 w-4" />Copy Link</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openLink(token.token)}><ExternalLink className="mr-2 h-4 w-4" />Open Portal</DropdownMenuItem>
                        {token.verification && (
                          <>
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />View Results</DropdownMenuItem>
                            {(token.verification.status === 'verified' || token.verification.status === 'issues_found') && (
                              <DropdownMenuItem 
                                onClick={() => downloadCertificate(token.verification!.id)}
                                disabled={downloadingCertificateId === token.verification.id}
                              >
                                {downloadingCertificateId === token.verification.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <FileText className="mr-2 h-4 w-4" />
                                )}
                                Download Certificate
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => resendMutation.mutate(token)} disabled={resendMutation.isPending}>
                          <Mail className="mr-2 h-4 w-4" />Resend Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTokenId(token.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />Revoke Access
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTokenId} onOpenChange={() => setDeleteTokenId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke verification access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the verification link. The electrician will no longer 
              be able to access the verification portal. Any incomplete verification progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTokenId && deleteMutation.mutate(deleteTokenId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
