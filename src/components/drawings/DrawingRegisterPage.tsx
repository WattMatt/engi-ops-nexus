/**
 * Drawing Register Page
 * Main page for managing project drawings
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Upload, 
  Download, 
  Search,
  LayoutGrid,
  LayoutList,
  Filter
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
import { DrawingFilters } from '@/types/drawings';

export function DrawingRegisterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
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
        <p className="text-muted-foreground">No project selected</p>
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
        
        <div className="flex items-center gap-2">
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
      </div>
      
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
    </div>
  );
}
