import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClimaticZoneMap } from "./ClimaticZoneMap";

interface SANS204CalculatorProps {
  documentId: string;
  onZoneSelect?: (zone: string) => void;
}

export const SANS204Calculator = ({ documentId, onZoneSelect }: SANS204CalculatorProps) => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const handleZoneSelect = (zone: string) => {
    setSelectedZone(zone);
    onZoneSelect?.(zone);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Select Climatic Zone</CardTitle>
      </CardHeader>
      <CardContent>
        <ClimaticZoneMap
          onZoneSelect={handleZoneSelect}
          selectedZone={selectedZone}
        />
      </CardContent>
    </Card>
  );
};
