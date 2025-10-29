import React, { useState } from 'react';
import { DesignPurpose } from '../types';

interface DesignPurposeSelectorProps {
  onSelectPurpose: (purpose: DesignPurpose) => void;
}

const DesignPurposeSelector: React.FC<DesignPurposeSelectorProps> = ({ onSelectPurpose }) => {
  const [selected, setSelected] = useState<DesignPurpose>(DesignPurpose.BUDGET_MARKUP);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSelectPurpose(selected);
  };

  return (
    <div className="flex-1 flex justify-center items-center bg-gray-800">
      <div className="text-center p-8 border-2 border-dashed border-gray-600 rounded-lg max-w-lg w-full">
        <h2 className="text-2xl font-semibold text-gray-300">Confirm Project Type</h2>
        <p className="mt-2 mb-6 text-gray-500">Please select the primary purpose for this markup session.</p>
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value as DesignPurpose)}
            className="w-full max-w-xs px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Object.values(DesignPurpose).map(purpose => (
              <option key={purpose} value={purpose}>{purpose}</option>
            ))}
          </select>
          <button
            type="submit"
            className="mt-4 px-8 py-2.5 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold"
          >
            Start Markup
          </button>
        </form>
      </div>
    </div>
  );
};

export default DesignPurposeSelector;