import React, { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs';
import { User } from '@supabase/supabase-js';
import { Tool, type EquipmentItem, type SupplyLine, type SupplyZone, type ScaleInfo, type ViewState, type Point, type Containment, ContainmentType, DesignPurpose, PVPanelConfig, RoofMask, PVArrayItem, Task, TaskStatus } from '@/types/floor-plan';
import { purposeConfigs, type PurposeConfig } from '@/lib/floor-plan-purpose.config';
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

  const undo = () => { if (canUndo) setHistoryIndex(historyIndex - 1); };
  const redo = () => { if (canRedo) setHistoryIndex(historyIndex + 1); };

  const [scaleInfo, setScaleInfo] = useState<ScaleInfo | null>(null);
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [scaleLineData, setScaleLineData] = useState<{ start: Point; end: Point } | null>(null);

  const [showCableModal, setShowCableModal] = useState(false);
  const [pendingLineData, setPendingLineData] = useState<{ points: Point[]; length: number } | null>(null);

  const [showContainmentModal, setShowContainmentModal] = useState(false);
  const [pendingContainmentData, setPendingContainmentData] = useState<{ type: ContainmentType; points: Point[]; length: number } | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [pvPanelConfig, setPvPanelConfig] = useState<PVPanelConfig | null>(null);
  const [showPvConfigModal, setShowPvConfigModal] = useState(false);

  const [showRoofModal, setShowRoofModal] = useState(false);
  const [pendingRoofMaskData, setPendingRoofMaskData] = useState<{ points: Point[] } | null>(null);

  const [showPvArrayModal, setShowPvArrayModal] = useState(false);
  const [pendingPvArrayData, setPendingPvArrayData] = useState<{ x: number; y: number; roofId: string } | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedDesigns, setSavedDesigns] = useState<DesignListing[]>([]);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);

  const [showBoqModal, setShowBoqModal] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const canvasRef = useRef<CanvasHandles>(null);

  // Auth effect
  useEffect(() => {
    const unsubscribe = onAuthChange((newUser) => {
      setUser(newUser);
      setIsLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  // Set purpose config when purpose changes
  useEffect(() => {
    if (designPurpose) {
      const config = purposeConfigs[designPurpose];
      setPurposeConfig(config);
    }
  }, [designPurpose]);

  const handlePdfUpload = useCallback(async (file: File) => {
    try {
      toast.info('Loading PDF...');
      const arrayBuffer = await file.arrayBuffer();
      const loadedPdf = await getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(loadedPdf);
      setPdfFile(file);
      toast.success('PDF loaded successfully!');
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF. Please try again.');
    }
  }, [toast]);

  const handleScaleSet = useCallback((distance: number) => {
    if (scaleLineData) {
      const dx = scaleLineData.end.x - scaleLineData.start.x;
      const dy = scaleLineData.end.y - scaleLineData.start.y;
      const pixelLength = Math.sqrt(dx * dx + dy * dy);
      const metersPerPixel = distance / pixelLength;
      setScaleInfo({
        metersPerPixel,
        referenceLineStart: scaleLineData.start,
        referenceLineEnd: scaleLineData.end,
        referenceDistanceMeters: distance,
      });
      toast.success(`Scale set: ${distance}m`);
    }
    setShowScaleModal(false);
    setScaleLineData(null);
    setActiveTool(Tool.PAN);
  }, [scaleLineData, toast]);

  const handleCableDetailsSubmit = useCallback((details: { from: string; to: string; cableType: string; terminationCount: number; startHeight: number; endHeight: number; label: string; }) => {
    if (pendingLineData) {
      const newLine: SupplyLine = {
        id: `line-${Date.now()}`,
        points: pendingLineData.points,
        length: pendingLineData.length,
        from: details.from,
        to: details.to,
        cableType: details.cableType,
        terminationCount: details.terminationCount,
        startHeight: details.startHeight,
        endHeight: details.endHeight,
        label: details.label,
      };
      setLines(prev => [...prev, newLine]);
      toast.success('Cable added successfully!');
    }
    setShowCableModal(false);
    setPendingLineData(null);
    setActiveTool(Tool.PAN);
  }, [pendingLineData, setLines, toast]);

  const handleContainmentDetailsSubmit = useCallback((details: { size: string }) => {
    if (pendingContainmentData) {
      const newContainment: Containment = {
        id: `containment-${Date.now()}`,
        type: pendingContainmentData.type,
        points: pendingContainmentData.points,
        length: pendingContainmentData.length,
        size: details.size,
      };
      setContainment(prev => [...prev, newContainment]);
      toast.success('Containment added successfully!');
    }
    setShowContainmentModal(false);
    setPendingContainmentData(null);
    setActiveTool(Tool.PAN);
  }, [pendingContainmentData, setContainment, toast]);

  const handleExportConfirm = useCallback(async (details: { projectName: string; comments: string }) => {
    setIsExporting(true);
    try {
      const blob = await generatePdf({
        pdfDoc,
        pdfFile,
        equipment,
        lines,
        zones,
        containment,
        scaleInfo,
        viewState,
        projectName: details.projectName,
        comments: details.comments,
        designPurpose: designPurpose || DesignPurpose.BUDGET_MARKUP,
        pvPanelConfig,
        pvArrays,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${details.projectName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  }, [pdfDoc, pdfFile, equipment, lines, zones, containment, scaleInfo, viewState, designPurpose, pvPanelConfig, pvArrays, toast]);

  const handlePvConfigSubmit = useCallback((config: PVPanelConfig) => {
    setPvPanelConfig(config);
    setShowPvConfigModal(false);
    toast.success('PV panel configuration saved!');
  }, [toast]);

  const handleRoofMaskSubmit = useCallback((details: { pitch: number }) => {
    if (pendingRoofMaskData && pvPanelConfig) {
      const newRoof: RoofMask = {
        id: `roof-${Date.now()}`,
        maskPoints: pendingRoofMaskData.points,
        pitchDegrees: details.pitch,
        lowPoint: null,
        highPoint: null,
        azimuthDegrees: null,
      };
      setRoofMasks(prev => [...prev, newRoof]);
      toast.success('Roof mask created successfully!');
    }
    setShowRoofModal(false);
    setPendingRoofMaskData(null);
    setActiveTool(Tool.PAN);
  }, [pendingRoofMaskData, pvPanelConfig, setRoofMasks, toast]);

  const handlePvArraySubmit = useCallback((config: PVArrayConfig) => {
    if (pendingPvArrayData && pvPanelConfig) {
      const newArray: PVArrayItem = {
        id: `pvarray-${Date.now()}`,
        x: pendingPvArrayData.x,
        y: pendingPvArrayData.y,
        rows: config.rows,
        cols: config.columns,
        orientation: config.orientation,
        rotation: 0,
        roofId: pendingPvArrayData.roofId,
      };
      setPvArrays(prev => [...prev, newArray]);
      toast.success(`PV array created: ${config.rows}x${config.columns} panels`);
    }
    setShowPvArrayModal(false);
    setPendingPvArrayData(null);
    setActiveTool(Tool.PAN);
  }, [pendingPvArrayData, pvPanelConfig, setPvArrays, toast]);

  const handleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Failed to sign in. Please try again.');
    }
  }, [toast]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast.info('Signed out successfully.');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out.');
    }
  }, [toast]);

  const handleSaveDesign = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to save designs.');
      return;
    }
    if (!pdfFile) {
      toast.error('No PDF loaded to save.');
      return;
    }
    if (!designPurpose) {
      toast.error('Design purpose not set.');
      return;
    }

    const designName = prompt('Enter a name for this design:');
    if (!designName) return;

    try {
      toast.info('Saving design...');
      await saveDesign(
        designName,
        designPurpose,
        pdfFile,
        equipment,
        lines,
        zones,
        containment,
        roofMasks,
        pvArrays,
        scaleInfo,
        viewState,
        pvPanelConfig,
        tasks
      );
      toast.success('Design saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save design. Please try again.');
    }
  }, [user, pdfFile, designPurpose, equipment, lines, zones, containment, roofMasks, pvArrays, scaleInfo, viewState, pvPanelConfig, tasks, toast]);

  const handleLoadDesignClick = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to load designs.');
      return;
    }
    setIsLoadingDesigns(true);
    setShowLoadModal(true);
    try {
      const designs = await listDesigns();
      setSavedDesigns(designs);
    } catch (error) {
      console.error('Error fetching designs:', error);
      toast.error('Failed to load saved designs.');
      setShowLoadModal(false);
    } finally {
      setIsLoadingDesigns(false);
    }
  }, [user, toast]);

  const handleLoadDesign = useCallback(async (id: string) => {
    try {
      toast.info('Loading design...');
      const design = await loadDesign(id);
      
      setPdfDoc(design.pdfDoc);
      setPdfFile(design.pdfFile);
      setDesignPurpose(design.designPurpose);
      setEquipment(() => design.equipment, false);
      setLines(() => design.lines, false);
      setZones(() => design.zones, false);
      setContainment(() => design.containment, false);
      setRoofMasks(() => design.roofMasks, false);
      setPvArrays(() => design.pvArrays, false);
      setTasks(() => design.tasks, false);
      setScaleInfo(design.scaleInfo);
      setViewState(design.viewState);
      setPvPanelConfig(design.pvPanelConfig);

      // Reset history
      const newState: DesignState = {
        equipment: design.equipment,
        lines: design.lines,
        zones: design.zones,
        containment: design.containment,
        roofMasks: design.roofMasks,
        pvArrays: design.pvArrays,
        tasks: design.tasks,
      };
      setHistory([newState]);
      setHistoryIndex(0);

      toast.success('Design loaded successfully!');
      setShowLoadModal(false);
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Failed to load design. Please try again.');
    }
  }, [toast, setEquipment, setLines, setZones, setContainment, setRoofMasks, setPvArrays, setTasks]);

  const handleOpenBoq = useCallback(() => {
    setShowBoqModal(true);
  }, []);

  const handleCreateTask = useCallback((itemType: string, itemId: string) => {
    setSelectedTask({
      id: `task-${Date.now()}`,
      title: '',
      description: '',
      status: TaskStatus.TODO,
      itemType,
      itemId,
      assignee: '',
    });
    setTaskModalMode('create');
    setShowTaskModal(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setSelectedTask(task);
    setTaskModalMode('edit');
    setShowTaskModal(true);
  }, []);

  const handleTaskSubmit = useCallback((task: Task) => {
    if (taskModalMode === 'create') {
      setTasks(prev => [...prev, task]);
      toast.success('Task created successfully!');
    } else {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      toast.success('Task updated successfully!');
    }
    setShowTaskModal(false);
    setSelectedTask(null);
  }, [taskModalMode, setTasks, toast]);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success('Task deleted successfully!');
    setShowTaskModal(false);
    setSelectedTask(null);
  }, [setTasks, toast]);

  // Equipment management
  const existingCableTypes = useMemo(() => {
    const types = new Set<string>();
    lines.forEach(line => types.add(line.cableType));
    return Array.from(types);
  }, [lines]);

  if (isLoadingAuth) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <Loader className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  if (!designPurpose) {
    return <DesignPurposeSelector onSelectPurpose={setDesignPurpose} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onFileUpload={handlePdfUpload}
        onExport={() => setShowExportModal(true)}
        isExporting={isExporting}
        hasScale={!!scaleInfo}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onSave={handleSaveDesign}
        onLoad={handleLoadDesignClick}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onConfigurePV={() => setShowPvConfigModal(true)}
        hasPvConfig={!!pvPanelConfig}
        purposeConfig={purposeConfig}
        onOpenBoq={handleOpenBoq}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <EquipmentPanel
          onEquipmentSelect={(type) => {
            setActiveTool(Tool.PLACE_EQUIPMENT);
            canvasRef.current?.setEquipmentType(type);
          }}
          activeTool={activeTool}
          purposeConfig={purposeConfig}
        />
        
        <Canvas
          ref={canvasRef}
          pdfDoc={pdfDoc}
          activeTool={activeTool}
          equipment={equipment}
          setEquipment={setEquipment}
          lines={lines}
          setLines={setLines}
          zones={zones}
          setZones={setZones}
          containment={containment}
          setContainment={setContainment}
          roofMasks={roofMasks}
          setRoofMasks={setRoofMasks}
          pvArrays={pvArrays}
          setPvArrays={setPvArrays}
          scaleInfo={scaleInfo}
          viewState={viewState}
          setViewState={setViewState}
          initialViewState={initialViewState}
          setInitialViewState={setInitialViewState}
          onScaleLineDrawn={(start, end) => {
            setScaleLineData({ start, end });
            setShowScaleModal(true);
          }}
          onCableDrawn={(points, length) => {
            setPendingLineData({ points, length });
            setShowCableModal(true);
          }}
          onContainmentDrawn={(type, points, length) => {
            setPendingContainmentData({ type, points, length });
            setShowContainmentModal(true);
          }}
          onRoofMaskDrawn={(points) => {
            setPendingRoofMaskData({ points });
            setShowRoofModal(true);
          }}
          onPvArrayPlacement={(x, y, roofId) => {
            setPendingPvArrayData({ x, y, roofId });
            setShowPvArrayModal(true);
          }}
          pvPanelConfig={pvPanelConfig}
          purposeConfig={purposeConfig}
          tasks={tasks}
          onCreateTask={handleCreateTask}
          onEditTask={handleEditTask}
        />
      </div>

      {showScaleModal && (
        <ScaleModal
          isOpen={showScaleModal}
          onClose={() => {
            setShowScaleModal(false);
            setScaleLineData(null);
            setActiveTool(Tool.PAN);
          }}
          onSubmit={handleScaleSet}
        />
      )}

      {showCableModal && (
        <CableDetailsModal
          isOpen={showCableModal}
          onClose={() => {
            setShowCableModal(false);
            setPendingLineData(null);
            setActiveTool(Tool.PAN);
          }}
          onSubmit={handleCableDetailsSubmit}
          existingCableTypes={existingCableTypes}
          purposeConfig={purposeConfig}
        />
      )}

      {showContainmentModal && (
        <ContainmentDetailsModal
          isOpen={showContainmentModal}
          onClose={() => {
            setShowContainmentModal(false);
            setPendingContainmentData(null);
            setActiveTool(Tool.PAN);
          }}
          onSubmit={handleContainmentDetailsSubmit}
          purposeConfig={purposeConfig}
        />
      )}

      {showExportModal && (
        <ExportPreviewModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onConfirm={handleExportConfirm}
          equipment={equipment}
          lines={lines}
          zones={zones}
          containment={containment}
          pvPanelConfig={pvPanelConfig}
          pvArrays={pvArrays}
        />
      )}

      {showPvConfigModal && (
        <PVConfigModal
          isOpen={showPvConfigModal}
          onClose={() => setShowPvConfigModal(false)}
          onSubmit={handlePvConfigSubmit}
        />
      )}

      {showRoofModal && (
        <RoofMaskModal
          isOpen={showRoofModal}
          onClose={() => {
            setShowRoofModal(false);
            setPendingRoofMaskData(null);
            setActiveTool(Tool.PAN);
          }}
          onSubmit={handleRoofMaskSubmit}
        />
      )}

      {showPvArrayModal && (
        <PVArrayModal
          isOpen={showPvArrayModal}
          onClose={() => {
            setShowPvArrayModal(false);
            setPendingPvArrayData(null);
            setActiveTool(Tool.PAN);
          }}
          onSubmit={handlePvArraySubmit}
        />
      )}

      {showLoadModal && (
        <LoadDesignModal
          isOpen={showLoadModal}
          onClose={() => setShowLoadModal(false)}
          onLoad={handleLoadDesign}
          designs={savedDesigns}
          isLoading={isLoadingDesigns}
        />
      )}

      {showBoqModal && (
        <BoqModal
          isOpen={showBoqModal}
          onClose={() => setShowBoqModal(false)}
          equipment={equipment}
          lines={lines}
          zones={zones}
          containment={containment}
          pvPanelConfig={pvPanelConfig}
          pvArrays={pvArrays}
        />
      )}

      {showTaskModal && selectedTask && (
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          mode={taskModalMode}
          onSubmit={handleTaskSubmit}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
};

export default App;