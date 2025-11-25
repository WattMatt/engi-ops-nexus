import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Line, Html, Text } from '@react-three/drei';
import { AlertTriangle, Upload, Plus, Trash2, Eye, EyeOff, Download, Filter } from 'lucide-react';
import { BIMObject, Clash, RoutePoint } from './types';
import * as THREE from 'three';
import { IfcAPI } from 'web-ifc';

interface ClashDetectionProps {
  points: RoutePoint[];
  cableDiameter: number;
}

const disciplineColors: Record<string, string> = {
  Structural: '#8B4513',
  Mechanical: '#4169E1',
  Electrical: '#FFD700',
  Plumbing: '#00CED1',
  Architectural: '#808080',
};

function BIMObjectMesh({ obj, visible }: { obj: BIMObject; visible: boolean }) {
  if (!visible) return null;

  const color = disciplineColors[obj.discipline] || '#666666';
  const position = new THREE.Vector3(obj.position.x / 50, obj.position.y, obj.position.z / 50);

  return (
    <Box
      position={position}
      args={[obj.dimensions.width / 50, obj.dimensions.height, obj.dimensions.depth / 50]}
      rotation={[0, (obj.rotation || 0) * (Math.PI / 180), 0]}
    >
      <meshStandardMaterial color={color} transparent opacity={0.6} />
    </Box>
  );
}

function ClashMarker({ clash }: { clash: Clash }) {
  const position = new THREE.Vector3(clash.position.x / 50, clash.position.y, clash.position.z / 50);
  
  const color = clash.severity === 'critical' ? '#ff0000' : 
                clash.severity === 'warning' ? '#ffa500' : '#ffff00';

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <Html distanceFactor={10} position={[0, 0.5, 0]}>
        <div
          style={{
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: `2px solid ${color}`,
          }}
        >
          <div className="font-bold">{clash.severity.toUpperCase()}</div>
          <div>{clash.objectName}</div>
          <div>Penetration: {clash.penetrationDepth.toFixed(1)}cm</div>
        </div>
      </Html>
    </group>
  );
}

