import React, { useState, useEffect, useMemo } from 'react';
import { PurposeConfig } from '../purpose.config';

interface ContainmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: { size: string }) => void;
  purposeConfig: PurposeConfig | null;
}

const ContainmentDetailsModal: React.FC<ContainmentDetailsModalProps> = ({ isOpen, onClose, onSubmit, purposeConfig }) => {
  const containmentSizes = useMemo(() => purposeConfig?.containmentSizes || [], [purposeConfig]);
  const [size, setSize] = useState(containmentSizes[0] || '');

  useEffect(() => {
    if (isOpen) {
      setSize(containmentSizes[0] || '');
    }
  }, [isOpen, containmentSizes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (size) {
      onSubmit({ size });
    } else {
      alert('Please select a size.');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Containment Details</h2>
        <p className="text-gray-400 mb-6">Select the size for the containment system you just drew.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="size" className="block text-sm font-medium text-gray-300 mb-2">
              Containment Size
            </label>
            <select
              id="size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            >
              {containmentSizes.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
              Set Size
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContainmentDetailsModal;