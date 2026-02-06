import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { DrawingPreviewDialog } from "@/components/drawings/DrawingPreviewDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { 
  Search, 
  FileText, 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  Download,
  History,
  Calendar,
  CheckCircle2,
  Lock
} from "lucide-react";
import { format } from "date-fns";

interface ContractorDrawingRegisterProps {
  projectId: string;
  token?: string;
  userEmail?: string;
}

interface Drawing {
  id: string;
  drawing_number: string;
  drawing_title: string | null;
  category: string;
  current_revision: string;
  status: string;
  revision_date: string | null;
  file_url: string | null;
  file_path: string | null;
  notes: string | null;
}

interface DrawingRevision {
  id: string;
  drawing_id: string;
  revision: string;
  revision_date: string | null;
  revision_notes: string | null;
  file_url: string | null;
  file_path: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  'ifc': { label: 'IFC', variant: 'default' },
  'for_construction': { label: 'For Construction', variant: 'default' },
  'as_built': { label: 'As Built', variant: 'secondary' },
  'draft': { label: 'Draft', variant: 'outline' },
  'for_review': { label: 'For Review', variant: 'outline' },
  'approved': { label: 'Approved', variant: 'default' },
};

const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
  'E': { label: 'Electrical', className: 'bg-chart-1' },
  'P': { label: 'Power', className: 'bg-chart-2' },
  'L': { label: 'Lighting', className: 'bg-chart-3' },
  'F': { label: 'Fire', className: 'bg-destructive' },
  'H': { label: 'HVAC', className: 'bg-chart-4' },
  'S': { label: 'Security', className: 'bg-chart-5' },
  'D': { label: 'Data', className: 'bg-accent' },
  'G': { label: 'General', className: 'bg-muted-foreground' },
};

async function fetchDrawings(projectId: string): Promise<Drawing[]> {
  // Fetch ALL drawings - visibility is now controlled at download level, not view level
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_drawings')
    .select('id, drawing_number, drawing_title, category, current_revision, status, revision_date, file_url, file_path, notes')
    .eq('project_id', projectId)
    .order('drawing_number');
  
  if (error) throw error;
  
  return (data || []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    drawing_number: d.drawing_number as string,
    drawing_title: d.drawing_title as string | null,
    category: d.category as string,
    current_revision: d.current_revision as string,
    status: d.status as string,
    revision_date: d.revision_date as string | null,
    file_url: d.file_url as string | null,
    file_path: d.file_path as string | null,
    notes: d.notes as string | null
  }));
}

// Check if user email is in the token's notification contacts (authorized for downloads)
async function checkDownloadPermission(token: string, userEmail: string): Promise<boolean> {
  if (!token || !userEmail) return false;
  
  // First get the token_id from the token string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tokenData } = await (supabase as any)
    .from('contractor_portal_tokens')
    .select('id')
    .eq('token', token)
    .maybeSingle();
  
  // Also try short_code if no match
  let tokenId = tokenData?.id;
  if (!tokenId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shortCodeData } = await (supabase as any)
      .from('contractor_portal_tokens')
      .select('id')
      .eq('short_code', token)
      .maybeSingle();
    tokenId = shortCodeData?.id;
  }
  
  if (!tokenId) return false;
  
  // Check if user email is in token notification contacts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contacts } = await (supabase as any)
    .from('token_notification_contacts')
    .select('id')
    .eq('token_id', tokenId)
    .ilike('email', userEmail)
    .maybeSingle();
  
  return !!contacts;
}

async function fetchRevisions(drawingIds: string[]): Promise<DrawingRevision[]> {
  if (drawingIds.length === 0) return [];
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('drawing_revisions')
    .select('id, drawing_id, revision, revision_date, revision_notes, file_url, file_path')
    .in('drawing_id', drawingIds)
    .order('revision_date', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    drawing_id: r.drawing_id as string,
    revision: r.revision as string,
    revision_date: r.revision_date as string | null,
    revision_notes: r.revision_notes as string | null,
    file_url: r.file_url as string | null,
    file_path: r.file_path as string | null
  }));
}