function CableRoute({ points, color = '#ff6b00' }: { points: RoutePoint[]; color?: string }) {
  if (points.length < 2) return null;

  const points3D = points.map((p) => new THREE.Vector3(p.x / 50, p.z, p.y / 50));

  return (
    <group>
      <Line points={points3D} color={color} lineWidth={3} />
      {points.map((point) => {
        const pos = new THREE.Vector3(point.x / 50, point.z, point.y / 50);
        return (
          <group key={point.id} position={pos}>
            <mesh>
              <sphereGeometry args={[0.2, 12, 12]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function ClashDetection({ points, cableDiameter }: ClashDetectionProps) {
  const [bimObjects, setBimObjects] = useState<BIMObject[]>([]);
  const [clashTolerance, setClashTolerance] = useState(50); // mm
  const [visibleDisciplines, setVisibleDisciplines] = useState<Set<string>>(
    new Set(['Structural', 'Mechanical', 'Electrical', 'Plumbing', 'Architectural'])
  );
  const [showClashesOnly, setShowClashesOnly] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  const clashes = useMemo<Clash[]>(() => {
    const detected: Clash[] = [];
    const tolerance = clashTolerance / 1000; // Convert mm to meters

    // Convert route points to cable segments
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      // Check each BIM object for clashes
      bimObjects.forEach((obj) => {
        // Simple bounding box intersection check
        const cableMinX = Math.min(p1.x / 50, p2.x / 50) - tolerance;
        const cableMaxX = Math.max(p1.x / 50, p2.x / 50) + tolerance;
        const cableMinY = Math.min(p1.z, p2.z) - tolerance;
        const cableMaxY = Math.max(p1.z, p2.z) + tolerance;
        const cableMinZ = Math.min(p1.y / 50, p2.y / 50) - tolerance;
        const cableMaxZ = Math.max(p1.y / 50, p2.y / 50) + tolerance;

        const objMinX = obj.position.x / 50 - obj.dimensions.width / 100;
        const objMaxX = obj.position.x / 50 + obj.dimensions.width / 100;
        const objMinY = obj.position.y - obj.dimensions.height / 2;
        const objMaxY = obj.position.y + obj.dimensions.height / 2;
        const objMinZ = obj.position.z / 50 - obj.dimensions.depth / 100;
        const objMaxZ = obj.position.z / 50 + obj.dimensions.depth / 100;

        const intersects =
          cableMinX <= objMaxX && cableMaxX >= objMinX &&
          cableMinY <= objMaxY && cableMaxY >= objMinY &&
          cableMinZ <= objMaxZ && cableMaxZ >= objMinZ;

        if (intersects) {
          // Calculate penetration depth
          const penetrationX = Math.min(cableMaxX - objMinX, objMaxX - cableMinX);
          const penetrationY = Math.min(cableMaxY - objMinY, objMaxY - cableMinY);
          const penetrationZ = Math.min(cableMaxZ - objMinZ, objMaxZ - cableMinZ);
          const penetration = Math.min(penetrationX, penetrationY, penetrationZ) * 100; // Convert to cm

          const severity: 'critical' | 'warning' | 'minor' =
            penetration > 10 ? 'critical' : penetration > 5 ? 'warning' : 'minor';

          detected.push({
            id: `clash-${obj.id}-${i}`,
            position: {
              x: (p1.x + p2.x) / 2,
              y: (p1.y + p2.y) / 2,
              z: (p1.z + p2.z) / 2,
            },
            severity,
            penetrationDepth: penetration,
            objectId: obj.id,
            objectName: obj.name,
            description: `Cable intersects ${obj.type} from ${obj.discipline}`,
          });
        }
      });
    }

    return detected;
  }, [points, bimObjects, clashTolerance]);

  const handleAddObject = () => {
    const newObject: BIMObject = {
      id: `obj-${Date.now()}`,
      name: `Object ${bimObjects.length + 1}`,
      type: 'beam',
      discipline: 'Structural',
      position: { x: 500, y: 2, z: 500 },
      dimensions: { width: 200, height: 400, depth: 200 },
      rotation: 0,
      visible: true,
    };
    setBimObjects([...bimObjects, newObject]);
  };

  const handleDeleteObject = (id: string) => {
    setBimObjects(bimObjects.filter((obj) => obj.id !== id));
  };

  const handleToggleDiscipline = (discipline: string) => {
    const newVisible = new Set(visibleDisciplines);
    if (newVisible.has(discipline)) {
      newVisible.delete(discipline);
    } else {
      newVisible.add(discipline);
    }
    setVisibleDisciplines(newVisible);
  };

  const handleExportClashes = () => {
    const data = JSON.stringify({ clashes, bimObjects }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clash-report.json';
    a.click();
  };

  const criticalCount = clashes.filter((c) => c.severity === 'critical').length;
  const warningCount = clashes.filter((c) => c.severity === 'warning').length;
  const minorCount = clashes.filter((c) => c.severity === 'minor').length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-muted rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">BIM Clash Detection</h3>
          <div className="flex gap-2">
            <button
              onClick={handleAddObject}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
            >
              <Plus size={16} />
              Add Object
            </button>
            <button
              onClick={handleExportClashes}
              disabled={clashes.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/90 disabled:opacity-50"
            >
              <Download size={16} />
              Export Report
            </button>
          </div>
        </div>

        {/* Clash Summary */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-background rounded-md p-3">
            <div className="text-2xl font-bold text-foreground">{clashes.length}</div>
            <div className="text-xs text-muted-foreground">Total Clashes</div>
          </div>
          <div className="bg-background rounded-md p-3">
            <div className="text-2xl font-bold text-red-500">{criticalCount}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </div>
          <div className="bg-background rounded-md p-3">
            <div className="text-2xl font-bold text-orange-500">{warningCount}</div>
            <div className="text-xs text-muted-foreground">Warning</div>
          </div>
          <div className="bg-background rounded-md p-3">
            <div className="text-2xl font-bold text-yellow-500">{minorCount}</div>
            <div className="text-xs text-muted-foreground">Minor</div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Discipline Filter:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(disciplineColors).map(([discipline, color]) => (
              <button
                key={discipline}
                onClick={() => handleToggleDiscipline(discipline)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  visibleDisciplines.has(discipline)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <span
                  className="inline-block w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: color }}
                />
                {discipline}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={showClashesOnly}
                onChange={(e) => setShowClashesOnly(e.target.checked)}
                className="rounded"
              />
              Show Clashes Only
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              Clash Tolerance:
              <input
                type="number"
                value={clashTolerance}
                onChange={(e) => setClashTolerance(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-background border border-input rounded text-sm"
                min="10"
                max="200"
                step="10"
              />
              mm
            </label>
          </div>
        </div>
      </div>

      {/* 3D Viewer */}
      <div className="w-full h-[500px] border border-border rounded-lg overflow-hidden bg-background">
        <Canvas camera={{ position: [25, 20, 25], fov: 50 }} shadows>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
          <pointLight position={[-10, 10, -10]} intensity={0.3} />

          <Grid
            args={[30, 30]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#6e6e6e"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#9d4b4b"
            fadeDistance={60}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={false}
          />

          {/* BIM Objects */}
          {!showClashesOnly &&
            bimObjects.map((obj) => (
              <BIMObjectMesh
                key={obj.id}
                obj={obj}
                visible={visibleDisciplines.has(obj.discipline)}
              />
            ))}

          {/* Cable Route */}
          <CableRoute points={points} />

          {/* Clash Markers */}
          {clashes.map((clash) => (
            <ClashMarker key={clash.id} clash={clash} />
          ))}

          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={5}
            maxDistance={100}
          />
        </Canvas>
      </div>

      {/* BIM Objects List */}
      <div className="bg-muted rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">
          BIM Objects ({bimObjects.length})
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {bimObjects.map((obj) => (
            <div
              key={obj.id}
              className="flex items-center justify-between bg-background rounded-md p-2"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: disciplineColors[obj.discipline] }}
                />
                <div>
                  <div className="text-sm font-medium text-foreground">{obj.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {obj.type} · {obj.discipline}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteObject(obj.id)}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {bimObjects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No BIM objects. Click "Add Object" to start.
            </p>
          )}
        </div>
      </div>

      {/* Clash List */}
      {clashes.length > 0 && (
        <div className="bg-muted rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" />
            Detected Clashes ({clashes.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {clashes.map((clash) => (
              <div
                key={clash.id}
                className={`bg-background rounded-md p-3 border-l-4 ${
                  clash.severity === 'critical'
                    ? 'border-red-500'
                    : clash.severity === 'warning'
                    ? 'border-orange-500'
                    : 'border-yellow-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {clash.objectName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {clash.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Penetration: {clash.penetrationDepth.toFixed(1)}cm
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      clash.severity === 'critical'
                        ? 'bg-red-500/20 text-red-400'
                        : clash.severity === 'warning'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {clash.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
