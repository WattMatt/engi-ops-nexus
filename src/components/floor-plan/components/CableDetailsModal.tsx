
import React, { useState, useEffect, useMemo } from 'react';
import { PurposeConfig } from '../purpose.config';
import { supabase } from '@/integrations/supabase/client';
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
    cableEntryId?: string;
    scheduleId?: string;
    calculatedLength?: number;
  }) => void;
  existingCableTypes: string[];
  purposeConfig: PurposeConfig | null;
  calculatedLength: number;
  projectId?: string;
}

interface CableSchedule {
  id: string;
  schedule_name: string;
  schedule_number: string;
}

interface CableEntry {
  id: string;
  cable_tag: string;
  from_location: string;
  to_location: string;
  cable_type: string;
  measured_length: number | null;
  schedule_id: string;
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
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [schedules, setSchedules] = useState<CableSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [cableEntries, setCableEntries] = useState<CableEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState('');
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

  // Fetch cable schedules
  useEffect(() => {
    if (isOpen && projectId) {
      const fetchSchedules = async () => {
        console.log('Fetching cable schedules for project:', projectId);
        const { data, error } = await supabase
          .from('cable_schedules')
          .select('id, schedule_name, schedule_number')
          .eq('project_id', projectId)
          .order('schedule_number');
        
        if (error) {
          console.error('Error fetching cable schedules:', error);
        } else {
          console.log('Fetched cable schedules:', data);
          setSchedules(data || []);
        }
      };
      fetchSchedules();
    } else if (isOpen && !projectId) {
      console.log('No project ID available for fetching cable schedules');
      setSchedules([]);
    }
  }, [isOpen, projectId]);

  // Fetch cable entries when schedule is selected
  useEffect(() => {
    if (selectedSchedule) {
      const fetchEntries = async () => {
        console.log('Fetching cable entries for schedule:', selectedSchedule);
        const { data, error } = await supabase
          .from('cable_entries')
          .select('id, cable_tag, from_location, to_location, cable_type, measured_length, schedule_id, floor_plan_cable_id')
          .eq('schedule_id', selectedSchedule)
          .is('floor_plan_cable_id', null); // Only fetch unlinked cables
        
        if (error) {
          console.error('Error fetching cable entries:', error);
        } else {
          console.log('Fetched cable entries:', data);
          // Sort by shop number extracted from cable_tag
          const sorted = (data || []).sort((a, b) => {
            // Extract shop numbers (e.g., "Shop 13/14" -> 13, "Shop 17B" -> 17, "Shop 1A" -> 1)
            const shopRegex = /Shop\s+(\d+)/i;
            const matchA = a.cable_tag.match(shopRegex);
            const matchB = b.cable_tag.match(shopRegex);
            
            const numA = matchA ? parseInt(matchA[1], 10) : 0;
            const numB = matchB ? parseInt(matchB[1], 10) : 0;
            
            // If shop numbers are different, sort by number
            if (numA !== numB) {
              return numA - numB;
            }
            
            // If same shop number, sort alphabetically (handles 17, 17A, 17B, etc.)
            return a.cable_tag.localeCompare(b.cable_tag, undefined, { numeric: true });
          });
          setCableEntries(sorted);
        }
      };
      fetchEntries();
    } else {
      setCableEntries([]);
      setSelectedEntry('');
    }
  }, [selectedSchedule]);

  // Auto-populate fields when cable entry is selected
  useEffect(() => {
    if (selectedEntry && mode === 'existing') {
      const entry = cableEntries.find(e => e.id === selectedEntry);
      if (entry) {
        setFrom(entry.from_location);
        setTo(entry.to_location);
        setLabel(entry.cable_tag);
        setSelectedCableType(entry.cable_type || '');
      }
    }
  }, [selectedEntry, cableEntries, mode]);

