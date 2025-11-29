import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MaterialPriceHistoryProps {
  material: {
    id: string;
    material_code: string;
    material_name: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MaterialPriceHistory = ({ material, open, onOpenChange }: MaterialPriceHistoryProps) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ["material-price-history", material?.id],
    queryFn: async () => {
      if (!material) return [];
      const { data, error } = await supabase
        .from("material_price_audit")
        .select("*")
        .eq("material_id", material.id)
        .order("changed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!material,
  });

  const getChangeIcon = (percent: number | null) => {
    if (!percent || percent === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (percent > 0) return <TrendingUp className="h-4 w-4 text-destructive" />;
    return <TrendingDown className="h-4 w-4 text-green-600" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Price History</DialogTitle>
          <DialogDescription>
            {material?.material_code} - {material?.material_name}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : history?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No price changes recorded yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Old Supply</TableHead>
                <TableHead className="text-right">New Supply</TableHead>
                <TableHead className="text-right">Old Install</TableHead>
                <TableHead className="text-right">New Install</TableHead>
                <TableHead className="text-center">Change</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history?.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-sm">
                    {format(new Date(record.changed_at), "dd MMM yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(record.old_supply_cost || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(record.new_supply_cost || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(record.old_install_cost || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(record.new_install_cost || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getChangeIcon(record.change_percent)}
                      <Badge variant={record.change_percent && record.change_percent > 0 ? "destructive" : "secondary"}>
                        {record.change_percent?.toFixed(1)}%
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate">
                    {record.change_reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
