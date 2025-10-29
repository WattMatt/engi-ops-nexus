import React, { useState, useEffect } from 'react';

interface RoofMaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: { pitch: number }) => void;
}

const RoofMaskModal: React.FC<RoofMaskModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [pitch, setPitch] = useState('30');

  useEffect(() => {
    if (isOpen) {
      setPitch('30');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numPitch = parseFloat(pitch);

    if (isNaN(numPitch) || numPitch < 0 || numPitch > 90) {
      alert('Please enter a valid pitch between 0 and 90 degrees.');
      return;
    }
    
    onSubmit({ pitch: numPitch });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Roof Face Properties</h2>
        <p className="text-gray-400 mb-6">Enter the pitch for the roof area you just drew.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pitch" className="block text-sm font-medium text-gray-300 mb-2">
              Roof Pitch (degrees)
            </label>
            <input
              type="number"
              id="pitch"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 30"
              min="0"
              max="90"
              step="any"
              autoFocus
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
              Set Pitch &amp; Draw Direction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoofMaskModal;