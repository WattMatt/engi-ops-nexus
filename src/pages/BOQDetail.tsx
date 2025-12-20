import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowLeft, FileSpreadsheet, Check } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { BOQSpreadsheetTable } from "@/components/boq/BOQSpreadsheetTable";
import { cn } from "@/lib/utils";

interface SheetInfo {
  billNumber: number | null;
  billName: string;
  sectionCode: string | null;
  sectionName: string;
  itemCount: number;
  totalAmount: number;
  key: string;
}

export default function BOQDetail() {
  const { uploadId } = useParams<{ uploadId: string }>();
  const navigate = useNavigate();
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

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
    queryKey: ["boq-items-all", uploadId],
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

  // Build sheet tabs from items - group by bill_number + section_code
  const sheets = useMemo(() => {
    const sheetMap = new Map<string, SheetInfo>();
    
    items.forEach((item) => {
      // Create a unique key for each sheet (bill + section combination)
      const key = `${item.bill_number ?? 'null'}-${item.section_code ?? 'general'}`;
      
      if (!sheetMap.has(key)) {
        sheetMap.set(key, {
          billNumber: item.bill_number,
          billName: item.bill_name || `Bill ${item.bill_number || 'General'}`,
          sectionCode: item.section_code,
          sectionName: item.section_name || item.section_code || 'General',
          itemCount: 0,
          totalAmount: 0,
          key,
        });
      }
      
      const sheet = sheetMap.get(key)!;
      sheet.itemCount++;
      const amount = (item.quantity || 0) * ((item.supply_rate || 0) + (item.install_rate || 0));
      sheet.totalAmount += amount;
    });
    
    return Array.from(sheetMap.values());
  }, [items]);

  // Auto-select first sheet
  const activeSheet = useMemo(() => {
    if (selectedSheet) {
      return sheets.find(s => s.key === selectedSheet) || sheets[0];
    }
    return sheets[0];
  }, [selectedSheet, sheets]);

  const grandTotal = useMemo(() => {
    return sheets.reduce((sum, sheet) => sum + sheet.totalAmount, 0);
  }, [sheets]);

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

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">{upload.file_name}</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {(upload as any).projects?.name} • {format(new Date(upload.created_at!), "dd MMM yyyy")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{sheets.length} sheets</Badge>
            <Badge variant="outline">{items.length} items</Badge>
            <Badge variant="secondary" className="font-semibold">{formatCurrency(grandTotal)}</Badge>
          </div>
        </div>
      </div>

      {/* Sheet Tabs - Similar to Excel/Google Sheets tabs */}
      <div className="border-b bg-muted/30">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-1 px-4 py-2">
            {sheets.map((sheet) => {
              const isActive = activeSheet?.key === sheet.key;
              const displayName = sheet.sectionCode 
                ? `${sheet.sectionCode} ${sheet.sectionName}` 
                : sheet.sectionName;
              
              return (
                <button
                  key={sheet.key}
                  onClick={() => setSelectedSheet(sheet.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-t-md text-sm font-medium transition-colors whitespace-nowrap border border-b-0",
                    isActive 
                      ? "bg-background text-foreground border-border shadow-sm" 
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border-transparent"
                  )}
                >
                  {isActive && <Check className="h-3 w-3 text-primary" />}
                  <span className="max-w-[150px] truncate">{displayName}</span>
                  <Badge 
                    variant={isActive ? "default" : "secondary"} 
                    className="text-[10px] px-1.5 py-0 h-4"
                  >
                    {sheet.itemCount}
                  </Badge>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Selected Sheet Info Bar */}
      {activeSheet && (
        <div className="px-6 py-2 bg-muted/20 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {activeSheet.billName}
              {activeSheet.sectionCode && (
                <span className="text-muted-foreground"> → {activeSheet.sectionCode} {activeSheet.sectionName}</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">{activeSheet.itemCount} items</span>
            <span className="font-medium">{formatCurrency(activeSheet.totalAmount)}</span>
          </div>
        </div>
      )}

      {/* Spreadsheet Content */}
      <div className="flex-1 overflow-hidden p-4">
        {activeSheet ? (
          <Card className="h-full flex flex-col">
            <CardContent className="flex-1 p-0 overflow-auto">
              <BOQSpreadsheetTable 
                uploadId={uploadId!}
                billNumber={activeSheet.billNumber}
                sectionCode={activeSheet.sectionCode}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No sheets available
          </div>
        )}
      </div>
    </div>
  );
}
