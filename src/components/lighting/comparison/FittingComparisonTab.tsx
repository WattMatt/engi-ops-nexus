import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, GitCompare, History, Trash2 } from 'lucide-react';
import { LightingFitting, FITTING_TYPES } from '../lightingTypes';
import { ComparisonMatrix } from './ComparisonMatrix';
import { SaveComparisonDialog } from './SaveComparisonDialog';
import { parseComparisonCriteria } from './comparisonTypes';
import { SavedComparison, DEFAULT_SETTINGS, ComparisonSettings } from './comparisonTypes';
import { toast } from 'sonner';

interface FittingComparisonTabProps {
  projectId?: string | null;
}

export const FittingComparisonTab = ({ projectId }: FittingComparisonTabProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [settings, setSettings] = useState<ComparisonSettings>(DEFAULT_SETTINGS);

  // Fetch fittings
  const { data: fittings = [] } = useQuery({
    queryKey: ['lighting-fittings', projectId],
    queryFn: async () => {
      let query = supabase
        .from('lighting_fittings')
        .select('*')
        .order('fitting_code');

      if (projectId) {
        query = query.or(`project_id.is.null,project_id.eq.${projectId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LightingFitting[];
    },
  });

  // Fetch saved comparisons
  const { data: savedComparisons = [], refetch: refetchComparisons } = useQuery({
    queryKey: ['lighting-comparisons', projectId],
    queryFn: async () => {
      let query = supabase
        .from('lighting_comparisons')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.or(`project_id.is.null,project_id.eq.${projectId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SavedComparison[];
    },
  });

  // Fetch analysis settings
  useQuery({
    queryKey: ['lighting-analysis-settings', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const { data, error } = await supabase
        .from('lighting_analysis_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings({
          electricity_rate: Number(data.electricity_rate) || DEFAULT_SETTINGS.electricity_rate,
          operating_hours_per_day: Number(data.operating_hours_per_day) || DEFAULT_SETTINGS.operating_hours_per_day,
          analysis_period_years: data.analysis_period_years || DEFAULT_SETTINGS.analysis_period_years,
          include_vat: data.include_vat ?? DEFAULT_SETTINGS.include_vat,
          vat_rate: Number(data.vat_rate) || DEFAULT_SETTINGS.vat_rate,
        });
      }
      return data;
    },
    enabled: !!projectId,
  });

  const filteredFittings = useMemo(() => {
    if (!search) return fittings;
    const lower = search.toLowerCase();
    return fittings.filter(
      (f) =>
        f.fitting_code.toLowerCase().includes(lower) ||
        f.model_name.toLowerCase().includes(lower) ||
        f.manufacturer?.toLowerCase().includes(lower)
    );
  }, [fittings, search]);

  const selectedFittings = useMemo(() => {
    return fittings.filter((f) => selectedIds.includes(f.id));
  }, [fittings, selectedIds]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCompare = () => {
    if (selectedIds.length < 2) {
      toast.error('Select at least 2 fittings to compare');
      return;
    }
    if (selectedIds.length > 6) {
      toast.error('Maximum 6 fittings can be compared at once');
      return;
    }
    setShowComparison(true);
  };

  const loadSavedComparison = (comparison: SavedComparison) => {
    const validIds = comparison.fitting_ids.filter((id) =>
      fittings.some((f) => f.id === id)
    );
    if (validIds.length < 2) {
      toast.error('Some fittings from this comparison no longer exist');
      return;
    }
    setSelectedIds(validIds);
    const parsedCriteria = parseComparisonCriteria(comparison.comparison_criteria);
    if (parsedCriteria) {
      setSettings(parsedCriteria);
    }
    setShowComparison(true);
  };

  const deleteSavedComparison = async (id: string) => {
    const { error } = await supabase
      .from('lighting_comparisons')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete comparison');
    } else {
      toast.success('Comparison deleted');
      refetchComparisons();
    }
  };

  const getTypeLabel = (type: string) => {
    return FITTING_TYPES.find((t) => t.value === type)?.label || type;
  };

  if (showComparison) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setShowComparison(false)}>
            ← Back to Selection
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSaveDialogOpen(true)}>
              Save Comparison
            </Button>
          </div>
        </div>
        <ComparisonMatrix
          fittings={selectedFittings}
          settings={settings}
          onSettingsChange={setSettings}
        />
        <SaveComparisonDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          fittingIds={selectedIds}
          settings={settings}
          projectId={projectId}
          onSaved={refetchComparisons}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="select">
        <TabsList>
          <TabsTrigger value="select">Select Fittings</TabsTrigger>
          <TabsTrigger value="saved">
            <History className="h-4 w-4 mr-1" />
            Saved ({savedComparisons.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="select" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Select Fittings to Compare</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedIds.length} selected
                  </Badge>
                  <Button
                    onClick={handleCompare}
                    disabled={selectedIds.length < 2 || selectedIds.length > 6}
                  >
                    <GitCompare className="h-4 w-4 mr-1" />
                    Compare Selected
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fittings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              <ScrollArea className="h-[450px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]" />
                      <TableHead>Code</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Wattage</TableHead>
                      <TableHead className="text-right">Lumens</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFittings.map((fitting) => (
                      <TableRow
                        key={fitting.id}
                        className={selectedIds.includes(fitting.id) ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(fitting.id)}
                            onCheckedChange={() => toggleSelection(fitting.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {fitting.fitting_code}
                        </TableCell>
                        <TableCell>{fitting.manufacturer || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {fitting.model_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(fitting.fitting_type)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {fitting.wattage ? `${fitting.wattage}W` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {fitting.lumen_output ? `${fitting.lumen_output}lm` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R{(fitting.supply_cost + fitting.install_cost).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <p className="text-sm text-muted-foreground mt-2">
                Select 2-6 fittings to compare. {filteredFittings.length} fittings available.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saved Comparisons</CardTitle>
            </CardHeader>
            <CardContent>
              {savedComparisons.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No saved comparisons yet. Create a comparison and save it.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedComparisons.map((comparison) => (
                    <div
                      key={comparison.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => loadSavedComparison(comparison)}
                      >
                        <p className="font-medium">{comparison.comparison_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {comparison.fitting_ids.length} fittings •{' '}
                          {new Date(comparison.created_at).toLocaleDateString()}
                        </p>
                        {comparison.notes && (
                          <p className="text-sm text-muted-foreground truncate">
                            {comparison.notes}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSavedComparison(comparison.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
