import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Box } from 'lucide-react';
import { SupplyLine, EquipmentItem, Containment, ScaleInfo } from '../types';

interface FloorPlan3DDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lines: SupplyLine[];
    equipment: EquipmentItem[];
    containment: Containment[];
    scaleInfo: ScaleInfo;
}

export function FloorPlan3DDialog({
    open,
    onOpenChange,
    lines,
    equipment,
    containment,
    scaleInfo
}: FloorPlan3DDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] h-[80vh] flex flex-col p-0 gap-0 bg-slate-950 text-slate-100 border-slate-800">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                        <Maximize2 className="h-5 w-5 text-blue-500" />
                        3D Floor Plan Visualization
                    </DialogTitle>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 text-slate-400 hover:text-white">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden relative bg-slate-900 flex items-center justify-center">
                    <div className="text-center text-slate-400">
                        <Box className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">3D Visualization Temporarily Unavailable</p>
                        <p className="text-sm mt-2 text-slate-500">
                            Equipment: {equipment.length} items • Lines: {lines.length} • Containment: {containment.length}
                        </p>
                        <p className="text-xs mt-4 text-slate-600">
                            Use the 2D view for floor plan editing
                        </p>
                    </div>
                </div>

                <div className="p-2 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                    3D visualization is being updated
                </div>
            </DialogContent>
        </Dialog>
    );
}
