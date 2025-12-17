import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  Upload,
  Filter,
  X,
  Lightbulb,
} from 'lucide-react';
import { AddFittingDialog } from './AddFittingDialog';
import { ImportFittingsDialog } from './ImportFittingsDialog';
import { LightingFitting, FITTING_TYPES } from './lightingTypes';

interface LightingLibraryTabProps {
  projectId?: string | null;
}

export const LightingLibraryTab = ({ projectId }: LightingLibraryTabProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editFitting, setEditFitting] = useState<LightingFitting | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: fittings = [], isLoading } = useQuery({
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lighting_fittings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lighting-fittings'] });
      toast.success('Fitting deleted');
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error('Failed to delete fitting', { description: error.message });
    },
  });

  const filteredFittings = useMemo(() => {
    return fittings.filter((fitting) => {
      const matchesSearch =
        !search ||
        fitting.fitting_code.toLowerCase().includes(search.toLowerCase()) ||
        fitting.model_name.toLowerCase().includes(search.toLowerCase()) ||
        fitting.manufacturer?.toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === 'all' || fitting.fitting_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [fittings, search, typeFilter]);

  const manufacturers = useMemo(() => {
    const unique = [...new Set(fittings.map((f) => f.manufacturer).filter(Boolean))];
    return unique.sort();
  }, [fittings]);

  const exportToCSV = () => {
    const headers = [
      'Code',
      'Manufacturer',
      'Model',
      'Type',
      'Wattage',
      'Lumens',
      'Color Temp',
      'CRI',
      'IP Rating',
      'Supply Cost',
      'Install Cost',
    ];
    const rows = filteredFittings.map((f) => [
      f.fitting_code,
      f.manufacturer || '',
      f.model_name,
      f.fitting_type,
      f.wattage || '',
      f.lumen_output || '',
      f.color_temperature || '',
      f.cri || '',
      f.ip_rating || '',
      f.supply_cost,
      f.install_cost,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lighting-fittings.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const getTypeLabel = (type: string) => {
    return FITTING_TYPES.find((t) => t.value === type)?.label || type;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lighting Fittings Library</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Fitting
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, model, manufacturer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {FITTING_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || typeFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('all');
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Table */}
          <ScrollArea className="h-[500px] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-[60px] bg-background"></TableHead>
                  <TableHead className="w-[100px] bg-background">Code</TableHead>
                  <TableHead className="bg-background">Manufacturer</TableHead>
                  <TableHead className="bg-background">Model</TableHead>
                  <TableHead className="bg-background">Type</TableHead>
                  <TableHead className="text-right bg-background">Wattage</TableHead>
                  <TableHead className="text-right bg-background">Lumens</TableHead>
                  <TableHead className="text-center bg-background">Color</TableHead>
                  <TableHead className="text-center bg-background">Warranty</TableHead>
                  <TableHead className="text-right bg-background">Total Cost</TableHead>
                  <TableHead className="w-[50px] bg-background" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      Loading fittings...
                    </TableCell>
                  </TableRow>
                ) : filteredFittings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {fittings.length === 0
                          ? 'No fittings in library. Add your first fitting.'
                          : 'No fittings match your filters.'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFittings.map((fitting) => (
                    <TableRow key={fitting.id}>
                      <TableCell>
                        <Avatar className="h-10 w-10 rounded-md">
                          <AvatarImage src={fitting.image_url || undefined} alt={fitting.model_name} className="object-cover" />
                          <AvatarFallback className="rounded-md bg-muted">
                            <Lightbulb className="h-5 w-5 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
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
                      <TableCell className="text-center">
                        {fitting.color_temperature ? `${fitting.color_temperature}K` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {(fitting as any).warranty_years || 3} yrs
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(fitting.supply_cost + fitting.install_cost)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditFitting(fitting);
                                setAddDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(fitting.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="mt-2 text-sm text-muted-foreground">
            Showing {filteredFittings.length} of {fittings.length} fittings
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <AddFittingDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditFitting(null);
        }}
        editFitting={editFitting}
        projectId={projectId}
      />

      {/* Import Dialog */}
      <ImportFittingsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        projectId={projectId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fitting?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the fitting from the library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
