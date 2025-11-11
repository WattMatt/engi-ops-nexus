interface SouthAfricaZoneMapProps {
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

export const SouthAfricaZoneMap = ({ selectedZone }: SouthAfricaZoneMapProps) => {
  const getZoneOpacity = (zone: string) => selectedZone === zone ? 1 : 0.25;
  const getZoneStroke = (zone: string) => selectedZone === zone ? "#000" : "#999";
  const getZoneStrokeWidth = (zone: string) => selectedZone === zone ? 3 : 0.5;

  // Zone center coordinates for pin placement
  const zoneCenters: Record<string, { x: number; y: number }> = {
    "1": { x: 260, y: 155 },
    "2": { x: 270, y: 85 },
    "3": { x: 340, y: 150 },
    "4": { x: 90, y: 250 },
    "5": { x: 280, y: 260 },
    "6": { x: 120, y: 160 },
  };

  return (
    <svg
      viewBox="0 0 400 350"
      className="w-full h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="400" height="350" fill="#f8f9fa" />
      
      {/* Title */}
      <text x="200" y="20" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1a1a1a">
        South Africa Climatic Zones
      </text>

      {/* Zone 4 - Temperate Coastal (Western & Southern Cape) */}
      <path
        d="M 30 200 L 30 280 L 120 320 L 180 310 L 200 290 L 180 270 L 140 250 L 100 230 L 60 210 Z"
        fill={ZONE_COLORS["4"]}
        opacity={getZoneOpacity("4")}
        stroke={getZoneStroke("4")}
        strokeWidth={getZoneStrokeWidth("4")}
      />
      
      {/* Zone 6 - Arid Interior (Northern Cape) */}
      <path
        d="M 30 80 L 30 200 L 60 210 L 100 230 L 140 250 L 180 240 L 200 220 L 210 180 L 200 140 L 180 100 L 140 80 Z"
        fill={ZONE_COLORS["6"]}
        opacity={getZoneOpacity("6")}
        stroke={getZoneStroke("6")}
        strokeWidth={getZoneStrokeWidth("6")}
      />

      {/* Zone 1 - Cold Interior (Johannesburg/Free State area) */}
      <path
        d="M 180 100 L 200 140 L 210 180 L 230 200 L 270 210 L 300 200 L 310 170 L 300 140 L 270 120 L 230 110 Z"
        fill={ZONE_COLORS["1"]}
        opacity={getZoneOpacity("1")}
        stroke={getZoneStroke("1")}
        strokeWidth={getZoneStrokeWidth("1")}
      />

      {/* Zone 2 - Temperate Interior (Pretoria/Limpopo) */}
      <path
        d="M 180 50 L 180 100 L 230 110 L 270 120 L 300 110 L 330 100 L 350 80 L 340 60 L 300 50 L 250 55 Z"
        fill={ZONE_COLORS["2"]}
        opacity={getZoneOpacity("2")}
        stroke={getZoneStroke("2")}
        strokeWidth={getZoneStrokeWidth("2")}
      />

      {/* Zone 3 - Hot Interior (Lowveld/Mpumalanga) */}
      <path
        d="M 300 110 L 330 100 L 360 120 L 370 150 L 360 180 L 340 190 L 310 170 L 300 140 Z"
        fill={ZONE_COLORS["3"]}
        opacity={getZoneOpacity("3")}
        stroke={getZoneStroke("3")}
        strokeWidth={getZoneStrokeWidth("3")}
      />

      {/* Zone 5 - Sub-tropical Coastal (KZN/Eastern Cape coast) */}
      <path
        d="M 200 220 L 230 200 L 270 210 L 300 200 L 310 170 L 340 190 L 360 180 L 370 210 L 360 250 L 340 280 L 300 300 L 250 310 L 200 290 L 180 270 Z"
        fill={ZONE_COLORS["5"]}
        opacity={getZoneOpacity("5")}
        stroke={getZoneStroke("5")}
        strokeWidth={getZoneStrokeWidth("5")}
      />

      {/* South Africa border outline */}
      <path
        d="M 30 80 L 30 200 L 30 280 L 120 320 L 180 310 L 200 290 L 250 310 L 300 300 L 340 280 L 360 250 L 370 210 L 370 150 L 360 120 L 350 80 L 340 60 L 300 50 L 250 55 L 180 50 L 140 80 Z"
        fill="none"
        stroke="#000"
        strokeWidth="2"
      />

      {/* Zone labels */}
      <text x="260" y="155" fontSize="20" fontWeight="bold" fill="#000" opacity={getZoneOpacity("1")}>1</text>
      <text x="270" y="85" fontSize="20" fontWeight="bold" fill="#000" opacity={getZoneOpacity("2")}>2</text>
      <text x="340" y="150" fontSize="20" fontWeight="bold" fill="#000" opacity={getZoneOpacity("3")}>3</text>
      <text x="90" y="250" fontSize="20" fontWeight="bold" fill="#000" opacity={getZoneOpacity("4")}>4</text>
      <text x="280" y="260" fontSize="20" fontWeight="bold" fill="#000" opacity={getZoneOpacity("5")}>5</text>
      <text x="120" y="160" fontSize="20" fontWeight="bold" fill="#000" opacity={getZoneOpacity("6")}>6</text>

      {/* Large location pin on selected zone */}
      {selectedZone && zoneCenters[selectedZone] && (
        <g>
          {/* Pin shadow/glow */}
          <ellipse
            cx={zoneCenters[selectedZone].x}
            cy={zoneCenters[selectedZone].y + 35}
            rx="12"
            ry="4"
            fill="#000"
            opacity="0.3"
          />
          
          {/* Pin outer border */}
          <path
            d={`M ${zoneCenters[selectedZone].x} ${zoneCenters[selectedZone].y + 30} 
                Q ${zoneCenters[selectedZone].x - 15} ${zoneCenters[selectedZone].y + 15}, 
                  ${zoneCenters[selectedZone].x - 15} ${zoneCenters[selectedZone].y} 
                Q ${zoneCenters[selectedZone].x - 15} ${zoneCenters[selectedZone].y - 15}, 
                  ${zoneCenters[selectedZone].x} ${zoneCenters[selectedZone].y - 15} 
                Q ${zoneCenters[selectedZone].x + 15} ${zoneCenters[selectedZone].y - 15}, 
                  ${zoneCenters[selectedZone].x + 15} ${zoneCenters[selectedZone].y} 
                Q ${zoneCenters[selectedZone].x + 15} ${zoneCenters[selectedZone].y + 15}, 
                  ${zoneCenters[selectedZone].x} ${zoneCenters[selectedZone].y + 30} Z`}
            fill="#fff"
            stroke="#000"
            strokeWidth="3"
          />
          
          {/* Pin inner color */}
          <path
            d={`M ${zoneCenters[selectedZone].x} ${zoneCenters[selectedZone].y + 28} 
                Q ${zoneCenters[selectedZone].x - 13} ${zoneCenters[selectedZone].y + 14}, 
                  ${zoneCenters[selectedZone].x - 13} ${zoneCenters[selectedZone].y} 
                Q ${zoneCenters[selectedZone].x - 13} ${zoneCenters[selectedZone].y - 13}, 
                  ${zoneCenters[selectedZone].x} ${zoneCenters[selectedZone].y - 13} 
                Q ${zoneCenters[selectedZone].x + 13} ${zoneCenters[selectedZone].y - 13}, 
                  ${zoneCenters[selectedZone].x + 13} ${zoneCenters[selectedZone].y} 
                Q ${zoneCenters[selectedZone].x + 13} ${zoneCenters[selectedZone].y + 14}, 
                  ${zoneCenters[selectedZone].x} ${zoneCenters[selectedZone].y + 28} Z`}
            fill="#ef4444"
          />
          
          {/* Pin center dot */}
          <circle
            cx={zoneCenters[selectedZone].x}
            cy={zoneCenters[selectedZone].y}
            r="5"
            fill="#fff"
          />
          
          {/* Zone number on pin */}
          <text
            x={zoneCenters[selectedZone].x}
            y={zoneCenters[selectedZone].y + 4}
            fontSize="12"
            fontWeight="bold"
            fill="#fff"
            textAnchor="middle"
          >
            {selectedZone}
          </text>
        </g>
      )}

      {/* Zone labels */}
      <text x="260" y="155" fontSize="20" fontWeight="bold" fill="#000" opacity={getZoneOpacity("1")}>1</text>
      <text x="270" y="85" fontSize="20" fontWeight="bold" fill="#000" opacity={getZoneOpacity("2")}>2</text>
      <text x="340" y="150" fontSize="20" fontWeight="bold" fill="#000" opacity={getZoneOpacity("3")}>3</text>
      <text x="90" y="250" fontSize="20" fontWeight="bold" fill="#000" opacity={getZoneOpacity("4")}>4</text>
      <text x="280" y="260" fontSize="20" fontWeight="bold" fill="#000" opacity={getZoneOpacity("5")}>5</text>
      <text x="120" y="160" fontSize="20" fontWeight="bold" fill="#000" opacity={getZoneOpacity("6")}>6</text>

      {/* Selected zone indicator */}
      {selectedZone && (
        <text x="200" y="340" textAnchor="middle" fontSize="11" fill="#666">
          Selected: Zone {selectedZone} - {
            selectedZone === "1" ? "Cold Interior" :
            selectedZone === "2" ? "Temperate Interior" :
            selectedZone === "3" ? "Hot Interior" :
            selectedZone === "4" ? "Temperate Coastal" :
            selectedZone === "5" ? "Sub-tropical Coastal" :
            selectedZone === "6" ? "Arid Interior" : ""
          }
        </text>
      )}
    </svg>
  );
};
