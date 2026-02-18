import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Cloud, RefreshCw, CheckCircle2, AlertCircle, FolderSync, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectSyncResult {
  name: string;
  projectNumber: string;
  drawingsFound: number;
  newImported: number;
  skipped: number;
}

interface SyncResult {
  projectsScanned: ProjectSyncResult[];
  totalNewDrawings: number;
  totalSkipped: number;
  errors: string[];
}

export function DropboxDrawingSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setResult(null);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('sync-drawings');

      if (fnError) {
        throw new Error(fnError.message || 'Sync failed');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResult(data as SyncResult);

      if (data.totalNewDrawings > 0) {
        toast.success(`Imported ${data.totalNewDrawings} new drawing(s)`);
      } else {
        toast.info('No new drawings found to import');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderSync className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Dropbox Drawing Sync</CardTitle>
              <CardDescription>
                Scan Dropbox for project drawing PDFs and import them
              </CardDescription>
            </div>
          </div>
          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isSyncing && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Scanning Dropbox folders and importing new drawings...
            </p>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{result.projectsScanned.length}</p>
                <p className="text-xs text-muted-foreground">Projects Scanned</p>
              </div>
              <div className="rounded-md border bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{result.totalNewDrawings}</p>
                <p className="text-xs text-muted-foreground">New Imported</p>
              </div>
              <div className="rounded-md border bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{result.totalSkipped}</p>
                <p className="text-xs text-muted-foreground">Skipped (Existing)</p>
              </div>
            </div>

            {/* Project details */}
            {result.projectsScanned.length > 0 && (
              <ScrollArea className="max-h-60">
                <div className="space-y-2">
                  {result.projectsScanned.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground">({p.projectNumber})</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {p.newImported > 0 && (
                          <span className="flex items-center gap-1 text-primary">
                            <CheckCircle2 className="h-3 w-3" />
                            {p.newImported} new
                          </span>
                        )}
                        {p.skipped > 0 && (
                          <span className="text-muted-foreground">{p.skipped} skipped</span>
                        )}
                        <span className="text-muted-foreground">{p.drawingsFound} found</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  Errors ({result.errors.length})
                </p>
                <ScrollArea className="max-h-32">
                  <div className="space-y-1">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive/80">{err}</p>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {!isSyncing && !result && !error && (
          <p className="text-sm text-muted-foreground">
            Click "Sync Now" to scan your Dropbox <code className="text-xs bg-muted px-1 rounded">/OFFICE/PROJECTS/</code> folder
            for new electrical drawing PDFs and import them into your project registers.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
