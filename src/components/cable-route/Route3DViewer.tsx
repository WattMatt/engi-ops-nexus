import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Line, Html } from '@react-three/drei';
import { RoutePoint } from './types';
import * as THREE from 'three';

interface Route3DViewerProps {
  points: RoutePoint[];
  cableDiameter?: number;
}

function CableRoute({ points, color = '#ff6b00' }: { points: RoutePoint[]; color?: string }) {
  if (points.length < 2) return null;

  // Convert 2D canvas coordinates to 3D space (divide by 50 for scale)
  const points3D = points.map((p) => new THREE.Vector3(p.x / 50, p.z, p.y / 50));

  return (
    <group>
      {/* Cable route line */}
      <Line points={points3D} color={color} lineWidth={3} />

      {/* Point markers */}
      {points.map((point, index) => {
        const pos = new THREE.Vector3(point.x / 50, point.z, point.y / 50);
        return (
          <group key={point.id} position={pos}>
            {/* Sphere marker */}
            <mesh>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color={color} />
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
  return (
    <div className="w-full h-[600px] border border-border rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [20, 15, 20], fov: 50 }}
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
        <CableRoute points={points} />

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
