import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Upload, FileSpreadsheet, CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseExcelFile } from "@/utils/excelParser";
import type { BOQWizardState } from "../BOQProcessingWizard";

const SA_PROVINCES = [
  "Western Cape",
  "Eastern Cape",
  "Northern Cape",
  "KwaZulu-Natal",
  "Gauteng",
  "Mpumalanga",
  "Limpopo",
  "North West",
  "Free State",
];

const BUILDING_TYPES = [
  "Retail",
  "Commercial",
  "Industrial",
  "Residential",
  "Healthcare",
  "Education",
  "Mixed Use",
  "Hospitality",
  "Warehouse",
  "Data Centre",
];

interface Props {
  state: BOQWizardState;
  updateState: (updates: Partial<BOQWizardState>) => void;
}

export function BOQWizardStep1Upload({ state, updateState }: Props) {
  const [parsing, setParsing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, project_number")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleFileSelect = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast.error("Please upload an Excel or CSV file");
      return;
    }

    setParsing(true);
    try {
      // Parse the file immediately to get sheets
      const parsed = await parseExcelFile(file);
      
      // Pre-select sheets that look like BOQ data
      const selectedSheets = new Set<string>();
      parsed.sheets.forEach(sheet => {
        const isLikelyBOQ = !sheet.name.toLowerCase().includes("notes") &&
                          !sheet.name.toLowerCase().includes("qualification") &&
                          !sheet.name.toLowerCase().includes("summary") &&
                          !sheet.name.toLowerCase().includes("cover") &&
                          sheet.rows.length > 0;
        if (isLikelyBOQ) {
          selectedSheets.add(sheet.name);
        }
      });

      updateState({
        file,
        parsedSheets: parsed.sheets,
        selectedSheets,
      });
      
      toast.success(`Parsed ${parsed.sheets.length} sheets with ${parsed.totalRows} total rows`);
    } catch (error) {
      toast.error("Failed to parse file");
      console.error(error);
    } finally {
      setParsing(false);
    }
  }, [updateState]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const updateMetadata = (key: keyof BOQWizardState['metadata'], value: string | Date | undefined) => {
    updateState({
      metadata: {
        ...state.metadata,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload BOQ File
          </CardTitle>
          <CardDescription>
            Upload an Excel file (.xlsx, .xls) or CSV containing your Bill of Quantities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              dragActive && "border-primary bg-primary/5",
              state.file && "border-green-500 bg-green-50 dark:bg-green-900/20",
              !dragActive && !state.file && "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById("boq-file-input")?.click()}
          >
            <input
              id="boq-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            
            {parsing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Parsing file...</p>
              </div>
            ) : state.file ? (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="h-10 w-10 text-green-600" />
                <p className="font-medium">{state.file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {state.parsedSheets.length} sheets found
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Change File
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Drop file here or click to browse</p>
                <p className="text-sm text-muted-foreground">
                  Supports Excel (.xlsx, .xls) and CSV files
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">BOQ Details (Optional)</CardTitle>
          <CardDescription>
            Add context about this BOQ for better organization and matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractor">Contractor Name</Label>
              <Input
                id="contractor"
                placeholder="e.g., ABC Electrical"
                value={state.metadata.contractorName}
                onChange={(e) => updateMetadata("contractorName", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project">Link to Project</Label>
              <Select
                value={state.metadata.projectId}
                onValueChange={(v) => updateMetadata("projectId", v)}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Select
                value={state.metadata.province}
                onValueChange={(v) => updateMetadata("province", v)}
              >
                <SelectTrigger id="province">
                  <SelectValue placeholder="Select province..." />
                </SelectTrigger>
                <SelectContent>
                  {SA_PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="building-type">Building Type</Label>
              <Select
                value={state.metadata.buildingType}
                onValueChange={(v) => updateMetadata("buildingType", v)}
              >
                <SelectTrigger id="building-type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {BUILDING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tender Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !state.metadata.tenderDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {state.metadata.tenderDate ? format(state.metadata.tenderDate, "PPP") : "Select date..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={state.metadata.tenderDate}
                    onSelect={(d) => updateMetadata("tenderDate", d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source">Source Description</Label>
              <Input
                id="source"
                placeholder="e.g., Tender submission Rev 2"
                value={state.metadata.sourceDescription}
                onChange={(e) => updateMetadata("sourceDescription", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
