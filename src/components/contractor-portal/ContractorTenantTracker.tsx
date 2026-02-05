import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  FileText, 
  LayoutGrid, 
  Package, 
  Lightbulb,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
  AlertCircle
} from "lucide-react";
import { useState, useMemo } from "react";
import { 
  getDeadlineStatus, 
  getDaysUntilDeadline, 
  formatDeadlineText, 
  calculateOrderDeadlines,
  type DeadlineStatus 
} from "@/utils/dateCalculations";
import { DeadlineExportButton } from "./DeadlineExportButton";

interface ContractorTenantTrackerProps {
  projectId: string;
}

interface Tenant {
  id: string;
  shop_number: string;
  shop_name: string | null;
  shop_category: string | null;
  area: number | null;
  db_size_allowance: string | null;
  sow_received: boolean | null;
  layout_received: boolean | null;
  db_ordered: boolean | null;
  db_order_date: string | null;
  lighting_ordered: boolean | null;
  lighting_order_date: string | null;
  status: string | null;
  opening_date: string | null;
  beneficial_occupation_days: number | null;
   db_last_order_date: string | null;
   db_delivery_date: string | null;
   lighting_last_order_date: string | null;
   lighting_delivery_date: string | null;
}

export function ContractorTenantTracker({ projectId }: ContractorTenantTrackerProps) {
  const [searchQuery, setSearchQuery] = useState("");

   const { data: project } = useQuery({
     queryKey: ['contractor-project-name', projectId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('projects')
         .select('name')
         .eq('id', projectId)
         .single();
       if (error) throw error;
       return data;
     }
   });
 
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['contractor-tenant-tracker', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
         .select('id, shop_number, shop_name, shop_category, area, db_size_allowance, sow_received, layout_received, db_ordered, db_order_date, lighting_ordered, lighting_order_date, opening_date, beneficial_occupation_days, db_last_order_date, db_delivery_date, lighting_last_order_date, lighting_delivery_date')
        .eq('project_id', projectId);
      
      if (error) throw error;
      
      // Sort numerically by shop number
      return (data || []).sort((a, b) => {
        const matchA = a.shop_number.match(/\d+/);
        const matchB = b.shop_number.match(/\d+/);
        const numA = matchA ? parseInt(matchA[0]) : 0;
        const numB = matchB ? parseInt(matchB[0]) : 0;
        if (numA !== numB) return numA - numB;
        return a.shop_number.localeCompare(b.shop_number, undefined, { numeric: true });
      }) as Tenant[];
    }
  });

  // Filter tenants based on search
  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    if (!searchQuery.trim()) return tenants;
    
    const query = searchQuery.toLowerCase();
    return tenants.filter(t => 
      t.shop_number.toLowerCase().includes(query) ||
      t.shop_name?.toLowerCase().includes(query) ||
      t.shop_category?.toLowerCase().includes(query)
    );
  }, [tenants, searchQuery]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!tenants || tenants.length === 0) {
      return { total: 0, sowReceived: 0, layoutReceived: 0, dbOrdered: 0, lightingOrdered: 0 };
    }
    
    return {
      total: tenants.length,
      sowReceived: tenants.filter(t => t.sow_received).length,
      layoutReceived: tenants.filter(t => t.layout_received).length,
      dbOrdered: tenants.filter(t => t.db_ordered).length,
      lightingOrdered: tenants.filter(t => t.lighting_ordered).length,
    };
  }, [tenants]);

  const progressItems = [
    { 
      label: 'SOW Documents', 
      icon: FileText, 
      count: metrics.sowReceived, 
      total: metrics.total,
      colorClass: 'text-primary bg-primary/10'
    },
    { 
      label: 'Layout Plans', 
      icon: LayoutGrid, 
      count: metrics.layoutReceived, 
      total: metrics.total,
      colorClass: 'text-blue-500 bg-blue-500/10'
    },
    { 
      label: 'DB Orders', 
      icon: Package, 
      count: metrics.dbOrdered, 
      total: metrics.total,
      colorClass: 'text-emerald-500 bg-emerald-500/10'
    },
    { 
      label: 'Lighting Orders', 
      icon: Lightbulb, 
      count: metrics.lightingOrdered, 
      total: metrics.total,
      colorClass: 'text-amber-500 bg-amber-500/10'
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tenant Overview
          </CardTitle>
          <CardDescription>
            Current status of tenant documentation and orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {progressItems.map((item) => {
              const Icon = item.icon;
              const percent = item.total > 0 ? (item.count / item.total) * 100 : 0;
              return (
                <div key={item.label} className="space-y-3 p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-md ${item.colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    <Badge variant={percent === 100 ? "default" : "secondary"}>
                      {item.count}/{item.total}
                    </Badge>
                  </div>
                  <Progress value={percent} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {percent.toFixed(0)}% complete
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tenant List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Tenant Status</CardTitle>
              <CardDescription>{metrics.total} tenants in project</CardDescription>
            </div>
             <div className="flex items-center gap-2">
               <DeadlineExportButton 
                 tenants={filteredTenants} 
                 projectName={project?.name || "Project"} 
               />
               <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
               </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTenants.length > 0 ? (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead>Tenant Name</TableHead>
                    <TableHead>BO Date</TableHead>
                     <TableHead>DB Deadlines</TableHead>
                     <TableHead>Lighting Deadlines</TableHead>
                    <TableHead>Connection</TableHead>
                    <TableHead className="text-center">SOW</TableHead>
                    <TableHead className="text-center">Layout</TableHead>
                    <TableHead className="text-center">DB</TableHead>
                    <TableHead className="text-center">Lighting</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => {
                    // Calculate BO date
                    const boDate = tenant.opening_date 
                      ? addDays(new Date(tenant.opening_date), -(tenant.beneficial_occupation_days || 90))
                      : null;
                    const daysUntilBO = boDate ? differenceInDays(boDate, new Date()) : null;
                    
                    // Calculate deadlines - use stored values or calculate from BO date
                    const calculatedDeadlines = boDate 
                      ? calculateOrderDeadlines(boDate)
                      : null;
                    
                    const dbLastOrder = tenant.db_last_order_date 
                      ? tenant.db_last_order_date 
                      : calculatedDeadlines?.dbLastOrderDate 
                        ? format(calculatedDeadlines.dbLastOrderDate, 'yyyy-MM-dd')
                        : null;
                    
                    const dbDelivery = tenant.db_delivery_date 
                      ? tenant.db_delivery_date 
                      : calculatedDeadlines?.dbDeliveryDate 
                        ? format(calculatedDeadlines.dbDeliveryDate, 'yyyy-MM-dd')
                        : null;
                    
                    const lightingLastOrder = tenant.lighting_last_order_date 
                      ? tenant.lighting_last_order_date 
                      : calculatedDeadlines?.lightingLastOrderDate 
                        ? format(calculatedDeadlines.lightingLastOrderDate, 'yyyy-MM-dd')
                        : null;
                    
                    const lightingDelivery = tenant.lighting_delivery_date 
                      ? tenant.lighting_delivery_date 
                      : calculatedDeadlines?.lightingDeliveryDate 
                        ? format(calculatedDeadlines.lightingDeliveryDate, 'yyyy-MM-dd')
                        : null;
                    
                    return (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.shop_number}</TableCell>
                      <TableCell>{tenant.shop_name || '—'}</TableCell>
                      <TableCell>
                        {boDate ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {format(boDate, 'dd MMM yyyy')}
                            </span>
                            {daysUntilBO !== null && (
                              <span className={`text-xs ${
                                daysUntilBO < 0 
                                  ? 'text-destructive' 
                                  : daysUntilBO <= 14 
                                    ? 'text-amber-600' 
                                    : 'text-muted-foreground'
                              }`}>
                                {daysUntilBO < 0 
                                  ? `${Math.abs(daysUntilBO)}d overdue` 
                                  : `${daysUntilBO}d remaining`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                       <TableCell>
                         <DeadlineDateCell 
                           lastOrderDate={dbLastOrder} 
                           deliveryDate={dbDelivery}
                           label="DB"
                         />
                       </TableCell>
                       <TableCell>
                         <DeadlineDateCell 
                           lastOrderDate={lightingLastOrder} 
                           deliveryDate={lightingDelivery}
                           label="Lighting"
                         />
                       </TableCell>
                      <TableCell>
                        {tenant.db_size_allowance ? (
                          <Badge variant="secondary" className="text-xs font-mono">
                            {tenant.db_size_allowance}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusIcon checked={tenant.sow_received} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusIcon checked={tenant.layout_received} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusWithDate checked={tenant.db_ordered} date={tenant.db_order_date} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusWithDate checked={tenant.lighting_ordered} date={tenant.lighting_order_date} />
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">
                {searchQuery ? 'No tenants match your search' : 'No tenants found'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ checked }: { checked: boolean | null }) {
  if (checked) {
    return <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />;
  }
  return <XCircle className="h-5 w-5 text-muted-foreground/40 mx-auto" />;
}

function StatusWithDate({ checked, date }: { checked: boolean | null; date: string | null }) {
  if (checked) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <Badge variant="default" className="bg-emerald-500 text-white text-xs">
          Ordered
        </Badge>
        {date && (
          <span className="text-xs text-muted-foreground">
            {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground text-xs">
      Pending
    </Badge>
  );
}
 
 function DeadlineDateCell({ 
   lastOrderDate, 
   deliveryDate,
   label
 }: { 
   lastOrderDate: string | null; 
   deliveryDate: string | null;
   label: string;
 }) {
   if (!lastOrderDate && !deliveryDate) {
     return <span className="text-muted-foreground text-sm">—</span>;
   }
 
   const orderDate = lastOrderDate ? parseISO(lastOrderDate) : null;
   const delDate = deliveryDate ? parseISO(deliveryDate) : null;
   
   const orderStatus = getDeadlineStatus(orderDate);
   const orderDays = getDaysUntilDeadline(orderDate);
   
   const deliveryStatus = getDeadlineStatus(delDate);
   const deliveryDays = getDaysUntilDeadline(delDate);
 
   return (
     <div className="flex flex-col gap-1.5 min-w-[130px]">
       {orderDate && (
         <DeadlineLine 
           label="Order" 
           date={orderDate} 
           status={orderStatus} 
           daysText={formatDeadlineText(orderDays)}
         />
       )}
       {delDate && (
         <DeadlineLine 
           label="Delivery" 
           date={delDate} 
           status={deliveryStatus} 
           daysText={formatDeadlineText(deliveryDays)}
         />
       )}
     </div>
   );
 }
 
 function DeadlineLine({ 
   label, 
   date, 
   status, 
   daysText 
 }: { 
   label: string; 
   date: Date; 
   status: DeadlineStatus; 
   daysText: string;
 }) {
   const statusStyles: Record<DeadlineStatus, { dot: string; text: string; bg: string }> = {
     overdue: { 
       dot: 'bg-destructive', 
       text: 'text-destructive font-medium',
       bg: 'bg-destructive/10'
     },
     approaching: { 
       dot: 'bg-amber-500', 
       text: 'text-amber-600 dark:text-amber-400',
       bg: 'bg-amber-500/10'
     },
     normal: { 
       dot: 'bg-muted-foreground/40', 
       text: 'text-muted-foreground',
       bg: 'bg-muted/50'
     },
   };
 
   const style = statusStyles[status];
 
   return (
     <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${style.bg}`}>
       <span className={`h-2 w-2 rounded-full ${style.dot}`} />
       <div className="flex flex-col">
         <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
         <div className="flex items-center gap-2">
           <span className={`text-xs font-medium ${style.text}`}>
             {format(date, 'dd MMM yy')}
           </span>
           {daysText && (
             <span className={`text-[10px] ${style.text}`}>
               {daysText}
             </span>
           )}
         </div>
       </div>
     </div>
   );
 }
