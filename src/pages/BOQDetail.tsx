import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, FileSpreadsheet, ChevronDown, ChevronRight, Building2, Layers } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { BOQSpreadsheetTable } from "@/components/boq/BOQSpreadsheetTable";

interface GroupedData {
  [billKey: string]: {
    billNumber: number | null;
    billName: string;
    sections: {
      [sectionKey: string]: {
        sectionCode: string | null;
        sectionName: string;
        itemCount: number;
        totalAmount: number;
      };
    };
    totalAmount: number;
  };
}

export default function BOQDetail() {
  const { uploadId } = useParams<{ uploadId: string }>();
  const navigate = useNavigate();
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<{ billNumber: number | null; sectionCode: string | null } | null>(null);

  const { data: upload, isLoading: uploadLoading } = useQuery({
    queryKey: ["boq-upload", uploadId],
    queryFn: async () => {
      if (!uploadId) return null;
      const { data, error } = await supabase
        .from("boq_uploads")
        .select("*, projects(name)")
        .eq("id", uploadId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!uploadId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["boq-items-grouped", uploadId],
    queryFn: async () => {
      if (!uploadId) return [];
      const { data, error } = await supabase
        .from("boq_extracted_items")
        .select("*")
        .eq("upload_id", uploadId)
        .order("bill_number")
        .order("section_code")
        .order("row_number");
      if (error) throw error;
      return data;
    },
    enabled: !!uploadId,
  });

  const groupedData = useMemo(() => {
    const grouped: GroupedData = {};
    
    items.forEach((item) => {
      const billKey = `bill-${item.bill_number ?? "general"}`;
      const sectionKey = `section-${item.section_code ?? "general"}`;
      const amount = (item.quantity || 0) * ((item.supply_rate || 0) + (item.install_rate || 0));
      
      if (!grouped[billKey]) {
        grouped[billKey] = {
          billNumber: item.bill_number,
          billName: item.bill_name || `Bill ${item.bill_number || "General"}`,
          sections: {},
          totalAmount: 0,
        };
      }
      
      if (!grouped[billKey].sections[sectionKey]) {
        grouped[billKey].sections[sectionKey] = {
          sectionCode: item.section_code,
          sectionName: item.section_name || item.section_code || "General Items",
          itemCount: 0,
          totalAmount: 0,
        };
      }
      
      grouped[billKey].sections[sectionKey].itemCount++;
      grouped[billKey].sections[sectionKey].totalAmount += amount;
      grouped[billKey].totalAmount += amount;
    });
    
    return grouped;
  }, [items]);

  const toggleBill = (billKey: string) => {
    const newExpanded = new Set(expandedBills);
    if (newExpanded.has(billKey)) {
      newExpanded.delete(billKey);
    } else {
      newExpanded.add(billKey);
    }
    setExpandedBills(newExpanded);
  };

  const selectSection = (billNumber: number | null, sectionCode: string | null) => {
    setActiveSection({ billNumber, sectionCode });
  };

  const grandTotal = useMemo(() => {
    return Object.values(groupedData).reduce((sum, bill) => sum + bill.totalAmount, 0);
  }, [groupedData]);

  if (uploadLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!upload) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">BOQ upload not found</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const billKeys = Object.keys(groupedData);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">{upload.file_name}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {(upload as any).projects?.name} • Uploaded {format(new Date(upload.created_at!), "PPP")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{items.length} items</Badge>
          <Badge variant="secondary">{formatCurrency(grandTotal)}</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{billKeys.length}</div>
            <p className="text-xs text-muted-foreground">Bills</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {Object.values(groupedData).reduce((sum, bill) => sum + Object.keys(bill.sections).length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Sections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">Line Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatCurrency(grandTotal)}</div>
            <p className="text-xs text-muted-foreground">Grand Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - Bill/Section Navigation */}
        <div className="col-span-3">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Bills & Sections</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {billKeys.map((billKey) => {
                  const bill = groupedData[billKey];
                  const sectionKeys = Object.keys(bill.sections);
                  const isExpanded = expandedBills.has(billKey);
                  
                  return (
                    <Collapsible key={billKey} open={isExpanded} onOpenChange={() => toggleBill(billKey)}>
                      <CollapsibleTrigger className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{bill.billName}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {formatCurrency(bill.totalAmount)}
                        </Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 pb-2">
                          {sectionKeys.map((sectionKey) => {
                            const section = bill.sections[sectionKey];
                            const isActive = activeSection?.billNumber === bill.billNumber && 
                                           activeSection?.sectionCode === section.sectionCode;
                            
                            return (
                              <button
                                key={sectionKey}
                                onClick={() => selectSection(bill.billNumber, section.sectionCode)}
                                className={`w-full px-3 py-1.5 flex items-center justify-between text-left rounded-md transition-colors ${
                                  isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Layers className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs">
                                    {section.sectionCode && <span className="font-medium">{section.sectionCode}: </span>}
                                    {section.sectionName}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">{section.itemCount}</span>
                              </button>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Content - Spreadsheet */}
        <div className="col-span-9">
          <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">
                  {activeSection ? (
                    <>
                      {activeSection.sectionCode 
                        ? `Section ${activeSection.sectionCode}` 
                        : 'General Items'}
                      {activeSection.billNumber && ` (Bill ${activeSection.billNumber})`}
                    </>
                  ) : (
                    'All Items'
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Click on a section in the sidebar to filter, or view all items below
                </p>
              </div>
              {activeSection && (
                <Button variant="ghost" size="sm" onClick={() => setActiveSection(null)}>
                  Show All
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="spreadsheet">
                <TabsList className="mx-4 mb-2">
                  <TabsTrigger value="spreadsheet">Spreadsheet View</TabsTrigger>
                </TabsList>
                <TabsContent value="spreadsheet" className="m-0">
                  <BOQSpreadsheetTable 
                    uploadId={uploadId!}
                    billNumber={activeSection?.billNumber}
                    sectionCode={activeSection?.sectionCode}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
