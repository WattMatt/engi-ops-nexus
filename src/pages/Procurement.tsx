import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Plus,
  Calendar,
  Activity,
  List,
  LayoutGrid
} from "lucide-react";
import { 
  ProcurementStatusPipeline,
  ProcurementActivityFeed,
  ProcurementDeliveryCalendar,
  UpcomingDeliveries
} from "@/components/contractor-portal/procurement";
import { ProcurementItemsTable } from "@/components/procurement/ProcurementItemsTable";
import { AddProcurementItemDialog } from "@/components/project-settings/AddProcurementItemDialog";
import { EditProcurementItemDialog } from "@/components/project-settings/EditProcurementItemDialog";
import { useProject } from "@/hooks/useProject";
import { useState } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/common/FeedbackStates";

interface ProcurementItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  category: string | null;
  supplier_name: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  po_number: string | null;
  tracking_number: string | null;
  priority: string | null;
  location_group: string | null;
  source_type: string;
  quoted_amount: number | null;
  actual_amount: number | null;
  quote_valid_until: string | null;
  assigned_to: string | null;
  notes: string | null;
  instruction_date: string | null;
  order_date: string | null;
}

async function fetchProcurementItems(projectId: string): Promise<ProcurementItem[]> {
  const { data, error } = await supabase
    .from('project_procurement_items')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export default function Procurement() {
  const { projectId } = useProject();
  const [activeTab, setActiveTab] = useState('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProcurementItem | null>(null);

  const { data: procurementItems, isLoading, refetch } = useQuery({
    queryKey: ['procurement-items', projectId],
    queryFn: () => fetchProcurementItems(projectId!),
    enabled: !!projectId
  });

  if (!projectId) {
    return (
      <div className="flex-1 p-6">
        <EmptyState
          icon={Package}
          title="No project selected"
          description="Select a project to view procurement items"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Calculate status counts
  const statusCounts = procurementItems?.reduce((acc, item) => {
    const status = item.status || 'not_started';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalItems = procurementItems?.length || 0;
  const orderedCount = (statusCounts['ordered'] || 0) + 
                       (statusCounts['in_transit'] || 0) + 
                       (statusCounts['delivered'] || 0);
  const deliveredCount = statusCounts['delivered'] || 0;
  const orderProgressPercent = totalItems > 0 ? Math.round((orderedCount / totalItems) * 100) : 0;
  const deliveryProgressPercent = totalItems > 0 ? Math.round((deliveredCount / totalItems) * 100) : 0;

  // Filter items
  const filteredItems = procurementItems?.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleStatusFilterClick = (status: string) => {
    setStatusFilter(prev => prev === status ? null : status);
    setActiveTab('items');
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Procurement Tracking
          </h1>
          <p className="text-muted-foreground">
            Manage and track procurement items for this project
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Progress Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Procurement Overview</CardTitle>
          <CardDescription>Track ordering and delivery progress</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bars */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order Progress</span>
                <span className="font-medium">{orderedCount}/{totalItems} ordered</span>
              </div>
              <Progress value={orderProgressPercent} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Progress</span>
                <span className="font-medium">{deliveredCount}/{totalItems} delivered</span>
              </div>
              <Progress value={deliveryProgressPercent} className="h-2" />
            </div>
          </div>

          {/* Status Pipeline */}
          <ProcurementStatusPipeline 
            statusCounts={statusCounts}
            onStatusClick={handleStatusFilterClick}
            activeStatus={statusFilter}
          />
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="items" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">All Items</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="mt-6 space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items, suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {statusFilter && (
              <Button 
                variant="outline" 
                onClick={() => setStatusFilter(null)}
                className="gap-2"
              >
                Clear Filter
                <Badge variant="secondary">{statusFilter}</Badge>
              </Button>
            )}
          </div>

          {/* Items Table */}
          <ProcurementItemsTable
            items={filteredItems}
            onEdit={(item) => setEditingItem(item)}
            onRefresh={refetch}
          />
        </TabsContent>


        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Upcoming Deliveries */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Upcoming Deliveries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UpcomingDeliveries 
                  items={procurementItems || []}
                  daysAhead={14}
                  onItemClick={setSelectedItemId}
                />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Recent Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProcurementActivityFeed 
                  projectId={projectId}
                  limit={10}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery Schedule</CardTitle>
              <CardDescription>View expected delivery dates</CardDescription>
            </CardHeader>
            <CardContent>
              <ProcurementDeliveryCalendar
                items={procurementItems || []}
                currentMonth={calendarMonth}
                onMonthChange={setCalendarMonth}
                onItemClick={setSelectedItemId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Feed</CardTitle>
              <CardDescription>All procurement updates and status changes</CardDescription>
            </CardHeader>
            <CardContent>
              <ProcurementActivityFeed 
                projectId={projectId}
                limit={50}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <AddProcurementItemDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        projectId={projectId}
        onSuccess={() => refetch()}
      />

      {/* Edit Dialog */}
      {editingItem && (
        <EditProcurementItemDialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          item={editingItem}
          onSuccess={() => {
            setEditingItem(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
