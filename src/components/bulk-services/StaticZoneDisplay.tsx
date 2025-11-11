import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { SouthAfricaZoneMap } from "./SouthAfricaZoneMap";

interface StaticZoneDisplayProps {
  selectedZone: string;
}

const ZONE_COLORS = {
  "1": "#7EC8E3",
  "2": "#F5E6D3",
  "3": "#E67E50",
  "4": "#6B9AC4",
  "5": "#70B77E",
  "6": "#F4D03F",
};

const ZONE_INFO = {
  "1": { 
    name: "Cold Interior", 
    cities: "Johannesburg, Bloemfontein",
    temp: "14-16°C mean annual",
    characteristics: "High altitude, cold winters, moderate summers"
  },
  "2": { 
    name: "Temperate Interior", 
    cities: "Pretoria, Polokwane",
    temp: "16-18°C mean annual",
    characteristics: "Moderate climate, warm summers, mild winters"
  },
  "3": { 
    name: "Hot Interior", 
    cities: "Makhado, Nelspruit",
    temp: "18-22°C mean annual",
    characteristics: "Hot summers, warm winters, summer rainfall"
  },
  "4": { 
    name: "Temperate Coastal", 
    cities: "Cape Town, Port Elizabeth",
    temp: "14-18°C mean annual",
    characteristics: "Moderate climate, winter rainfall, ocean influence"
  },
  "5": { 
    name: "Sub-tropical Coastal", 
    cities: "Durban, Richards Bay, East London",
    temp: "18-22°C mean annual",
    characteristics: "Humid, warm year-round, high rainfall"
  },
  "6": { 
    name: "Arid Interior", 
    cities: "Kimberley, Upington",
    temp: "16-20°C mean annual",
    characteristics: "Very hot dry summers, cold nights, low rainfall"
  },
};

export const StaticZoneDisplay = ({ selectedZone }: StaticZoneDisplayProps) => {
  const zoneInfo = ZONE_INFO[selectedZone as keyof typeof ZONE_INFO];
  
  if (!zoneInfo) return null;

  return (
    <div className="space-y-4">
      {/* Simplified South Africa Map */}
      <div className="bg-card border rounded-lg p-3">
        <SouthAfricaZoneMap selectedZone={selectedZone} />
      </div>

      {/* Selected Zone Card */}
      <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div
              className="w-8 h-8 rounded shadow-sm border-2 border-primary"
              style={{ backgroundColor: ZONE_COLORS[selectedZone as keyof typeof ZONE_COLORS] }}
            />
            <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5">
              <MapPin className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-sm font-semibold">
              Zone {selectedZone}
            </Badge>
            <h3 className="text-lg font-bold">{zoneInfo.name}</h3>
          </div>
        </div>
        
        <div className="space-y-2 ml-11">
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium text-muted-foreground min-w-[140px]">Temperature:</span>
            <span className="text-sm font-semibold text-primary">{zoneInfo.temp}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium text-muted-foreground min-w-[140px]">Characteristics:</span>
            <span className="text-sm">{zoneInfo.characteristics}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium text-muted-foreground min-w-[140px]">Example Cities:</span>
            <span className="text-sm italic">{zoneInfo.cities}</span>
          </div>
        </div>
      </div>

      {/* All Zones Reference Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg border">
        <div className="col-span-2 md:col-span-3 mb-1">
          <p className="text-xs font-semibold text-muted-foreground">SANS 10400-XA Climatic Zones Reference</p>
        </div>
        {Object.entries(ZONE_INFO).map(([zone, info]) => (
          <div
            key={zone}
            className={`p-2 rounded border text-left ${
              selectedZone === zone
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded border border-border/50"
                style={{ backgroundColor: ZONE_COLORS[zone as keyof typeof ZONE_COLORS] }}
              />
              <Badge variant={selectedZone === zone ? "default" : "outline"} className="text-xs h-5">
                {zone}
              </Badge>
            </div>
            <p className="text-xs font-semibold leading-tight">{info.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{info.temp}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
