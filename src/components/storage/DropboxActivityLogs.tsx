import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDropboxActivityLogs, DropboxActivityLog, ActivityLogFilters } from '@/hooks/useDropboxActivityLogs';
import { formatBytes } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  Upload, Download, Trash2, FolderPlus, Search, 
  RefreshCw, ChevronLeft, ChevronRight, Activity,
  CheckCircle, XCircle, Filter
} from 'lucide-react';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  upload: <Upload className="h-4 w-4 text-primary" />,
  download: <Download className="h-4 w-4 text-accent-foreground" />,
  delete: <Trash2 className="h-4 w-4 text-destructive" />,
  create_folder: <FolderPlus className="h-4 w-4 text-secondary-foreground" />,
  list_folder: <Activity className="h-4 w-4 text-muted-foreground" />
};

const ACTION_LABELS: Record<string, string> = {
  upload: 'Upload',
  download: 'Download',
  delete: 'Delete',
  create_folder: 'Create Folder',
  list_folder: 'List Folder'
};

interface DropboxActivityLogsProps {
  compact?: boolean;
}

export function DropboxActivityLogs({ compact = false }: DropboxActivityLogsProps) {
  const { logs, isLoading, totalCount, fetchLogs, getActivityStats } = useDropboxActivityLogs();
  const [filters, setFilters] = useState<ActivityLogFilters>({});
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const pageSize = compact ? 10 : 25;

  useEffect(() => {
    fetchLogs(filters, page, pageSize);
  }, [fetchLogs, filters, page, pageSize]);

  useEffect(() => {
    if (!compact) {
      getActivityStats(30).then(setStats);
    }
  }, [getActivityStats, compact]);

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, searchTerm: value }));
    setPage(1);
  };

  const handleFilterChange = (key: keyof ActivityLogFilters, value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value === 'all' ? undefined : value 
    }));
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const renderLogRow = (log: DropboxActivityLog) => (
    <TableRow key={log.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          {ACTION_ICONS[log.action] || <Activity className="h-4 w-4" />}
          <span className="font-medium">{ACTION_LABELS[log.action] || log.action}</span>
        </div>
      </TableCell>
      <TableCell className="max-w-[200px] truncate" title={log.file_path}>
        {log.file_name || log.file_path}
      </TableCell>
      {!compact && (
        <>
          <TableCell>
            {log.file_size ? formatBytes(log.file_size) : '-'}
          </TableCell>
          <TableCell>
            {log.file_type || '-'}
          </TableCell>
        </>
      )}
      <TableCell>
        <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="gap-1">
          {log.status === 'success' ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {log.status}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
      </TableCell>
    </TableRow>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Dropbox Activity Logs
            </CardTitle>
            <CardDescription>
              Track file uploads, downloads, and deletions for audit purposes
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchLogs(filters, page, pageSize)}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        {stats && !compact && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{stats.uploads}</div>
              <div className="text-sm text-muted-foreground">Uploads</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-accent-foreground">{stats.downloads}</div>
              <div className="text-sm text-muted-foreground">Downloads</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-destructive">{stats.deletes}</div>
              <div className="text-sm text-muted-foreground">Deletions</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-secondary-foreground">{stats.folders_created}</div>
              <div className="text-sm text-muted-foreground">Folders Created</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              className="pl-9"
              value={filters.searchTerm || ''}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          
          <Select 
            value={filters.action || 'all'} 
            onValueChange={(v) => handleFilterChange('action', v)}
          >
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="upload">Uploads</SelectItem>
              <SelectItem value="download">Downloads</SelectItem>
              <SelectItem value="delete">Deletions</SelectItem>
              <SelectItem value="create_folder">Folders</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.status || 'all'} 
            onValueChange={(v) => handleFilterChange('status', v)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <ScrollArea className={compact ? 'h-[300px]' : 'h-[400px]'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>File</TableHead>
                {!compact && (
                  <>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                  </>
                )}
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={compact ? 4 : 6} className="text-center text-muted-foreground py-8">
                    {isLoading ? 'Loading...' : 'No activity logs found'}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(renderLogRow)
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
