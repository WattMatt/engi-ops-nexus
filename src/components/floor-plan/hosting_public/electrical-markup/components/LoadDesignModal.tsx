import React from 'react';
import { FolderOpen } from 'lucide-react';
import { DesignListing } from '../utils/firebase';

interface LoadDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (designId: string) => void;
  designs: DesignListing[];
  isLoading: boolean;
}

const LoadDesignModal: React.FC<LoadDesignModalProps> = ({ isOpen, onClose, onLoad, designs, isLoading }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-xl max-h-[80vh] flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-4">Load Design from Cloud</h2>
        <p className="text-gray-400 mb-6">Select a previously saved design to continue working on it.</p>
        
        <div className="overflow-y-auto space-y-2 pr-2 flex-grow">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <p className="text-gray-400">Loading your designs...</p>
            </div>
          ) : designs.length > 0 ? (
            designs.map(design => (
              <button 
                key={design.id}
                onClick={() => onLoad(design.id)}
                className="w-full flex items-center justify-between p-3 rounded-md bg-gray-700 hover:bg-indigo-600/50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                    <FolderOpen className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-gray-200">{design.name}</p>
                        <p className="text-xs text-gray-400">Saved: {new Date(design.createdAt).toLocaleString()}</p>
                    </div>
                </div>
              </button>
            ))
          ) : (
            <div className="flex justify-center items-center h-full">
                <p className="text-gray-400">You have no saved designs.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadDesignModal;