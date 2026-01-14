
import React, { useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Line, Cylinder, Box } from '@react-three/drei';
import * as THREE from 'three';
import { SupplyLine, EquipmentItem, Containment, ScaleInfo, EquipmentType } from '../../types';
import { getCableColor } from '../../utils/styleUtils';

interface FloorPlan3DProps {
    lines: SupplyLine[];
    equipment: EquipmentItem[];
    containment: Containment[];
    scaleInfo: ScaleInfo;
}

// Helper to convert 2D pixel coordinates to 3D world coordinates (meters)
// preserving the aspect ratio but scaling to real world units.
// We map 2D (x, y) -> 3D (x, -y, z) or similar.
// Let's use Z-up: 2D(x,y) -> 3D(x, y, height).  
// Note: Canvas Y is usually down. ThreeJS Y is up. So we might need to negate Y.
const useWorldScale = (scaleInfo: ScaleInfo) => {
    const ratio = scaleInfo.ratio || 0.05; // Default fallback: 1px = 5cm
    // If ratio is meters per pixel.

    const toWorld = (x: number, y: number, h: number = 0) => {
        return new THREE.Vector3(x * ratio, -y * ratio, h);
    };

    return { toWorld, ratio };
};

const Equipment3D: React.FC<{ item: EquipmentItem; toWorld: (x: number, y: number, h?: number) => THREE.Vector3 }> = ({ item, toWorld }) => {
    const pos = toWorld(item.position.x, item.position.y, 0); // Equipment on floor (z=0) unless specified

    // Decide geometry based on type
    let color = '#fbbf24'; // amber-400
    let geometry = <boxGeometry args={[0.3, 0.3, 0.3]} />; // Default box 30cm
    let heightOffset = 0.15;

    if (item.type.includes('Socket')) {
        color = '#ef4444'; // red
        geometry = <boxGeometry args={[0.1, 0.1, 0.3]} />; // Small box on wall usually, but floor for now
    } else if (item.type.includes('Light')) {
        color = '#fcd34d'; // yellow
        pos.z = 2.4; // Ceiling height approximation
        geometry = <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />;
    }

    return (
        <group position={pos} rotation={[0, 0, item.rotation * (Math.PI / 180)]}>
            <mesh>
                {geometry}
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Label */}
            <Text
                position={[0, 0, 0.5]}
                fontSize={0.2}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                {item.name || ''}
            </Text>
        </group>
    );
};

const Cable3D: React.FC<{ line: SupplyLine; toWorld: (x: number, y: number, h?: number) => THREE.Vector3 }> = ({ line, toWorld }) => {
    const points = useMemo(() => {
        if (!line.points || line.points.length < 2) return [];

        const startP = line.points[0];
        const endP = line.points[line.points.length - 1];

        // Simple logic: Start at startHeight, End at endHeight.
        // Intermediate points: We need to interpolate or just keep them at ceiling/floor?
        // For now, let's assume cables run at "ceiling" level if not specified, 
        // or strictly follow markers.

        // Better logic:
        // Point 0: @ startHeight
        // Point 1..N-1: @ max(start, end) or specific routing height? 
        // Let's effectively assume the cable rises immediately, runs, and drops.
        // Or just linear interpolation if it's a direct line. 
        // But typically user draws 2D references.

        const startH = line.startHeight || 0;
        const endH = line.endHeight || 0;

        const worldPoints: THREE.Vector3[] = [];

        // Add start point at height
        worldPoints.push(toWorld(startP.x, startP.y, startH));

        // If we have intermediate points, at what height are they?
        // Ideally we assume a "Routing Height" (e.g. ceiling/tray height).
        // Let's infer a routing height. If start/end are low (sockets), route is high.
        const runHeight = Math.max(startH, endH, 2.7); // default ceiling 2.7m

        // Vertical rise at start
        if (Math.abs(startH - runHeight) > 0.1) {
            worldPoints.push(toWorld(startP.x, startP.y, runHeight));
        }

        // Intermediate points at runHeight
        for (let i = 1; i < line.points.length - 1; i++) {
            const p = line.points[i];
            worldPoints.push(toWorld(p.x, p.y, runHeight));
        }

        // Destination point (horizontal position) at runHeight
        worldPoints.push(toWorld(endP.x, endP.y, runHeight));

        // Vertical drop at end
        if (Math.abs(endH - runHeight) > 0.1) {
            worldPoints.push(toWorld(endP.x, endP.y, endH));
        }

        return worldPoints;
    }, [line, toWorld]);

    if (points.length < 2) return null;

    const color = getCableColor(line.cableType || 'default');

    return (
        <Line
            points={points}       // Array of Vector3
            color={color}                   // Default
            lineWidth={3}                   // In pixels (default)
            dashed={false}                  // Default
        />
    );
};

export const FloorPlan3D: React.FC<FloorPlan3DProps> = ({ lines, equipment, containment, scaleInfo }) => {
    const { toWorld } = useWorldScale(scaleInfo);

    return (
        <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
            <Canvas camera={{ position: [0, -10, 10], fov: 50, up: [0, 0, 1] }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <OrbitControls makeDefault />

                {/* Grid Helper - centered roughly */}
                <gridHelper args={[100, 100]} rotation={[Math.PI / 2, 0, 0]} position={[50, -50, 0]} />
                <axesHelper args={[5]} />

                <group>
                    {equipment.map(item => (
                        <Equipment3D key={item.id} item={item} toWorld={toWorld} />
                    ))}

                    {lines.filter(l => l.points.length > 1).map(line => (
                        <Cable3D key={line.id} line={line} toWorld={toWorld} />
                    ))}
                </group>
            </Canvas>

            {/* Overlay Instructions */}
            <div className="absolute top-4 right-4 pointer-events-none bg-black/50 p-2 rounded text-white text-xs">
                <p>Left Click + Drag to Rotate</p>
                <p>Right Click + Drag to Pan</p>
                <p>Scroll to Zoom</p>
            </div>
        </div>
    );
};
