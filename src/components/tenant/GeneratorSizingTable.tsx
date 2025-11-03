import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";

export function GeneratorSizingTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generator Sizing & Consumption Reference</CardTitle>
        <CardDescription>
          Fuel consumption rates (L/hr) at different load percentages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Generator Rating</TableHead>
              <TableHead className="text-right font-semibold">25% Load</TableHead>
              <TableHead className="text-right font-semibold">50% Load</TableHead>
              <TableHead className="text-right font-semibold">75% Load</TableHead>
              <TableHead className="text-right font-semibold">100% Load</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {GENERATOR_SIZING_TABLE.map((row) => (
              <TableRow key={row.rating}>
                <TableCell className="font-medium">{row.rating}</TableCell>
                <TableCell className="text-right">{row.load25}</TableCell>
                <TableCell className="text-right">{row.load50}</TableCell>
                <TableCell className="text-right">{row.load75}</TableCell>
                <TableCell className="text-right">{row.load100}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
