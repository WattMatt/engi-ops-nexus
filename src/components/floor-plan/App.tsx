import React, { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs';
import { User } from '@supabase/supabase-js';
import { Tool, type EquipmentItem, type SupplyLine, type SupplyZone, type ScaleInfo, type ViewState, type Point, type Containment, ContainmentType, DesignPurpose, PVPanelConfig, RoofMask, PVArrayItem, Task, TaskStatus } from './types';
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
import BoqModal from './components/BoqModal';
import TaskModal from './components/TaskModal';
import { ToastProvider, useToast } from './components/ToastProvider';
import { 
    signInWithGoogle,
    signOut,
    onAuthChange,
    saveDesign,
    listDesigns,
    loadDesign,
    type DesignListing,
    initializeSupabase,
    isSupabaseInitialized as isSupabaseReady,
} from './utils/supabase';
import { Building, Loader } from 'lucide-react';


// Set PDF.js worker source
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs`;
}

interface DesignState {
    equipment: EquipmentItem[];
    lines: SupplyLine[];
    zones: SupplyZone[];
    containment: Containment[];
    roofMasks: RoofMask[];
    pvArrays: PVArrayItem[];
    tasks: Task[];
}

const initialDesignState: DesignState = {
    equipment: [],
    lines: [],
    zones: [],
    containment: [],
    roofMasks: [],
    pvArrays: [],
    tasks: [],
};

const MainApp: React.FC = () => {
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

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const currentDesign = history[historyIndex];
  const { equipment, lines, zones, containment, roofMasks, pvArrays, tasks } = currentDesign;

  const setState = useCallback((updater: (prevState: DesignState) => DesignState, commit: boolean = true) => {
    const currentState = history[historyIndex];
    const newState = updater(currentState);

    if (JSON.stringify(newState) === JSON.stringify(currentState)) {
        return;
    }

    if (commit) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newState);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    } else {
        const newHistory = [...history];
        newHistory[historyIndex] = newState;
        setHistory(newHistory);
    }
  }, [history, historyIndex]);

  const setEquipment = (updater: (prev: EquipmentItem[]) => EquipmentItem[], commit: boolean = true) => setState(s => ({ ...s, equipment: updater(s.equipment) }), commit);
  const setLines = (updater: (prev: SupplyLine[]) => SupplyLine[], commit: boolean = true) => setState(s => ({ ...s, lines: updater(s.lines) }), commit);
  const setZones = (updater: (prev: SupplyZone[]) => SupplyZone[], commit: boolean = true) => setState(s => ({ ...s, zones: updater(s.zones) }), commit);
  const setContainment = (updater: (prev: Containment[]) => Containment[], commit: boolean = true) => setState(s => ({ ...s, containment: updater(s.containment) }), commit);
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
  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState<string | null>(null);

  // PV Design State
  const [pvPanelConfig, setPvPanelConfig] = useState<PVPanelConfig | null>(null);
  const [isPvConfigModalOpen, setIsPvConfigModalOpen] = useState(false);
  const [isRoofMaskModalOpen, setIsRoofMaskModalOpen] = useState(false);
  const [isPvArrayModalOpen, setIsPvArrayModalOpen] = useState(false);
  const [pendingRoofMask, setPendingRoofMask] = useState<{ points: Point[]; pitch?: number; } | null>(null);
  const [pendingPvArrayConfig, setPendingPvArrayConfig] = useState<PVArrayConfig | null>(null);
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);

  const [pendingLine, setPendingLine] = useState<{ points: Point[]; length: number; } | null>(null);
  const [pendingContainment, setPendingContainment] = useState<{ points: Point[]; length: number; type: ContainmentType; } | null>(null);

  // Supabase State
  const [user, setUser] = useState<User | null>(null);
  const [isLoadDesignModalOpen, setIsLoadDesignModalOpen] = useState(false);
  const [designList, setDesignList] = useState<DesignListing[]>([]);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  const [isSupabaseInitialized, setIsSupabaseInitialized] = useState(isSupabaseReady);

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
    setPendingRoofMask(null);
    setPendingPvArrayConfig(null);
    setIsSnappingEnabled(true);
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
    const designName = prompt("Enter a name for this design:", `Design - ${new Date().toLocaleDateString()}`);
    if (!designName) return;

    setGlobalLoadingMessage("Saving design to cloud...");
    const designData = {
        ...currentDesign,
        designPurpose,
        scaleInfo,
        pvPanelConfig,
    };

    try {
        await saveDesign(designName, designData, pdfFile);
        toast.success(`Design '${designName}' saved successfully!`);
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
          const designs = await listDesigns();
          setDesignList(designs);
      } catch (error) {
          console.error("Error listing designs:", error);
          toast.error(`Failed to load design list: ${error instanceof Error ? error.message : 'Unknown Error'}`);
      } finally {
          setIsLoadingDesigns(false);
      }
  };

  const handleLoadFromCloud = async (designId: string) => {
      if (!user) return;
      setIsLoadDesignModalOpen(false);
      setGlobalLoadingMessage("Loading design from cloud...");
      try {
          const { designData, pdfBlob } = await loadDesign(designId);
          const fileName = designData.pdf_storage_path.split('/').pop() || 'design.pdf';
          const loadedFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
          await loadPdfData(pdfBlob, loadedFile);
          
          resetStateWith({
              equipment: designData.equipment || [],
              lines: designData.lines || [],
              zones: designData.zones || [],
              containment: designData.containment || [],
              roofMasks: designData.roof_masks || [],
              pvArrays: designData.pv_arrays || [],
              tasks: designData.tasks || [],
          });
          setScaleInfo(designData.scale_info || { pixelDistance: null, realDistance: null, ratio: null });
          setPvPanelConfig(designData.pv_panel_config || null);

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


  const handlePrint = () => {
    const canvases = canvasApiRef.current?.getCanvases();
    if (!canvases?.pdf || !canvases?.drawing) {
        toast.error('Could not access canvas to generate PDF.');
        return;
    }
    setIsExportModalOpen(true);
  };

  const handleOpenBoqModal = () => setIsBoqModalOpen(true);

  const handleConfirmExport = async ({ projectName, comments }: { projectName: string; comments: string }) => {
    const canvases = canvasApiRef.current?.getCanvases();
    if (!canvases?.pdf || !canvases?.drawing) return toast.error('Canvas elements not ready.');
    if (!projectName) return toast.error("Project name is required.");
    if (!scaleInfo.ratio) return toast.error("Cannot export without a valid scale.");
    
    toast.info("Generating PDF... This may take a moment.");
    setIsExportModalOpen(false);
    try {
        await generatePdf({
            canvases, projectName, equipment, lines, zones, containment, comments, 
            pvPanelConfig, pvArrays, scaleInfo, roofMasks, tasks
        });
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

  const handleScaleSubmit = (realDistance: number) => {
    if (scaleInfo.pixelDistance) {
      setScaleInfo({
        pixelDistance: scaleInfo.pixelDistance,
        realDistance: realDistance,
        ratio: realDistance / scaleInfo.pixelDistance,
      });
      if (designPurpose === DesignPurpose.PV_DESIGN) setIsPvConfigModalOpen(true);
    }
    setIsScaleModalOpen(false);
    setScaleLine(null);
    setActiveTool(Tool.PAN);
    toast.success("Scale set successfully!");
  };
  
  const handleInitialViewCalculated = useCallback((vs: ViewState) => {
    setViewState(vs);
    setInitialViewState(vs);
  }, []);

  const handleResetZoom = useCallback(() => {
      if(initialViewState) setViewState(initialViewState);
  }, [initialViewState]);
  
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
      const typesWithoutSizeModal = [ContainmentType.SLEEVES, ContainmentType.POWERSKIRTING, ContainmentType.P2000_TRUNKING, ContainmentType.P8000_TRUNKING, ContainmentType.P9000_TRUNKING];
      if (typesWithoutSizeModal.includes(line.type)) {
        setContainment(prev => [...prev, { id: `containment-${Date.now()}`, type: line.type, size: line.type, points: line.points, length: line.length, }]);
      } else {
        setPendingContainment(line);
        setIsContainmentModalOpen(true);
      }
  }, []);

  const handleCableDetailsSubmit = (details: { from: string, to: string, cableType: string, terminationCount: number, startHeight: number, endHeight: number, label: string }) => {
      if (!pendingLine) return;
      const pathLength = pendingLine.length;
      const totalLength = pathLength + details.startHeight + details.endHeight;
      const newLine: SupplyLine = {
          id: `line-${Date.now()}`, name: `${details.from} to ${details.to}`, type: 'lv' as const, points: pendingLine.points, 
          length: totalLength, pathLength: pathLength, from: details.from, to: details.to, cableType: details.cableType,
          terminationCount: details.terminationCount, startHeight: details.startHeight, endHeight: details.endHeight, label: details.label
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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'supabase-config' && event.data.config) {
            if (!isSupabaseReady) {
                initializeSupabase(event.data.config.url, event.data.config.anonKey);
                setIsSupabaseInitialized(true);
            }
        }
    };
    window.addEventListener('message', handleMessage);
    if(isSupabaseReady && !isSupabaseInitialized) setIsSupabaseInitialized(true);
    return () => window.removeEventListener('message', handleMessage);
  }, [isSupabaseInitialized]);

  useEffect(() => {
    if (isSupabaseInitialized) {
      const { data: { subscription } } = onAuthChange((_event, session) => setUser(session?.user ?? null));
      return () => subscription.unsubscribe();
    }
  }, [isSupabaseInitialized]);

  const pvDesignReady = useMemo(() => designPurpose !== DesignPurpose.PV_DESIGN || (!!scaleInfo.ratio && !!pvPanelConfig), [designPurpose, scaleInfo.ratio, pvPanelConfig]);

  return (
    <div className="flex h-full w-full bg-gray-900 text-gray-100 font-sans relative">
      {globalLoadingMessage && (
        <div className="absolute inset-0 bg-gray-900/80 z-[100] flex flex-col items-center justify-center gap-4 animate-fade-in">
          <Loader className="h-12 w-12 text-indigo-400 animate-spin" />
          <p className="text-lg text-gray-300">{globalLoadingMessage}</p>
        </div>
      )}
      <Toolbar
        activeTool={activeTool} onToolSelect={handleToolSelect} onFileChange={handleFileChange}
        onSaveToCloud={handleSaveToCloud} onLoadFromCloud={handleOpenLoadModal} onPrint={handlePrint}
        onGenerateBoq={handleOpenBoqModal} isPdfLoaded={!!pdfDoc && !!purposeConfig}
        placementRotation={placementRotation} onRotationChange={setPlacementRotation}
        purposeConfig={purposeConfig} isPvDesignReady={pvDesignReady} isSnappingEnabled={isSnappingEnabled}
        setIsSnappingEnabled={setIsSnappingEnabled} isSupabaseAvailable={isSupabaseInitialized} user={user}
        onSignIn={signInWithGoogle} onSignOut={signOut} onUndo={handleUndo} onRedo={handleRedo}
        canUndo={canUndo} canRedo={canRedo}
      />
      <main ref={mainContainerRef} className="flex-1 flex flex-col relative overflow-hidden">
          {!pdfDoc ? (
             <div className="flex-1 flex justify-center items-center bg-gray-800">
                <div className="text-center p-8 border-2 border-dashed border-gray-600 rounded-lg animate-fade-in">
                    <Building className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                    <h2 className="text-2xl font-semibold text-gray-400">Load a PDF Floor Plan</h2>
                    <p className="mt-2 text-gray-500">Use the toolbar on the left to begin your project.</p>
                </div>
            </div>
          ) : !purposeConfig ? (
            <DesignPurposeSelector onSelectPurpose={handleSelectPurpose} />
          ) : (
            <>
              <Canvas
                  ref={canvasApiRef} pdfDoc={pdfDoc} activeTool={activeTool} viewState={viewState} setViewState={setViewState}
                  equipment={equipment} setEquipment={setEquipment} lines={lines} setLines={setLines}
                  zones={zones} setZones={setZones} containment={containment} setContainment={setContainment}
                  scaleInfo={scaleInfo} onScalingComplete={completeScaling} onLvLineComplete={handleLvLineComplete}
                  onContainmentDrawComplete={handleContainmentDrawComplete} scaleLine={scaleLine} onInitialViewCalculated={handleInitialViewCalculated}
                  selectedItemId={selectedItemId} setSelectedItemId={setSelectedItemId} placementRotation={placementRotation}
                  purposeConfig={purposeConfig} pvPanelConfig={pvPanelConfig} roofMasks={roofMasks} onRoofMaskDrawComplete={handleRoofMaskDrawComplete}
                  pendingPvArrayConfig={pendingPvArrayConfig} onPlacePvArray={handlePlacePvArray} isSnappingEnabled={isSnappingEnabled}
                  pendingRoofMask={pendingRoofMask} onRoofDirectionSet={handleRoofDirectionSet} onCancelRoofCreation={cancelRoofCreation}
                  pvArrays={pvArrays} setPvArrays={setPvArrays} tasks={tasks}
              />
              {(designPurpose === DesignPurpose.PV_DESIGN && !pvDesignReady) && (
                 <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="text-center p-4 bg-gray-800/95 border border-gray-600 rounded-lg shadow-2xl">
                        {!scaleInfo.ratio ? (
                            <><h2 className="text-lg font-semibold text-gray-300">Set Scale for PV Design</h2><p className="mt-1 text-sm text-gray-400">The <span className='text-indigo-400 font-semibold'>Scale</span> tool is active. Click the start and end points of a known length.</p></>
                        ) : (<h2 className="text-lg font-semibold text-gray-300">Awaiting Panel Configuration...</h2>)}
                    </div>
                </div>
              )}
            </>
          )}
      </main>
      {pdfDoc && purposeConfig && pvDesignReady && <EquipmentPanel 
        equipment={equipment} lines={lines} zones={zones} containment={containment} selectedItemId={selectedItemId}
        setSelectedItemId={setSelectedItemId} onEquipmentUpdate={handleEquipmentUpdate} onZoneUpdate={handleZoneUpdate}
        purposeConfig={purposeConfig} designPurpose={designPurpose!} pvPanelConfig={pvPanelConfig}
        pvArrays={pvArrays} onDeleteItem={handleDeleteSelectedItem} tasks={tasks} onOpenTaskModal={handleOpenTaskModal}
      />}
      <ScaleModal isOpen={isScaleModalOpen} onClose={() => { setIsScaleModalOpen(false); setScaleLine(null); if (!scaleInfo.ratio) setActiveTool(Tool.PAN); }} onSubmit={handleScaleSubmit} />
      <CableDetailsModal isOpen={isCableModalOpen} onClose={() => { setIsCableModalOpen(false); setPendingLine(null); }} onSubmit={handleCableDetailsSubmit} existingCableTypes={uniqueCableTypes} purposeConfig={purposeConfig} />
      <ContainmentDetailsModal isOpen={isContainmentModalOpen} onClose={() => { setIsContainmentModalOpen(false); setPendingContainment(null); }} onSubmit={handleContainmentDetailsSubmit} purposeConfig={purposeConfig} />
      <ExportPreviewModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onConfirm={handleConfirmExport} equipment={equipment} lines={lines} zones={zones} containment={containment} pvPanelConfig={pvPanelConfig} pvArrays={pvArrays} />
      <PVConfigModal isOpen={isPvConfigModalOpen} onClose={() => setIsPvConfigModalOpen(false)} onSubmit={handlePvConfigSubmit} />
      <RoofMaskModal isOpen={isRoofMaskModalOpen} onClose={() => { setIsRoofMaskModalOpen(false); setPendingRoofMask(null); }} onSubmit={handleRoofMaskSubmit} />
      <PVArrayModal isOpen={isPvArrayModalOpen} onClose={() => { setIsPvArrayModalOpen(false); setActiveTool(Tool.PAN); }} onSubmit={handlePvArrayConfigSubmit} />
      <LoadDesignModal isOpen={isLoadDesignModalOpen} onClose={() => setIsLoadDesignModalOpen(false)} onLoad={handleLoadFromCloud} designs={designList} isLoading={isLoadingDesigns} />
      <BoqModal isOpen={isBoqModalOpen} onClose={() => setIsBoqModalOpen(false)} projectData={{ equipment, lines, containment, zones }} />
      <TaskModal isOpen={isTaskModalOpen} onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }} onSubmit={handleTaskSubmit} task={editingTask} assigneeList={assigneeList} />
    </div>
  );
};

const App: React.FC = () => (
    <ToastProvider>
        <MainApp />
    </ToastProvider>
);

export default App;
