import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Line, Html, Box, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { EquipmentItem, SupplyLine, Containment, ScaleInfo, EquipmentType, ContainmentType } from '../types';

interface Isometric3DViewerProps {
  equipment: EquipmentItem[];
  containment: Containment[];
  lines: SupplyLine[];
  scaleInfo: ScaleInfo;
  roomWidth?: number;
  roomDepth?: number;
  ceilingHeight?: number;
  selectedItemId?: string | null;
  onItemSelect?: (id: string | null) => void;
}

// Equipment type to 3D representation mapping
const EQUIPMENT_3D_CONFIG: Record<string, { height: number; color: string; shape: 'box' | 'cylinder' | 'sphere' }> = {
  // Lighting - ceiling mounted
  [EquipmentType.CEILING_LIGHT]: { height: 2.4, color: '#fbbf24', shape: 'cylinder' },
  [EquipmentType.RECESSED_LIGHT_600]: { height: 2.4, color: '#fcd34d', shape: 'box' },
  [EquipmentType.RECESSED_LIGHT_1200]: { height: 2.4, color: '#fcd34d', shape: 'box' },
  [EquipmentType.FLOODLIGHT]: { height: 3.0, color: '#fbbf24', shape: 'box' },
  [EquipmentType.LED_STRIP_LIGHT]: { height: 2.4, color: '#fef08a', shape: 'box' },
  [EquipmentType.FLUORESCENT_2_TUBE]: { height: 2.4, color: '#fef9c3', shape: 'box' },
  [EquipmentType.FLUORESCENT_1_TUBE]: { height: 2.4, color: '#fef9c3', shape: 'box' },
  
  // Sockets - wall mounted
  [EquipmentType.SOCKET_16A]: { height: 0.3, color: '#3b82f6', shape: 'box' },
  [EquipmentType.SOCKET_DOUBLE]: { height: 0.3, color: '#3b82f6', shape: 'box' },
  [EquipmentType.DATA_SOCKET]: { height: 0.3, color: '#22c55e', shape: 'box' },
  [EquipmentType.TELEPHONE_OUTLET]: { height: 0.3, color: '#22c55e', shape: 'box' },
  
  // Distribution - floor/wall
  [EquipmentType.DISTRIBUTION_BOARD]: { height: 1.5, color: '#ef4444', shape: 'box' },
  [EquipmentType.MAIN_BOARD]: { height: 1.5, color: '#dc2626', shape: 'box' },
  [EquipmentType.SUB_BOARD]: { height: 1.5, color: '#f87171', shape: 'box' },
  
  // Switches - wall mounted
  [EquipmentType.GENERAL_LIGHT_SWITCH]: { height: 1.2, color: '#a3a3a3', shape: 'box' },
  [EquipmentType.DIMMER_SWITCH]: { height: 1.2, color: '#a3a3a3', shape: 'box' },
  
  // Default
  default: { height: 0.5, color: '#6b7280', shape: 'box' },
};

// Room geometry component
function Room({ 
  width = 10, 
  depth = 8, 
  height = 2.7,
  showCeiling = true,
  showWalls = true,
}: { 
  width?: number; 
  depth?: number; 
  height?: number;
  showCeiling?: boolean;
  showWalls?: boolean;
}) {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, 0, depth / 2]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#f5f5f4" side={THREE.DoubleSide} />
      </mesh>

      {/* Walls */}
      {showWalls && (
        <>
          {/* Back wall */}
          <mesh position={[width / 2, height / 2, 0]}>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial color="#e7e5e4" side={THREE.DoubleSide} transparent opacity={0.3} />
          </mesh>
          {/* Left wall */}
          <mesh position={[0, height / 2, depth / 2]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[depth, height]} />
            <meshStandardMaterial color="#e7e5e4" side={THREE.DoubleSide} transparent opacity={0.3} />
          </mesh>
          {/* Right wall (partial for visibility) */}
          <mesh position={[width, height / 2, depth / 2]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[depth, height]} />
            <meshStandardMaterial color="#e7e5e4" side={THREE.DoubleSide} transparent opacity={0.15} />
          </mesh>
        </>
      )}

      {/* Ceiling grid */}
      {showCeiling && (
        <group position={[0, height, 0]}>
          <Grid
            args={[width * 2, depth * 2]}
            cellSize={0.6}
            cellThickness={0.5}
            cellColor="#d6d3d1"
            sectionSize={1.2}
            sectionThickness={1}
            sectionColor="#a8a29e"
            fadeDistance={50}
            fadeStrength={1}
            position={[width / 2, 0, depth / 2]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>
      )}

      {/* Wall-ceiling edge lines */}
      <Line
        points={[
          [0, 0, 0],
          [width, 0, 0],
          [width, 0, depth],
          [0, 0, depth],
          [0, 0, 0],
        ]}
        color="#78716c"
        lineWidth={1}
      />
      <Line
        points={[
          [0, height, 0],
          [width, height, 0],
          [width, height, depth],
          [0, height, depth],
          [0, height, 0],
        ]}
        color="#78716c"
        lineWidth={1}
      />
      {/* Vertical edges */}
      {[[0, 0], [width, 0], [width, depth], [0, depth]].map(([x, z], i) => (
        <Line
          key={i}
          points={[[x, 0, z], [x, height, z]]}
          color="#78716c"
          lineWidth={1}
        />
      ))}
    </group>
  );
}

