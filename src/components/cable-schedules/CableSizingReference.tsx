import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COPPER_CABLE_TABLE, ALUMINIUM_CABLE_TABLE } from "@/utils/cableSizing";

interface CableSizingReferenceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CableSizingReference = ({
  open,
  onOpenChange,
}: CableSizingReferenceProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>SANS 10142-1 Cable Sizing Reference</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Reference Method B - Cables enclosed in conduit on a wall or in trunking
          </p>
        </DialogHeader>

        <Tabs defaultValue="copper" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="copper">Copper Conductors</TabsTrigger>
            <TabsTrigger value="aluminium">Aluminium Conductors</TabsTrigger>
          </TabsList>

          <TabsContent value="copper" className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cable Size</TableHead>
                    <TableHead className="text-right">
                      Current Rating (A)
                    </TableHead>
                    <TableHead className="text-right">Ω/km @ 20°C</TableHead>
                    <TableHead className="text-right">
                      Supply Cost (R/m)
                    </TableHead>
                    <TableHead className="text-right">
                      Install Cost (R/m)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COPPER_CABLE_TABLE.map((cable) => (
                    <TableRow key={cable.size}>
                      <TableCell className="font-medium">{cable.size}</TableCell>
                      <TableCell className="text-right">
                        {cable.currentRating}
                      </TableCell>
                      <TableCell className="text-right">
                        {cable.ohmPerKm.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">
                        R {cable.supplyCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        R {cable.installCost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              * Current ratings are for PVC insulated copper cables at 30°C ambient
              temperature. Costs are indicative and may vary based on supplier and
              market conditions.
            </p>
          </TabsContent>

          <TabsContent value="aluminium" className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cable Size</TableHead>
                    <TableHead className="text-right">
                      Current Rating (A)
                    </TableHead>
                    <TableHead className="text-right">Ω/km @ 20°C</TableHead>
                    <TableHead className="text-right">
                      Supply Cost (R/m)
                    </TableHead>
                    <TableHead className="text-right">
                      Install Cost (R/m)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALUMINIUM_CABLE_TABLE.map((cable) => (
                    <TableRow key={cable.size}>
                      <TableCell className="font-medium">{cable.size}</TableCell>
                      <TableCell className="text-right">
                        {cable.currentRating}
                      </TableCell>
                      <TableCell className="text-right">
                        {cable.ohmPerKm.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">
                        R {cable.supplyCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        R {cable.installCost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              * Current ratings are for PVC insulated aluminium cables at 30°C
              ambient temperature. Costs are indicative and may vary based on
              supplier and market conditions.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
