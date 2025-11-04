import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

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

  return (
    <div className="h-full overflow-auto bg-white p-8 space-y-8">
      {/* Cover Page - Standardized Design */}
      <div className="min-h-[900px] bg-white relative rounded-lg overflow-hidden">
        {/* Left gradient accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-[#E0E8F0] to-[#A0B8D0]"></div>
        
        {/* Main content */}
        <div className="flex flex-col items-center pt-24 px-12">
          {/* Title */}
          <h1 className="text-xl font-bold text-[#85A3CF] mb-12">TENANT TRACKER REPORT</h1>
          
          {/* Project name */}
          <h2 className="text-3xl font-bold text-[#85A3CF] mb-8">{projectName}</h2>
          
          {/* Subtitle */}
          <h3 className="text-2xl text-[#85A3CF]">Tenant Schedule & Progress</h3>
          
          {/* First divider */}
          <div className="w-[calc(100%-80px)] h-px bg-black mt-16 mb-4"></div>
          
          {/* Company details */}
          <div className="w-full px-8 mt-4">
            <div className="flex justify-between items-start">
              <div className="text-left">
                <p className="font-bold text-sm text-black mb-2">PREPARED BY:</p>
                <p className="text-xs text-black">{companyDetails?.companyName.toUpperCase()}</p>
                <p className="text-xs text-black">141 Which Hazel ave,</p>
                <p className="text-xs text-black">Highveld Techno Park</p>
                <p className="text-xs text-black">Building 1A</p>
                <p className="text-xs text-black">Tel: {companyDetails?.contactPhone}</p>
                <p className="text-xs text-black">Contact: {companyDetails?.contactName}</p>
              </div>
              
              {/* Logo */}
              {companyDetails?.logoUrl && (
                <img 
                  src={companyDetails.logoUrl} 
                  alt="Company Logo" 
                  className="w-32 h-24 object-contain"
                />
              )}
            </div>
          </div>
          
          {/* Second divider */}
          <div className="w-[calc(100%-80px)] h-px bg-black mt-12 mb-6"></div>
          
          {/* Date and Revision */}
          <div className="w-full px-8">
            <div className="flex justify-between">
              <div className="text-left">
                <p className="font-bold text-sm text-black mb-3">DATE:</p>
                <p className="font-bold text-sm text-black">REVISION:</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#00BFFF] mb-3">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
                <p className="text-sm text-[#00BFFF]">Rev 0</p>
              </div>
            </div>
          </div>
          
          {/* Page number */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-sm text-black">1</p>
          </div>
        </div>
      </div>

      {/* KPI Page */}
      <div className="min-h-[900px] space-y-8">
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