import React from 'react';
import { Tool } from '@/types/floor-plan';
import { User } from '@supabase/supabase-js';
import { PurposeConfig } from '@/lib/floor-plan-purpose.config';

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

const Toolbar: React.FC<ToolbarProps> = (props) => {
  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="text-white">Floor Plan Toolbar</div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded">Tools</button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;