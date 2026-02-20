import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseExcelFile, ParsedSheet } from "@/utils/excelParser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportTenantsDialogProps {
  projectId: string;
  onSuccess: () => void;
}

interface ColumnMapping {
  shop_name: string;
  shop_number: string;
  area: string;
  category: string;
  opening_date: string;
}

export function ImportTenantsDialog({ projectId, onSuccess }: ImportTenantsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    shop_name: "",
    shop_number: "",
    area: "",
    category: "",
    opening_date: "",
  });
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    try {
      const result = await parseExcelFile(selectedFile);
      if (result.sheets.length > 0) {
        // Use the first sheet by default
        const sheet = result.sheets[0];
        setParsedData(sheet);
        autoMapColumns(sheet.headers);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error parsing file",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const autoMapColumns = (headers: string[]) => {
    const newMapping: ColumnMapping = {
      shop_name: "",
      shop_number: "",
      area: "",
      category: "",
      opening_date: "",
    };

    headers.forEach((header) => {
      const h = header.toLowerCase();
      if (h.includes("name") || h.includes("tenant") || h.includes("shop")) newMapping.shop_name = header;
      if (h.includes("number") || h.includes("unit") || h.includes("code")) newMapping.shop_number = header;
      if (h.includes("area") || h.includes("sqm") || h.includes("gla")) newMapping.area = header;
      if (h.includes("category") || h.includes("type")) newMapping.category = header;
      if (h.includes("open") || h.includes("date")) newMapping.opening_date = header;
    });

    setMapping(newMapping);
  };

  const handleImport = async () => {
    if (!parsedData) return;
    setLoading(true);

    try {
      const tenantsToInsert = parsedData.rows.map((row) => {
        // Map raw row data to database schema
        return {
          project_id: projectId,
          shop_name: String(row[mapping.shop_name] || "Unknown Shop"),
          shop_number: String(row[mapping.shop_number] || "TBA"),
          area: row[mapping.area] ? parseFloat(String(row[mapping.area])) : null,
          shop_category: "standard", // Default to standard, user can update later
          opening_date: row[mapping.opening_date] ? new Date(String(row[mapping.opening_date])).toISOString().split('T')[0] : null,
          beneficial_occupation_days: 90, // Default
          // Initialize status flags
          sow_received: false,
          layout_received: false,
          db_ordered: false,
          db_by_tenant: false,
          lighting_ordered: false,
          lighting_by_tenant: false,
          cost_reported: false,
        };
      });

      const { error } = await supabase.from("tenants").insert(tenantsToInsert);

      if (error) throw error;

      toast({
        title: "Import Successful",
        description: `Imported ${tenantsToInsert.length} tenants.`,
      });
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Import from Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Tenants from Excel</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!parsedData ? (
            <div className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:bg-muted/50 transition-colors">
              <Upload className="h-12 w-12" />
              <div className="text-center">
                <p className="font-medium">Upload Tenant Schedule</p>
                <p className="text-sm">Drag and drop or click to upload (.xlsx, .xls)</p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>
          ) : (
            <>
              {/* Column Mapping Section */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Shop Name *</span>
                  <Select
                    value={mapping.shop_name}
                    onValueChange={(v) => setMapping({ ...mapping, shop_name: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      {parsedData.headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Shop Number *</span>
                  <Select
                    value={mapping.shop_number}
                    onValueChange={(v) => setMapping({ ...mapping, shop_number: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      {parsedData.headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Area (m²)</span>
                  <Select
                    value={mapping.area}
                    onValueChange={(v) => setMapping({ ...mapping, area: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      {parsedData.headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Opening Date</span>
                  <Select
                    value={mapping.opening_date}
                    onValueChange={(v) => setMapping({ ...mapping, opening_date: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      {parsedData.headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => setParsedData(null)} className="w-full">
                    Change File
                  </Button>
                </div>
              </div>

              {/* Data Preview */}
              <ScrollArea className="flex-1 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {parsedData.headers.map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">
                          {header}
                          {Object.values(mapping).includes(header) && (
                            <CheckCircle2 className="inline ml-1 h-3 w-3 text-green-500" />
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.rows.slice(0, 100).map((row, i) => (
                      <TableRow key={i}>
                        {parsedData.headers.map((header) => (
                          <TableCell key={`${i}-${header}`}>
                            {row[header]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              <div className="flex justify-end gap-2 pt-2">
                <span className="text-sm text-muted-foreground self-center mr-auto">
                  Previewing first 100 of {parsedData.rows.length} rows
                </span>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={loading || !mapping.shop_name}>
                  {loading ? "Importing..." : `Import ${parsedData.rows.length} Tenants`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