  useEffect(() => {
    if (isOpen) {
      // Reset fields when modal opens
      setMode('new');
      setSelectedSchedule('');
      setSelectedEntry('');
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
        cableEntryId: mode === 'existing' ? selectedEntry : undefined,
        scheduleId: mode === 'existing' ? selectedSchedule : undefined,
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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">LV/AC Cable Details</h2>
        <p className="text-gray-400 mb-6">
          Calculated Length: <span className="text-green-400 font-semibold">{calculatedLength.toFixed(2)}m</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <Label className="text-gray-300">Cable Entry Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  mode === 'new' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                New Cable
              </button>
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  mode === 'existing' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Link to Schedule
              </button>
            </div>
          </div>

          {/* Schedule and Entry Selection (only for existing mode) */}
          {mode === 'existing' && (
            <>
              {!projectId ? (
                <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-md">
                  <p className="text-sm text-yellow-400">
                    ⚠️ No project linked to this floor plan. Please link this floor plan to a project to access cable schedules.
                  </p>
                </div>
              ) : schedules.length === 0 ? (
                <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-md">
                  <p className="text-sm text-blue-400">
                    ℹ️ No cable schedules found for this project. Create cable schedules in the Cable Schedules page first.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="schedule" className="text-gray-300">Cable Schedule</Label>
                    <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select a cable schedule" />
                      </SelectTrigger>
                      <SelectContent>
                        {schedules.map((schedule) => (
                          <SelectItem key={schedule.id} value={schedule.id}>
                            {schedule.schedule_number} - {schedule.schedule_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSchedule && (
                    <>
                      {cableEntries.length === 0 ? (
                        <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-md">
                          <p className="text-sm text-blue-400">
                            ℹ️ No cable entries found in this schedule. Add entries to the schedule first.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="entry" className="text-gray-300">Cable Entry</Label>
                          <Select value={selectedEntry} onValueChange={setSelectedEntry}>
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                              <SelectValue placeholder="Select a cable entry" />
                            </SelectTrigger>
                            <SelectContent>
                              {cableEntries.map((entry) => (
                                <SelectItem key={entry.id} value={entry.id}>
                                  {entry.cable_tag} | {entry.from_location} → {entry.to_location}
                                  {entry.measured_length && ` (${entry.measured_length}m)`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedEntry && (
                            <p className="text-sm text-green-400 mt-1">
                              ✓ Length will be updated to {calculatedLength.toFixed(2)}m in the schedule
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from" className="text-gray-300">
                Supply From
              </Label>
              <Input
                type="text"
                id="from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="e.g., Main Board 1"
                autoFocus
                disabled={mode === 'existing' && !!selectedEntry}
              />
            </div>
            <div>
              <Label htmlFor="to" className="text-gray-300">
                Supply To
              </Label>
              <Input
                type="text"
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="e.g., Shop 1"
                disabled={mode === 'existing' && !!selectedEntry}
              />
            </div>
          </div>
           <div>
            <Label htmlFor="label" className="text-gray-300">
              Line Label (Optional)
            </Label>
            <Input
              type="text"
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="e.g., Feeder 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <Label htmlFor="startHeight" className="text-gray-300">
                Start Height / Rise (m)
                </Label>
                <Input
                type="number"
                id="startHeight"
                value={startHeight}
                onChange={(e) => setStartHeight(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="e.g., 3.0"
                min="0"
                step="0.1"
                />
            </div>
            <div>
                <Label htmlFor="endHeight" className="text-gray-300">
                End Height / Drop (m)
                </Label>
                <Input
                type="number"
                id="endHeight"
                value={endHeight}
                onChange={(e) => setEndHeight(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="e.g., 3.0"
                min="0"
                step="0.1"
                />
            </div>
          </div>
          <div>
            <label htmlFor="cableType" className="block text-sm font-medium text-gray-300 mb-2">
              Cable Type
            </label>
            <select
              id="cableType"
              value={selectedCableType}
              onChange={(e) => setSelectedCableType(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" disabled>-- Select a cable type --</option>
              {allCableOptions.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
              <option value="other">Other (specify below)</option>
            </select>
          </div>
          {selectedCableType === 'other' && (
            <div>
              <Label htmlFor="customCableType" className="text-gray-300">
                Custom Cable Type
              </Label>
              <Input
                type="text"
                id="customCableType"
                value={customCableType}
                onChange={(e) => setCustomCableType(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="e.g., 2Core x 10mm Cu"
                autoFocus
              />
            </div>
          )}
          <div>
            <Label htmlFor="terminationCount" className="text-gray-300">
              Number of Terminations
            </Label>
            <Input
              type="number"
              id="terminationCount"
              value={terminationCount}
              onChange={(e) => setTerminationCount(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="e.g., 2"
              min="0"
              step="1"
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
              Add Cable
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CableDetailsModal;