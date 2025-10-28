import React, { useRef } from 'react';
import { Tool } from '@/types/floor-plan';
import { User } from '@supabase/supabase-js';
import { PurposeConfig } from '@/lib/floor-plan-purpose.config';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, Save, FolderOpen, Download, Undo2, Redo2, 
  Hand, MousePointer, Ruler, Zap, Cable, Box, 
  SquareDashedBottom, Settings, LogIn, LogOut, FileText
} from 'lucide-react';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onFileUpload: (file: File) => void;
  onExport: () => void;
  isExporting: boolean;
  hasScale: boolean;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onSave: () => void;
  onLoad: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onConfigurePV?: () => void;
  hasPvConfig?: boolean;
  purposeConfig: PurposeConfig | null;
  onOpenBoq?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  onFileUpload,
  onExport,
  isExporting,
  hasScale,
  user,
  onSignIn,
  onSignOut,
  onSave,
  onLoad,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onConfigurePV,
  hasPvConfig,
  purposeConfig,
  onOpenBoq,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const toolGroups = [
    {
      name: 'Navigation',
      tools: [
        { id: Tool.SELECT, icon: MousePointer, label: 'Select' },
        { id: Tool.PAN, icon: Hand, label: 'Pan' },
      ],
    },
    {
      name: 'Drawing',
      tools: purposeConfig?.tools
        .filter(t => [Tool.SCALE, Tool.TOOL_CABLE_LV, Tool.TOOL_CABLE_HV, Tool.TOOL_CABLE_DATA, Tool.TOOL_ZONE, Tool.TOOL_CONTAINMENT_TRAY, Tool.TOOL_CONTAINMENT_TRUNKING, Tool.TOOL_CONTAINMENT_CONDUIT].includes(t))
        .map(t => ({
          id: t,
          icon: t === Tool.SCALE ? Ruler : 
                t === Tool.TOOL_ZONE ? SquareDashedBottom :
                t.toString().includes('CABLE') ? Cable : Box,
          label: purposeConfig.toolLabels?.[t] || t,
        })) || [],
    },
  ];

  return (
    <div className="bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: File Operations */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload PDF
          </Button>

          {user && (
            <>
              <Button variant="outline" size="sm" onClick={onSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={onLoad}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Load
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={isExporting || !hasScale}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>

          {onOpenBoq && (
            <Button variant="outline" size="sm" onClick={onOpenBoq}>
              <FileText className="h-4 w-4 mr-2" />
              BOQ
            </Button>
          )}
        </div>

        {/* Center: Tools */}
        <div className="flex items-center gap-4">
          {toolGroups.map((group, idx) => (
            <React.Fragment key={group.name}>
              {idx > 0 && <Separator orientation="vertical" className="h-8" />}
              <div className="flex items-center gap-1">
                {group.tools.map((tool) => (
                  <Button
                    key={tool.id}
                    variant={activeTool === tool.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onToolChange(tool.id)}
                    title={tool.label}
                  >
                    <tool.icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </React.Fragment>
          ))}

          <Separator orientation="vertical" className="h-8" />

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          {onConfigurePV && (
            <>
              <Separator orientation="vertical" className="h-8" />
              <Button
                variant={hasPvConfig ? 'default' : 'outline'}
                size="sm"
                onClick={onConfigurePV}
                title="Configure PV"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Right: Auth */}
        <div>
          {user ? (
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onSignIn}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
