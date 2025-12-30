import React, { useState, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Html, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { EquipmentItem, SupplyLine, Containment, ScaleInfo, EquipmentType } from '../types';
import { useRoomBounds } from '../hooks/useRoomBounds';

interface Isometric3DViewerProps {
  equipment: EquipmentItem[];
  containment: Containment[];
  lines: SupplyLine[];
  scaleInfo: ScaleInfo;
  ceilingHeight?: number;
  selectedItemId?: string | null;
  onItemSelect?: (id: string | null) => void;
}

// Wall thickness in meters
const WALL_THICKNESS = 0.2;

// Equipment mounting categories and heights
type MountType = 'ceiling' | 'wall-high' | 'wall-mid' | 'wall-low' | 'floor';

interface EquipmentConfig {
  mountType: MountType;
  mountHeight: number; // Height from floor (for wall/floor) or from ceiling (for ceiling)
  color: string;
  shape: 'box' | 'cylinder' | 'panel' | 'sphere';
  size: { w: number; h: number; d: number };
  emissive?: boolean;
}

// Enhanced equipment configurations with accurate mounting heights
const EQUIPMENT_3D_CONFIG: Record<string, EquipmentConfig> = {
  // Ceiling-mounted lighting (flush with ceiling)
  [EquipmentType.CEILING_LIGHT]: { 
    mountType: 'ceiling', mountHeight: 0.05, color: '#fbbf24', shape: 'cylinder',
    size: { w: 0.15, h: 0.08, d: 0.15 }, emissive: true
  },
  [EquipmentType.RECESSED_LIGHT_600]: { 
    mountType: 'ceiling', mountHeight: 0, color: '#fef3c7', shape: 'panel',
    size: { w: 0.6, h: 0.02, d: 0.6 }, emissive: true
  },
  [EquipmentType.RECESSED_LIGHT_1200]: { 
    mountType: 'ceiling', mountHeight: 0, color: '#fef3c7', shape: 'panel',
    size: { w: 1.2, h: 0.02, d: 0.3 }, emissive: true
  },
  [EquipmentType.FLOODLIGHT]: { 
    mountType: 'ceiling', mountHeight: 0.1, color: '#fbbf24', shape: 'box',
    size: { w: 0.3, h: 0.15, d: 0.2 }, emissive: true
  },
  [EquipmentType.LED_STRIP_LIGHT]: { 
    mountType: 'ceiling', mountHeight: 0.02, color: '#fef08a', shape: 'box',
    size: { w: 1.0, h: 0.02, d: 0.05 }, emissive: true
  },
  [EquipmentType.FLUORESCENT_2_TUBE]: { 
    mountType: 'ceiling', mountHeight: 0.05, color: '#fef9c3', shape: 'panel',
    size: { w: 1.2, h: 0.08, d: 0.3 }, emissive: true
  },
  [EquipmentType.FLUORESCENT_1_TUBE]: { 
    mountType: 'ceiling', mountHeight: 0.05, color: '#fef9c3', shape: 'panel',
    size: { w: 0.6, h: 0.08, d: 0.15 }, emissive: true
  },
  
  // Wall-mounted sockets (low - 300mm from floor)
  [EquipmentType.SOCKET_16A]: { 
    mountType: 'wall-low', mountHeight: 0.3, color: '#3b82f6', shape: 'box',
    size: { w: 0.085, h: 0.085, d: 0.04 }
  },
  [EquipmentType.SOCKET_DOUBLE]: { 
    mountType: 'wall-low', mountHeight: 0.3, color: '#3b82f6', shape: 'box',
    size: { w: 0.145, h: 0.085, d: 0.04 }
  },
  [EquipmentType.DATA_SOCKET]: { 
    mountType: 'wall-low', mountHeight: 0.3, color: '#22c55e', shape: 'box',
    size: { w: 0.085, h: 0.085, d: 0.04 }
  },
  [EquipmentType.TELEPHONE_OUTLET]: { 
    mountType: 'wall-low', mountHeight: 0.3, color: '#22c55e', shape: 'box',
    size: { w: 0.085, h: 0.085, d: 0.04 }
  },
  
  // Wall-mounted switches (mid - 1.2m from floor)
  [EquipmentType.GENERAL_LIGHT_SWITCH]: { 
    mountType: 'wall-mid', mountHeight: 1.2, color: '#e5e5e5', shape: 'box',
    size: { w: 0.085, h: 0.085, d: 0.03 }
  },
  [EquipmentType.DIMMER_SWITCH]: { 
    mountType: 'wall-mid', mountHeight: 1.2, color: '#d4d4d4', shape: 'box',
    size: { w: 0.085, h: 0.085, d: 0.03 }
  },
  
  // Wall-mounted high (AC controllers - 1.8m from floor)
  [EquipmentType.AC_CONTROLLER_BOX]: { 
    mountType: 'wall-high', mountHeight: 1.8, color: '#64748b', shape: 'box',
    size: { w: 0.2, h: 0.25, d: 0.1 }
  },
  
  // Floor/wall-mounted distribution boards (1.5m from floor)
  [EquipmentType.DISTRIBUTION_BOARD]: { 
    mountType: 'wall-mid', mountHeight: 1.5, color: '#dc2626', shape: 'box',
    size: { w: 0.4, h: 0.6, d: 0.15 }
  },
  [EquipmentType.MAIN_BOARD]: { 
    mountType: 'wall-mid', mountHeight: 1.5, color: '#b91c1c', shape: 'box',
    size: { w: 0.6, h: 0.8, d: 0.2 }
  },
  [EquipmentType.SUB_BOARD]: { 
    mountType: 'wall-mid', mountHeight: 1.5, color: '#f87171', shape: 'box',
    size: { w: 0.35, h: 0.5, d: 0.12 }
  },
  
  // Floor-mounted items
  [EquipmentType.FLUSH_FLOOR_OUTLET]: { 
    mountType: 'floor', mountHeight: 0, color: '#78716c', shape: 'box',
    size: { w: 0.15, h: 0.03, d: 0.15 }
  },
  [EquipmentType.BOX_FLUSH_FLOOR]: { 
    mountType: 'floor', mountHeight: 0, color: '#78716c', shape: 'box',
    size: { w: 0.1, h: 0.03, d: 0.1 }
  },
  [EquipmentType.MANHOLE]: { 
    mountType: 'floor', mountHeight: 0, color: '#57534e', shape: 'box',
    size: { w: 1.0, h: 0.05, d: 1.0 }
  },
  
  // Default configuration
  default: { 
    mountType: 'wall-mid', mountHeight: 1.0, color: '#6b7280', shape: 'box',
    size: { w: 0.1, h: 0.1, d: 0.05 }
  },
};

// Circuit colors for cable routes
const CIRCUIT_COLORS: Record<string, string> = {
  'L1': '#fbbf24', // Lighting 1 - yellow
  'L2': '#f59e0b', // Lighting 2 - amber
  'P1': '#3b82f6', // Power 1 - blue
  'P2': '#2563eb', // Power 2 - darker blue
  'KS': '#ef4444', // Kitchen socket - red
  'S1': '#a855f7', // Spare - purple
  'default': '#78716c',
};

// Enhanced Room with architectural elements
function EnhancedRoom({ 
  width = 10, 
  depth = 8, 
  height = 2.7,
}: { 
  width?: number; 
  depth?: number; 
  height?: number;
}) {
  const tileSize = 0.6; // 600x600mm tiles
  const tilesX = Math.ceil(width / tileSize);
  const tilesZ = Math.ceil(depth / tileSize);

  return (
    <group>
      {/* Floor with tile pattern */}
      <group>
        {/* Base floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, 0, depth / 2]} receiveShadow>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial color="#e7e5e4" side={THREE.DoubleSide} />
        </mesh>
        
        {/* Floor tile grid lines */}
        {Array.from({ length: tilesX + 1 }).map((_, i) => (
          <Line
            key={`fx-${i}`}
            points={[[i * tileSize, 0.001, 0], [i * tileSize, 0.001, depth]]}
            color="#d6d3d1"
            lineWidth={0.5}
          />
        ))}
        {Array.from({ length: tilesZ + 1 }).map((_, i) => (
          <Line
            key={`fz-${i}`}
            points={[[0, 0.001, i * tileSize], [width, 0.001, i * tileSize]]}
            color="#d6d3d1"
            lineWidth={0.5}
          />
        ))}
      </group>

      {/* Walls with thickness */}
      <group>
        {/* Back wall (solid) */}
        <mesh position={[width / 2, height / 2, -WALL_THICKNESS / 2]}>
          <boxGeometry args={[width + WALL_THICKNESS * 2, height, WALL_THICKNESS]} />
          <meshStandardMaterial color="#d6d3d1" />
        </mesh>
        
        {/* Left wall (solid) */}
        <mesh position={[-WALL_THICKNESS / 2, height / 2, depth / 2]}>
          <boxGeometry args={[WALL_THICKNESS, height, depth]} />
          <meshStandardMaterial color="#e7e5e4" />
        </mesh>
        
        {/* Right wall (transparent for visibility) */}
        <mesh position={[width + WALL_THICKNESS / 2, height / 2, depth / 2]}>
          <boxGeometry args={[WALL_THICKNESS, height, depth]} />
          <meshStandardMaterial color="#e7e5e4" transparent opacity={0.15} />
        </mesh>
        
        {/* Front wall (transparent for visibility) */}
        <mesh position={[width / 2, height / 2, depth + WALL_THICKNESS / 2]}>
          <boxGeometry args={[width + WALL_THICKNESS * 2, height, WALL_THICKNESS]} />
          <meshStandardMaterial color="#d6d3d1" transparent opacity={0.1} />
        </mesh>
      </group>

      {/* Suspended ceiling with 600x600 grid */}
      <group position={[0, height, 0]}>
        {/* Ceiling surface */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[width / 2, 0, depth / 2]}>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial color="#fafaf9" side={THREE.DoubleSide} />
        </mesh>
        
        {/* Ceiling grid T-bar system */}
        {Array.from({ length: tilesX + 1 }).map((_, i) => (
          <mesh key={`cx-${i}`} position={[i * tileSize, -0.015, depth / 2]}>
            <boxGeometry args={[0.025, 0.03, depth]} />
            <meshStandardMaterial color="#a8a29e" metalness={0.3} />
          </mesh>
        ))}
        {Array.from({ length: tilesZ + 1 }).map((_, i) => (
          <mesh key={`cz-${i}`} position={[width / 2, -0.015, i * tileSize]}>
            <boxGeometry args={[width, 0.03, 0.025]} />
            <meshStandardMaterial color="#a8a29e" metalness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Room edge outlines */}
      <Line
        points={[
          [0, 0, 0], [width, 0, 0], [width, 0, depth], [0, 0, depth], [0, 0, 0],
        ]}
        color="#57534e"
        lineWidth={2}
      />
      <Line
        points={[
          [0, height, 0], [width, height, 0], [width, height, depth], [0, height, depth], [0, height, 0],
        ]}
        color="#57534e"
        lineWidth={2}
      />
      {/* Vertical corners */}
      {[[0, 0], [width, 0], [width, depth], [0, depth]].map(([x, z], i) => (
        <Line key={i} points={[[x, 0, z], [x, height, z]]} color="#57534e" lineWidth={2} />
      ))}
    </group>
  );
}

// Enhanced Equipment 3D with proper positioning
function Equipment3D({
  item,
  scaleRatio,
  roomWidth,
  roomDepth,
  ceilingHeight,
  isSelected,
  onClick,
}: {
  item: EquipmentItem;
  scaleRatio: number;
  roomWidth: number;
  roomDepth: number;
  ceilingHeight: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = EQUIPMENT_3D_CONFIG[item.type] || EQUIPMENT_3D_CONFIG.default;
  
  // Convert 2D position to 3D
  const x = Math.min(Math.max(item.position.x * scaleRatio, 0.5), roomWidth - 0.5);
  const z = Math.min(Math.max(item.position.y * scaleRatio, 0.5), roomDepth - 0.5);
  
  // Calculate Y position based on mount type
  let y: number;
  switch (config.mountType) {
    case 'ceiling':
      y = ceilingHeight - config.mountHeight;
      break;
    case 'floor':
      y = config.size.h / 2;
      break;
    default:
      y = config.mountHeight;
  }

  const { w, h, d } = config.size;
  const color = isSelected ? '#f97316' : config.color;
  const emissiveColor = config.emissive ? config.color : '#000000';
  const emissiveIntensity = config.emissive ? 0.5 : 0;

  return (
    <group position={[x, y, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Equipment mesh based on shape */}
      {config.shape === 'box' && (
        <mesh castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial 
            color={color} 
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            metalness={0.1} 
            roughness={0.8} 
          />
          {isSelected && <Edges color="#ffffff" threshold={15} />}
        </mesh>
      )}
      {config.shape === 'panel' && (
        <mesh castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial 
            color={color} 
            emissive={emissiveColor}
            emissiveIntensity={0.8}
            metalness={0} 
            roughness={0.3} 
          />
          {isSelected && <Edges color="#ffffff" threshold={15} />}
        </mesh>
      )}
      {config.shape === 'cylinder' && (
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[w / 2, w / 2, h, 16]} />
          <meshStandardMaterial 
            color={color}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            metalness={0.2} 
            roughness={0.7} 
          />
        </mesh>
      )}
      {config.shape === 'sphere' && (
        <mesh castShadow>
          <sphereGeometry args={[w / 2, 16, 16]} />
          <meshStandardMaterial 
            color={color}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      )}

      {/* Vertical reference line to floor */}
      <Line
        points={[[0, 0, 0], [0, -y, 0]]}
        color="#a8a29e"
        lineWidth={1}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />

      {/* Floor position marker */}
      <mesh position={[0, -y + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>

      {/* Selection/hover label */}
      {isSelected && (
        <Html distanceFactor={10} position={[0, h / 2 + 0.2, 0]}>
          <div className="bg-background/95 backdrop-blur-sm border border-border px-2 py-1 rounded shadow-lg pointer-events-none">
            <div className="text-[10px] font-medium">{item.name || item.type}</div>
            <div className="text-[8px] text-muted-foreground">
              Height: {y.toFixed(2)}m
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Enhanced Containment with better visuals
function Containment3D({
  item,
  scaleRatio,
  ceilingHeight,
}: {
  item: Containment;
  scaleRatio: number;
  ceilingHeight: number;
}) {
  if (item.points.length < 2) return null;

  // Determine height based on containment type
  const isCeiling = item.type.toLowerCase().includes('basket') || 
                   item.type.toLowerCase().includes('tray') ||
                   item.type.toLowerCase().includes('trunking');
  const height = isCeiling ? ceilingHeight - 0.15 : 0.25;

  // Get containment dimensions
  const sizeNum = parseInt(item.size.replace(/\D/g, '')) || 50;
  const tubeRadius = Math.max((sizeNum / 1000) / 2, 0.015);

  // Convert points to 3D
  const points3D = item.points.map(p => 
    new THREE.Vector3(p.x * scaleRatio, height, p.y * scaleRatio)
  );

  // Create tube path
  const curve = new THREE.CatmullRomCurve3(points3D);

  // Color based on type
  let color = '#78716c';
  if (item.type.toLowerCase().includes('conduit')) color = '#a855f7';
  else if (item.type.toLowerCase().includes('trunking')) color = '#3b82f6';
  else if (item.type.toLowerCase().includes('basket')) color = '#22c55e';
  else if (item.type.toLowerCase().includes('tray')) color = '#f97316';

  return (
    <mesh>
      <tubeGeometry args={[curve, Math.max(item.points.length * 10, 20), tubeRadius, 8, false]} />
      <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
    </mesh>
  );
}

// Cable route visualization
function CableRoute3D({
  line,
  scaleRatio,
  ceilingHeight,
}: {
  line: SupplyLine;
  scaleRatio: number;
  ceilingHeight: number;
}) {
  if (line.points.length < 2) return null;

  // Determine circuit type from line type or default
  const circuitType = line.type?.toUpperCase() || 'default';
  const color = CIRCUIT_COLORS[circuitType] || CIRCUIT_COLORS.default;

  // Route cables at ceiling level through containment
  const routeHeight = ceilingHeight - 0.2;

  // Convert points to 3D
  const points3D = line.points.map(p => 
    new THREE.Vector3(p.x * scaleRatio, routeHeight, p.y * scaleRatio)
  );

  return (
    <Line
      points={points3D}
      color={color}
      lineWidth={2}
      dashed
      dashSize={0.15}
      gapSize={0.05}
    />
  );
}

export function Isometric3DViewer({
  equipment,
  containment,
  lines,
  scaleInfo,
  ceilingHeight = 2.7,
  selectedItemId,
  onItemSelect,
}: Isometric3DViewerProps) {
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front'>('iso');
  const [showCables, setShowCables] = useState(true);

  // Calculate dynamic room bounds based on equipment and containment
  const roomBounds = useRoomBounds(equipment, containment, scaleInfo);
  const roomWidth = roomBounds.width;
  const roomDepth = roomBounds.depth;

  // Auto-scale camera distance based on room size
  const cameraDistance = useMemo(() => {
    const maxDimension = Math.max(roomWidth, roomDepth);
    return Math.max(maxDimension * 1.2, 8);
  }, [roomWidth, roomDepth]);

  const cameraPositions = useMemo(() => ({
    iso: [cameraDistance, ceilingHeight * 2.5, cameraDistance] as [number, number, number],
    top: [roomWidth / 2, cameraDistance * 2, roomDepth / 2] as [number, number, number],
    front: [roomWidth / 2, ceilingHeight, cameraDistance * 1.5] as [number, number, number],
  }), [cameraDistance, roomWidth, roomDepth, ceilingHeight]);

  // Calculate scale ratio
  const scaleRatio = useMemo(() => {
    if (!scaleInfo.ratio) return 0.01;
    return scaleInfo.ratio;
  }, [scaleInfo.ratio]);

  return (
    <div className="w-full h-full min-h-[400px] relative">
      {/* Room info overlay */}
      <div className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1.5 text-[10px] space-y-0.5">
        <div>
          <span className="text-muted-foreground">Room: </span>
          <span className="font-medium">{roomWidth.toFixed(1)}m × {roomDepth.toFixed(1)}m × {ceilingHeight}m</span>
        </div>
        <div>
          <span className="text-muted-foreground">Equipment: </span>
          <span className="font-medium">{equipment.length}</span>
        </div>
        {roomBounds.isEmpty && <div className="text-muted-foreground italic">(default size)</div>}
      </div>

      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        {/* Camera presets */}
        {(['iso', 'top', 'front'] as const).map((preset) => (
          <button
            key={preset}
            onClick={() => setCameraPreset(preset)}
            className={`px-2 py-1 text-[10px] rounded transition-colors ${
              cameraPreset === preset
                ? 'bg-primary text-primary-foreground'
                : 'bg-background/90 text-foreground hover:bg-muted border border-border'
            }`}
          >
            {preset === 'iso' ? 'ISO' : preset === 'top' ? 'TOP' : 'FRONT'}
          </button>
        ))}
        
        {/* Toggle cables */}
        <button
          onClick={() => setShowCables(!showCables)}
          className={`px-2 py-1 text-[10px] rounded transition-colors mt-2 ${
            showCables
              ? 'bg-amber-500 text-white'
              : 'bg-background/90 text-foreground hover:bg-muted border border-border'
          }`}
        >
          {showCables ? 'CABLES' : 'CABLES'}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-10 bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1.5 text-[9px]">
        <div className="font-medium mb-1">Height Legend</div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span>Ceiling: {ceilingHeight}m</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span>Switches: 1.2m</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Sockets: 0.3m</span>
          </div>
        </div>
      </div>

      <Canvas
        camera={{ 
          position: cameraPositions[cameraPreset], 
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
        shadows
        onClick={() => onItemSelect?.(null)}
      >
        <Suspense fallback={null}>
          {/* Enhanced lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight 
            position={[roomWidth * 1.5, ceilingHeight * 3, roomDepth * 1.5]} 
            intensity={0.8} 
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight 
            position={[-roomWidth, ceilingHeight * 2, -roomDepth]} 
            intensity={0.3} 
          />
          <pointLight position={[roomWidth / 2, ceilingHeight - 0.5, roomDepth / 2]} intensity={0.2} color="#fff5e6" />

          {/* Enhanced room geometry */}
          <EnhancedRoom 
            width={roomWidth} 
            depth={roomDepth} 
            height={ceilingHeight}
          />

          {/* Containment / Cable routes */}
          {containment.map((item) => (
            <Containment3D
              key={item.id}
              item={item}
              scaleRatio={scaleRatio}
              ceilingHeight={ceilingHeight}
            />
          ))}

          {/* Cable routes (supply lines) */}
          {showCables && lines.map((line) => (
            <CableRoute3D
              key={line.id}
              line={line}
              scaleRatio={scaleRatio}
              ceilingHeight={ceilingHeight}
            />
          ))}

          {/* Equipment with proper height positioning */}
          {equipment.map((item) => (
            <Equipment3D
              key={item.id}
              item={item}
              scaleRatio={scaleRatio}
              roomWidth={roomWidth}
              roomDepth={roomDepth}
              ceilingHeight={ceilingHeight}
              isSelected={selectedItemId === item.id}
              onClick={() => onItemSelect?.(item.id)}
            />
          ))}

          {/* Camera controls */}
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            target={[roomWidth / 2, ceilingHeight / 2, roomDepth / 2]}
            minDistance={2}
            maxDistance={100}
            maxPolarAngle={Math.PI / 1.8}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Isometric3DViewer;
