import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, CheckCircle, XCircle, RefreshCw, Database, ArrowRight, Play } from "lucide-react";
import { toast } from "sonner";
import type { BOQWizardState, ColumnMapping } from "../BOQProcessingWizard";

interface Props {
  state: BOQWizardState;
  updateState: (updates: Partial<BOQWizardState>) => void;
}

export function BOQWizardStep4Match({ state, updateState }: Props) {
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Ready to start matching");
  const queryClient = useQueryClient();
  const hasStarted = useRef(false);

  // Build content string from selected sheets with column mappings
  const buildContentString = useCallback(() => {
    const contentParts: string[] = [];

    state.parsedSheets
      .filter(sheet => state.selectedSheets.has(sheet.name))
      .forEach(sheet => {
        const mapping = state.columnMappings[sheet.name];
        if (!mapping || mapping.description === null) return;

        let sheetContent = `=== SHEET: ${sheet.name} ===\n\n`;
        
        // Build header row from mapped columns
        const mappedHeaders: string[] = [];
        const headerMap: { key: keyof ColumnMapping; label: string }[] = [
          { key: 'itemCode', label: 'Item Code' },
          { key: 'description', label: 'Description' },
          { key: 'quantity', label: 'Qty' },
          { key: 'unit', label: 'Unit' },
          { key: 'supplyRate', label: 'Supply Rate' },
          { key: 'installRate', label: 'Install Rate' },
          { key: 'totalRate', label: 'Total Rate' },
          { key: 'amount', label: 'Amount' },
        ];

        headerMap.forEach(({ key, label }) => {
          if (mapping[key] !== null) {
            mappedHeaders.push(label);
          }
        });
        sheetContent += mappedHeaders.join('\t') + '\n';

        // Build data rows - filter out empty rows
        sheet.rows.forEach(row => {
          const values: string[] = [];
          let hasContent = false;
          
          headerMap.forEach(({ key }) => {
            const colIndex = mapping[key];
            if (colIndex !== null && typeof colIndex === 'number') {
              const header = sheet.headers[colIndex];
              const value = String(row[header] ?? '').trim();
              values.push(value);
              if (value && key === 'description') hasContent = true;
            }
          });
          
          // Only add rows that have a description
          if (hasContent) {
            sheetContent += values.join('\t') + '\n';
          }
        });

        contentParts.push(sheetContent);
      });

    return contentParts.join('\n');
  }, [state.parsedSheets, state.selectedSheets, state.columnMappings]);

  // Upload and process mutation
  const processMutation = useMutation({
    mutationFn: async () => {
      if (!state.file) throw new Error("No file selected");

      setProgress(10);
      setStatusMessage("Uploading file to storage...");

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}_${state.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("boq-uploads")
        .upload(filePath, state.file);

      if (uploadError) throw uploadError;

      setProgress(30);
      setStatusMessage("Creating upload record...");

      // Create upload record
      const { data: uploadRecord, error: recordError } = await supabase
        .from("boq_uploads")
        .insert({
          file_name: state.file.name,
          file_path: filePath,
          file_type: state.file.name.split('.').pop()?.toLowerCase() || 'xlsx',
          file_size: state.file.size,
          source_description: state.metadata.sourceDescription || null,
          contractor_name: state.metadata.contractorName || null,
          project_id: state.metadata.projectId || null,
          province: state.metadata.province || null,
          building_type: state.metadata.buildingType || null,
          tender_date: state.metadata.tenderDate?.toISOString().split('T')[0] || null,
          uploaded_by: user.id,
          status: "processing",
          extraction_started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (recordError) throw recordError;

      updateState({ uploadId: uploadRecord.id });

      setProgress(50);
      setStatusMessage("Starting AI matching...");

      // Build content from column mappings
      const contentToProcess = buildContentString();
      
      if (!contentToProcess.trim()) {
        throw new Error("No valid content to process. Check column mappings.");
      }

      // Call the matching edge function (now synchronous)
      setStatusMessage("AI matching in progress (this may take 1-2 minutes)...");
      
      const { data: matchResult, error: matchError } = await supabase.functions.invoke("match-boq-rates", {
        body: {
          upload_id: uploadRecord.id,
          file_content: contentToProcess,
        },
      });

      if (matchError) {
        console.error("Edge function error:", matchError);
        throw new Error(matchError.message || "AI matching failed");
      }

      setProgress(90);
      setStatusMessage("Retrieving results...");

      // Get final status
      const { data: uploadStatus } = await supabase
        .from("boq_uploads")
        .select("status, total_items_extracted, items_matched_to_master, error_message")
        .eq("id", uploadRecord.id)
        .single();

      if (uploadStatus?.status === "error") {
        throw new Error(uploadStatus.error_message || "Processing failed");
      }

      setProgress(100);
      return {
        uploadId: uploadRecord.id,
        itemsExtracted: uploadStatus?.total_items_extracted || 0,
        itemsMatched: uploadStatus?.items_matched_to_master || 0,
      };
    },
    onSuccess: (result) => {
      setStatusMessage("Matching completed!");
      updateState({
        matchingStatus: 'completed',
        extractedItemsCount: result.itemsExtracted,
        matchedItemsCount: result.itemsMatched,
      });
      queryClient.invalidateQueries({ queryKey: ["boq-uploads"] });
      toast.success(`Extracted ${result.itemsExtracted} items, matched ${result.itemsMatched} to master library`);
    },
    onError: (error: Error) => {
      setStatusMessage(`Error: ${error.message}`);
      updateState({
        matchingStatus: 'error',
        matchingError: error.message,
      });
      toast.error(error.message);
    },
  });

  // Start processing - called by button click instead of auto-start
  const startProcessing = useCallback(() => {
    if (state.matchingStatus !== 'idle' || processMutation.isPending || hasStarted.current) {
      return;
    }
    hasStarted.current = true;
    updateState({ matchingStatus: 'processing' });
    processMutation.mutate();
  }, [state.matchingStatus, processMutation, updateState]);

  const retry = () => {
    hasStarted.current = false;
    setProgress(0);
    updateState({ matchingStatus: 'idle', matchingError: null });
  };

  // Calculate row count for selected sheets with valid mappings
  const validRowCount = state.parsedSheets
    .filter(s => state.selectedSheets.has(s.name) && state.columnMappings[s.name]?.description !== null)
    .reduce((acc, s) => acc + s.rows.length, 0);

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {state.matchingStatus === 'idle' && (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Play className="h-10 w-10 text-primary" />
              </div>
            )}
            {state.matchingStatus === 'processing' && (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              </div>
            )}
            {state.matchingStatus === 'completed' && (
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            )}
            {state.matchingStatus === 'error' && (
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
            )}
          </div>
          <CardTitle className="text-xl">
            {state.matchingStatus === 'idle' && "Ready to Process"}
            {state.matchingStatus === 'processing' && "AI Matching in Progress"}
            {state.matchingStatus === 'completed' && "Matching Complete!"}
            {state.matchingStatus === 'error' && "Processing Error"}
          </CardTitle>
          <CardDescription className="text-base">
            {state.matchingStatus === 'idle' 
              ? `${validRowCount} rows from ${state.selectedSheets.size} sheets will be processed`
              : statusMessage
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Start button for idle state */}
          {state.matchingStatus === 'idle' && (
            <Button 
              onClick={startProcessing} 
              size="lg" 
              className="w-full"
              disabled={validRowCount === 0}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Start AI Matching
            </Button>
          )}

          {/* Progress bar */}
          {state.matchingStatus === 'processing' && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Upload</span>
                <span>Parse</span>
                <span>Match</span>
                <span>Done</span>
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {state.matchingStatus === 'processing' && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Analyzing items and matching to master library...
              </span>
            </div>
          )}

          {/* Success stats */}
          {state.matchingStatus === 'completed' && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <Database className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{state.extractedItemsCount}</p>
                      <p className="text-xs text-muted-foreground">Items Extracted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 dark:border-blue-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{state.matchedItemsCount}</p>
                      <p className="text-xs text-muted-foreground">Matched to Master</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error state */}
          {state.matchingStatus === 'error' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{state.matchingError}</p>
              </div>
              <Button onClick={retry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Info cards */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">File</span>
              <span className="font-medium truncate max-w-[200px]">{state.file?.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sheets with mappings</span>
              <Badge variant="outline">
                {Object.values(state.columnMappings).filter(m => m.description !== null).length} sheets
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rows to process</span>
              <span className="font-medium">{validRowCount}</span>
            </div>
          </div>

          {/* Next step hint */}
          {state.matchingStatus === 'completed' && (
            <div className="flex items-center justify-center gap-2 pt-4 text-sm text-muted-foreground">
              <span>Click</span>
              <Badge variant="outline" className="gap-1">
                Next <ArrowRight className="h-3 w-3" />
              </Badge>
              <span>to review and approve items</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
