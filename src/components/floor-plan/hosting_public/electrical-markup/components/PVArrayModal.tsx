import React, { useState, useEffect, useMemo } from 'react';
import { PanelOrientation } from '../types';

export interface PVArrayConfig {
    rows: number;
    columns: number;
    orientation: PanelOrientation;
}

interface PVArrayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: PVArrayConfig) => void;
}

const PVArrayModal: React.FC<PVArrayModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [rows, setRows] = useState(2);
  const [columns, setColumns] = useState(9);
  const [orientation, setOrientation] = useState<PanelOrientation>('portrait');

  useEffect(() => {
    if (isOpen) {
      // Don't reset values so user can make small adjustments
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rows > 0 && columns > 0) {
      onSubmit({ rows, columns, orientation });
    } else {
      alert('Please enter a valid number of rows and columns.');
    }
  };

  const previewCells = useMemo(() => {
    const safeRows = Math.max(1, Math.min(rows, 50)); // Cap for performance
    const safeCols = Math.max(1, Math.min(columns, 50));
    return Array.from({ length: safeRows * safeCols }, (_, i) => i);
  }, [rows, columns]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-lg">
        <h2 className="text-2xl font-bold text-white mb-4">Configure PV Array</h2>
        <p className="text-gray-400 mb-6">Define the layout for the array of panels you want to place.</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8">
            {/* Left side: Inputs */}
            <div className="space-y-4">
                <div>
                    <label htmlFor="rows" className="block text-sm font-medium text-gray-300 mb-2">
                    Rows
                    </label>
                    <input
                    type="number"
                    id="rows"
                    value={rows}
                    onChange={(e) => setRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    min="1"
                    autoFocus
                    />
                </div>
                <div>
                    <label htmlFor="columns" className="block text-sm font-medium text-gray-300 mb-2">
                    Columns
                    </label>
                    <input
                    type="number"
                    id="columns"
                    value={columns}
                    onChange={(e) => setColumns(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    min="1"
                    />
                </div>
                 <div>
                    <span className="block text-sm font-medium text-gray-300 mb-2">Orientation</span>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-white cursor-pointer">
                            <input type="radio" name="orientation" value="portrait" checked={orientation === 'portrait'} onChange={() => setOrientation('portrait')} className="form-radio bg-gray-700 text-indigo-500"/>
                            Portrait
                        </label>
                        <label className="flex items-center gap-2 text-white cursor-pointer">
                            <input type="radio" name="orientation" value="landscape" checked={orientation === 'landscape'} onChange={() => setOrientation('landscape')} className="form-radio bg-gray-700 text-indigo-500"/>
                            Landscape
                        </label>
                    </div>
                </div>
                 <div className="text-lg text-white font-bold mt-4">
                    Total Panels: {rows * columns}
                </div>
            </div>

            {/* Right side: Preview */}
            <div className='flex flex-col items-center justify-center bg-gray-900/50 p-4 rounded-lg'>
                <h4 className='text-sm text-gray-400 mb-2'>Layout Preview</h4>
                <div 
                    className="grid gap-1 p-2 border border-dashed border-gray-600"
                    style={{ 
                        gridTemplateRows: `repeat(${Math.min(rows, 50)}, minmax(0, 1fr))`, 
                        gridTemplateColumns: `repeat(${Math.min(columns, 50)}, minmax(0, 1fr))`
                    }}
                >
                    {previewCells.map(i => (
                        <div key={i} className={`bg-sky-500 rounded-sm ${orientation === 'portrait' ? 'w-3 h-5' : 'w-5 h-3'}`}></div>
                    ))}
                </div>
            </div>

            {/* Buttons */}
            <div className="col-span-2 flex justify-end space-x-4 pt-4 border-t border-gray-700">
                <button type="button" onClick={onClose} className="px-6 py-2 rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500">
                Cancel
                </button>
                <button type="submit" className="px-6 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                Confirm & Place
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default PVArrayModal;