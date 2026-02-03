import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  Truck, 
  ShoppingCart, 
  AlertCircle,
  Search,
  Calendar,
  Activity,
  List,
  LayoutGrid,
  FileCheck
} from "lucide-react";
import { 
  ProcurementStatusPipeline,
  ProcurementItemDetail,
  ProcurementActivityFeed,
  ProcurementDeliveryCalendar,
  UpcomingDeliveries,
  ConfirmDeliveryDialog
} from "./procurement";
import { cn } from "@/lib/utils";

interface ContractorProcurementStatusProps {
  projectId: string;
  contractorName?: string;
  contractorEmail?: string;
  companyName?: string | null;
}

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
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  not_started: { label: 'Not Started', icon: <Clock className="h-3 w-3" />, color: 'bg-muted' },
  pending_quote: { label: 'Pending Quote', icon: <FileCheck className="h-3 w-3" />, color: 'bg-amber-100 dark:bg-amber-900/30' },
  quote_received: { label: 'Quote Received', icon: <FileCheck className="h-3 w-3" />, color: 'bg-blue-100 dark:bg-blue-900/30' },
  pending_approval: { label: 'Pending Approval', icon: <Clock className="h-3 w-3" />, color: 'bg-orange-100 dark:bg-orange-900/30' },
  approved: { label: 'Approved', icon: <CheckCircle2 className="h-3 w-3" />, color: 'bg-emerald-100 dark:bg-emerald-900/30' },
  ordered: { label: 'Ordered', icon: <ShoppingCart className="h-3 w-3" />, color: 'bg-purple-100 dark:bg-purple-900/30' },
  in_transit: { label: 'In Transit', icon: <Truck className="h-3 w-3" />, color: 'bg-cyan-100 dark:bg-cyan-900/30' },
  delivered: { label: 'Delivered', icon: <Package className="h-3 w-3" />, color: 'bg-green-100 dark:bg-green-900/30' },
  cancelled: { label: 'Cancelled', icon: <AlertCircle className="h-3 w-3" />, color: 'bg-destructive/10' },
};

const priorityColors: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  normal: 'border-l-transparent',
  low: 'border-l-slate-300',
};

async function fetchProcurementItems(projectId: string): Promise<ProcurementItem[]> {
  const { data, error } = await supabase
    .from('project_procurement_items')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export function ContractorProcurementStatus({ 
  projectId,
  contractorName = 'Contractor',
  contractorEmail = '',
  companyName = null
}: ContractorProcurementStatusProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [confirmDeliveryItem, setConfirmDeliveryItem] = useState<ProcurementItem | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const { data: procurementItems, isLoading } = useQuery({
    queryKey: ['contractor-procurement', projectId],
    queryFn: () => fetchProcurementItems(projectId)
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
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

  // Group by category
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ProcurementItem[]>);

  const handleStatusFilterClick = (status: string) => {
    setStatusFilter(prev => prev === status ? null : status);
    setActiveTab('items');
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Procurement Overview
          </CardTitle>
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
          <TabsTrigger value="overview" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="items" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">All Items</span>
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

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Upcoming Deliveries */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" />
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
                  <Activity className="h-4 w-4" />
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
                <Badge variant="secondary">{statusConfig[statusFilter]?.label}</Badge>
              </Button>
            )}
          </div>

          {/* Items List by Category */}
          <Card>
            <CardContent className="p-0 divide-y">
              {Object.entries(itemsByCategory).length > 0 ? (
                Object.entries(itemsByCategory).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-4 py-2 bg-muted/50">
                      <h3 className="text-sm font-medium">{category} ({items.length})</h3>
                    </div>
                    <div className="divide-y">
                      {items.map((item) => {
                        const status = item.status || 'not_started';
                        const config = statusConfig[status] || statusConfig.not_started;
                        const priorityBorder = priorityColors[item.priority || 'normal'];
                        const canConfirm = status === 'delivered';
                        
                        return (
                          <div 
                            key={item.id} 
                            className={cn(
                              "p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors cursor-pointer border-l-4",
                              priorityBorder
                            )}
                            onClick={() => setSelectedItemId(item.id)}
                          >
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{item.name}</p>
                                {item.priority === 'critical' && (
                                  <Badge variant="destructive" className="text-xs">Critical</Badge>
                                )}
                                {item.priority === 'high' && (
                                  <Badge className="bg-orange-500 text-xs">High</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                {item.supplier_name && (
                                  <span>{item.supplier_name}</span>
                                )}
                                {item.expected_delivery && (
                                  <span>Expected: {new Date(item.expected_delivery).toLocaleDateString()}</span>
                                )}
                                {item.po_number && (
                                  <span>PO: {item.po_number}</span>
                                )}
                                {item.tracking_number && (
                                  <span className="flex items-center gap-1">
                                    <Truck className="h-3 w-3" />
                                    {item.tracking_number}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {canConfirm && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeliveryItem(item);
                                  }}
                                >
                                  Confirm Receipt
                                </Button>
                              )}
                              <Badge 
                                variant="secondary" 
                                className={cn("flex items-center gap-1", config.color)}
                              >
                                {config.icon}
                                <span>{config.label}</span>
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No items found</p>
                  {(searchQuery || statusFilter) && (
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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

      {/* Item Detail Dialog */}
      <ProcurementItemDetail
        open={!!selectedItemId}
        onOpenChange={(open) => !open && setSelectedItemId(null)}
        itemId={selectedItemId}
        onConfirmDelivery={() => {
          const item = procurementItems?.find(i => i.id === selectedItemId);
          if (item) {
            setConfirmDeliveryItem(item);
          }
        }}
      />

      {/* Confirm Delivery Dialog */}
      {confirmDeliveryItem && (
        <ConfirmDeliveryDialog
          open={!!confirmDeliveryItem}
          onOpenChange={(open) => !open && setConfirmDeliveryItem(null)}
          itemId={confirmDeliveryItem.id}
          itemName={confirmDeliveryItem.name}
          contractorName={contractorName}
          contractorEmail={contractorEmail}
          companyName={companyName}
        />
      )}
    </div>
  );
}