// Equipment 3D marker
function Equipment3D({
  item,
  scaleRatio,
  roomWidth,
  roomDepth,
  isSelected,
  onClick,
}: {
  item: EquipmentItem;
  scaleRatio: number;
  roomWidth: number;
  roomDepth: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = EQUIPMENT_3D_CONFIG[item.type] || EQUIPMENT_3D_CONFIG.default;
  
  // Convert 2D position to 3D (scale down and fit within room)
  const x = Math.min((item.position.x * scaleRatio), roomWidth - 0.5);
  const z = Math.min((item.position.y * scaleRatio), roomDepth - 0.5);
  const y = config.height;

  const size = 0.15;
  const color = isSelected ? '#f97316' : config.color;

  return (
    <group position={[x, y, z]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Equipment marker */}
      {config.shape === 'box' && (
        <mesh castShadow>
          <boxGeometry args={[size * 2, size, size * 2]} />
          <meshStandardMaterial color={color} metalness={0.2} roughness={0.8} />
          <Edges color={isSelected ? '#ffffff' : '#000000'} threshold={15} />
        </mesh>
      )}
      {config.shape === 'cylinder' && (
        <mesh castShadow>
          <cylinderGeometry args={[size, size, size * 0.5, 16]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
        </mesh>
      )}
      {config.shape === 'sphere' && (
        <mesh castShadow>
          <sphereGeometry args={[size, 16, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
        </mesh>
      )}

      {/* Vertical drop line */}
      <Line
        points={[[0, 0, 0], [0, -y, 0]]}
        color="#78716c"
        lineWidth={1}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />

      {/* Floor marker */}
      <mesh position={[0, -y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {/* Label on hover */}
      {isSelected && (
        <Html distanceFactor={8} position={[0, 0.3, 0]}>
          <div className="bg-background/90 backdrop-blur-sm border border-border px-2 py-1 rounded text-[10px] whitespace-nowrap pointer-events-none shadow-lg">
            <span className="font-medium">{item.name || item.type}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// Containment/Trunking 3D
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
  const height = isCeiling ? ceilingHeight - 0.1 : 0.3;

  // Get containment dimensions
  const sizeNum = parseInt(item.size.replace(/\D/g, '')) || 50;
  const tubeRadius = (sizeNum / 1000) / 2;

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
      <tubeGeometry args={[curve, item.points.length * 10, tubeRadius, 8, false]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
    </mesh>
  );
}

export function Isometric3DViewer({
  equipment,
  containment,
  lines,
  scaleInfo,
  roomWidth = 10,
  roomDepth = 8,
  ceilingHeight = 2.7,
  selectedItemId,
  onItemSelect,
}: Isometric3DViewerProps) {
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front'>('iso');

  const cameraPositions = {
    iso: [roomWidth * 1.5, ceilingHeight * 3, roomDepth * 1.5] as [number, number, number],
    top: [roomWidth / 2, ceilingHeight * 4, roomDepth / 2] as [number, number, number],
    front: [roomWidth / 2, ceilingHeight, roomDepth * 2.5] as [number, number, number],
  };

  // Calculate scale ratio
  const scaleRatio = useMemo(() => {
    if (!scaleInfo.ratio) return 0.01;
    return scaleInfo.ratio;
  }, [scaleInfo.ratio]);

  return (
    <div className="w-full h-full min-h-[400px] relative">
      {/* Camera preset buttons */}
      <div className="absolute top-12 right-2 z-10 flex flex-col gap-1">
        {(['iso', 'top', 'front'] as const).map((preset) => (
          <button
            key={preset}
            onClick={() => setCameraPreset(preset)}
            className={`px-2 py-1 text-[10px] rounded transition-colors ${
              cameraPreset === preset
                ? 'bg-primary text-primary-foreground'
                : 'bg-background/80 text-foreground hover:bg-muted'
            }`}
          >
            {preset === 'iso' ? 'ISO' : preset === 'top' ? 'TOP' : 'FRONT'}
          </button>
        ))}
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
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight 
            position={[roomWidth, ceilingHeight * 2, roomDepth]} 
            intensity={0.8} 
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[0, ceilingHeight * 2, 0]} intensity={0.3} />

          {/* Room geometry */}
          <Room 
            width={roomWidth} 
            depth={roomDepth} 
            height={ceilingHeight}
            showCeiling={true}
            showWalls={true}
          />

          {/* Containment / Trunking */}
          {containment.map((item) => (
            <Containment3D
              key={item.id}
              item={item}
              scaleRatio={scaleRatio}
              ceilingHeight={ceilingHeight}
            />
          ))}

          {/* Equipment */}
          {equipment.map((item) => (
            <Equipment3D
              key={item.id}
              item={item}
              scaleRatio={scaleRatio}
              roomWidth={roomWidth}
              roomDepth={roomDepth}
              isSelected={selectedItemId === item.id}
              onClick={() => onItemSelect?.(item.id)}
            />
          ))}

          {/* Controls */}
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            target={[roomWidth / 2, ceilingHeight / 2, roomDepth / 2]}
            minDistance={3}
            maxDistance={50}
            maxPolarAngle={Math.PI / 2}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Isometric3DViewer;
