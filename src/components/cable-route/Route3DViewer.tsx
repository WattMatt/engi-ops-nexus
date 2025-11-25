import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Line, Html } from '@react-three/drei';
import { RoutePoint } from './types';
import * as THREE from 'three';
import { useState } from 'react';

interface Route3DViewerProps {
  points: RoutePoint[];
  cableDiameter?: number;
}

function CableRoute({ 
  points, 
  color = '#ff6b00', 
  diameter = 10,
  showThickness = true 
}: { 
  points: RoutePoint[]; 
  color?: string; 
  diameter?: number;
  showThickness?: boolean;
}) {
  if (points.length < 2) return null;

  // Convert 2D canvas coordinates to 3D space (divide by 50 for scale)
  const points3D = points.map((p) => new THREE.Vector3(p.x / 50, p.z, p.y / 50));

  // Create tube geometry for cable thickness
  const curve = new THREE.CatmullRomCurve3(points3D);
  const tubeRadius = (diameter / 1000) / 2; // Convert mm to meters

  return (
    <group>
      {/* Cable route with thickness */}
      {showThickness ? (
        <mesh>
          <tubeGeometry args={[curve, points.length * 10, tubeRadius, 8, false]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
        </mesh>
      ) : (
        <Line points={points3D} color={color} lineWidth={3} />
      )}

      {/* Point markers */}
      {points.map((point, index) => {
        const pos = new THREE.Vector3(point.x / 50, point.z, point.y / 50);
        return (
          <group key={point.id} position={pos}>
            {/* Sphere marker */}
            <mesh>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
            </mesh>

            {/* Vertical support line */}
            {point.z > 0 && (
              <Line
                points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -point.z, 0)]}
                color="#888888"
                lineWidth={1}
                dashed
                dashSize={0.2}
                gapSize={0.1}
              />
            )}

            {/* Point label */}
            <Html distanceFactor={10} position={[0, 0.5, 0]}>
              <div
                style={{
                  background: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {point.label || `P${index + 1}`}
                {point.z > 0 && ` (${point.z.toFixed(1)}m)`}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export function Route3DViewer({ points, cableDiameter = 50 }: Route3DViewerProps) {
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'side' | 'front'>('iso');
  const [showThickness, setShowThickness] = useState(true);

  const cameraPositions = {
    iso: [20, 15, 20] as [number, number, number],
    top: [0, 30, 0] as [number, number, number],
    side: [30, 10, 0] as [number, number, number],
    front: [0, 10, 30] as [number, number, number],
  };

  return (
    <div className="w-full h-[600px] border border-border rounded-lg overflow-hidden relative">
      {/* Camera Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-2 space-y-1">
          <button
            onClick={() => setCameraPreset('iso')}
            className={`w-full px-3 py-1.5 text-xs rounded ${
              cameraPreset === 'iso'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Isometric
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className={`w-full px-3 py-1.5 text-xs rounded ${
              cameraPreset === 'top'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Top View
          </button>
          <button
            onClick={() => setCameraPreset('side')}
            className={`w-full px-3 py-1.5 text-xs rounded ${
              cameraPreset === 'side'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Side View
          </button>
          <button
            onClick={() => setCameraPreset('front')}
            className={`w-full px-3 py-1.5 text-xs rounded ${
              cameraPreset === 'front'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Front View
          </button>
        </div>
        <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-2">
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showThickness}
              onChange={(e) => setShowThickness(e.target.checked)}
              className="rounded"
            />
            Show Thickness
          </label>
        </div>
      </div>

      <Canvas
        camera={{ position: cameraPositions[cameraPreset], fov: 50 }}
        shadows
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
        <pointLight position={[-10, 10, -10]} intensity={0.3} />

        {/* Floor grid */}
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#6e6e6e"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#9d4b4b"
          fadeDistance={50}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
        />

        {/* Cable route */}
        <CableRoute 
          points={points} 
          diameter={cableDiameter}
          showThickness={showThickness}
        />

        {/* Controls */}
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={5}
          maxDistance={100}
        />
      </Canvas>
    </div>
  );
}
