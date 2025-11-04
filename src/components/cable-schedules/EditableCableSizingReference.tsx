import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, RotateCcw, Edit3 } from "lucide-react";
import { COPPER_CABLE_TABLE, ALUMINIUM_CABLE_TABLE, CableData } from "@/utils/cableSizing";
import { useToast } from "@/hooks/use-toast";

export const EditableCableSizingReference = () => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [copperData, setCopperData] = useState<CableData[]>([...COPPER_CABLE_TABLE]);
  const [aluminiumData, setAluminiumData] = useState<CableData[]>([...ALUMINIUM_CABLE_TABLE]);

  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedCopper = localStorage.getItem("custom_copper_cable_table");
    const savedAluminium = localStorage.getItem("custom_aluminium_cable_table");
    
    if (savedCopper) {
      setCopperData(JSON.parse(savedCopper));
    }
    if (savedAluminium) {
      setAluminiumData(JSON.parse(savedAluminium));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("custom_copper_cable_table", JSON.stringify(copperData));
    localStorage.setItem("custom_aluminium_cable_table", JSON.stringify(aluminiumData));
    
    toast({
      title: "Success",
      description: "Cable sizing table saved successfully",
    });
    
    setIsEditing(false);
  };

  const handleReset = () => {
    setCopperData([...COPPER_CABLE_TABLE]);
    setAluminiumData([...ALUMINIUM_CABLE_TABLE]);
    localStorage.removeItem("custom_copper_cable_table");
    localStorage.removeItem("custom_aluminium_cable_table");
    
    toast({
      title: "Reset Complete",
      description: "Cable sizing table reset to SANS defaults",
    });
    
    setIsEditing(false);
  };

  const updateCopperValue = (index: number, field: keyof CableData, value: string) => {
    const newData = [...copperData];
    const numValue = parseFloat(value);
    
    if (!isNaN(numValue)) {
      (newData[index] as any)[field] = numValue;
      setCopperData(newData);
    }
  };

  const updateAluminiumValue = (index: number, field: keyof CableData, value: string) => {
    const newData = [...aluminiumData];
    const numValue = parseFloat(value);
    
    if (!isNaN(numValue)) {
      (newData[index] as any)[field] = numValue;
      setAluminiumData(newData);
    }
  };

  const EditableCell = ({ value, onChange }: { value: number; onChange: (val: string) => void }) => {
    if (!isEditing) {
      return <span>{typeof value === 'number' ? value.toFixed(value < 1 ? 4 : 2) : value}</span>;
    }
    
    return (
      <Input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-center"
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>SANS 1507-3 Cable Sizing Reference</CardTitle>
            <CardDescription>
              PVC Insulated PVC bedded SWA PVC sheathed 600/1000 V cables - Ducts installation method
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Table
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to SANS
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>
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
                    <TableHead colSpan={2} className="text-center border-r">Voltage Drop (mV/A/m)</TableHead>
                    <TableHead colSpan={2} className="text-center">Cost (R/m)</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-center">Ground</TableHead>
                    <TableHead className="text-center">Ducts</TableHead>
                    <TableHead className="text-center border-r">Air</TableHead>
                    <TableHead className="text-center">3 Phase</TableHead>
                    <TableHead className="text-center border-r">1 Phase</TableHead>
                    <TableHead className="text-center">Supply</TableHead>
                    <TableHead className="text-center">Install</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {copperData.map((row, index) => (
                    <TableRow key={row.size}>
                      <TableCell className="font-medium border-r">{row.size}</TableCell>
                      <TableCell className="text-center">
                        <EditableCell 
                          value={row.currentRatingGround} 
                          onChange={(val) => updateCopperValue(index, 'currentRatingGround', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <EditableCell 
                          value={row.currentRatingDucts} 
                          onChange={(val) => updateCopperValue(index, 'currentRatingDucts', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center border-r">
                        <EditableCell 
                          value={row.currentRatingAir} 
                          onChange={(val) => updateCopperValue(index, 'currentRatingAir', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center border-r">
                        <EditableCell 
                          value={row.impedance} 
                          onChange={(val) => updateCopperValue(index, 'impedance', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <EditableCell 
                          value={row.voltDrop3Phase} 
                          onChange={(val) => updateCopperValue(index, 'voltDrop3Phase', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center border-r">
                        <EditableCell 
                          value={row.voltDrop1Phase} 
                          onChange={(val) => updateCopperValue(index, 'voltDrop1Phase', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <EditableCell 
                          value={row.supplyCost} 
                          onChange={(val) => updateCopperValue(index, 'supplyCost', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <EditableCell 
                          value={row.installCost} 
                          onChange={(val) => updateCopperValue(index, 'installCost', val)}
                        />
                      </TableCell>
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
                    <TableHead colSpan={2} className="text-center border-r">Voltage Drop (mV/A/m)</TableHead>
                    <TableHead colSpan={2} className="text-center">Cost (R/m)</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-center">Ground</TableHead>
                    <TableHead className="text-center">Ducts</TableHead>
                    <TableHead className="text-center border-r">Air</TableHead>
                    <TableHead className="text-center">3 Phase</TableHead>
                    <TableHead className="text-center border-r">1 Phase</TableHead>
                    <TableHead className="text-center">Supply</TableHead>
                    <TableHead className="text-center">Install</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aluminiumData.map((row, index) => (
                    <TableRow key={row.size}>
                      <TableCell className="font-medium border-r">{row.size}</TableCell>
                      <TableCell className="text-center">
                        <EditableCell 
                          value={row.currentRatingGround} 
                          onChange={(val) => updateAluminiumValue(index, 'currentRatingGround', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <EditableCell 
                          value={row.currentRatingDucts} 
                          onChange={(val) => updateAluminiumValue(index, 'currentRatingDucts', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center border-r">
                        <EditableCell 
                          value={row.currentRatingAir} 
                          onChange={(val) => updateAluminiumValue(index, 'currentRatingAir', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center border-r">
                        <EditableCell 
                          value={row.impedance} 
                          onChange={(val) => updateAluminiumValue(index, 'impedance', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <EditableCell 
                          value={row.voltDrop3Phase} 
                          onChange={(val) => updateAluminiumValue(index, 'voltDrop3Phase', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center border-r">
                        <EditableCell 
                          value={row.voltDrop1Phase} 
                          onChange={(val) => updateAluminiumValue(index, 'voltDrop1Phase', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <EditableCell 
                          value={row.supplyCost} 
                          onChange={(val) => updateAluminiumValue(index, 'supplyCost', val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <EditableCell 
                          value={row.installCost} 
                          onChange={(val) => updateAluminiumValue(index, 'installCost', val)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
        
        {isEditing && (
          <p className="text-sm text-muted-foreground mt-4">
            Click on any value to edit. Changes will be saved to your browser and used for cable sizing calculations.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
