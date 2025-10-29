import React, { useState, useEffect } from 'react';

interface ScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (distance: number) => void;
}

const ScaleModal: React.FC<ScaleModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [distance, setDistance] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDistance('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numDistance = parseFloat(distance);
    if (!isNaN(numDistance) && numDistance > 0) {
      onSubmit(numDistance);
    } else {
      alert('Please enter a valid positive number.');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Set Drawing Scale</h2>
        <p className="text-gray-400 mb-6">Enter the real-world length for the line you just drew to calibrate the scale.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="distance" className="block text-sm font-medium text-gray-300 mb-2">
              Length (in meters)
            </label>
            <input
              type="number"
              id="distance"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 10.5"
              autoFocus
              step="any"
            />
          </div>
          <div className="flex justify-end space-x-4 mt-8">
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
              Set Scale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScaleModal;