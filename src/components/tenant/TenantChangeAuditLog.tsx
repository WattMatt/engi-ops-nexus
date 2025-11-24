import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, UserPlus, Edit, Trash2, ChevronDown, ChevronRight, Filter, Download, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface TenantChangeAuditLogProps {
  projectId: string;
}

export function TenantChangeAuditLog({ projectId }: TenantChangeAuditLogProps) {
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ["tenant-audit-logs", projectId, changeTypeFilter, searchTerm, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("tenant_change_audit_log")
        .select(`
          *,
          version:tenant_schedule_versions(version_number, change_summary)
        `)
        .eq("project_id", projectId);

      // Apply filters
      if (changeTypeFilter !== "all") {
        query = query.eq("change_type", changeTypeFilter);
      }

      if (dateFrom) {
        query = query.gte("changed_at", new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte("changed_at", endDate.toISOString());
      }

      const { data, error } = await query
        .order("changed_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Apply search filter client-side (for fields in old_values and new_values)
      let filteredData = data || [];
      if (searchTerm) {
        filteredData = filteredData.filter((log: any) => {
          const searchLower = searchTerm.toLowerCase();
          const summaryMatch = log.version?.change_summary?.toLowerCase().includes(searchLower);
          const oldValuesMatch = JSON.stringify(log.old_values || {}).toLowerCase().includes(searchLower);
          const newValuesMatch = JSON.stringify(log.new_values || {}).toLowerCase().includes(searchLower);
          return summaryMatch || oldValuesMatch || newValuesMatch;
        });
      }

      return filteredData;
    },
    enabled: !!projectId,
  });

  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case "created":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "updated":
        return <Edit className="h-4 w-4 text-blue-500" />;
      case "deleted":
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChangeTypeBadge = (changeType: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive", label: string }> = {
      created: { variant: "default", label: "Created" },
      updated: { variant: "secondary", label: "Updated" },
      deleted: { variant: "destructive", label: "Deleted" },
    };
    const { variant, label } = config[changeType] || { variant: "default" as const, label: changeType };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const renderFieldComparison = (log: any) => {
    if (log.change_type === "created") {
      return (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
          <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-2">New Values:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(log.new_values || {}).map(([key, value]: [string, any]) => (
              key !== 'id' && key !== 'created_at' && key !== 'updated_at' && (
                <div key={key} className="flex flex-col">
                  <span className="font-medium text-green-800 dark:text-green-200">{formatFieldName(key)}:</span>
                  <span className="text-green-700 dark:text-green-300">{formatFieldValue(key, value)}</span>
                </div>
              )
            ))}
          </div>
        </div>
      );
    }

    if (log.change_type === "deleted") {
      return (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-md">
          <p className="text-xs font-medium text-red-900 dark:text-red-100 mb-2">Deleted Values:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(log.old_values || {}).map(([key, value]: [string, any]) => (
              key !== 'id' && key !== 'created_at' && key !== 'updated_at' && (
                <div key={key} className="flex flex-col">
                  <span className="font-medium text-red-800 dark:text-red-200">{formatFieldName(key)}:</span>
                  <span className="text-red-700 dark:text-red-300 line-through">{formatFieldValue(key, value)}</span>
                </div>
              )
            ))}
          </div>
        </div>
      );
    }

    if (log.change_type === "updated" && log.changed_fields?.changed_fields) {
      const changedFields = log.changed_fields.changed_fields;
      return (
        <div className="mt-3 space-y-2">
          {changedFields.map((field: string) => {
            if (field === 'updated_at' || field === 'last_modified_at' || field === 'last_modified_by') {
              return null;
            }
            
            const oldValue = log.old_values?.[field];
            const newValue = log.new_values?.[field];
            
            return (
              <div key={field} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                  {formatFieldName(field)}
                </p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-medium text-red-700 dark:text-red-400">Before:</span>
                    <p className="mt-1 text-red-600 dark:text-red-500 line-through">
                      {formatFieldValue(field, oldValue)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-green-700 dark:text-green-400">After:</span>
                    <p className="mt-1 text-green-600 dark:text-green-500 font-medium">
                      {formatFieldValue(field, newValue)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  const formatFieldName = (field: string): string => {
    return field
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatFieldValue = (field: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (field.includes('date') && value) {
      try {
        return format(new Date(value), 'MMM d, yyyy');
      } catch {
        return String(value);
      }
    }
    if (field.includes('cost') && typeof value === 'number') {
      return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
    }
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  const exportToCSV = () => {
    if (auditLogs.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Date", "Change Type", "Version", "Summary", "Changed Fields"];
    const rows = auditLogs.map((log: any) => [
      format(new Date(log.changed_at), "yyyy-MM-dd HH:mm:ss"),
      log.change_type,
      log.version?.version_number || "N/A",
      log.version?.change_summary || "N/A",
      log.changed_fields?.changed_fields?.join(", ") || "N/A"
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenant-audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Audit log exported successfully");
  };

  const clearFilters = () => {
    setChangeTypeFilter("all");
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = changeTypeFilter !== "all" || searchTerm || dateFrom || dateTo;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tenant Change Audit Trail</CardTitle>
            <CardDescription>
              Complete modification history with before/after values for compliance tracking
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={auditLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4" />
            <Label className="font-semibold">Filters</Label>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-7 text-xs">
                Clear All
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="change-type" className="text-xs">Change Type</Label>
              <Select value={changeTypeFilter} onValueChange={setChangeTypeFilter}>
                <SelectTrigger id="change-type" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Changes</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search" className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Shop name, number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="date-from" className="text-xs">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="date-to" className="text-xs">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {auditLogs.length} {auditLogs.length === 1 ? 'change' : 'changes'}
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>

        {/* Audit Log List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading audit trail...</p>
            </div>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">
              {hasActiveFilters ? "No changes match your filters" : "No changes recorded yet"}
            </p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters to see all changes
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {auditLogs.map((log: any) => {
                const isExpanded = expandedLogs.has(log.id);
                const hasDetails = log.old_values || log.new_values || log.changed_fields?.changed_fields;
                
                return (
                  <Collapsible
                    key={log.id}
                    open={isExpanded}
                    onOpenChange={() => hasDetails && toggleExpand(log.id)}
                  >
                    <div className="border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                      <CollapsibleTrigger asChild>
                        <div className={`flex items-start gap-3 p-4 ${hasDetails ? 'cursor-pointer hover:bg-accent/30' : ''}`}>
                          <div className="mt-1">{getChangeIcon(log.change_type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {getChangeTypeBadge(log.change_type)}
                              {log.version && (
                                <Badge variant="outline">
                                  v{log.version.version_number}
                                </Badge>
                              )}
                              {log.changed_fields?.changed_fields && (
                                <Badge variant="outline" className="text-xs">
                                  {log.changed_fields.changed_fields.length} {log.changed_fields.changed_fields.length === 1 ? 'field' : 'fields'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium">
                              {log.version?.change_summary || "Tenant data modified"}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {format(new Date(log.changed_at), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                          </div>
                          {hasDetails && (
                            <div className="mt-1">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      
                      {hasDetails && (
                        <CollapsibleContent>
                          <div className="px-4 pb-4">
                            <Separator className="mb-3" />
                            {renderFieldComparison(log)}
                          </div>
                        </CollapsibleContent>
                      )}
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}