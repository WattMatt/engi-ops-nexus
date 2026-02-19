/**
 * Drawing Register Page
 * Main page for managing project drawings
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Upload, 
  Download, 
  Search,
  LayoutGrid,
  LayoutList,
  Route,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  useProjectDrawings, 
  useDrawingCategories, 
  useDrawingStats 
} from '@/hooks/useProjectDrawings';
import { DrawingTable } from './DrawingTable';
import { DrawingGrid } from './DrawingGrid';
import { AddDrawingDialog } from './AddDrawingDialog';
import { BulkImportDialog } from './BulkImportDialog';
import { DrawingStatsCards } from './DrawingStatsCards';
import { SyncToRoadmapDialog } from './SyncToRoadmapDialog';
import { TickSheetList } from './admin';
import { DrawingFilters } from '@/types/drawings';
import { OfflineSyncStatusBar } from '@/components/pwa/OfflineSyncStatusBar';
import { useDrawingOfflineSync } from '@/hooks/useDrawingOfflineSync';

import { DropboxDrawingSync } from './DropboxDrawingSync';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export function DrawingRegisterPage() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string | null>(
    localStorage.getItem("selectedProjectId")
  );
  const [activeMainTab, setActiveMainTab] = useState<'drawings' | 'ticksheets'>('drawings');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isDropboxDialogOpen, setIsDropboxDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  
  // Offline sync hook
  const {
    unsyncedCount,
    pendingUploadsCount,
    isOnline,
    syncNow,
  } = useDrawingOfflineSync({ projectId: projectId || '', enabled: !!projectId });
  
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncNow();
      setLastSyncAt(Date.now());
    } finally {
      setIsSyncing(false);
    }
  }, [syncNow]);

  // Listen for project changes
  useEffect(() => {
    const handleProjectChange = () => {
      setProjectId(localStorage.getItem("selectedProjectId"));
    };
    
    window.addEventListener('projectChanged', handleProjectChange);
    return () => window.removeEventListener('projectChanged', handleProjectChange);
  }, []);
  
  // Build filters
  const filters: DrawingFilters = {
    search: searchQuery || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
  };
  
  const { data: drawings = [], isLoading } = useProjectDrawings(projectId, filters);
  const { data: categories = [] } = useDrawingCategories();
  const { data: stats } = useDrawingStats(projectId);
  
  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a project first</p>
        <Button variant="link" onClick={() => navigate('/projects')}>
          Go to Projects
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Drawing Register
          </h1>
          <p className="text-muted-foreground">
            Manage project drawings, revisions, and portal visibility
          </p>
        </div>
        
        {activeMainTab === 'drawings' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDropboxDialogOpen(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Dropbox Sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSyncDialogOpen(true)}
              disabled={drawings.length === 0}
            >
              <Route className="h-4 w-4 mr-2" />
              Sync to Roadmap
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Drawing
            </Button>
          </div>
        )}
      </div>
      
      {/* Main Tabs */}
      {/* Offline Sync Status */}
      <OfflineSyncStatusBar
        pendingCount={unsyncedCount + pendingUploadsCount}
        isSyncing={isSyncing}
        onSync={handleSync}
        lastSyncAt={lastSyncAt}
      />
      
      {/* Main Tabs */}
      <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as 'drawings' | 'ticksheets')}>
        <TabsList>
          <TabsTrigger value="drawings" className="gap-2">
            <FileText className="h-4 w-4" />
            Drawings
          </TabsTrigger>
          <TabsTrigger value="ticksheets" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Checklists
          </TabsTrigger>
        </TabsList>
        
        {/* Drawings Tab Content */}
        <TabsContent value="drawings" className="space-y-6 mt-6">
          {/* Stats Cards */}
          <DrawingStatsCards stats={stats} categories={categories} />
          
          {/* Search and Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search drawings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('table')}
                  >
                    <LayoutList className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Category Tabs */}
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
                  <TabsTrigger value="all" className="text-xs">
                    All
                    <Badge variant="secondary" className="ml-1">
                      {stats?.total || 0}
                    </Badge>
                  </TabsTrigger>
                  {categories.map(cat => (
                    <TabsTrigger key={cat.code} value={cat.code} className="text-xs">
                      {cat.name}
                      {stats?.byCategory[cat.code] ? (
                        <Badge variant="secondary" className="ml-1">
                          {stats.byCategory[cat.code]}
                        </Badge>
                      ) : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <TabsContent value={selectedCategory} className="mt-0">
                  {viewMode === 'table' ? (
                    <DrawingTable 
                      drawings={drawings} 
                      isLoading={isLoading}
                      projectId={projectId}
                    />
                  ) : (
                    <DrawingGrid 
                      drawings={drawings} 
                      isLoading={isLoading}
                      projectId={projectId}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tick Sheets Tab Content */}
        <TabsContent value="ticksheets" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <TickSheetList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialogs */}
      <AddDrawingDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        projectId={projectId}
        categories={categories}
      />
      
      <BulkImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        projectId={projectId}
      />

      <SyncToRoadmapDialog
        open={isSyncDialogOpen}
        onOpenChange={setIsSyncDialogOpen}
        projectId={projectId}
        drawings={drawings}
      />

      <Dialog open={isDropboxDialogOpen} onOpenChange={setIsDropboxDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DropboxDrawingSync />
        </DialogContent>
      </Dialog>
    </div>
  );
}
