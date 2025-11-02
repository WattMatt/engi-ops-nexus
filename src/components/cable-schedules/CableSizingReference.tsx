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
          <DialogTitle>SANS 1507-3 Cable Sizing Reference</DialogTitle>
          <p className="text-sm text-muted-foreground">
            PVC Insulated PVC bedded SWA PVC sheathed 600/1000 V cables - Ducts installation method
          </p>
        </DialogHeader>

        <Tabs defaultValue="copper" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="copper">Copper Conductors</TabsTrigger>
            <TabsTrigger value="aluminium">Aluminium Conductors</TabsTrigger>
          </TabsList>

          <TabsContent value="copper" className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2} className="align-middle border-r">Cable<br/>Size<br/>(mm²)</TableHead>
                    <TableHead colSpan={3} className="text-center border-r">Current Rating</TableHead>
                    <TableHead rowSpan={2} className="text-center align-middle border-r">Impe-<br/>dance<br/>(Ω/km)</TableHead>
                    <TableHead colSpan={2} className="text-center border-r">Volt drop</TableHead>
                    <TableHead colSpan={6} className="text-center border-r">Nominal Diameters (mm)</TableHead>
                    <TableHead colSpan={2} className="text-center border-r">Approx. Mass<br/>(kg/km)</TableHead>
                    <TableHead colSpan={2} className="text-center">Cost (R/m)</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-center">Ground<br/>(A)</TableHead>
                    <TableHead className="text-center">Ducts<br/>(A)</TableHead>
                    <TableHead className="text-center border-r">Air<br/>(A)</TableHead>
                    <TableHead className="text-center">3φ<br/>(mV/A/m)</TableHead>
                    <TableHead className="text-center border-r">1φ<br/>(mV/A/m)</TableHead>
                    <TableHead className="text-center">D1-3c</TableHead>
                    <TableHead className="text-center">D1-4c</TableHead>
                    <TableHead className="text-center">d-3c</TableHead>
                    <TableHead className="text-center">d-4c</TableHead>
                    <TableHead className="text-center">D2-3c</TableHead>
                    <TableHead className="text-center border-r">D2-4c</TableHead>
                    <TableHead className="text-center">3c</TableHead>
                    <TableHead className="text-center border-r">4c</TableHead>
                    <TableHead className="text-center">Supply</TableHead>
                    <TableHead className="text-center">Install</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COPPER_CABLE_TABLE.map((cable) => (
                    <TableRow key={cable.size}>
                      <TableCell className="font-medium border-r">{cable.size}</TableCell>
                      <TableCell className="text-right">{cable.currentRatingGround}</TableCell>
                      <TableCell className="text-right">{cable.currentRatingDucts}</TableCell>
                      <TableCell className="text-right border-r">{cable.currentRatingAir}</TableCell>
                      <TableCell className="text-right border-r">{cable.impedance.toFixed(4)}</TableCell>
                      <TableCell className="text-right">{cable.voltDrop3Phase.toFixed(3)}</TableCell>
                      <TableCell className="text-right border-r">{cable.voltDrop1Phase.toFixed(3)}</TableCell>
                      <TableCell className="text-right">{cable.d1_3c.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cable.d1_4c.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cable.d_3c.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cable.d_4c.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cable.d2_3c.toFixed(2)}</TableCell>
                      <TableCell className="text-right border-r">{cable.d2_4c.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cable.mass_3c}</TableCell>
                      <TableCell className="text-right border-r">{cable.mass_4c}</TableCell>
                      <TableCell className="text-right">{cable.supplyCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cable.installCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              * Current ratings from SANS 1507-3 Table 6.2 for 3 and 4 core PVC Insulated PVC bedded SWA PVC sheathed 600/1000 V cables.
              Costs are indicative and may vary based on supplier and market conditions.
            </p>
          </TabsContent>

          <TabsContent value="aluminium" className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2} className="align-middle border-r">Cable<br/>Size<br/>(mm²)</TableHead>
                    <TableHead colSpan={3} className="text-center border-r">Current Rating</TableHead>
                    <TableHead rowSpan={2} className="text-center align-middle border-r">Impe-<br/>dance<br/>(Ω/km)</TableHead>
                    <TableHead colSpan={2} className="text-center border-r">Volt drop</TableHead>
                    <TableHead colSpan={6} className="text-center border-r">Nominal Diameters (mm)</TableHead>
                    <TableHead colSpan={2} className="text-center border-r">Approx. Mass<br/>(kg/km)</TableHead>
                    <TableHead colSpan={2} className="text-center">Cost (R/m)</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-center">Ground<br/>(A)</TableHead>
                    <TableHead className="text-center">Ducts<br/>(A)</TableHead>
                    <TableHead className="text-center border-r">Air<br/>(A)</TableHead>
                    <TableHead className="text-center">3φ<br/>(mV/A/m)</TableHead>
                    <TableHead className="text-center border-r">1φ<br/>(mV/A/m)</TableHead>
                    <TableHead className="text-center">D1-3c</TableHead>
                    <TableHead className="text-center">D1-4c</TableHead>
                    <TableHead className="text-center">d-3c</TableHead>
                    <TableHead className="text-center">d-4c</TableHead>
                    <TableHead className="text-center">D2-3c</TableHead>
                    <TableHead className="text-center border-r">D2-4c</TableHead>
                    <TableHead className="text-center">3c</TableHead>
                    <TableHead className="text-center border-r">4c</TableHead>
                    <TableHead className="text-center">Supply</TableHead>
                    <TableHead className="text-center">Install</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALUMINIUM_CABLE_TABLE.map((cable) => (
                    <TableRow key={cable.size}>
                      <TableCell className="font-medium border-r">{cable.size}</TableCell>
                      <TableCell className="text-right">{cable.currentRatingGround}</TableCell>
                      <TableCell className="text-right">{cable.currentRatingDucts}</TableCell>
                      <TableCell className="text-right border-r">{cable.currentRatingAir}</TableCell>
                      <TableCell className="text-right border-r">{cable.impedance.toFixed(4)}</TableCell>
                      <TableCell className="text-right">{cable.voltDrop3Phase.toFixed(3)}</TableCell>
                      <TableCell className="text-right border-r">{cable.voltDrop1Phase.toFixed(3)}</TableCell>
                      <TableCell className="text-right">{cable.d1_3c.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cable.d1_4c.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cable.d_3c.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cable.d_4c.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cable.d2_3c.toFixed(2)}</TableCell>
                      <TableCell className="text-right border-r">{cable.d2_4c.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cable.mass_3c}</TableCell>
                      <TableCell className="text-right border-r">{cable.mass_4c}</TableCell>
                      <TableCell className="text-right">{cable.supplyCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cable.installCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              * Current ratings from SANS 1507-3 Table 6.3 for 3 and 4 core PVC Insulated PVC bedded SWA PVC sheathed 600/1000 V cables.
              Costs are indicative and may vary based on supplier and market conditions.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
