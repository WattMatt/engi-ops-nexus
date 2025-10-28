import React from 'react';
import { Tool } from '@/types/floor-plan';
import { PurposeConfig } from '@/lib/floor-plan-purpose.config';

interface EquipmentPanelProps {
  onEquipmentSelect: (type: string) => void;
  activeTool: Tool;
  purposeConfig: PurposeConfig | null;
}

const EquipmentPanel: React.FC<EquipmentPanelProps> = ({ onEquipmentSelect, activeTool, purposeConfig }) => {
  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
      <div className="text-white font-semibold mb-4">Equipment</div>
      <div className="space-y-2">
        <button 
          className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          onClick={() => onEquipmentSelect('DB')}
        >
          DB
        </button>
        <button 
          className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          onClick={() => onEquipmentSelect('Panel')}
        >
          Panel
        </button>
      </div>
    </div>
  );
};

export default EquipmentPanel;