export function ContractorDrawingRegister({ projectId, token, userEmail }: ContractorDrawingRegisterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['E', 'P', 'L']));
  const [expandedDrawings, setExpandedDrawings] = useState<Set<string>>(new Set());
  const [previewDrawing, setPreviewDrawing] = useState<{ url: string; title: string; fileName: string } | null>(null);

  // Check if user has download permission (is in token notification contacts)
  const { data: canDownload = false } = useQuery<boolean>({
    queryKey: ['contractor-download-permission', token, userEmail],
    queryFn: () => checkDownloadPermission(token!, userEmail!),
    enabled: !!token && !!userEmail
  });

  // Fetch drawings
  const { data: drawings = [], isLoading: loadingDrawings } = useQuery<Drawing[]>({
    queryKey: ['contractor-drawings', projectId],
    queryFn: () => fetchDrawings(projectId),
    enabled: !!projectId
  });

  // Fetch revisions
  const { data: revisions = [] } = useQuery<DrawingRevision[]>({
    queryKey: ['contractor-drawing-revisions', projectId, drawings.length],
    queryFn: () => fetchRevisions(drawings.map(d => d.id)),
    enabled: drawings.length > 0
  });

  const getCategoryFromDrawing = (drawingNumber: string): string => {
    const parts = drawingNumber.split(/[./]/);
    if (parts.length >= 2) {
      return parts[1].charAt(0).toUpperCase();
    }
    return 'G';
  };

  const filteredDrawings = drawings.filter(d => 
    d.drawing_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.drawing_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedDrawings = filteredDrawings.reduce((acc, drawing) => {
    const category = getCategoryFromDrawing(drawing.drawing_number);
    if (!acc[category]) acc[category] = [];
    acc[category].push(drawing);
    return acc;
  }, {} as Record<string, Drawing[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleDrawingHistory = (drawingId: string) => {
    const newExpanded = new Set(expandedDrawings);
    if (newExpanded.has(drawingId)) {
      newExpanded.delete(drawingId);
    } else {
      newExpanded.add(drawingId);
    }
    setExpandedDrawings(newExpanded);
  };

  const getDrawingRevisions = (drawingId: string) => {
    return revisions.filter(r => r.drawing_id === drawingId);
  };

  // Extract bucket name from file URL (handles both public and authenticated patterns)
  const extractBucketFromUrl = (fileUrl: string): string | null => {
    // Match /storage/v1/object/public/BUCKET_NAME/...
    const publicMatch = fileUrl.match(/\/storage\/v1\/object\/public\/([^/]+)/);
    if (publicMatch) return publicMatch[1];
    
    // Match /storage/v1/object/authenticated/BUCKET_NAME/...
    const authMatch = fileUrl.match(/\/storage\/v1\/object\/authenticated\/([^/]+)/);
    if (authMatch) return authMatch[1];
    
    // Match /storage/v1/object/sign/BUCKET_NAME/...
    const signMatch = fileUrl.match(/\/storage\/v1\/object\/sign\/([^/]+)/);
    if (signMatch) return signMatch[1];
    
    return null;
  };

  // Extract file path from URL
  const extractPathFromUrl = (fileUrl: string): string | null => {
    // Match after bucket name in storage URL
    const match = fileUrl.match(/\/storage\/v1\/object\/(?:public|authenticated|sign)\/[^/]+\/(.+?)(?:\?|$)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return null;
  };

  // Public buckets that don't need signed URLs (contractor portal uses these without auth)
  const PUBLIC_BUCKETS = ['project-drawings'];

  const getAccessibleUrl = async (fileUrl: string | null, filePath: string | null): Promise<string | null> => {
    // Always prefer extracting bucket from file_url since file_path doesn't include bucket info
    if (fileUrl) {
      const bucket = extractBucketFromUrl(fileUrl);
      const path = filePath || extractPathFromUrl(fileUrl);
      
      if (bucket && path) {
        // For public buckets, use getPublicUrl (no auth required)
        if (PUBLIC_BUCKETS.includes(bucket)) {
          const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);
          return data?.publicUrl || null;
        }
        // For private buckets, return the URL as-is (will need auth context)
        return fileUrl;
      }
    }
    
    // Last resort: try file_path with project-drawings bucket (public)
    if (filePath && !fileUrl) {
      const { data } = supabase.storage
        .from('project-drawings')
        .getPublicUrl(filePath);
      return data?.publicUrl || null;
    }
    
    return null;
  };

  const handlePreview = async (fileUrl: string | null, filePath: string | null, title: string, fileName?: string) => {
    const url = await getAccessibleUrl(fileUrl, filePath);
    if (url) {
      setPreviewDrawing({
        url,
        title,
        fileName: fileName || `${title}.pdf`
      });
    }
  };

  const handleDownload = async (fileUrl: string | null, filePath: string | null, fileName: string) => {
    const url = await getAccessibleUrl(fileUrl, filePath);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      link.click();
    }
  };

  const stats = {
    total: drawings.length,
    asBuilt: drawings.filter(d => d.status === 'as_built').length,
    forConstruction: drawings.filter(d => d.status === 'for_construction' || d.status === 'ifc').length,
  };

  if (loadingDrawings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Drawings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.asBuilt}</p>
                <p className="text-sm text-muted-foreground">As Built</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.forConstruction}</p>
                <p className="text-sm text-muted-foreground">For Construction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by drawing number or title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grouped Drawings */}
      <div className="space-y-4">
        {Object.entries(groupedDrawings)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, categoryDrawings]) => {
            const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['G'];
            const isExpanded = expandedCategories.has(category);
            
            return (
              <Card key={category}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                          <div className={`w-3 h-3 rounded-full ${config.className}`} />
                          <CardTitle className="text-lg">{config.label}</CardTitle>
                          <Badge variant="secondary">{categoryDrawings.length}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Drawing No.</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead className="text-center">Rev</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryDrawings.map((drawing) => {
                            const drawingRevisions = getDrawingRevisions(drawing.id);
                            const hasHistory = drawingRevisions.length > 0;
                            const isHistoryExpanded = expandedDrawings.has(drawing.id);
                            const statusConfig = STATUS_CONFIG[drawing.status] || STATUS_CONFIG['draft'];
                            
                            return (
                              <>
                                <TableRow key={drawing.id}>
                                  <TableCell>
                                    {hasHistory && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => toggleDrawingHistory(drawing.id)}
                                      >
                                        {isHistoryExpanded ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </Button>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {drawing.drawing_number}
                                  </TableCell>
                                  <TableCell>{drawing.drawing_title || '-'}</TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline">{drawing.current_revision || '0'}</Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {drawing.revision_date 
                                      ? format(new Date(drawing.revision_date), 'dd MMM yyyy')
                                      : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={statusConfig.variant}>
                                      {statusConfig.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {(drawing.file_url || drawing.file_path) && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handlePreview(
                                              drawing.file_url,
                                              drawing.file_path,
                                            `${drawing.drawing_number} - ${drawing.drawing_title}`,
                                            `${drawing.drawing_number}.pdf`
                                            )}
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    disabled={!canDownload}
                                                    onClick={() => {
                                                      if (canDownload) {
                                                        handleDownload(
                                                          drawing.file_url,
                                                          drawing.file_path,
                                                          `${drawing.drawing_number}_Rev${drawing.current_revision}.pdf`
                                                        );
                                                      } else {
                                                        toast.info("Download access is restricted to authorized contacts");
                                                      }
                                                    }}
                                                  >
                                                    {canDownload ? (
                                                      <Download className="h-4 w-4" />
                                                    ) : (
                                                      <Lock className="h-4 w-4" />
                                                    )}
                                                  </Button>
                                                </span>
                                              </TooltipTrigger>
                                              {!canDownload && (
                                                <TooltipContent>
                                                  <p>Download restricted to authorized contacts</p>
                                                </TooltipContent>
                                              )}
                                            </Tooltip>
                                          </TooltipProvider>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                                
                                {/* Revision History */}
                                {isHistoryExpanded && drawingRevisions.map((rev, idx) => (
                                  <TableRow key={rev.id} className="bg-muted/30">
                                    <TableCell></TableCell>
                                    <TableCell className="pl-8">
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <History className="h-3 w-3" />
                                        <span className="text-xs">Previous</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                      {rev.revision_notes || 'No notes'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="outline" className="opacity-70">
                                        {rev.revision}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                      {rev.revision_date 
                                        ? format(new Date(rev.revision_date), 'dd MMM yyyy')
                                        : '-'}
                                    </TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right">
                                      {(rev.file_url || rev.file_path) && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7"
                                                  disabled={!canDownload}
                                                  onClick={() => {
                                                    if (canDownload) {
                                                      handleDownload(
                                                        rev.file_url,
                                                        rev.file_path,
                                                        `${drawing.drawing_number}_Rev${rev.revision}.pdf`
                                                      );
                                                    } else {
                                                      toast.info("Download access is restricted to authorized contacts");
                                                    }
                                                  }}
                                                >
                                                  {canDownload ? (
                                                    <Download className="h-3 w-3" />
                                                  ) : (
                                                    <Lock className="h-3 w-3" />
                                                  )}
                                                </Button>
                                              </span>
                                            </TooltipTrigger>
                                            {!canDownload && (
                                              <TooltipContent>
                                                <p>Download restricted to authorized contacts</p>
                                              </TooltipContent>
                                            )}
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
      </div>

      {filteredDrawings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No drawings match your search' : 'No drawings available'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <DrawingPreviewDialog
        open={!!previewDrawing}
        onOpenChange={(open) => !open && setPreviewDrawing(null)}
        fileUrl={previewDrawing?.url || null}
        fileName={previewDrawing?.fileName}
        title={previewDrawing?.title}
      />
    </div>
  );
}
