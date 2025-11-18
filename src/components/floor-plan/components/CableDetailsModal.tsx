import React, { useState, useEffect, useMemo } from 'react';
import { PurposeConfig } from '../purpose.config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface CableDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: { 
    from: string; 
    to: string; 
    cableType: string; 
    terminationCount: number; 
    startHeight: number; 
    endHeight: number; 
    label: string;
    calculatedLength: number;
  }) => void;
  existingCableTypes: string[];
  purposeConfig: PurposeConfig | null;
  calculatedLength: number;
  projectId?: string;
}

const CableDetailsModal: React.FC<CableDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  existingCableTypes, 
  purposeConfig,
  calculatedLength,
  projectId 
}) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [label, setLabel] = useState('');
  const [selectedCableType, setSelectedCableType] = useState('');
  const [customCableType, setCustomCableType] = useState('');
  const [terminationCount, setTerminationCount] = useState('2');
  const [startHeight, setStartHeight] = useState('3');
  const [endHeight, setEndHeight] = useState('3');

  const allCableOptions = useMemo(() => {
    if (!purposeConfig) return [];
    const combined = new Set([...purposeConfig.cableTypes, ...existingCableTypes]);
    return Array.from(combined).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [existingCableTypes, purposeConfig]);

  useEffect(() => {
    if (isOpen) {
      // Reset form fields when modal opens
      setFrom('');
      setTo('');
      setLabel('');
      setSelectedCableType('');
      setCustomCableType('');
      setTerminationCount('2');
      setStartHeight('3');
      setEndHeight('3');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCableType = selectedCableType === 'other' ? customCableType.trim() : selectedCableType;
    const count = parseInt(terminationCount, 10);
    const startH = parseFloat(startHeight);
    const endH = parseFloat(endHeight);

    if (from.trim() && to.trim() && finalCableType && !isNaN(count) && count >= 0 && !isNaN(startH) && startH >= 0 && !isNaN(endH) && endH >= 0) {
      onSubmit({ 
        from, 
        to, 
        cableType: finalCableType, 
        terminationCount: count, 
        startHeight: startH, 
        endHeight: endH, 
        label: label.trim(),
        calculatedLength
      });
    } else {
      alert('Please fill in all fields with valid values.');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[9999]">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">LV/AC Cable Details</h2>
        <p className="text-gray-400 mb-6">
          Calculated Length: <span className="text-green-400 font-semibold">{calculatedLength.toFixed(2)}m</span>
        </p>
        <p className="text-xs text-green-400 mb-4">
          ✓ Cable will be automatically saved to the latest cable schedule for this project
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Supply From */}
          <div className="space-y-2">
            <Label htmlFor="from" className="text-gray-300">Supply From</Label>
            <Input 
              id="from" 
              type="text" 
              value={from} 
              onChange={(e) => setFrom(e.target.value)} 
              placeholder="e.g., Main DB" 
              className="bg-gray-700 text-white border-gray-600"
              required
            />
          </div>

          {/* Supply To */}
          <div className="space-y-2">
            <Label htmlFor="to" className="text-gray-300">Supply To</Label>
            <Input 
              id="to" 
              type="text" 
              value={to} 
              onChange={(e) => setTo(e.target.value)} 
              placeholder="e.g., Shop 13" 
              className="bg-gray-700 text-white border-gray-600"
              required
            />
          </div>

          {/* Line Label */}
          <div className="space-y-2">
            <Label htmlFor="label" className="text-gray-300">Line Label (Optional)</Label>
            <Input 
              id="label" 
              type="text" 
              value={label} 
              onChange={(e) => setLabel(e.target.value)} 
              placeholder="e.g., DB-Shop13" 
              className="bg-gray-700 text-white border-gray-600"
            />
          </div>

          {/* Start Height (Rise) */}
          <div className="space-y-2">
            <Label htmlFor="startHeight" className="text-gray-300">Start Height / Rise (m)</Label>
            <Input 
              id="startHeight" 
              type="number" 
              step="0.1" 
              value={startHeight} 
              onChange={(e) => setStartHeight(e.target.value)} 
              className="bg-gray-700 text-white border-gray-600"
              required
              min="0"
            />
            <p className="text-xs text-gray-400">Vertical rise at the start point</p>
          </div>

          {/* End Height (Drop) */}
          <div className="space-y-2">
            <Label htmlFor="endHeight" className="text-gray-300">End Height / Drop (m)</Label>
            <Input 
              id="endHeight" 
              type="number" 
              step="0.1" 
              value={endHeight} 
              onChange={(e) => setEndHeight(e.target.value)} 
              className="bg-gray-700 text-white border-gray-600"
              required
              min="0"
            />
            <p className="text-xs text-gray-400">Vertical drop at the end point</p>
          </div>

          {/* Cable Type */}
          <div className="space-y-2">
            <Label htmlFor="cableType" className="text-gray-300">Cable Type</Label>
            <Select value={selectedCableType} onValueChange={setSelectedCableType}>
              <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                <SelectValue placeholder="Select cable type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 text-white border-gray-600">
                {allCableOptions.map((cableType) => (
                  <SelectItem key={cableType} value={cableType} className="hover:bg-gray-600">
                    {cableType}
                  </SelectItem>
                ))}
                <SelectItem value="other" className="hover:bg-gray-600">Other (specify below)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedCableType === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="customCableType" className="text-gray-300">Custom Cable Type</Label>
              <Input 
                id="customCableType" 
                type="text" 
                value={customCableType} 
                onChange={(e) => setCustomCableType(e.target.value)} 
                placeholder="Enter custom cable type" 
                className="bg-gray-700 text-white border-gray-600"
                required
              />
            </div>
          )}

          {/* Number of Terminations */}
          <div className="space-y-2">
            <Label htmlFor="terminationCount" className="text-gray-300">Number of Terminations</Label>
            <Input 
              id="terminationCount" 
              type="number" 
              value={terminationCount} 
              onChange={(e) => setTerminationCount(e.target.value)} 
              className="bg-gray-700 text-white border-gray-600"
              required
              min="0"
            />
            <p className="text-xs text-gray-400">Total terminations (both ends combined)</p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors"
            >
              Add Cable
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CableDetailsModal;
