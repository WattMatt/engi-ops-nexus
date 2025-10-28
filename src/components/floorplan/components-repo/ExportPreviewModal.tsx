

import React, { useState, useMemo, useEffect } from 'react';
import { EquipmentItem, SupplyLine, SupplyZone, Containment, EquipmentType, PVArrayItem, PVPanelConfig } from '../types';
import { calculateLvCableSummary } from '../utils/styleUtils';

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: { projectName: string; comments: string }) => void;
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  zones: SupplyZone[];
  containment: Containment[];
  pvPanelConfig: PVPanelConfig | null;
  pvArrays: PVArrayItem[] | undefined;
}

const SummarySection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h4 className="text-md font-semibold text-indigo-300 mb-2 border-b border-gray-600 pb-1">{title}</h4>
        <div className="text-sm text-gray-300 space-y-1">{children}</div>
    </div>
);

const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({ isOpen, onClose, onConfirm, equipment, lines, zones, containment, pvPanelConfig, pvArrays }) => {
    const [projectName, setProjectName] = useState('Electrical Layout');
    const [comments, setComments] = useState('');

    useEffect(() => {
        if (isOpen) {
            setProjectName('Electrical Layout');
            setComments('');
        }
    }, [isOpen]);

    const equipmentCounts = useMemo(() => {
        const counts = new Map<EquipmentType, number>();
        equipment.forEach(item => {
            counts.set(item.type, (counts.get(item.type) || 0) + 1);
        });
        return Array.from(counts.entries());
    }, [equipment]);

    const lineSummary = useMemo(() => {
        const summary = { mvLength: 0, dcLength: 0 };
        lines.forEach(line => {
            if (line.type === 'mv') summary.mvLength += line.length;
            else if (line.type === 'dc') summary.dcLength += line.length;
        });
        const { totalLength: lvLength } = calculateLvCableSummary(lines);
        return { ...summary, lvLength };
    }, [lines]);

    const containmentSummary = useMemo(() => {
        const summary = new Map<string, number>();
        containment.forEach(c => {
             const key = `${c.type} (${c.size})`;
             summary.set(key, (summary.get(key) || 0) + c.length);
        });
        return Array.from(summary.entries());
    }, [containment]);
    
    const zoneSummary = useMemo(() => zones.reduce((acc, z) => acc + z.area, 0), [zones]);

    const pvSummary = useMemo(() => {
        if (!pvPanelConfig || !pvArrays || pvArrays.length === 0) return null;
        const totalPanels = pvArrays.reduce((sum, arr) => sum + arr.rows * arr.columns, 0);
        return {
            totalPanels,
            totalWattage: totalPanels * pvPanelConfig.wattage
        }
    }, [pvArrays, pvPanelConfig]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectName.trim()) {
            alert('Please enter a project name.');
            return;
        }
        onConfirm({ projectName, comments });
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold text-white mb-4 flex-shrink-0">Export Project Report</h2>
                <p className="text-gray-400 mb-6 flex-shrink-0">Review the summary below, add any comments, and generate the PDF report.</p>
                
                <div className="overflow-y-auto pr-4 space-y-6 mb-6">
                    {pvSummary && pvPanelConfig && (
                        <SummarySection title="PV System Summary">
                             <div className="flex justify-between"><span>Panel Type:</span> <span className="font-semibold">{pvPanelConfig.length}m x {pvPanelConfig.width}m, {pvPanelConfig.wattage}Wp</span></div>
                             <div className="flex justify-between"><span>Total Panels:</span> <span className="font-semibold">{pvSummary.totalPanels}</span></div>
                             <div className="flex justify-between"><span>Total Power:</span> <span className="font-semibold">{(pvSummary.totalWattage / 1000).toFixed(2)} kWp</span></div>
                        </SummarySection>
                    )}

                    <SummarySection title="Equipment Quantities">
                        {equipmentCounts.length > 0 ? equipmentCounts.map(([type, count]) => (
                            <div key={type} className="flex justify-between"><span>{type}:</span> <span className="font-semibold">{count}</span></div>
                        )) : <p className="text-gray-500">No equipment added.</p>}
                    </SummarySection>

                    <SummarySection title="Line Lengths">
                        {lineSummary.mvLength > 0 && <div className="flex justify-between"><span>MV Line Total:</span> <span className="font-semibold">{lineSummary.mvLength.toFixed(2)}m</span></div>}
                        {lineSummary.lvLength > 0 && <div className="flex justify-between"><span>LV/AC Line Total:</span> <span className="font-semibold">{lineSummary.lvLength.toFixed(2)}m</span></div>}
                        {lineSummary.dcLength > 0 && <div className="flex justify-between"><span>DC Line Total:</span> <span className="font-semibold">{lineSummary.dcLength.toFixed(2)}m</span></div>}
                        {lineSummary.mvLength === 0 && lineSummary.lvLength === 0 && lineSummary.dcLength === 0 && <p className="text-gray-500">No lines drawn.</p>}
                    </SummarySection>

                    <SummarySection title="Containment Totals">
                        {containmentSummary.length > 0 ? containmentSummary.map(([type, length]) => (
                            <div key={type} className="flex justify-between"><span>{type}:</span> <span className="font-semibold">{length.toFixed(2)}m</span></div>
                        )) : <p className="text-gray-500">No containment systems added.</p>}
                    </SummarySection>

                    <SummarySection title="Zone Areas">
                        {zones.length > 0 ? (
                           <div className="flex justify-between"><span>Total Zoned Area:</span> <span className="font-semibold">{zoneSummary.toFixed(2)}m²</span></div>
                        ) : <p className="text-gray-500">No zones defined.</p>}
                    </SummarySection>

                    <div>
                        <label htmlFor="projectName" className="block text-sm font-medium text-gray-300 mb-2">
                            Project Name / File Name
                        </label>
                        <input
                            type="text"
                            id="projectName"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="comments" className="block text-sm font-medium text-gray-300 mb-2">
                            Notes & Comments
                        </label>
                        <textarea
                            id="comments"
                            rows={4}
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Add any final notes or observations to be included in the PDF report..."
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-4 mt-auto flex-shrink-0 pt-4 border-t border-gray-700">
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
                        Generate PDF
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ExportPreviewModal;