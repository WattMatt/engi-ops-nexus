/**
 * Load Profile Sub-Tab - Main container for meter-shop linking and charts
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Link2, 
  BarChart3, 
  RefreshCw, 
  Cloud, 
  CloudOff,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight
} from 'lucide-react';
import { MeterShopLinking } from './MeterShopLinking';
import { LoadProfileCharts } from './LoadProfileCharts';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { useLoadProfile } from './useLoadProfile';

interface LoadProfileSubTabProps {
  projectId: string;
  documentId: string;
}

export function LoadProfileSubTab({ projectId, documentId }: LoadProfileSubTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('linking');
  const {
    profile,
    linkages,
    categories,
    readings,
    totals,
    isLoading,
    syncingStatus,
    addLinkage,
    updateLinkage,
    deleteLinkage,
    syncWithExternal,
    refetch,
  } = useLoadProfile(projectId, documentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with sync controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Load Profile Manager
              </CardTitle>
              <CardDescription>
                Link meters to shops and visualize load distribution from tenant schedule
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <SyncStatusIndicator 
                status={profile?.sync_status || 'pending'} 
                lastSyncAt={profile?.last_sync_at}
              />
              
              {/* Sync Buttons */}
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => syncWithExternal('pull', 'local')}
                  disabled={syncingStatus === 'syncing'}
                  title="Sync from local tenant schedule"
                  className="flex items-center gap-1"
                >
                  {syncingStatus === 'syncing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowDownToLine className="h-4 w-4" />
                      <span className="hidden md:inline text-xs">Tenant Schedule</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => syncWithExternal('pull', 'external')}
                  disabled={syncingStatus === 'syncing'}
                  title="Sync from external wm-solar app"
                  className="flex items-center gap-1"
                >
                  <Cloud className="h-4 w-4" />
                  <span className="hidden md:inline text-xs">wm-solar</span>
                </Button>
              </div>

              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {totals.linkageCount}
              </p>
              <p className="text-xs text-muted-foreground">Linked Meters</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-accent-foreground">
                {(totals.totalConnectedLoad / 1000).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Total Load (MVA)</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {(totals.totalMaxDemand / 1000).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Max Demand (MVA)</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">
                {categories.length}
              </p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-tabs for Linking and Charts */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="linking" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Meter-Shop Linking
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Load Charts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="linking" className="mt-6">
          <MeterShopLinking
            profileId={profile?.id || ''}
            projectId={projectId}
            linkages={linkages}
            onAddLinkage={addLinkage}
            onUpdateLinkage={updateLinkage}
            onDeleteLinkage={deleteLinkage}
          />
        </TabsContent>

        <TabsContent value="charts" className="mt-6">
          <LoadProfileCharts
            categories={categories}
            readings={readings}
            linkages={linkages}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
