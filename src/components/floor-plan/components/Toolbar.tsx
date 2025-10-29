import React, { useMemo, useState } from 'react';
import type { LucideProps } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { MousePointer, Hand, Ruler, Route, Layers, Save, FolderOpen, Network, Shield, Server, RotateCw, Printer, Square, LayoutGrid, Sun, Magnet, LogIn, LogOut, Cloud, User as UserIcon, Sparkles, Wrench, Edit, ShieldQuestion, Power, Plug, Undo2, Redo2 } from 'lucide-react';
import { Tool, DesignPurpose, MarkupToolCategory, MARKUP_TOOL_CATEGORIES } from '../types';
import { type PurposeConfig } from '../purpose.config';
import { EquipmentIcon } from './EquipmentIcon';

interface ToolButtonProps {
  icon: React.ElementType<LucideProps>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: string;
  disabled?: boolean;
}

const GlobalToolButton: React.FC<Pick<ToolButtonProps, 'icon' | 'label' | 'onClick' | 'disabled'>> = ({ icon: Icon, label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center w-full text-left p-2.5 rounded-md transition-colors duration-200 text-gray-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}`}
    title={label}
  >
    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
    <span className="flex-grow text-sm font-medium">{label}</span>
  </button>
);


const MarkupToolButton: React.FC<ToolButtonProps> = ({ icon: Icon, label, isActive, onClick, badge, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center w-full text-left p-2.5 rounded-md transition-colors duration-200 ${
      isActive ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-gray-700 text-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    title={label}
  >
    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
    <span className="flex-grow text-sm font-medium">{label}</span>
    {badge && <span className="text-xs bg-gray-600 text-indigo-300 font-bold px-2 py-0.5 rounded-full">{badge}</span>}
  </button>
);


interface ToolbarProps {
  activeTool: Tool;
  onToolSelect: (tool: Tool) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveToCloud: () => void;
  onLoadFromCloud: () => void;
  onPrint: () => void;
  onGenerateBoq: () => void;
  isPdfLoaded: boolean;
  placementRotation: number;
  onRotationChange: React.Dispatch<React.SetStateAction<number>>;
  purposeConfig: PurposeConfig | null;
  isPvDesignReady: boolean;
  isSnappingEnabled: boolean;
  setIsSnappingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  isSupabaseAvailable: boolean;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const toolIconMap: Partial<Record<Tool, React.ElementType<LucideProps>>> = {
    [Tool.SELECT]: MousePointer, [Tool.PAN]: Hand, [Tool.SCALE]: Ruler, 
    [Tool.LINE_MV]: Route, [Tool.LINE_LV]: Route, [Tool.LINE_DC]: Route, [Tool.ZONE]: Layers,
    [Tool.TOOL_TELKOM_BASKET]: Network, [Tool.TOOL_SECURITY_BASKET]: Shield, [Tool.TOOL_CABLE_TRAY]: Server,
    [Tool.TOOL_SLEEVES]: Route, [Tool.TOOL_POWERSKIRTING]: Route,
    [Tool.TOOL_P2000_TRUNKING]: Route, [Tool.TOOL_P8000_TRUNKING]: Route, [Tool.TOOL_P9000_TRUNKING]: Route,
    [Tool.TOOL_ROOF_MASK]: Square, [Tool.TOOL_PV_ARRAY]: LayoutGrid,
};

const categoryLabels: Record<MarkupToolCategory, { label: string; icon: React.ElementType<LucideProps> }> = {
    general: { label: 'General', icon: Wrench },
    drawing: { label: 'Drawing', icon: Edit },
    equipment: { label: 'Equipment', icon: Power },
    containment: { label: 'Containment', icon: Server },
    lighting_sockets: { label: 'Lighting & Sockets', icon: Plug },
    other_equipment: { label: 'Other', icon: ShieldQuestion },
};

const Toolbar: React.FC<ToolbarProps> = ({ 
  activeTool, onToolSelect, onFileChange, onSaveToCloud, onLoadFromCloud, onPrint, isPdfLoaded,
  placementRotation, onRotationChange, purposeConfig, isPvDesignReady, isSnappingEnabled, setIsSnappingEnabled,
  onGenerateBoq, isSupabaseAvailable, user, onSignIn, onSignOut,
  onUndo, onRedo, canUndo, canRedo
}) => {
  const [activeMarkupTab, setActiveMarkupTab] = useState<MarkupToolCategory>('general');
  
  const isPlacementToolActive = purposeConfig && (Object.values(purposeConfig.equipmentToToolMap).includes(activeTool) || activeTool === Tool.TOOL_PV_ARRAY);

  const handleRotation = () => onRotationChange(prev => (prev + 45) % 360);

  const allPurposeTools = useMemo(() => {
    if (!purposeConfig) return new Set<Tool>();
    const equipmentTools = purposeConfig.availableEquipment
        .map(eq => purposeConfig.equipmentToToolMap[eq])
        .filter((t): t is Tool => !!t);

    return new Set<Tool>([
        Tool.SELECT, Tool.PAN,
        ...purposeConfig.availableDrawingTools,
        ...equipmentTools
    ]);
  }, [purposeConfig]);

  const categorizedTools = useMemo(() => {
    if (!purposeConfig) return {};
    const result: Partial<Record<MarkupToolCategory, Tool[]>> = {};

    for (const tool of allPurposeTools) {
        const category = purposeConfig.toolCategories[tool];
        if (category) {
            if (!result[category]) {
                result[category] = [];
            }
            if(!result[category]!.includes(tool)){
                result[category]!.push(tool);
            }
        }
    }
    return result;
  }, [purposeConfig, allPurposeTools]);

  return (
    <aside className="w-72 bg-gray-800 p-4 flex flex-col space-y-4 overflow-y-auto shadow-2xl z-10 border-r border-gray-700/50">
      <div>
        <h1 className="text-xl font-bold text-white mb-2">Floor Plan Markup</h1>
        <p className="text-sm text-indigo-300 h-5">{purposeConfig?.label || ''}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="pdf-upload" className="flex items-center w-full text-left p-2.5 rounded-md transition-colors duration-200 hover:bg-indigo-500 hover:text-white bg-gray-700/50 text-gray-200 cursor-pointer">
            <FolderOpen className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="flex-grow text-sm font-semibold">Load PDF File</span>
        </label>
        <input id="pdf-upload" type="file" className="hidden" onChange={onFileChange} accept=".pdf" />
        
        <hr className="border-gray-700" />
        {isSupabaseAvailable ? (
          <>
            {user ? (
              <>
                  <div className="flex items-center w-full text-left p-2 rounded-md bg-gray-900/50">
                      <img src={user.user_metadata.avatar_url || undefined} alt="user" className="h-6 w-6 rounded-full mr-3"/>
                      <span className="flex-grow text-sm font-medium text-gray-200 truncate" title={user.user_metadata.full_name || user.email}>{user.user_metadata.full_name || user.email}</span>
                      <button onClick={onSignOut} title="Sign Out" className="p-1 rounded-full hover:bg-gray-700">
                          <LogOut className="h-5 w-5 text-gray-400 hover:text-white"/>
                      </button>
                  </div>
                  <GlobalToolButton icon={Cloud} label="Save to Cloud" onClick={onSaveToCloud} disabled={!isPdfLoaded} />
                  <GlobalToolButton icon={FolderOpen} label="Load from Cloud" onClick={onLoadFromCloud} />
              </>
            ) : (
              <GlobalToolButton icon={LogIn} label="Sign in with Google" onClick={onSignIn} />
            )}
          </>
        ) : (
            <div className="p-2.5 rounded-md bg-gray-700/50 text-gray-400 text-xs">
                Cloud features are disabled. This widget must be hosted to connect to a backend project.
            </div>
        )}
        <hr className="border-gray-700" />

        <GlobalToolButton icon={Printer} label="Export as PDF" onClick={onPrint} disabled={!isPdfLoaded} />
        <GlobalToolButton icon={Sparkles} label="Generate BoQ (AI)" onClick={onGenerateBoq} disabled={!isPdfLoaded} />
      </div>
      
      {isPdfLoaded && purposeConfig && (
        <div className="flex-grow flex flex-col min-h-0">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">Markup Tools</h2>
          
          <nav className="flex-shrink-0 grid grid-cols-3 gap-1 mb-3">
            {MARKUP_TOOL_CATEGORIES.map(cat => {
              const categoryInfo = categoryLabels[cat];
              const hasTools = (categorizedTools[cat]?.length ?? 0) > 0 || (cat === 'general');
              if (!hasTools) return null;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveMarkupTab(cat)}
                  className={`flex flex-col items-center justify-center p-2 rounded-md text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500/50 ${
                      activeMarkupTab === cat ? 'bg-indigo-600 text-white' : 'bg-gray-700/60 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <categoryInfo.icon className="h-4 w-4 mb-1"/>
                  <span>{categoryInfo.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="space-y-1 flex-grow overflow-y-auto pr-1">
            {activeMarkupTab === 'general' && (
              <>
                <MarkupToolButton icon={Undo2} label="Undo (Ctrl+Z)" isActive={false} onClick={onUndo} disabled={!canUndo} />
                <MarkupToolButton icon={Redo2} label="Redo (Ctrl+Y)" isActive={false} onClick={onRedo} disabled={!canRedo} />
                <hr className="border-gray-700 my-2" />
              </>
            )}

            {categorizedTools[activeMarkupTab]?.map(toolId => {
              const equipmentType = Object.entries(purposeConfig.equipmentToToolMap).find(([, t]) => t === toolId)?.[0] as (keyof typeof purposeConfig.equipmentToToolMap) | undefined;
              
              if (equipmentType) {
                 return (
                  <MarkupToolButton
                    key={toolId}
                    onClick={() => onToolSelect(toolId)}
                    isActive={activeTool === toolId}
                    icon={() => <EquipmentIcon type={equipmentType} className="h-5 w-5 mr-3 flex-shrink-0" />}
                    label={equipmentType}
                    disabled={!isPvDesignReady}
                  />
                 );
              }

              const Icon = toolIconMap[toolId] || Layers;
              const label = purposeConfig.toolLabels[toolId] || toolId.replace(/_/g, ' ');
              const isDisabled = !isPvDesignReady && toolId !== Tool.SCALE && toolId !== Tool.PAN && toolId !== Tool.SELECT;
              return (
                  <MarkupToolButton key={toolId} icon={Icon} label={label} isActive={activeTool === toolId} onClick={() => onToolSelect(toolId)} disabled={isDisabled}/>
              );
            })}

            {activeMarkupTab === 'general' && (
              <>
                 {purposeConfig.label === DesignPurpose.PV_DESIGN && (
                  <MarkupToolButton
                      icon={Magnet} label="Toggle Snapping" isActive={isSnappingEnabled}
                      onClick={() => setIsSnappingEnabled(prev => !prev)} disabled={!isPvDesignReady}
                  />
                )}
                {isPlacementToolActive && (
                  <MarkupToolButton icon={RotateCw} label="Rotate Symbol" isActive={false} onClick={handleRotation} badge={`${placementRotation}°`} />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Toolbar;
