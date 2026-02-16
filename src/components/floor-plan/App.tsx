import React, { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs';
import { User } from '@supabase/supabase-js';
import { Tool, type EquipmentItem, type SupplyLine, type SupplyZone, type ScaleInfo, type ViewState, type Point, type Containment, ContainmentType, type Walkway, DesignPurpose, PVPanelConfig, RoofMask, PVArrayItem, Task, TaskStatus, type CircuitCable } from './types';
import { purposeConfigs, type PurposeConfig } from './purpose.config';
import Toolbar from './components/Toolbar';
import Canvas, { type CanvasHandles } from './components/Canvas';
import EquipmentPanel from './components/EquipmentPanel';
import ScaleModal from './components/ScaleModal';
import CableDetailsModal from './components/CableDetailsModal';
import CircuitCableDetailsDialog, { CircuitCableFormData } from './components/CircuitCableDetailsDialog';
import ContainmentDetailsModal from './components/ContainmentDetailsModal';
import DesignPurposeSelector from './components/DesignPurposeSelector';
import { generatePdf } from './utils/pdfGenerator';
import ExportPreviewModal from './components/ExportPreviewModal';
import PVConfigModal from './components/PVConfigModal';
import RoofMaskModal from './components/RoofMaskModal';
import PVArrayModal, { PVArrayConfig } from './components/PVArrayModal';
import LoadDesignModal from './components/LoadDesignModal';
import TaskModal from './components/TaskModal';
import { ToastProvider, useToast } from './components/ToastProvider';
import { ProjectSelector } from './components/ProjectSelector';
import { 
    saveDesign,
    updateDesign,
    listDesigns,
    loadDesign,
    deleteDesign,
    assignDesignToProject,
    type DesignListing,
} from './utils/supabase';
import { autoSyncToFinalAccount } from './utils/autoSyncFinalAccount';
import { Building, Loader } from 'lucide-react';
import { SavedReportsList } from './components/SavedReportsList';
import { SavedDesignsGallery } from './components/SavedDesignsGallery';
import { supabase } from '@/integrations/supabase/client';
import { LinkToFinalAccountDialog } from './components/LinkToFinalAccountDialog';
import { useTakeoffCounts } from './hooks/useTakeoffCounts';
import { CircuitSchedulePanel } from './components/CircuitSchedulePanel';
import { CircuitScheduleRightPanel } from './components/CircuitScheduleRightPanel';
import { RegionSelectionOverlay } from '@/components/circuit-schedule/RegionSelectionOverlay';
import { DbCircuit, useCreateCircuitMaterial, useDistributionBoards, useFloorPlanCircuitMaterials, useDeleteCircuitMaterialByCanvasLine } from '@/components/circuit-schedule/hooks/useDistributionBoards';
import { useAICircuitScan } from '@/components/circuit-schedule/hooks/useAICircuitScan';
import { DrawingSheetView } from './components/DrawingSheetView';


// Set PDF.js worker source
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@5.4.296/build/pdf.worker.mjs`;
}

interface DesignState {
    equipment: EquipmentItem[];
    lines: SupplyLine[];
    zones: SupplyZone[];
    containment: Containment[];
    walkways: Walkway[];
    roofMasks: RoofMask[];
    pvArrays: PVArrayItem[];
    tasks: Task[];
}

const initialDesignState: DesignState = {
    equipment: [],
    lines: [],
    zones: [],
    containment: [],
    walkways: [],
    roofMasks: [],
    pvArrays: [],
  tasks: [],
};

interface MainAppProps {
  user: User | null;
  projectId?: string;
}

const MainApp: React.FC<MainAppProps> = ({ user, projectId }) => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [designPurpose, setDesignPurpose] = useState<DesignPurpose | null>(null);
  const [purposeConfig, setPurposeConfig] = useState<PurposeConfig | null>(null);

  const [activeTool, setActiveTool] = useState<Tool>(Tool.PAN);
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, offset: { x: 0, y: 0 } });
  const [initialViewState, setInitialViewState] = useState<ViewState | null>(null);
  const toast = useToast();

  // --- History State Management ---
  const [history, setHistory] = useState<DesignState[]>([initialDesignState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Use refs to avoid stale closures in setState callback
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  
  // Keep refs in sync with state
  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const currentDesign = history[historyIndex];
  const { equipment, lines, zones, containment, walkways, roofMasks, pvArrays, tasks } = currentDesign;

  // Calculate take-off counts for linking to final account - moved below after currentDesignId/currentProjectId are declared
  
  // Material assignment mutation
  const createCircuitMaterial = useCreateCircuitMaterial();
  const deleteCircuitMaterialByCanvasLine = useDeleteCircuitMaterialByCanvasLine();
  
  // AI Circuit scanning
  const { isScanning, scanLayout, scanResult } = useAICircuitScan();

  const setState = useCallback((updater: (prevState: DesignState) => DesignState, commit: boolean = true) => {
    // Use refs to get the latest values, avoiding stale closure issues
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    const currentState = currentHistory[currentIndex];
    const newState = updater(currentState);

    if (JSON.stringify(newState) === JSON.stringify(currentState)) {
        return;
    }

    if (commit) {
        const newHistory = currentHistory.slice(0, currentIndex + 1);
        newHistory.push(newState);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    } else {
        const newHistory = [...currentHistory];
        newHistory[currentIndex] = newState;
        setHistory(newHistory);
    }
  }, []);

  const setEquipment = (updater: (prev: EquipmentItem[]) => EquipmentItem[], commit: boolean = true) => setState(s => ({ ...s, equipment: updater(s.equipment) }), commit);
  const setLines = (updater: (prev: SupplyLine[]) => SupplyLine[], commit: boolean = true) => setState(s => ({ ...s, lines: updater(s.lines) }), commit);
  const setZones = (updater: (prev: SupplyZone[]) => SupplyZone[], commit: boolean = true) => setState(s => ({ ...s, zones: updater(s.zones) }), commit);
  const setContainment = (updater: (prev: Containment[]) => Containment[], commit: boolean = true) => setState(s => ({ ...s, containment: updater(s.containment) }), commit);
  const setWalkways = (updater: (prev: Walkway[]) => Walkway[], commit: boolean = true) => setState(s => ({ ...s, walkways: updater(s.walkways) }), commit);
  const setRoofMasks = (updater: (prev: RoofMask[]) => RoofMask[], commit: boolean = true) => setState(s => ({ ...s, roofMasks: updater(s.roofMasks) }), commit);
  const setPvArrays = (updater: (prev: PVArrayItem[]) => PVArrayItem[], commit: boolean = true) => setState(s => ({ ...s, pvArrays: updater(s.pvArrays) }), commit);
  const setTasks = (updater: (prev: Task[]) => Task[], commit: boolean = true) => setState(s => ({ ...s, tasks: updater(s.tasks) }), commit);
  
  const resetStateWith = (newState: DesignState) => {
      setHistory([newState]);
      setHistoryIndex(0);
  }

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
    }
  }, [canUndo, historyIndex]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
    }
  }, [canRedo, historyIndex]);
  // --- End History State Management ---
  
  const [scaleInfo, setScaleInfo] = useState<ScaleInfo>({ pixelDistance: null, realDistance: null, ratio: null });
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isCableModalOpen, setIsCableModalOpen] = useState(false);
  const [isCircuitCableModalOpen, setIsCircuitCableModalOpen] = useState(false);
  const [isContainmentModalOpen, setIsContainmentModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState<string | null>(null);

  // PV Design State
  const [pvPanelConfig, setPvPanelConfig] = useState<PVPanelConfig | null>(null);
  const [modulesPerString, setModulesPerString] = useState<number>(20); // Default 20 modules per string
  const [isPvConfigModalOpen, setIsPvConfigModalOpen] = useState(false);
  const [isRoofMaskModalOpen, setIsRoofMaskModalOpen] = useState(false);
  const [isPvArrayModalOpen, setIsPvArrayModalOpen] = useState(false);
  const [pendingRoofMask, setPendingRoofMask] = useState<{ points: Point[]; pitch?: number; } | null>(null);
  const [pendingPvArrayConfig, setPendingPvArrayConfig] = useState<PVArrayConfig | null>(null);
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);

  const [pendingLine, setPendingLine] = useState<{ points: Point[]; length: number; } | null>(null);
  const [pendingCircuitCable, setPendingCircuitCable] = useState<{ points: Point[]; length: number; } | null>(null);
  const [pendingContainment, setPendingContainment] = useState<{ points: Point[]; length: number; type: ContainmentType; } | null>(null);
  const [editingCableId, setEditingCableId] = useState<string | null>(null); // For editing existing cables

  // Cloud State
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [currentDesignName, setCurrentDesignName] = useState<string | null>(null);
  // Use the project ID from props (dashboard context) as the source of truth
  const currentProjectId = projectId || null;
  const [isLoadDesignModalOpen, setIsLoadDesignModalOpen] = useState(false);
  const [designList, setDesignList] = useState<DesignListing[]>([]);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  const [isSavedReportsModalOpen, setIsSavedReportsModalOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isCircuitScheduleOpen, setIsCircuitScheduleOpen] = useState(false);
  const [isCircuitPanelOpen, setIsCircuitPanelOpen] = useState(false);
  const [isDrawingSheetOpen, setIsDrawingSheetOpen] = useState(false);
  const [selectedCircuit, setSelectedCircuit] = useState<DbCircuit | null>(null);
  const selectedCircuitRef = useRef<DbCircuit | null>(null);
  const [isSelectingRegion, setIsSelectingRegion] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [debugCapturedImage, setDebugCapturedImage] = useState<string | null>(null); // For debugging region capture

  // Fetch boards to get the selected board name
  const { data: distributionBoards } = useDistributionBoards(currentProjectId);
  
  // Fetch circuit materials for this floor plan (for takeoff counts)
  const { data: circuitMaterials } = useFloorPlanCircuitMaterials(currentDesignId, currentProjectId);
  
  // Calculate take-off counts for linking to final account (including circuit materials)
  const takeoffCounts = useTakeoffCounts(equipment, lines, containment, circuitMaterials);
  const selectedBoardName = useMemo(() => {
    if (!selectedCircuit || !distributionBoards) return undefined;
    const board = distributionBoards.find(b => b.id === selectedCircuit.distribution_board_id);
    return board?.name;
  }, [selectedCircuit, distributionBoards]);

  // Keep ref in sync with state
  useEffect(() => {
    selectedCircuitRef.current = selectedCircuit;
  }, [selectedCircuit]);

  const [scaleLine, setScaleLine] = useState<{start: Point, end: Point} | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [placementRotation, setPlacementRotation] = useState<number>(0);
  const mainContainerRef = useRef<HTMLElement>(null);
  const canvasApiRef = useRef<CanvasHandles>(null);

  const uniqueCableTypes = useMemo(() => {
    const types = new Set(lines.filter(l => l.type === 'lv' && l.cableType).map(l => l.cableType!));
    return Array.from(types);
  }, [lines]);

  const assigneeList = useMemo(() => {
    const names = new Set(tasks.map(t => t.assignedTo).filter(Boolean) as string[]);
    return Array.from(names).sort();
  }, [tasks]);

  const loadPdfData = async (data: ArrayBuffer | Blob, file?: File) => {
      setGlobalLoadingMessage("Loading PDF...");
      const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;
      const loadingTask = getDocument(arrayBuffer);
      try {
        const doc = await loadingTask.promise;
        if(file) setPdfFile(file);
        resetState();
        setPdfDoc(doc);
      } catch (error) {
        console.error("Error loading PDF: ", error);
        toast.error(`Failed to load PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setGlobalLoadingMessage(null);
      }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (file.size === 0) {
        toast.error('The selected PDF file is empty. Please select a valid PDF file.');
        event.target.value = '';
        return;
      }
      await loadPdfData(await file.arrayBuffer(), file);
    } else {
      toast.error('Please select a valid PDF file.');
    }
  };
  
  const handleSelectPurpose = (purpose: DesignPurpose) => {
    setDesignPurpose(purpose);
    setPurposeConfig(purposeConfigs[purpose]);
    if (purpose === DesignPurpose.PV_DESIGN) {
        setActiveTool(Tool.SCALE);
    }
  };

  const resetState = () => {
    resetStateWith(initialDesignState);
    setScaleInfo({ pixelDistance: null, realDistance: null, ratio: null });
    setScaleLine(null);
    setViewState({ zoom: 1, offset: { x: 0, y: 0 } });
    setInitialViewState(null);
    setActiveTool(Tool.PAN);
    setSelectedItemId(null);
    setPendingLine(null);
    setIsCableModalOpen(false);
    setPendingContainment(null);
    setIsContainmentModalOpen(false);
    setPlacementRotation(0);
    setDesignPurpose(null);
    setPurposeConfig(null);
    setPvPanelConfig(null);
    setModulesPerString(20);
    setPendingRoofMask(null);
    setPendingPvArrayConfig(null);
    setIsSnappingEnabled(true);
    setCurrentDesignId(null);
    setCurrentDesignName(null);
    // Don't reset currentProjectId - it comes from dashboard context
  }

  useEffect(() => {
    if (activeTool !== Tool.SELECT) setSelectedItemId(null);
    const isPlacementTool = purposeConfig && (Object.values(purposeConfig.equipmentToToolMap).includes(activeTool) || activeTool === Tool.TOOL_PV_ARRAY);
    if (!isPlacementTool) setPlacementRotation(0);
    if (activeTool !== Tool.TOOL_PV_ARRAY) setPendingPvArrayConfig(null);
    if (activeTool !== Tool.TOOL_ROOF_DIRECTION && pendingRoofMask?.pitch) setPendingRoofMask(null);
  }, [activeTool, purposeConfig, pendingRoofMask]);

  const handleToolSelect = (tool: Tool) => {
    if (tool === Tool.TOOL_PV_ARRAY) {
        if (!pvPanelConfig) {
            toast.error("Please configure PV panel details before placing an array.");
            return;
        }
        setIsPvArrayModalOpen(true);
    }
    setActiveTool(tool);
  };

  const handleSaveToCloud = async () => {
    if (!user) {
        toast.error("Please sign in to save your design to the cloud.");
        return;
    }
    if (!pdfFile) {
        toast.error("Cannot save a design without an associated PDF file.");
        return;
    }

    const designData = {
        ...currentDesign,
        designPurpose,
        scaleInfo,
        pvPanelConfig,
        modulesPerString,
        scaleLine,
    };

    setGlobalLoadingMessage("Saving design to cloud...");
    
    let savedDesignId: string | null = null;
    
    try {
        if (currentDesignId) {
            // Update existing design
            await updateDesign(currentDesignId, designData);
            savedDesignId = currentDesignId;
            toast.success(`Design '${currentDesignName}' updated successfully!`);
        } else {
            // Create new design
            const designName = prompt("Enter a name for this design:", `Design - ${new Date().toLocaleDateString()}`);
            if (!designName) {
                setGlobalLoadingMessage(null);
                return;
            }
            
            const newDesignId = await saveDesign(designName, designData, pdfFile, currentProjectId);
            setCurrentDesignId(newDesignId);
            setCurrentDesignName(designName);
            savedDesignId = newDesignId;
            toast.success(`Design '${designName}' saved successfully!`);
        }
        
        // Auto-sync to final account if mappings exist
        if (savedDesignId) {
            const syncResult = await autoSyncToFinalAccount(savedDesignId);
            if (syncResult.synced && syncResult.itemsUpdated > 0) {
                toast.success(`Final account updated: ${syncResult.itemsUpdated} items synced`);
            }
        }
    } catch (error) {
        console.error("Error saving design:", error);
        toast.error(`Failed to save design: ${error instanceof Error ? error.message : 'Unknown Error'}`);
    } finally {
        setGlobalLoadingMessage(null);
    }
  };

  const handleOpenLoadModal = async () => {
    if(!user) {
      toast.error("Please sign in to load designs from the cloud.");
      return;
    }
    setIsLoadDesignModalOpen(true);
    setIsLoadingDesigns(true);
    try {
      // Show all designs for the current project
      const designs = await listDesigns(false, currentProjectId);
      setDesignList(designs);
    } catch (error) {
      console.error("Error listing designs:", error);
      toast.error(`Failed to load design list: ${error instanceof Error ? error.message : 'Unknown Error'}`);
    } finally {
      setIsLoadingDesigns(false);
    }
  };

  const handleAssignToProject = async (designId: string) => {
    if (!currentProjectId) {
      toast.error("No project selected. Please select a project first.");
      return;
    }
    
    try {
      await assignDesignToProject(designId, currentProjectId);
      toast.success("Design assigned to current project!");
      // Refresh the design list - only show designs for current project
      const designs = await listDesigns(false, currentProjectId);
      setDesignList(designs);
    } catch (error) {
      console.error("Error assigning design:", error);
      toast.error(`Failed to assign design: ${error instanceof Error ? error.message : 'Unknown Error'}`);
    }
  };

  const handleLoadFromCloud = async (designId: string) => {
      if (!user) return;
      setIsLoadDesignModalOpen(false);
      setGlobalLoadingMessage("Loading design from cloud...");
      try {
          const { designData, pdfBlob } = await loadDesign(designId);
          const fileName = designData.pdf_url.split('/').pop() || 'design.pdf';
          const loadedFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
          await loadPdfData(pdfBlob, loadedFile);
          
          resetStateWith({
              equipment: designData.equipment || [],
              lines: designData.lines || [],
              zones: designData.zones || [],
              containment: designData.containment || [],
              walkways: designData.walkways || [],
              roofMasks: designData.roof_masks || [],
              pvArrays: designData.pv_arrays || [],
              tasks: designData.tasks || [],
          });
          setScaleInfo(designData.scale_info || { pixelDistance: null, realDistance: null, ratio: null });
          setScaleLine(designData.scale_line || null);
          setPvPanelConfig(designData.pv_panel_config || null);
          setModulesPerString(designData.modules_per_string || 20);
          setCurrentDesignId(designData.id);
          setCurrentDesignName(designData.name);
          // Don't override the currentProjectId from dashboard context

          if (designData.design_purpose && purposeConfigs[designData.design_purpose as DesignPurpose]) {
              handleSelectPurpose(designData.design_purpose as DesignPurpose);
          } else {
              handleSelectPurpose(DesignPurpose.BUDGET_MARKUP);
          }
          toast.success(`Design '${designData.name}' loaded successfully!`);

      } catch (error) {
          console.error("Error loading design:", error);
          toast.error(`Failed to load design: ${error instanceof Error ? error.message : 'Unknown Error'}`);
      } finally {
          setGlobalLoadingMessage(null);
      }
  };

  const handleDeleteDesign = async (designId: string, designName: string) => {
      if (!user) return;
      
      if (!window.confirm(`Are you sure you want to delete "${designName}"? This action cannot be undone.`)) {
          return;
      }
      
      try {
          await deleteDesign(designId);
          toast.success(`Design "${designName}" deleted successfully!`);
          
          // Refresh the design list
          setDesignList(prev => prev.filter(d => d.id !== designId));
      } catch (error) {
          console.error("Error deleting design:", error);
          toast.error(`Failed to delete design: ${error instanceof Error ? error.message : 'Unknown Error'}`);
      }
  };


  const handlePrint = () => {
    const canvases = canvasApiRef.current?.getCanvases();
    if (!canvases?.pdf || !canvases?.drawing) {
        toast.error('Could not access canvas to generate PDF.');
        return;
    }
    setIsExportModalOpen(true);
  };

  const handleConfirmExport = async ({ projectName, comments }: { projectName: string; comments: string }) => {
    const canvases = canvasApiRef.current?.getCanvases();
    if (!canvases?.pdf || !canvases?.drawing) return toast.error('Canvas elements not ready.');
    if (!projectName) return toast.error("Project name is required.");
    if (!scaleInfo.ratio) return toast.error("Cannot export without a valid scale.");
    
    if (!user) {
      toast.error("Please log in to export PDFs.");
      return;
    }
    
    toast.info("Generating PDF... This may take a moment.");
    setIsExportModalOpen(false);
    
    try {
      const { svgPagesToPdfBlob } = await import("@/utils/svg-pdf/svgToPdfEngine");
      const { buildFloorPlanReportPdf } = await import("@/utils/svg-pdf/floorPlanPdfBuilder");
      type FloorPlanReportData = import("@/utils/svg-pdf/floorPlanPdfBuilder").FloorPlanReportData;
      const { imageToBase64 } = await import("@/utils/svg-pdf/imageUtils");

      // Get next revision number
      const { data: existingReports } = await supabase
        .from('floor_plan_reports')
        .select('report_revision')
        .eq('project_name', projectName)
        .order('report_revision', { ascending: false })
        .limit(1);

      const nextRevision = existingReports && existingReports.length > 0 
        ? existingReports[0].report_revision + 1 
        : 1;

      // Get company data for cover page
      const { data: company } = await supabase.from("company_settings").select("company_name, company_logo_url").limit(1).maybeSingle();
      let companyLogoBase64: string | null = null;
      if (company?.company_logo_url) { try { companyLogoBase64 = await imageToBase64(company.company_logo_url); } catch {} }

      // Capture floor plan image from canvas
      let floorPlanImageBase64: string | undefined;
      const canvases = canvasApiRef.current?.getCanvases();
      if (canvases?.drawing) {
        try { floorPlanImageBase64 = canvases.drawing.toDataURL('image/png'); } catch {}
      }

      const pdfData: FloorPlanReportData = {
        coverData: {
          reportTitle: "Floor Plan Report",
          reportSubtitle: currentDesignName || "Floor Plan Layout",
          projectName,
          revision: `Rev ${nextRevision}`,
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          companyName: company?.company_name || undefined,
          companyLogoBase64,
        },
        projectName,
        layoutName: currentDesignName || "Floor Plan",
        floorPlanImageBase64,
        equipment: equipment.map(e => ({
          tag: e.name || e.id,
          type: e.type,
          location: `(${Math.round(e.position.x)}, ${Math.round(e.position.y)})`,
          quantity: 1,
        })),
        cables: lines.map(l => ({
          tag: l.name || l.id,
          from: l.from || '',
          to: l.to || '',
          type: l.cableType || '',
          size: '',
          length: l.length || l.pathLength || 0,
        })),
        containment: containment.map(c => ({
          type: c.type,
          size: c.size || '',
          length: c.length || 0,
          route: '',
        })),
      };

      const pages = buildFloorPlanReportPdf(pdfData);
      const { blob } = await svgPagesToPdfBlob(pages);

      // Upload to storage
      const filename = `${projectName}_Rev${nextRevision}_${Date.now()}.pdf`;
      const storagePath = `${currentProjectId}/${filename}`;
      const { error: uploadError } = await supabase.storage
        .from('floor-plan-reports')
        .upload(storagePath, blob, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('floor_plan_reports')
        .insert({
          user_id: user.id,
          project_id: currentProjectId,
          project_name: projectName,
          file_path: storagePath,
          report_revision: nextRevision,
          comments: comments || null,
        });

      if (dbError) throw dbError;

      toast.success(`PDF saved to cloud (Rev ${nextRevision}). Access via "View Saved Reports" in File Actions.`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error(`PDF Generation Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const completeScaling = useCallback((line: {start: Point, end: Point}) => {
    const pixelDistance = Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y);
    setScaleLine(line);
    setScaleInfo(prev => ({ ...prev, pixelDistance }));
    setIsScaleModalOpen(true);
  }, []);

  const handleScaleLabelPositionChange = useCallback((position: Point | null) => {
    setScaleInfo(prev => ({ ...prev, labelPosition: position }));
  }, []);

  const handleScaleSubmit = (realDistance: number) => {
    if (scaleInfo.pixelDistance) {
      setScaleInfo(prev => ({
        ...prev,
        realDistance: realDistance,
        ratio: realDistance / (prev.pixelDistance || 1),
      }));
      if (designPurpose === DesignPurpose.PV_DESIGN) setIsPvConfigModalOpen(true);
    }
    setIsScaleModalOpen(false);
    // Keep scaleLine visible so users can see where scale was set
    setActiveTool(Tool.PAN);
    toast.success("Scale set successfully!");
  };
  
  const handleInitialViewCalculated = useCallback((vs: ViewState) => {
    setViewState(vs);
    setInitialViewState(vs);
  }, []);

  const handleResetZoom = useCallback(() => {
      if(!canvasApiRef.current || !mainContainerRef.current) return;
      const canvases = canvasApiRef.current.getCanvases();
      if(!canvases.pdf) return;
      
      // Get the actual visible canvas area (the main container)
      const containerWidth = mainContainerRef.current.clientWidth;
      const containerHeight = mainContainerRef.current.clientHeight;
      const pdfWidth = canvases.pdf.width;
      const pdfHeight = canvases.pdf.height;
      
      // Calculate zoom to fit with some padding
      const fitZoom = Math.min(containerWidth / pdfWidth, containerHeight / pdfHeight) * 0.95;
      
      // Center the PDF in the visible area
      const fitOffsetX = (containerWidth - pdfWidth * fitZoom) / 2;
      const fitOffsetY = (containerHeight - pdfHeight * fitZoom) / 2;
      
      setViewState({ zoom: fitZoom, offset: { x: fitOffsetX, y: fitOffsetY } });
  }, []);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement).nodeName === 'INPUT' || (e.target as HTMLElement).nodeName === 'TEXTAREA') return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? handleRedo() : handleUndo(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); return; }
        const isPlacementTool = purposeConfig && (Object.values(purposeConfig.equipmentToToolMap).includes(activeTool) || (activeTool === Tool.TOOL_PV_ARRAY && !!pendingPvArrayConfig));
        if ((e.key === 'r' || e.key === 'R') && isPlacementTool) { e.preventDefault(); setPlacementRotation(prev => (prev + 45) % 360); }
        if (e.key === 'f' || e.key === 'F') { e.preventDefault(); handleResetZoom(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, purposeConfig, handleResetZoom, pendingPvArrayConfig, handleUndo, handleRedo]);

  // Handle auto-assigning canvas items to the selected circuit when created
  const handleAutoAssignToCircuit = useCallback(async (description: string, quantity: number, unit: string) => {
    const circuit = selectedCircuitRef.current;
    console.log('handleAutoAssignToCircuit called:', { description, quantity, unit, circuit });
    
    if (!circuit) {
      console.log('No circuit selected, skipping auto-assign');
      return;
    }
    
    try {
      console.log('Creating circuit material for circuit:', circuit.id);
      const isUnassigned = circuit.id === 'unassigned';
      await createCircuitMaterial.mutateAsync({
        circuit_id: isUnassigned ? null : circuit.id,
        description,
        quantity,
        unit,
        // Include project_id for unassigned materials (required by RLS)
        ...(isUnassigned && currentProjectId ? { project_id: currentProjectId } : {}),
      });
      console.log('Circuit material created successfully');
    } catch (error: any) {
      console.error('Failed to auto-assign material:', error);
    }
  }, [createCircuitMaterial, currentProjectId]);

  // Handle equipment placement - auto-assign to selected circuit
  const handleEquipmentPlaced = useCallback((equipmentType: string) => {
    const circuit = selectedCircuitRef.current;
    console.log('handleEquipmentPlaced called:', { equipmentType, circuit });
    if (circuit) {
      handleAutoAssignToCircuit(equipmentType, 1, 'No');
    }
  }, [selectedCircuit, handleAutoAssignToCircuit]);

  const handleLvLineComplete = useCallback((line: { points: Point[]; length: number; }) => {
      setPendingLine(line);
      setIsCableModalOpen(true);
  }, []);

  const handleCircuitCableComplete = useCallback((line: { points: Point[]; length: number; }) => {
      setPendingCircuitCable(line);
      setIsCircuitCableModalOpen(true);
  }, []);

  const handleCircuitCableSubmit = async (details: CircuitCableFormData) => {
    if (!pendingCircuitCable) return;
    const totalLength = pendingCircuitCable.length + details.startHeight + details.endHeight;
    
    // Get the circuit ID from dialog selection or current selected circuit
    const circuitId = details.dbCircuitId || selectedCircuitRef.current?.id;
    
    // Create as a SupplyLine with circuit cable data
    const newLine: SupplyLine = {
      id: `circuit-${Date.now()}`,
      name: details.circuitRef,
      label: `${details.circuitRef}: ${details.from} → ${details.to}`,
      type: 'lv',
      points: pendingCircuitCable.points,
      length: totalLength,
      pathLength: pendingCircuitCable.length,
      from: details.from,
      to: details.to,
      cableType: details.cableType,
      startHeight: details.startHeight,
      endHeight: details.endHeight,
      dbCircuitId: circuitId, // Store the circuit ID directly on the line
    };
    setLines(prev => [...prev, newLine]);
    
    // Also create a db_circuit_materials record if circuit is assigned
    if (circuitId) {
      try {
        const isUnassigned = circuitId === 'unassigned';
        await createCircuitMaterial.mutateAsync({
          circuit_id: isUnassigned ? null : circuitId,
          description: `${details.cableType} - ${details.from} to ${details.to}`,
          quantity: Math.round(totalLength * 100) / 100,
          unit: 'm',
          supply_rate: details.supplyRate,
          install_rate: details.installRate,
          boq_item_code: details.boqItemCode,
          master_material_id: details.masterMaterialId,
          final_account_item_id: details.finalAccountItemId,
          canvas_line_id: newLine.id, // Link for sync deletion when line is removed
          ...(isUnassigned && currentProjectId ? { project_id: currentProjectId } : {}),
        });
        toast.success(`Circuit cable ${details.circuitRef} added and assigned to circuit`);
      } catch (error: any) {
        console.error('Failed to assign cable to circuit:', error);
        toast.error('Cable added but failed to assign to circuit');
      }
    } else {
      toast.success(`Circuit cable ${details.circuitRef} added (not assigned to circuit)`);
    }
    
    setIsCircuitCableModalOpen(false);
    setPendingCircuitCable(null);
  };
  
  const handleContainmentDrawComplete = useCallback((line: { points: Point[]; length: number; type: ContainmentType; }) => {
      // Types that have predefined sizes (no modal needed)
      const typesWithoutSizeModal = [
        ContainmentType.SLEEVES, 
        ContainmentType.POWERSKIRTING, 
        ContainmentType.P2000_TRUNKING, 
        ContainmentType.P8000_TRUNKING, 
        ContainmentType.P9000_TRUNKING,
        // Conduits have size in their type name, no modal needed
        ContainmentType.CONDUIT_20MM,
        ContainmentType.CONDUIT_25MM,
        ContainmentType.CONDUIT_32MM,
        ContainmentType.CONDUIT_40MM,
        ContainmentType.CONDUIT_50MM,
      ];
      if (typesWithoutSizeModal.includes(line.type)) {
        setContainment(prev => [...prev, { id: `containment-${Date.now()}`, type: line.type, size: line.type, points: line.points, length: line.length, }]);
        // Auto-assign to selected circuit using ref
        const circuit = selectedCircuitRef.current;
        if (circuit) {
          handleAutoAssignToCircuit(`${line.type}`, line.length, 'm');
        }
      } else {
        setPendingContainment(line);
        setIsContainmentModalOpen(true);
      }
  }, [handleAutoAssignToCircuit]);

  const handleWalkwayDrawComplete = useCallback((line: { points: Point[]; length: number; }) => {
      setWalkways(prev => [...prev, { 
        id: `walkway-${Date.now()}`, 
        points: line.points, 
        length: line.length,
        width: 0.55 // Fixed 550mm width
      }]);
  }, []);

  const handleCableDetailsSubmit = async (details: { 
    from: string, 
    to: string, 
    cableType: string, 
    terminationCount: number, 
    startHeight: number, 
    endHeight: number, 
    label: string,
    calculatedLength: number
  }) => {
      if (!pendingLine) return;
      const pathLength = pendingLine.length;
      const totalLength = pathLength + details.startHeight + details.endHeight;
      
      // Capture circuit reference IMMEDIATELY at start of function
      const circuitForAssignment = selectedCircuitRef.current;
      console.log('[handleCableDetailsSubmit] Starting - circuit:', circuitForAssignment?.circuit_ref || 'none', 'id:', circuitForAssignment?.id || 'none');
      
      // Check if we're editing an existing cable
      const isEditing = !!editingCableId;
      const existingCable = isEditing ? lines.find(l => l.id === editingCableId) : null;
      let cableEntryId: string | undefined = existingCable?.cableEntryId;

      // Auto-save to database if we have a project ID
      if (projectId) {
        try {
          if (isEditing && existingCable?.cableEntryId) {
            // Update existing cable_entry
            const { error: updateError } = await supabase
              .from('cable_entries')
              .update({
                cable_tag: details.label || `${details.from}-${details.to}`,
                from_location: details.from,
                to_location: details.to,
                cable_type: details.cableType,
                measured_length: details.calculatedLength,
                extra_length: details.startHeight + details.endHeight,
                total_length: details.calculatedLength + details.startHeight + details.endHeight,
                notes: `Terminations: ${details.terminationCount}`,
              })
              .eq('id', existingCable.cableEntryId);

            if (updateError) throw updateError;
            toast.success('Cable updated');
          } else {
            // Create new cable_entry
            const { data: schedules } = await supabase
              .from('cable_schedules')
              .select('id')
              .eq('project_id', projectId)
              .order('created_at', { ascending: false })
              .limit(1);

            const scheduleId = schedules?.[0]?.id;

            const { data: cableEntry, error: entryError } = await supabase
              .from('cable_entries')
              .insert({
                schedule_id: scheduleId,
                floor_plan_id: currentDesignId,
                created_from: 'floor_plan',
                cable_tag: details.label || `${details.from}-${details.to}`,
                from_location: details.from,
                to_location: details.to,
                cable_type: details.cableType,
                measured_length: details.calculatedLength,
                extra_length: details.startHeight + details.endHeight,
                total_length: details.calculatedLength + details.startHeight + details.endHeight,
                notes: `Terminations: ${details.terminationCount}`,
                installation_method: 'ducts',
                quantity: 1
              })
              .select()
              .single();

            if (entryError) throw entryError;
            
            cableEntryId = cableEntry.id;

            // Save to floor_plan_cables for reference
            await supabase.from('floor_plan_cables').insert({
              floor_plan_id: currentDesignId,
              cable_type: details.cableType,
              points: pendingLine.points as any,
              length_meters: totalLength,
              from_label: details.from,
              to_label: details.to,
              label: details.label,
              termination_count: details.terminationCount,
              start_height: details.startHeight,
              end_height: details.endHeight,
              cable_entry_id: cableEntryId
            });

            toast.success('Cable saved to schedule');
          }
        } catch (error) {
          console.error('Error saving cable:', error);
          toast.error('Failed to save cable to schedule');
        }
      }

      if (isEditing && editingCableId) {
        // Update existing line
        setLines(prev => prev.map(line => 
          line.id === editingCableId
            ? {
                ...line,
                name: `${details.from} to ${details.to}`,
                from: details.from,
                to: details.to,
                cableType: details.cableType,
                terminationCount: details.terminationCount,
                startHeight: details.startHeight,
                endHeight: details.endHeight,
                label: details.label,
                length: totalLength,
                pathLength: pathLength,
                cableEntryId: cableEntryId || line.cableEntryId
              }
            : line
        ));
        toast.success('Cable updated');
      } else {
        // Create new line
        const newLine: SupplyLine = {
            id: `line-${Date.now()}`, name: `${details.from} to ${details.to}`, type: 'lv' as const, points: pendingLine.points, 
            length: totalLength, pathLength: pathLength, from: details.from, to: details.to, cableType: details.cableType,
            terminationCount: details.terminationCount, startHeight: details.startHeight, endHeight: details.endHeight, label: details.label,
            cableEntryId: cableEntryId
        };
        setLines(prev => [...prev, newLine]);
        
        // Auto-assign to selected circuit using the captured reference from start
        console.log('[handleCableDetailsSubmit] About to assign - circuit:', circuitForAssignment?.circuit_ref || 'none');
        if (circuitForAssignment) {
          try {
            console.log('[handleCableDetailsSubmit] Creating material for circuit:', circuitForAssignment.id);
            const isUnassigned = circuitForAssignment.id === 'unassigned';
            await createCircuitMaterial.mutateAsync({
              circuit_id: isUnassigned ? null : circuitForAssignment.id,
              description: `${details.cableType} - ${details.from} to ${details.to}`,
              quantity: Math.round(totalLength * 100) / 100,
              unit: 'm',
              ...(isUnassigned && currentProjectId ? { project_id: currentProjectId } : {}),
            });
            console.log('[handleCableDetailsSubmit] Material created successfully');
            toast.success(`Cable assigned to ${circuitForAssignment.circuit_ref}`);
          } catch (error: any) {
            console.error('[handleCableDetailsSubmit] Failed to assign:', error);
            toast.error('Cable saved but failed to assign to circuit');
          }
        } else {
          console.log('[handleCableDetailsSubmit] No circuit selected, skipping assignment');
        }
      }
      
      setIsCableModalOpen(false);
      setPendingLine(null);
      setEditingCableId(null);
  };

  const handleContainmentDetailsSubmit = (details: { size: string }) => {
      if (!pendingContainment) return;
      setContainment(prev => [...prev, { id: `containment-${Date.now()}`, type: pendingContainment.type, size: details.size, points: pendingContainment.points, length: pendingContainment.length, }]);
      
      // Auto-assign to selected circuit using ref
      const circuit = selectedCircuitRef.current;
      if (circuit) {
        handleAutoAssignToCircuit(`${pendingContainment.type} - ${details.size}`, pendingContainment.length, 'm');
      }
      
      setIsContainmentModalOpen(false);
      setPendingContainment(null);
  };
  
  const handleEquipmentUpdate = (updatedItem: EquipmentItem) => setEquipment(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  const handleZoneUpdate = (updatedZone: SupplyZone) => setZones(prev => prev.map(zone => zone.id === updatedZone.id ? updatedZone : zone));

  // Edit an existing cable - opens the modal with pre-populated values
  const handleEditCable = useCallback((cable: SupplyLine) => {
    // Set the cable as pending for edit (reusing the pending line flow)
    setPendingLine({ points: cable.points || [], length: cable.pathLength || cable.length });
    setEditingCableId(cable.id);
    setIsCableModalOpen(true);
  }, []);

  const handleJumpToZone = useCallback((zone: SupplyZone) => {
    if (canvasApiRef.current) {
      canvasApiRef.current.jumpToZone(zone);
    }
  }, []);

  const handleJumpToRoofMask = useCallback((mask: RoofMask) => {
    if (canvasApiRef.current && mask.points.length > 0) {
      // Calculate center of the roof mask polygon
      const center = mask.points.reduce(
        (acc, p) => ({ x: acc.x + p.x / mask.points.length, y: acc.y + p.y / mask.points.length }),
        { x: 0, y: 0 }
      );
      // Use jumpToZone-like behavior - create a temporary zone-like object
      canvasApiRef.current.jumpToZone({ id: mask.id, points: mask.points, name: 'Roof Mask', color: '#9470D8', area: 0 });
    }
    setSelectedItemId(mask.id);
  }, []);

  const handleDeleteSelectedItem = async () => {
    if (!selectedItemId) return;
    if (window.confirm(`Are you sure you want to delete this item? This will also delete any linked tasks and circuit materials.`)) {
        // Check if this is a line (circuit wiring) and delete associated materials
        const isLine = lines.some(l => l.id === selectedItemId);
        if (isLine) {
          try {
            await deleteCircuitMaterialByCanvasLine.mutateAsync(selectedItemId);
          } catch (error) {
            console.log('No linked circuit material found or already deleted');
          }
        }
        
        setState(prev => {
            setSelectedItemId(null);
            return { 
                ...prev, 
                equipment: prev.equipment.filter(e => e.id !== selectedItemId),
                zones: prev.zones.filter(z => z.id !== selectedItemId),
                pvArrays: prev.pvArrays.filter(p => p.id !== selectedItemId),
                lines: prev.lines.filter(l => l.id !== selectedItemId),
                containment: prev.containment.filter(c => c.id !== selectedItemId),
                roofMasks: prev.roofMasks.filter(rm => rm.id !== selectedItemId),
                tasks: prev.tasks.filter(t => t.linkedItemId !== selectedItemId),
            };
        });
    }
  };

  const handleOpenTaskModal = (task: Partial<Task> | null) => { setEditingTask(task); setIsTaskModalOpen(true); };
  
  const handleTaskSubmit = (taskData: Omit<Task, 'id'> & { id?: string }) => {
      if (taskData.id) {
          setTasks(prev => prev.map(t => t.id === taskData.id ? { ...t, ...taskData } as Task : t));
      } else {
          setTasks(prev => [...prev, { ...taskData, id: `task-${Date.now()}` } as Task]);
      }
      setIsTaskModalOpen(false);
      setEditingTask(null);
  };

  const handlePvConfigSubmit = (config: PVPanelConfig) => { setPvPanelConfig(config); setIsPvConfigModalOpen(false); setActiveTool(Tool.PAN); };
  const handleRoofMaskDrawComplete = useCallback((points: Point[]) => { setPendingRoofMask({ points }); setIsRoofMaskModalOpen(true); }, []);
  const handleRoofMaskSubmit = useCallback((details: { pitch: number }) => { if (!pendingRoofMask) return; setPendingRoofMask(prev => ({ ...prev!, pitch: details.pitch })); setActiveTool(Tool.TOOL_ROOF_DIRECTION); setIsRoofMaskModalOpen(false); }, [pendingRoofMask]);
  
  // Calculate polygon area using shoelace formula
  const calculatePolygonArea = useCallback((vertices: Point[]): number => {
    if (!scaleInfo.ratio || vertices.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area / 2) * Math.pow(scaleInfo.ratio, 2);
  }, [scaleInfo.ratio]);
  
  const handleRoofDirectionSet = useCallback((direction: number) => { 
    if (!pendingRoofMask || typeof pendingRoofMask.pitch === 'undefined') return; 
    const area = calculatePolygonArea(pendingRoofMask.points);
    setRoofMasks(prev => [...prev, { 
      id: `roofmask-${Date.now()}`, 
      points: pendingRoofMask.points, 
      pitch: pendingRoofMask.pitch, 
      direction: direction,
      area: area
    }]); 
    setPendingRoofMask(null); 
    setActiveTool(Tool.PAN); 
  }, [pendingRoofMask, setRoofMasks, calculatePolygonArea]);
  
  const handleRoofMaskUpdate = useCallback((updatedMask: RoofMask) => {
    setRoofMasks(prev => prev.map(mask => 
      mask.id === updatedMask.id ? updatedMask : mask
    ));
  }, [setRoofMasks]);
  const cancelRoofCreation = useCallback(() => { setPendingRoofMask(null); setActiveTool(Tool.PAN); }, []);
  const handlePvArrayConfigSubmit = (config: PVArrayConfig) => { setPendingPvArrayConfig(config); setIsPvArrayModalOpen(false); };
  const handlePlacePvArray = (array: Omit<PVArrayItem, 'id'>) => setPvArrays(prev => [...prev, { id: `pvarray-${Date.now()}`, ...array }]);

  // Capture layout as image for AI scanning
  const handleCaptureLayout = useCallback(async (): Promise<string | null> => {
    const canvases = canvasApiRef.current?.getCanvases();
    if (!canvases?.pdf) {
      return null;
    }
    try {
      // Create a combined canvas with PDF and drawings
      const pdfCanvas = canvases.pdf;
      const drawingCanvas = canvases.drawing;
      
      const combinedCanvas = document.createElement('canvas');
      combinedCanvas.width = pdfCanvas.width;
      combinedCanvas.height = pdfCanvas.height;
      const ctx = combinedCanvas.getContext('2d');
      
      if (!ctx) return null;
      
      // Draw PDF first
      ctx.drawImage(pdfCanvas, 0, 0);
      
      // Draw overlay if exists
      if (drawingCanvas) {
        ctx.drawImage(drawingCanvas, 0, 0);
      }
      
      // Convert to base64
      const dataUrl = combinedCanvas.toDataURL('image/png');
      return dataUrl.replace(/^data:image\/\w+;base64,/, '');
    } catch (err) {
      console.error('Failed to capture layout:', err);
      return null;
    }
  }, []);

  // Capture a specific region of the layout
  const handleCaptureRegion = useCallback(async (region: { x: number; y: number; width: number; height: number }): Promise<string | null> => {
    console.log('=== handleCaptureRegion START ===');
    console.log('Input region:', JSON.stringify(region));
    console.log('Current viewState:', JSON.stringify(viewState));
    
    const canvases = canvasApiRef.current?.getCanvases();
    if (!canvases?.pdf) {
      console.error('No PDF canvas available');
      toast.error('No PDF canvas available');
      return null;
    }
    try {
      const pdfCanvas = canvases.pdf;
      console.log('PDF canvas size:', pdfCanvas.width, 'x', pdfCanvas.height);
      
      // The PDF canvas has CSS transform: translate(offset.x, offset.y) scale(zoom)
      // with transformOrigin: 'top left'
      // 
      // The canvas intrinsic size is pdfCanvas.width x pdfCanvas.height (actual pixels)
      // The visual size on screen is: intrinsic_size * zoom
      // The visual position is: (offset.x, offset.y) relative to its container
      //
      // The region coordinates are relative to the container (overlay covers the container)
      // 
      // To convert region coords to canvas pixel coords:
      // 1. Subtract the offset to get position relative to canvas visual origin
      // 2. Divide by zoom to get canvas pixel coordinates
      
      const { zoom, offset } = viewState;
      
      // Convert region (relative to container) to PDF canvas pixel coordinates
      const pdfRegion = {
        x: (region.x - offset.x) / zoom,
        y: (region.y - offset.y) / zoom,
        width: region.width / zoom,
        height: region.height / zoom
      };
      
      console.log('Calculated pdfRegion:', JSON.stringify(pdfRegion));
      
      // Clamp to canvas bounds
      const clampedRegion = {
        x: Math.max(0, Math.min(pdfRegion.x, pdfCanvas.width - 1)),
        y: Math.max(0, Math.min(pdfRegion.y, pdfCanvas.height - 1)),
        width: 0,
        height: 0
      };
      clampedRegion.width = Math.min(pdfRegion.width, pdfCanvas.width - clampedRegion.x);
      clampedRegion.height = Math.min(pdfRegion.height, pdfCanvas.height - clampedRegion.y);
      
      console.log('Clamped region:', JSON.stringify(clampedRegion));
      
      // Check if selection is actually over the PDF content
      if (clampedRegion.x >= pdfCanvas.width || clampedRegion.y >= pdfCanvas.height ||
          clampedRegion.width <= 10 || clampedRegion.height <= 10) {
        console.error('Region outside PDF or too small:', clampedRegion);
        toast.error('Please select an area over the PDF content');
        return null;
      }
      
      // Create output canvas at a good resolution for AI analysis
      // Scale up to at least 2048px on longest side for better OCR
      const maxDimension = 2048;
      const scaleFactor = Math.max(1, maxDimension / Math.max(clampedRegion.width, clampedRegion.height));
      
      const regionCanvas = document.createElement('canvas');
      regionCanvas.width = Math.round(clampedRegion.width * scaleFactor);
      regionCanvas.height = Math.round(clampedRegion.height * scaleFactor);
      const ctx = regionCanvas.getContext('2d');
      
      if (!ctx) return null;
      
      // Fill with white background first (in case of transparency)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, regionCanvas.width, regionCanvas.height);
      
      // Enable high quality image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw the PDF region at higher resolution
      ctx.drawImage(
        pdfCanvas,
        clampedRegion.x, clampedRegion.y, clampedRegion.width, clampedRegion.height,
        0, 0, regionCanvas.width, regionCanvas.height
      );
      
      console.log('Output canvas size:', regionCanvas.width, 'x', regionCanvas.height, 
        'from source region:', Math.round(clampedRegion.width), 'x', Math.round(clampedRegion.height));
      
      const dataUrl = regionCanvas.toDataURL('image/png');
      
      // DEBUG: Open captured image in new tab so user can verify what's being captured
      console.log('Opening captured image preview...');
      const debugWindow = window.open('', '_blank');
      if (debugWindow) {
        debugWindow.document.write(`
          <html>
            <head><title>Captured Region Preview</title></head>
            <body style="margin:0; background:#333; display:flex; justify-content:center; align-items:center; min-height:100vh;">
              <div style="text-align:center; color:white;">
                <h2>This is the image being sent to AI for analysis:</h2>
                <img src="${dataUrl}" style="max-width:90vw; max-height:80vh; border:2px solid #fff;" />
                <p style="margin-top:20px;">If this doesn't match what you selected, the coordinate mapping is wrong.</p>
              </div>
            </body>
          </html>
        `);
      }
      
      return dataUrl.replace(/^data:image\/\w+;base64,/, '');
    } catch (err) {
      console.error('Failed to capture region:', err);
      return null;
    }
  }, [viewState, toast]);

  const handleStartRegionSelect = useCallback(() => {
    setIsSelectingRegion(true);
    setSelectedRegion(null);
  }, []);

  const handleRegionSelected = useCallback(async (region: { x: number; y: number; width: number; height: number }) => {
    console.log('handleRegionSelected called with region:', region);
    console.log('Current viewState:', JSON.stringify(viewState));
    
    // Capture the region image
    const imageBase64 = await handleCaptureRegion(region);
    if (!imageBase64) {
      toast.error('Failed to capture region');
      return;
    }
    
    // Store the image for debug preview
    setDebugCapturedImage(`data:image/png;base64,${imageBase64}`);
    
    console.log('Region captured, starting scan...');
    setGlobalLoadingMessage('Scanning region for circuit references...');
    
    try {
      // Trigger the scan
      const result = await scanLayout(imageBase64, 'image/png');
      console.log('Scan result:', result);
      
      if (result && result.distribution_boards?.length > 0) {
        // Open the circuit schedule panel to show results
        setIsCircuitScheduleOpen(true);
      }
    } finally {
      setGlobalLoadingMessage(null);
    }
    
    setSelectedRegion(null);
    setIsSelectingRegion(false);
  }, [handleCaptureRegion, scanLayout, toast, viewState]);

  const handleCancelRegionSelect = useCallback(() => {
    setIsSelectingRegion(false);
    setSelectedRegion(null);
  }, []);

  const pvDesignReady = useMemo(() => designPurpose !== DesignPurpose.PV_DESIGN || (!!scaleInfo.ratio && !!pvPanelConfig), [designPurpose, scaleInfo.ratio, pvPanelConfig]);

  return (
    <div className="h-full w-full flex overflow-hidden bg-background relative">
      {globalLoadingMessage && (
        <div className="absolute inset-0 bg-background/80 z-[100] flex flex-col items-center justify-center gap-4 animate-fade-in">
          <Loader className="h-12 w-12 text-primary animate-spin" />
          <p className="text-lg text-foreground">{globalLoadingMessage}</p>
        </div>
      )}
      
      {/* Left Sidebar - Toolbar */}
      <Toolbar
        activeTool={activeTool} onToolSelect={handleToolSelect} onFileChange={handleFileChange}
        onSaveToCloud={handleSaveToCloud} onLoadFromCloud={handleOpenLoadModal} onPrint={handlePrint}
        isPdfLoaded={!!pdfDoc && !!purposeConfig}
        placementRotation={placementRotation} onRotationChange={setPlacementRotation}
        purposeConfig={purposeConfig} isPvDesignReady={pvDesignReady} isSnappingEnabled={isSnappingEnabled}
        setIsSnappingEnabled={setIsSnappingEnabled} user={user}
        onUndo={handleUndo} onRedo={handleRedo}
        canUndo={canUndo} canRedo={canRedo} onResetView={handleResetZoom}
        scaleInfo={scaleInfo}
        onOpenSavedReports={() => setIsSavedReportsModalOpen(true)}
        onLinkToFinalAccount={() => setIsLinkDialogOpen(true)}
        onOpenCircuitSchedule={() => setIsCircuitScheduleOpen(true)}
        onOpenCircuitPanel={() => setIsCircuitPanelOpen(true)}
        onOpenDrawingSheet={() => setIsDrawingSheetOpen(true)}
        hasDesignId={!!currentDesignId}
        hasProjectId={!!currentProjectId}
      />
      
      {/* Center - Canvas Area */}
      <main ref={mainContainerRef} className="flex-1 min-w-0 flex flex-col relative overflow-hidden bg-background">
          {!pdfDoc ? (
            user ? (
              <SavedDesignsGallery 
                onLoadDesign={handleLoadFromCloud}
                onNewDesign={handleOpenLoadModal}
                currentProjectId={currentProjectId}
              />
            ) : (
              <div className="flex-1 flex justify-center items-center bg-muted/30">
                <div className="text-center p-8 border-2 border-dashed border-border rounded-lg animate-fade-in max-w-md">
                  <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h2 className="text-2xl font-semibold text-foreground">Load a PDF Floor Plan</h2>
                  <p className="mt-2 text-muted-foreground">Sign in to save and access your designs.</p>
                </div>
              </div>
            )
          ) : !purposeConfig ? (
            <DesignPurposeSelector onSelectPurpose={handleSelectPurpose} />
          ) : (
            <>
              <Canvas
                  ref={canvasApiRef} pdfDoc={pdfDoc} activeTool={activeTool} viewState={viewState} setViewState={setViewState}
                  equipment={equipment} setEquipment={setEquipment} lines={lines} setLines={setLines}
                  zones={zones} setZones={setZones} containment={containment} setContainment={setContainment}
                  walkways={walkways} setWalkways={setWalkways}
                  scaleInfo={scaleInfo} onScaleLabelPositionChange={handleScaleLabelPositionChange} onScalingComplete={completeScaling} onLvLineComplete={handleLvLineComplete}
                  onCircuitCableComplete={handleCircuitCableComplete}
                  onContainmentDrawComplete={handleContainmentDrawComplete} onWalkwayDrawComplete={handleWalkwayDrawComplete} scaleLine={scaleLine} onInitialViewCalculated={handleInitialViewCalculated}
                  selectedItemId={selectedItemId} setSelectedItemId={setSelectedItemId} placementRotation={placementRotation}
                  purposeConfig={purposeConfig} pvPanelConfig={pvPanelConfig} roofMasks={roofMasks} onRoofMaskDrawComplete={handleRoofMaskDrawComplete}
                  pendingPvArrayConfig={pendingPvArrayConfig} onPlacePvArray={handlePlacePvArray} isSnappingEnabled={isSnappingEnabled}
                  pendingRoofMask={pendingRoofMask} onRoofDirectionSet={handleRoofDirectionSet} onCancelRoofCreation={cancelRoofCreation}
                  pvArrays={pvArrays} setPvArrays={setPvArrays} tasks={tasks}
                  onEquipmentPlaced={handleEquipmentPlaced}
                  selectedCircuit={selectedCircuit}
              />
              {(designPurpose === DesignPurpose.PV_DESIGN && !pvDesignReady) && (
                 <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="text-center p-4 bg-card/95 border border-border rounded-lg shadow-lg">
                        {!scaleInfo.ratio ? (
                            <><h2 className="text-lg font-semibold text-foreground">Set Scale for PV Design</h2><p className="mt-1 text-sm text-muted-foreground">The <span className='text-primary font-semibold'>Scale</span> tool is active. Click the start and end points of a known length.</p></>
                        ) : (<h2 className="text-lg font-semibold text-foreground">Awaiting Panel Configuration...</h2>)}
                    </div>
                </div>
              )}
            </>
          )}
          
          {/* Region Selection Overlay for AI Circuit Scanning */}
          {isSelectingRegion && pdfDoc && (
            <RegionSelectionOverlay
              isActive={isSelectingRegion}
              onCancel={handleCancelRegionSelect}
              onConfirm={handleRegionSelected}
              containerRef={mainContainerRef}
            />
          )}
      </main>
      
      {/* Right Sidebar - Unified Panel with Overview and Circuits tabs */}
      <EquipmentPanel 
        equipment={equipment} lines={lines} zones={zones} containment={containment} selectedItemId={selectedItemId}
        setSelectedItemId={setSelectedItemId} onEquipmentUpdate={handleEquipmentUpdate} onZoneUpdate={handleZoneUpdate}
        scaleInfo={scaleInfo}
        purposeConfig={purposeConfig} designPurpose={designPurpose} pvPanelConfig={pvPanelConfig}
        pvArrays={pvArrays} onDeleteItem={handleDeleteSelectedItem} tasks={tasks} onOpenTaskModal={handleOpenTaskModal}
        onJumpToZone={handleJumpToZone} modulesPerString={modulesPerString} onModulesPerStringChange={setModulesPerString}
        roofMasks={roofMasks}
        onJumpToRoofMask={handleJumpToRoofMask}
        onRoofMaskUpdate={handleRoofMaskUpdate}
        projectId={currentProjectId || undefined}
        floorPlanId={currentDesignId || undefined}
        selectedCircuit={selectedCircuit}
        onSelectCircuit={setSelectedCircuit}
        onEditCable={handleEditCable}
        onStartRegionSelect={pdfDoc ? handleStartRegionSelect : undefined}
        isSelectingRegion={isSelectingRegion}
      />
      
      {/* Modals */}
      <ScaleModal isOpen={isScaleModalOpen} onClose={() => { setIsScaleModalOpen(false); if (!scaleInfo.ratio) { setScaleLine(null); setActiveTool(Tool.PAN); } }} onSubmit={handleScaleSubmit} />
      <CableDetailsModal 
        isOpen={isCableModalOpen} 
        onClose={() => { setIsCableModalOpen(false); setPendingLine(null); setEditingCableId(null); }} 
        onSubmit={handleCableDetailsSubmit} 
        existingCableTypes={uniqueCableTypes} 
        purposeConfig={purposeConfig}
        calculatedLength={pendingLine ? pendingLine.length : 0}
        projectId={currentProjectId || undefined}
        editingCable={editingCableId ? lines.find(l => l.id === editingCableId) : null}
      />
      <ContainmentDetailsModal isOpen={isContainmentModalOpen} onClose={() => { setIsContainmentModalOpen(false); setPendingContainment(null); }} onSubmit={handleContainmentDetailsSubmit} purposeConfig={purposeConfig} />
      <CircuitCableDetailsDialog 
        isOpen={isCircuitCableModalOpen}
        onClose={() => { setIsCircuitCableModalOpen(false); setPendingCircuitCable(null); }}
        onSubmit={handleCircuitCableSubmit}
        measuredLength={pendingCircuitCable?.length || 0}
        existingCableTypes={uniqueCableTypes}
        configCableTypes={purposeConfig?.cableTypes || []}
        projectId={currentProjectId || undefined}
        selectedCircuit={selectedCircuit}
        selectedBoardName={selectedBoardName}
      />
      <ExportPreviewModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onConfirm={handleConfirmExport} equipment={equipment} lines={lines} zones={zones} containment={containment} pvPanelConfig={pvPanelConfig} pvArrays={pvArrays} />
      <PVConfigModal isOpen={isPvConfigModalOpen} onClose={() => setIsPvConfigModalOpen(false)} onSubmit={handlePvConfigSubmit} />
      <RoofMaskModal isOpen={isRoofMaskModalOpen} onClose={() => { setIsRoofMaskModalOpen(false); setPendingRoofMask(null); }} onSubmit={handleRoofMaskSubmit} />
      <PVArrayModal isOpen={isPvArrayModalOpen} onClose={() => { setIsPvArrayModalOpen(false); setActiveTool(Tool.PAN); }} onSubmit={handlePvArrayConfigSubmit} />
      <LoadDesignModal 
        isOpen={isLoadDesignModalOpen} 
        onClose={() => setIsLoadDesignModalOpen(false)} 
        onLoad={handleLoadFromCloud}
        onDelete={handleDeleteDesign}
        onNewDesign={() => document.getElementById('pdf-upload')?.click()}
        onAssignToProject={handleAssignToProject}
        designs={designList} 
        isLoading={isLoadingDesigns}
        currentProjectId={currentProjectId}
      />
      <TaskModal isOpen={isTaskModalOpen} onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }} onSubmit={handleTaskSubmit} task={editingTask} assigneeList={assigneeList} />
      <SavedReportsList open={isSavedReportsModalOpen} onOpenChange={setIsSavedReportsModalOpen} projectId={currentProjectId} />
      <LinkToFinalAccountDialog
        isOpen={isLinkDialogOpen}
        onClose={() => setIsLinkDialogOpen(false)}
        floorPlanId={currentDesignId}
        floorPlanName={currentDesignName}
        projectId={currentProjectId}
        takeoffCounts={takeoffCounts}
      />
      <CircuitSchedulePanel
        open={isCircuitScheduleOpen}
        onOpenChange={setIsCircuitScheduleOpen}
        projectId={currentProjectId}
        floorPlanId={currentDesignId}
        floorPlanName={currentDesignName}
        onCaptureLayout={pdfDoc ? handleCaptureLayout : undefined}
        onCaptureRegion={pdfDoc ? handleCaptureRegion : undefined}
        onStartRegionSelect={pdfDoc ? handleStartRegionSelect : undefined}
        isSelectingRegion={isSelectingRegion}
        selectedRegion={selectedRegion}
        initialScanResult={scanResult}
        onClearInitialScanResult={() => {
          // The hook's scanResult will be cleared when next scan starts
        }}
      />
      
      {/* Drawing Sheet View Modal */}
      {isDrawingSheetOpen && (
        <div className="fixed inset-0 z-[100] bg-background">
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={() => setIsDrawingSheetOpen(false)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium text-sm"
            >
              Close Drawing Sheet
            </button>
          </div>
          <DrawingSheetView
            equipment={equipment}
            lines={lines}
            containment={containment}
            scaleInfo={scaleInfo}
            projectName={currentDesignName || 'Floor Plan Design'}
            roomName={currentDesignName || 'Layout'}
            roomArea={undefined}
          />
        </div>
      )}
      
      {/* Debug Preview of Captured Image */}
      {debugCapturedImage && (
        <div className="fixed bottom-4 right-4 z-[200] bg-card border border-border rounded-lg shadow-xl p-4 max-w-md">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-foreground">Captured Image (Debug)</h4>
            <button 
              onClick={() => setDebugCapturedImage(null)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-2">This is what was sent to AI:</p>
          <img 
            src={debugCapturedImage} 
            alt="Captured region" 
            className="max-w-full max-h-64 border border-border rounded"
          />
          <p className="text-xs text-muted-foreground mt-2">
            If this doesn't match your selection, the coordinate mapping is wrong.
          </p>
        </div>
      )}
    </div>
  );
};

const App: React.FC<{ user: User | null; projectId?: string }> = ({ user, projectId }) => (
    <ToastProvider>
        <MainApp user={user} projectId={projectId} />
    </ToastProvider>
);

export default App;
