import React, { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs';
import { User } from '@supabase/supabase-js';
import { Tool, type EquipmentItem, type SupplyLine, type SupplyZone, type ScaleInfo, type ViewState, type Point, type Containment, ContainmentType, type Walkway, DesignPurpose, PVPanelConfig, RoofMask, PVArrayItem, Task, TaskStatus } from './types';
import { purposeConfigs, type PurposeConfig } from './purpose.config';
import Toolbar from './components/Toolbar';
import Canvas, { type CanvasHandles } from './components/Canvas';
import EquipmentPanel from './components/EquipmentPanel';
import ScaleModal from './components/ScaleModal';
import CableDetailsModal from './components/CableDetailsModal';
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
import { Building, Loader } from 'lucide-react';
import { SavedReportsList } from './components/SavedReportsList';
import { SavedDesignsGallery } from './components/SavedDesignsGallery';
import { supabase } from '@/integrations/supabase/client';
import { LinkToFinalAccountDialog } from './components/LinkToFinalAccountDialog';
import { useTakeoffCounts } from './hooks/useTakeoffCounts';
import { CircuitSchedulePanel } from './components/CircuitSchedulePanel';


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

  // Calculate take-off counts for linking to final account
  const takeoffCounts = useTakeoffCounts(equipment, lines, containment);

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
  const [pendingContainment, setPendingContainment] = useState<{ points: Point[]; length: number; type: ContainmentType; } | null>(null);

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
    
    try {
        if (currentDesignId) {
            // Update existing design
            await updateDesign(currentDesignId, designData);
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
            toast.success(`Design '${designName}' saved successfully!`);
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
    
    toast.info("Generating PDF... This may take a moment.");
    setIsExportModalOpen(false);
    try {
        const blob = await generatePdf({
            canvases, projectName, equipment, lines, zones, containment, walkways, comments, 
            pvPanelConfig, pvArrays, scaleInfo, roofMasks, tasks
        }, true);

        // Save to cloud if user is logged in
        if (user && blob) {
            try {
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

                // Upload to storage
                const filePath = `${user.id}/${projectName}_Rev${nextRevision}_${Date.now()}.pdf`;
                const { error: uploadError } = await supabase.storage
                    .from('floor-plan-reports')
                    .upload(filePath, blob);

                if (uploadError) throw uploadError;

                // Save metadata to database
                const { error: dbError } = await supabase
                    .from('floor_plan_reports')
                    .insert({
                        user_id: user.id,
                        project_name: projectName,
                        file_path: filePath,
                        report_revision: nextRevision,
                        comments: comments || null,
                    });

                if (dbError) throw dbError;

                toast.success(`PDF exported and saved to cloud (Rev ${nextRevision})`);
            } catch (error) {
                console.error('Error saving to cloud:', error);
                toast.error('PDF downloaded but failed to save to cloud');
            }
        } else {
            toast.success('PDF exported successfully');
        }
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

  const handleLvLineComplete = useCallback((line: { points: Point[]; length: number; }) => {
      setPendingLine(line);
      setIsCableModalOpen(true);
  }, []);
  
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
      } else {
        setPendingContainment(line);
        setIsContainmentModalOpen(true);
      }
  }, []);

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
      
      let cableEntryId: string | undefined;

      // Auto-save to database if we have a project ID
      if (projectId) {
        try {
          // Get the latest cable schedule for this project
          const { data: schedules } = await supabase
            .from('cable_schedules')
            .select('id')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(1);

          const scheduleId = schedules?.[0]?.id;

          // Save to cable_entries (single source of truth)
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
              installation_method: 'TBD',
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
        } catch (error) {
          console.error('Error saving cable:', error);
          toast.error('Failed to save cable to schedule');
        }
      }

      const newLine: SupplyLine = {
          id: `line-${Date.now()}`, name: `${details.from} to ${details.to}`, type: 'lv' as const, points: pendingLine.points, 
          length: totalLength, pathLength: pathLength, from: details.from, to: details.to, cableType: details.cableType,
          terminationCount: details.terminationCount, startHeight: details.startHeight, endHeight: details.endHeight, label: details.label,
          cableEntryId: cableEntryId
      };
      setLines(prev => [...prev, newLine]);
      setIsCableModalOpen(false);
      setPendingLine(null);
  };

  const handleContainmentDetailsSubmit = (details: { size: string }) => {
      if (!pendingContainment) return;
      setContainment(prev => [...prev, { id: `containment-${Date.now()}`, type: pendingContainment.type, size: details.size, points: pendingContainment.points, length: pendingContainment.length, }]);
      setIsContainmentModalOpen(false);
      setPendingContainment(null);
  };
  
  const handleEquipmentUpdate = (updatedItem: EquipmentItem) => setEquipment(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  const handleZoneUpdate = (updatedZone: SupplyZone) => setZones(prev => prev.map(zone => zone.id === updatedZone.id ? updatedZone : zone));

  const handleJumpToZone = useCallback((zone: SupplyZone) => {
    if (canvasApiRef.current) {
      canvasApiRef.current.jumpToZone(zone);
    }
  }, []);

  const handleDeleteSelectedItem = () => {
    if (!selectedItemId) return;
    if (window.confirm(`Are you sure you want to delete this item? This will also delete any linked tasks.`)) {
        setState(prev => {
            setSelectedItemId(null);
            return { 
                ...prev, 
                equipment: prev.equipment.filter(e => e.id !== selectedItemId),
                zones: prev.zones.filter(z => z.id !== selectedItemId),
                pvArrays: prev.pvArrays.filter(p => p.id !== selectedItemId),
                lines: prev.lines.filter(l => l.id !== selectedItemId),
                containment: prev.containment.filter(c => c.id !== selectedItemId),
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
  const handleRoofDirectionSet = useCallback((direction: number) => { if (!pendingRoofMask || typeof pendingRoofMask.pitch === 'undefined') return; setRoofMasks(prev => [...prev, { id: `roofmask-${Date.now()}`, points: pendingRoofMask.points, pitch: pendingRoofMask.pitch, direction: direction }]); setPendingRoofMask(null); setActiveTool(Tool.PAN); }, [pendingRoofMask, setRoofMasks]);
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
                  onContainmentDrawComplete={handleContainmentDrawComplete} onWalkwayDrawComplete={handleWalkwayDrawComplete} scaleLine={scaleLine} onInitialViewCalculated={handleInitialViewCalculated}
                  selectedItemId={selectedItemId} setSelectedItemId={setSelectedItemId} placementRotation={placementRotation}
                  purposeConfig={purposeConfig} pvPanelConfig={pvPanelConfig} roofMasks={roofMasks} onRoofMaskDrawComplete={handleRoofMaskDrawComplete}
                  pendingPvArrayConfig={pendingPvArrayConfig} onPlacePvArray={handlePlacePvArray} isSnappingEnabled={isSnappingEnabled}
                  pendingRoofMask={pendingRoofMask} onRoofDirectionSet={handleRoofDirectionSet} onCancelRoofCreation={cancelRoofCreation}
                  pvArrays={pvArrays} setPvArrays={setPvArrays} tasks={tasks}
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
      </main>
      
      {/* Right Sidebar - Equipment Panel */}
      <EquipmentPanel 
        equipment={equipment} lines={lines} zones={zones} containment={containment} selectedItemId={selectedItemId}
        setSelectedItemId={setSelectedItemId} onEquipmentUpdate={handleEquipmentUpdate} onZoneUpdate={handleZoneUpdate}
        scaleInfo={scaleInfo}
        purposeConfig={purposeConfig} designPurpose={designPurpose} pvPanelConfig={pvPanelConfig}
        pvArrays={pvArrays} onDeleteItem={handleDeleteSelectedItem} tasks={tasks} onOpenTaskModal={handleOpenTaskModal}
        onJumpToZone={handleJumpToZone} modulesPerString={modulesPerString} onModulesPerStringChange={setModulesPerString}
        projectId={currentProjectId || undefined}
      />
      
      {/* Modals */}
      <ScaleModal isOpen={isScaleModalOpen} onClose={() => { setIsScaleModalOpen(false); if (!scaleInfo.ratio) { setScaleLine(null); setActiveTool(Tool.PAN); } }} onSubmit={handleScaleSubmit} />
      <CableDetailsModal 
        isOpen={isCableModalOpen} 
        onClose={() => { setIsCableModalOpen(false); setPendingLine(null); }} 
        onSubmit={handleCableDetailsSubmit} 
        existingCableTypes={uniqueCableTypes} 
        purposeConfig={purposeConfig}
        calculatedLength={pendingLine ? pendingLine.length : 0}
        projectId={currentProjectId || undefined}
      />
      <ContainmentDetailsModal isOpen={isContainmentModalOpen} onClose={() => { setIsContainmentModalOpen(false); setPendingContainment(null); }} onSubmit={handleContainmentDetailsSubmit} purposeConfig={purposeConfig} />
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
      <SavedReportsList open={isSavedReportsModalOpen} onOpenChange={setIsSavedReportsModalOpen} />
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
      />
    </div>
  );
};

const App: React.FC<{ user: User | null; projectId?: string }> = ({ user, projectId }) => (
    <ToastProvider>
        <MainApp user={user} projectId={projectId} />
    </ToastProvider>
);

export default App;
