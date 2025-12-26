import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Zap, AlertCircle, Check, Edit2 } from 'lucide-react';
import { useCreateDistributionBoard, useCreateCircuit } from './hooks/useDistributionBoards';
import { toast } from 'sonner';

interface DetectedCircuit {
  ref: string;
  type: string;
  description?: string;
}

interface DetectedDB {
  name: string;
  location?: string;
  circuits: DetectedCircuit[];
}

interface ScanResult {
  distribution_boards: DetectedDB[];
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

interface AIScanResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanResult: ScanResult | null;
  projectId: string;
  floorPlanId?: string;
  onComplete: () => void;
}

export function AIScanResultsDialog({
  open,
  onOpenChange,
  scanResult,
  projectId,
  floorPlanId,
  onComplete,
}: AIScanResultsDialogProps) {
  const createBoard = useCreateDistributionBoard();
  const createCircuit = useCreateCircuit();
  
  const [selectedDBs, setSelectedDBs] = useState<Set<string>>(new Set());
  const [editingDB, setEditingDB] = useState<string | null>(null);
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  // Initialize selections when dialog opens
  const initializeSelections = () => {
    if (scanResult?.distribution_boards) {
      setSelectedDBs(new Set(scanResult.distribution_boards.map(db => db.name)));
      setEditedNames({});
    }
  };

  const handleToggleDB = (name: string) => {
    const newSelected = new Set(selectedDBs);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedDBs(newSelected);
  };

  const handleSelectAll = () => {
    if (!scanResult) return;
    if (selectedDBs.size === scanResult.distribution_boards.length) {
      setSelectedDBs(new Set());
    } else {
      setSelectedDBs(new Set(scanResult.distribution_boards.map(db => db.name)));
    }
  };

  const getDBName = (originalName: string) => editedNames[originalName] || originalName;

  const handleCreateSelected = async () => {
    if (!scanResult || selectedDBs.size === 0) return;

    setIsCreating(true);
    let createdDBs = 0;
    let createdCircuits = 0;

    try {
      for (const db of scanResult.distribution_boards) {
        if (!selectedDBs.has(db.name)) continue;

        const dbName = getDBName(db.name);
        
        // Create the distribution board
        const newBoard = await createBoard.mutateAsync({
          project_id: projectId,
          name: dbName,
          location: db.location,
          floor_plan_id: floorPlanId,
        });

        createdDBs++;

        // Create circuits for this board
        for (const circuit of db.circuits || []) {
          await createCircuit.mutateAsync({
            distribution_board_id: newBoard.id,
            circuit_ref: circuit.ref,
            circuit_type: circuit.type,
            description: circuit.description,
          });
          createdCircuits++;
        }
      }

      toast.success(`Created ${createdDBs} DB(s) with ${createdCircuits} circuit(s)`);
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create some items');
    } finally {
      setIsCreating(false);
    }
  };

  const confidenceColor = {
    high: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    low: 'text-red-600 bg-red-100',
  };

  const circuitTypeColors: Record<string, string> = {
    lighting: 'bg-yellow-500/20 text-yellow-700',
    power: 'bg-blue-500/20 text-blue-700',
    'air conditioning': 'bg-cyan-500/20 text-cyan-700',
    spare: 'bg-gray-500/20 text-gray-700',
    emergency: 'bg-red-500/20 text-red-700',
  };

  if (!scanResult) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) initializeSelections(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Scan Results
          </DialogTitle>
          <DialogDescription>
            Review detected distribution boards and circuits before creating
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Badge className={confidenceColor[scanResult.confidence]}>
              {scanResult.confidence} confidence
            </Badge>
            <span className="text-sm text-muted-foreground">
              {scanResult.distribution_boards.length} DB(s) detected
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSelectAll}>
            {selectedDBs.size === scanResult.distribution_boards.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        {scanResult.notes && (
          <div className="p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {scanResult.notes}
          </div>
        )}

        {scanResult.distribution_boards.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No distribution boards or circuits detected.</p>
            <p className="text-sm">Try with a clearer image or add manually.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
            <div className="space-y-4 pr-4">
              {scanResult.distribution_boards.map((db) => (
                <div 
                  key={db.name} 
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedDBs.has(db.name) ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedDBs.has(db.name)}
                      onCheckedChange={() => handleToggleDB(db.name)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-primary" />
                        {editingDB === db.name ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editedNames[db.name] ?? db.name}
                              onChange={(e) => setEditedNames(prev => ({ ...prev, [db.name]: e.target.value }))}
                              className="h-7 w-32"
                              autoFocus
                            />
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => setEditingDB(null)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="font-semibold">{getDBName(db.name)}</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6"
                              onClick={() => setEditingDB(db.name)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {db.location && (
                          <span className="text-sm text-muted-foreground">— {db.location}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {db.circuits.map((circuit, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline"
                            className={circuitTypeColors[circuit.type.toLowerCase()] || 'bg-muted'}
                          >
                            {circuit.ref}
                            <span className="ml-1 opacity-60 text-xs">{circuit.type}</span>
                          </Badge>
                        ))}
                        {db.circuits.length === 0 && (
                          <span className="text-sm text-muted-foreground italic">No circuits detected</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateSelected} 
            disabled={selectedDBs.size === 0 || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create {selectedDBs.size} Selected
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
