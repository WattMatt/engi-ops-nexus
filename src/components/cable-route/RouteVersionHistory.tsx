import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RouteVersion } from './types';
import { History, RotateCcw, Trash2, GitCompare } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface RouteVersionHistoryProps {
  versions: RouteVersion[];
  currentVersionId: string;
  onRevert: (version: RouteVersion) => void;
  onDelete: (versionId: string) => void;
}

export function RouteVersionHistory({
  versions,
  currentVersionId,
  onRevert,
  onDelete,
}: RouteVersionHistoryProps) {
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);

  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const latestVersion = sortedVersions[0];

  const handleCompare = () => {
    if (sortedVersions.length >= 2) {
      setCompareIds([sortedVersions[0].id, sortedVersions[1].id]);
    }
  };

  const getVersionDiff = (v1: RouteVersion, v2: RouteVersion) => {
    return {
      length: v1.metrics.totalLength - v2.metrics.totalLength,
      cost: v1.metrics.totalCost - v2.metrics.totalCost,
      supports: v1.metrics.supportCount - v2.metrics.supportCount,
      bends: v1.metrics.bendCount - v2.metrics.bendCount,
      points: v1.points.length - v2.points.length,
    };
  };

  const formatDiff = (value: number, unit: string) => {
    const sign = value > 0 ? '+' : '';
    const color = value > 0 ? 'text-red-500' : value < 0 ? 'text-green-500' : 'text-muted-foreground';
    return (
      <span className={color}>
        {sign}
        {value.toFixed(1)}
        {unit}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          {sortedVersions.length >= 2 && (
            <Button variant="outline" size="sm" onClick={handleCompare}>
              <GitCompare className="h-4 w-4 mr-2" />
              Compare
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {compareIds ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Version Comparison</h3>
              <Button variant="ghost" size="sm" onClick={() => setCompareIds(null)}>
                Close
              </Button>
            </div>
            {(() => {
              const v1 = versions.find((v) => v.id === compareIds[0]);
              const v2 = versions.find((v) => v.id === compareIds[1]);
              if (!v1 || !v2) return null;

              const diff = getVersionDiff(v1, v2);

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{v1.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(v1.timestamp), 'PPp')}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{v2.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(v2.timestamp), 'PPp')}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm">Length:</span>
                      {formatDiff(diff.length, 'm')}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cost:</span>
                      {formatDiff(diff.cost, '£')}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Supports:</span>
                      {formatDiff(diff.supports, '')}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Bends:</span>
                      {formatDiff(diff.bends, '')}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Points:</span>
                      {formatDiff(diff.points, '')}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {sortedVersions.map((version) => (
                <div
                  key={version.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{version.name}</span>
                        {version.id === currentVersionId && <Badge>Current</Badge>}
                        {version.id === latestVersion.id && <Badge variant="outline">Latest</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(version.timestamp), 'PPp')}
                      </div>
                      {version.description && (
                        <div className="text-sm text-muted-foreground">{version.description}</div>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {version.id !== currentVersionId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRevert(version)}
                          title="Revert to this version"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(version.id)}
                        title="Delete version"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Length:</span>
                      <span className="ml-2">{version.metrics.totalLength.toFixed(1)}m</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="ml-2">£{version.metrics.totalCost.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supports:</span>
                      <span className="ml-2">{version.metrics.supportCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bends:</span>
                      <span className="ml-2">{version.metrics.bendCount}</span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {version.changeType}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
