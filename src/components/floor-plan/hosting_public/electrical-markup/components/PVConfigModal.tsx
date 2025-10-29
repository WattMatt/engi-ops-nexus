import React, { useState, useEffect } from 'react';
import { PVPanelConfig } from '../types';

interface PVConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: PVPanelConfig) => void;
}

const PVConfigModal: React.FC<PVConfigModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [length, setLength] = useState('1.72');
  const [width, setWidth] = useState('1.13');
  const [wattage, setWattage] = useState('450');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numLength = parseFloat(length);
    const numWidth = parseFloat(width);
    const numWattage = parseInt(wattage, 10);

    if ([numLength, numWidth, numWattage].some(v => isNaN(v) || v <= 0)) {
      alert('Please enter valid, positive numbers for all fields.');
      return;
    }
    onSubmit({ length: numLength, width: numWidth, wattage: numWattage });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">PV Panel Configuration</h2>
        <p className="text-gray-400 mb-6">Enter the specifications for the PV panels you will be using.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="panel-length" className="block text-sm font-medium text-gray-300 mb-2">
              Panel Length (meters)
            </label>
            <input
              type="number"
              id="panel-length"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 1.722"
              step="any"
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="panel-width" className="block text-sm font-medium text-gray-300 mb-2">
              Panel Width (meters)
            </label>
            <input
              type="number"
              id="panel-width"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 1.134"
              step="any"
              required
            />
          </div>
          <div>
            <label htmlFor="panel-wattage" className="block text-sm font-medium text-gray-300 mb-2">
              Panel Wattage (Wp)
            </label>
            <input
              type="number"
              id="panel-wattage"
              value={wattage}
              onChange={(e) => setWattage(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 455"
              step="1"
              required
            />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Set Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PVConfigModal;