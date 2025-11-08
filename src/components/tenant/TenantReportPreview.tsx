import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  area: number | null;
  db_size_allowance: string | null;
  db_size_scope_of_work: string | null;
  shop_category: string;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  db_cost: number | null;
  lighting_ordered: boolean;
  lighting_cost: number | null;
  cost_reported: boolean;
}

interface TenantReportPreviewProps {
  projectId: string;
  projectName: string;
}

export const TenantReportPreview = ({ projectId, projectName }: TenantReportPreviewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "complete" | "in-progress">("all");
  const [sortBy, setSortBy] = useState<"shop-number" | "name" | "completion">("shop-number");
  
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants-preview", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId)
        .order("shop_number");

      if (error) throw error;
      return data as Tenant[];
    },
  });

  const { data: companyDetails } = useQuery({
    queryKey: ["company-details-preview"],
    queryFn: async () => {
      const { data: companySettings } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", currentUser?.id)
        .maybeSingle();

      const { data: employeeData } = await supabase
        .from("employees")
        .select("phone")
        .eq("user_id", currentUser?.id)
        .maybeSingle();

      return {
        companyName: companySettings?.company_name || "WATSON MATTHEUS CONSULTING ELECTRICAL ENGINEERS (PTY) LTD",
        logoUrl: companySettings?.company_logo_url,
        contactName: profileData?.full_name || currentUser?.email?.split("@")[0] || "Contact Person",
        contactPhone: employeeData?.phone || "(012) 665 3487",
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!tenants || tenants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tenants found
      </div>
    );
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      standard: "Standard",
      fast_food: "Fast Food",
      restaurant: "Restaurant",
      national: "National"
    };
    return labels[category as keyof typeof labels] || category;
  };

  const totalTenants = tenants.length;
  const totalArea = tenants.reduce((sum, t) => sum + (t.area || 0), 0);
  const totalDbCost = tenants.reduce((sum, t) => sum + (t.db_cost || 0), 0);
  const totalLightingCost = tenants.reduce((sum, t) => sum + (t.lighting_cost || 0), 0);

  const categoryCounts = tenants.reduce((acc, t) => {
    acc[t.shop_category] = (acc[t.shop_category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dbOrdered = tenants.filter(t => t.db_ordered).length;
  const lightingOrdered = tenants.filter(t => t.lighting_ordered).length;
  const sowReceived = tenants.filter(t => t.sow_received).length;
  const layoutReceived = tenants.filter(t => t.layout_received).length;
  const costReported = tenants.filter(t => t.cost_reported).length;

  // Helper function to check if tenant is complete
  const isTenantComplete = (tenant: Tenant) => {
    return tenant.sow_received &&
      tenant.layout_received &&
      tenant.db_ordered &&
      tenant.lighting_ordered &&
      tenant.cost_reported &&
      tenant.area !== null &&
      tenant.db_cost !== null &&
      tenant.lighting_cost !== null;
  };

  // Calculate completion percentage for sorting
  const getCompletionPercentage = (tenant: Tenant) => {
    let completed = 0;
    let total = 8;
    
    if (tenant.sow_received) completed++;
    if (tenant.layout_received) completed++;
    if (tenant.db_ordered) completed++;
    if (tenant.lighting_ordered) completed++;
    if (tenant.cost_reported) completed++;
    if (tenant.area !== null) completed++;
    if (tenant.db_cost !== null) completed++;
    if (tenant.lighting_cost !== null) completed++;
    
    return (completed / total) * 100;
  };

  // Filter and sort tenants
  const filteredTenants = tenants
    .filter(tenant => {
      // Status filter
      if (statusFilter === "complete" && !isTenantComplete(tenant)) return false;
      if (statusFilter === "in-progress" && isTenantComplete(tenant)) return false;
      
      // Search filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        tenant.shop_number.toLowerCase().includes(query) ||
        tenant.shop_name.toLowerCase().includes(query) ||
        getCategoryLabel(tenant.shop_category).toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "shop-number":
          // Extract first number from strings like "Shop 77", "Shop 27/28" or "Shop 66A"
          const matchA = a.shop_number.match(/\d+/);
          const matchB = b.shop_number.match(/\d+/);
          const numA = matchA ? parseInt(matchA[0]) : 0;
          const numB = matchB ? parseInt(matchB[0]) : 0;
          if (numA !== numB) return numA - numB;
          return a.shop_number.localeCompare(b.shop_number, undefined, { numeric: true });
        
        case "name":
          return a.shop_name.localeCompare(b.shop_name);
        
        case "completion":
          return getCompletionPercentage(b) - getCompletionPercentage(a); // Descending order
        
        default:
          return 0;
      }
    });

  return (
    <div className="h-full overflow-auto bg-white p-8 space-y-8">
      {/* Cover Page - Standardized Design matching PDF exactly */}
      <div className="min-h-[900px] bg-white relative rounded-lg overflow-hidden">
        {/* Left gradient accent bar - matching PDF gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-[#DCEAFA] to-[#B4C3FA]"></div>
        
        {/* Main content */}
        <div className="flex flex-col items-center pt-16 px-12">
          {/* Title - RGB(133, 163, 207) = #85A3CF */}
          <h1 className="text-base font-bold text-[#85A3CF] mb-6">TENANT TRACKER REPORT</h1>
          
          {/* Project name - RGB(133, 163, 207) = #85A3CF */}
          <h2 className="text-[22px] font-bold text-[#85A3CF] mb-8 text-center">{projectName}</h2>
          
          {/* Subtitle - RGB(133, 163, 207) = #85A3CF */}
          <h3 className="text-lg text-[#85A3CF]">Tenant Schedule & Progress</h3>
          
          {/* First divider */}
          <div className="w-[calc(100%-80px)] h-[1px] bg-black mt-[60px] mb-3"></div>
          
          {/* Company details */}
          <div className="w-full px-5 mt-3">
            <div className="flex justify-between items-start">
              <div className="text-left space-y-[6px]">
                <p className="font-bold text-[10px] text-black">PREPARED BY:</p>
                <p className="text-[9px] text-black leading-tight">{companyDetails?.companyName.toUpperCase()}</p>
                <p className="text-[9px] text-black leading-tight">141 Which Hazel ave,</p>
                <p className="text-[9px] text-black leading-tight">Highveld Techno Park</p>
                <p className="text-[9px] text-black leading-tight">Building 1A</p>
                <p className="text-[9px] text-black leading-tight">Tel: {companyDetails?.contactPhone}</p>
                <p className="text-[9px] text-black leading-tight">Contact: {companyDetails?.contactName}</p>
              </div>
              
              {/* Logo - positioned to match PDF */}
              {companyDetails?.logoUrl && (
                <img 
                  src={companyDetails.logoUrl} 
                  alt="Company Logo" 
                  className="w-[120px] h-[88px] object-contain"
                />
              )}
            </div>
          </div>
          
          {/* Second divider */}
          <div className="w-[calc(100%-80px)] h-[1px] bg-black mt-[48px] mb-[18px]"></div>
          
          {/* Date and Revision - RGB(0, 191, 255) = #00BFFF */}
          <div className="w-full px-5">
            <div className="flex justify-between">
              <div className="text-left space-y-3">
                <p className="font-bold text-xs text-black">DATE:</p>
                <p className="font-bold text-xs text-black">REVISION:</p>
              </div>
              <div className="text-right space-y-3">
                <p className="text-xs text-[#00BFFF]">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
                <p className="text-xs text-[#00BFFF]">Rev 0</p>
              </div>
            </div>
          </div>
          
          {/* Page number */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-[11px] text-black">1</p>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="min-h-[900px] bg-white p-8 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg mb-6">
          <h2 className="text-3xl font-bold">Table of Contents</h2>
        </div>

        {/* Report Sections */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Report Sections</h3>
          <div className="space-y-2 ml-4">
            {[
              "Project Overview & KPIs",
              "Floor Plan with Tenant Zones",
              "Tenant Schedule",
              "Tenant Documents (By Tenant)"
            ].map((section, idx) => (
              <p key={idx} className="text-sm text-gray-700">{idx + 2}. {section}</p>
            ))}
          </div>
        </div>

        {/* Tenant Documents Index */}
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-bold text-gray-900">Tenant Documents Index</h3>
          <div className="text-xs text-gray-600 italic space-y-1 ml-2">
            <p>Documents are organized by tenant in the appendix. Each tenant&apos;s section includes:</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Scope of Work (SOW) documents</li>
              <li>Layout plans and drawings</li>
              <li>Cost breakdowns and quotations</li>
            </ul>
          </div>

          {/* Search Input */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by shop number, name, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-xs font-medium text-gray-600">Filter by status:</span>
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              All ({tenants.length})
            </Button>
            <Button
              variant={statusFilter === "complete" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("complete")}
              className={statusFilter === "complete" ? "" : "border-green-200 text-green-700 hover:bg-green-50"}
            >
              ✓ Complete ({tenants.filter(t => isTenantComplete(t)).length})
            </Button>
            <Button
              variant={statusFilter === "in-progress" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("in-progress")}
              className={statusFilter === "in-progress" ? "" : "border-yellow-200 text-yellow-700 hover:bg-yellow-50"}
            >
              ⚠ In Progress ({tenants.filter(t => !isTenantComplete(t)).length})
            </Button>
          </div>

          {/* Sort Options */}
          <div className="flex gap-2 items-center">
            <ArrowUpDown className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Sort by:</span>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shop-number">Shop Number</SelectItem>
                <SelectItem value="name">Shop Name</SelectItem>
                <SelectItem value="completion">Completion %</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          {(searchQuery || statusFilter !== "all") && (
            <p className="text-xs text-gray-500">
              Showing {filteredTenants.length} of {tenants.length} tenants
            </p>
          )}

          {/* Tenant List Table */}
          <div className="mt-6 border rounded-lg overflow-hidden">
            <div className="bg-gray-100 grid grid-cols-5 gap-4 p-3 font-bold text-xs">
              <div>Shop Number</div>
              <div>Shop Name</div>
              <div>Category</div>
              <div>Status</div>
              <div>Completion</div>
            </div>
            <div className="divide-y">
              {filteredTenants.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {searchQuery ? (
                    <>No tenants found matching &quot;{searchQuery}&quot;</>
                  ) : (
                    <>No {statusFilter === "complete" ? "complete" : "in-progress"} tenants found</>
                  )}
                </div>
              ) : (
                filteredTenants.map((tenant) => {
                  const isComplete = isTenantComplete(tenant);
                  const completionPercentage = getCompletionPercentage(tenant);

                return (
                  <div key={tenant.id} className="grid grid-cols-5 gap-4 p-3 text-xs hover:bg-gray-50">
                    <div className="font-medium">{tenant.shop_number}</div>
                    <div className="truncate">{tenant.shop_name}</div>
                    <div>{getCategoryLabel(tenant.shop_category)}</div>
                    <div>
                      {isComplete ? (
                        <span className="text-green-600 font-medium">✓ Complete</span>
                      ) : (
                        <span className="text-yellow-600 font-medium">⚠ In Progress</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            completionPercentage === 100 ? 'bg-green-500' : 
                            completionPercentage >= 75 ? 'bg-blue-500' : 
                            completionPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-600 font-medium min-w-[35px]">{completionPercentage.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Page */}
      <div className="min-h-[900px] space-y-8">
        {/* Document Organization Note */}
        <div className="text-center py-2">
          <p className="text-xs text-gray-500 italic">Note: Documents are organized by tenant in the appendix section</p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg">
          <h2 className="text-3xl font-bold">Project Overview & KPIs</h2>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-sm text-gray-600 uppercase">Total Tenants</span>
            </div>
            <p className="text-4xl font-bold">{totalTenants}</p>
          </div>

          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 uppercase">Total Area</span>
            </div>
            <p className="text-3xl font-bold">{totalArea.toFixed(0)} m²</p>
          </div>

          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600 uppercase">Total DB Cost</span>
            </div>
            <p className="text-2xl font-bold">
              R{totalDbCost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600 uppercase">Lighting Cost</span>
            </div>
            <p className="text-2xl font-bold">
              R{totalLightingCost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <div key={category} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  category === 'standard' ? 'bg-blue-500' :
                  category === 'fast_food' ? 'bg-red-500' :
                  category === 'restaurant' ? 'bg-green-500' :
                  'bg-purple-500'
                }`}></div>
                <span className="flex-1">{getCategoryLabel(category)}</span>
                <span className="font-bold">{count} tenant{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Tracking */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Progress Tracking</h3>
          <div className="space-y-4">
            {[
              { label: 'SOW Received', value: sowReceived, color: 'bg-blue-600' },
              { label: 'Layout Received', value: layoutReceived, color: 'bg-green-500' },
              { label: 'DB Ordered', value: dbOrdered, color: 'bg-orange-500' },
              { label: 'Lighting Ordered', value: lightingOrdered, color: 'bg-yellow-500' },
              { label: 'Cost Reported', value: costReported, color: 'bg-purple-500' },
            ].map(item => {
              const percentage = (item.value / totalTenants * 100);
              return (
                <div key={item.label} className="flex items-center gap-4">
                  <span className="w-32 text-sm">{item.label}</span>
                  <span className="w-16 text-sm font-bold">{item.value}/{totalTenants}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${item.color} h-2 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-sm text-gray-600">{percentage.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tenant Schedule */}
      <div className="min-h-[900px] space-y-6">
        <h2 className="text-3xl font-bold">Tenant Schedule</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border border-gray-300 p-2">Shop #</th>
                <th className="border border-gray-300 p-2">Shop Name</th>
                <th className="border border-gray-300 p-2">Category</th>
                <th className="border border-gray-300 p-2">Area (m²)</th>
                <th className="border border-gray-300 p-2">DB Allow.</th>
                <th className="border border-gray-300 p-2">DB SOW</th>
                <th className="border border-gray-300 p-2">SOW</th>
                <th className="border border-gray-300 p-2">Layout</th>
                <th className="border border-gray-300 p-2">DB Ord</th>
                <th className="border border-gray-300 p-2">DB Cost</th>
                <th className="border border-gray-300 p-2">Light Ord</th>
                <th className="border border-gray-300 p-2">Light Cost</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant, idx) => (
                <tr key={tenant.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 p-2">{tenant.shop_number}</td>
                  <td className="border border-gray-300 p-2">{tenant.shop_name}</td>
                  <td className="border border-gray-300 p-2">{getCategoryLabel(tenant.shop_category)}</td>
                  <td className="border border-gray-300 p-2">{tenant.area?.toFixed(2) || '-'}</td>
                  <td className="border border-gray-300 p-2">{tenant.db_size_allowance || '-'}</td>
                  <td className="border border-gray-300 p-2">{tenant.db_size_scope_of_work || '-'}</td>
                  <td className="border border-gray-300 p-2 text-center">{tenant.sow_received ? '✓' : '✗'}</td>
                  <td className="border border-gray-300 p-2 text-center">{tenant.layout_received ? '✓' : '✗'}</td>
                  <td className="border border-gray-300 p-2 text-center">{tenant.db_ordered ? '✓' : '✗'}</td>
                  <td className="border border-gray-300 p-2">{tenant.db_cost ? `R${tenant.db_cost.toFixed(2)}` : '-'}</td>
                  <td className="border border-gray-300 p-2 text-center">{tenant.lighting_ordered ? '✓' : '✗'}</td>
                  <td className="border border-gray-300 p-2">{tenant.lighting_cost ? `R${tenant.lighting_cost.toFixed(2)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};