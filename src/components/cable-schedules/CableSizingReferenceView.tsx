import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export const CableSizingReferenceView = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SANS 1507-3 Cable Sizing Reference</CardTitle>
        <CardDescription>
          PVC Insulated PVC bedded SWA PVC sheathed 600/1000 V cables - Ducts installation method
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                    <TableHead rowSpan={2} className="align-middle border-r">Cable<br/>Size</TableHead>
                    <TableHead colSpan={3} className="text-center border-r">Current Rating (A)</TableHead>
                    <TableHead rowSpan={2} className="text-center align-middle border-r">Impedance<br/>(Ω/km)</TableHead>
                    <TableHead colSpan={2} className="text-center">Voltage Drop (mV/A/m)</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-center">Ground</TableHead>
                    <TableHead className="text-center">Ducts</TableHead>
                    <TableHead className="text-center border-r">Air</TableHead>
                    <TableHead className="text-center">3 Phase</TableHead>
                    <TableHead className="text-center">1 Phase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COPPER_CABLE_TABLE.map((row) => (
                    <TableRow key={row.size}>
                      <TableCell className="font-medium border-r">{row.size}</TableCell>
                      <TableCell className="text-center">{row.currentRatingGround}</TableCell>
                      <TableCell className="text-center">{row.currentRatingDucts}</TableCell>
                      <TableCell className="text-center border-r">{row.currentRatingAir}</TableCell>
                      <TableCell className="text-center border-r">{row.impedance}</TableCell>
                      <TableCell className="text-center">{row.voltDrop3Phase}</TableCell>
                      <TableCell className="text-center">{row.voltDrop1Phase}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="aluminium" className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2} className="align-middle border-r">Cable<br/>Size</TableHead>
                    <TableHead colSpan={3} className="text-center border-r">Current Rating (A)</TableHead>
                    <TableHead rowSpan={2} className="text-center align-middle border-r">Impedance<br/>(Ω/km)</TableHead>
                    <TableHead colSpan={2} className="text-center">Voltage Drop (mV/A/m)</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-center">Ground</TableHead>
                    <TableHead className="text-center">Ducts</TableHead>
                    <TableHead className="text-center border-r">Air</TableHead>
                    <TableHead className="text-center">3 Phase</TableHead>
                    <TableHead className="text-center">1 Phase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALUMINIUM_CABLE_TABLE.map((row) => (
                    <TableRow key={row.size}>
                      <TableCell className="font-medium border-r">{row.size}</TableCell>
                      <TableCell className="text-center">{row.currentRatingGround}</TableCell>
                      <TableCell className="text-center">{row.currentRatingDucts}</TableCell>
                      <TableCell className="text-center border-r">{row.currentRatingAir}</TableCell>
                      <TableCell className="text-center border-r">{row.impedance}</TableCell>
                      <TableCell className="text-center">{row.voltDrop3Phase}</TableCell>
                      <TableCell className="text-center">{row.voltDrop1Phase}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
