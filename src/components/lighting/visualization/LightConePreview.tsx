import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Html } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import * as THREE from 'three';

interface LightConePreviewProps {
  beamAngle?: number;
  mountingHeight?: number;
  colorTemperature?: number; // Kelvin
  lumens?: number;
}

// Convert Kelvin to RGB color
const kelvinToRGB = (kelvin: number): string => {
  const temp = kelvin / 100;
  let r, g, b;

  if (temp <= 66) {
    r = 255;
    g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
  } else {
    r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  }

  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
};

interface LightConeProps {
  beamAngle: number;
  height: number;
  color: string;
  lumens: number;
}

const LightCone = ({ beamAngle, height, color, lumens }: LightConeProps) => {
  const coneRef = useRef<THREE.Mesh>(null);
  
  // Calculate cone radius based on beam angle and height
  const radius = height * Math.tan((beamAngle / 2) * (Math.PI / 180));
  
  // Intensity based on lumens (normalized)
  const intensity = Math.min(1, lumens / 3000);

  useFrame((state) => {
    if (coneRef.current) {
      // Subtle pulsing effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      coneRef.current.scale.set(scale, 1, scale);
    }
  });

  return (
    <group position={[0, height, 0]}>
      {/* Light source */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>

      {/* Light cone */}
      <mesh ref={coneRef} rotation={[Math.PI, 0, 0]} position={[0, -height / 2, 0]}>
        <coneGeometry args={[radius, height, 32, 1, true]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.2 * intensity} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floor light spread */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -height, 0]}>
        <circleGeometry args={[radius, 32]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.4 * intensity}
        />
      </mesh>
    </group>
  );
};

const Scene = ({ beamAngle, mountingHeight, colorTemperature, lumens }: LightConePreviewProps) => {
  const color = kelvinToRGB(colorTemperature || 4000);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      <LightCone 
        beamAngle={beamAngle || 60} 
        height={mountingHeight || 3} 
        color={color}
        lumens={lumens || 1000}
      />

      {/* Floor grid */}
      <Grid 
        args={[10, 10]}
        position={[0, 0, 0]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#374151"
        fadeDistance={25}
        fadeStrength={1}
        followCamera={false}
      />

      {/* Dimension labels */}
      <Text
        position={[0, (mountingHeight || 3) + 0.3, 0]}
        fontSize={0.2}
        color="#9ca3af"
      >
        {`${mountingHeight || 3}m mounting height`}
      </Text>

      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={15}
      />
    </>
  );
};

export const LightConePreview = ({
  beamAngle: initialBeamAngle = 60,
  mountingHeight: initialMountingHeight = 3,
  colorTemperature: initialColorTemperature = 4000,
  lumens: initialLumens = 1000
}: LightConePreviewProps) => {
  const [beamAngle, setBeamAngle] = useState(initialBeamAngle);
  const [mountingHeight, setMountingHeight] = useState(initialMountingHeight);
  const [colorTemperature, setColorTemperature] = useState(initialColorTemperature);
  const [lumens, setLumens] = useState(initialLumens);

  // Calculate spread diameter
  const spreadDiameter = useMemo(() => {
    return (2 * mountingHeight * Math.tan((beamAngle / 2) * (Math.PI / 180))).toFixed(2);
  }, [beamAngle, mountingHeight]);

  const lightColor = kelvinToRGB(colorTemperature);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          3D Light Beam Preview
          <Badge 
            variant="outline" 
            style={{ backgroundColor: lightColor, color: colorTemperature > 4500 ? '#000' : '#fff' }}
          >
            {colorTemperature}K
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 3D Canvas */}
        <div className="h-[400px] bg-background rounded-lg overflow-hidden border">
          <Canvas
            camera={{ position: [5, 5, 5], fov: 50 }}
            gl={{ antialias: true }}
          >
            <Scene 
              beamAngle={beamAngle}
              mountingHeight={mountingHeight}
              colorTemperature={colorTemperature}
              lumens={lumens}
            />
          </Canvas>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Beam Angle</Label>
                <span className="text-sm text-muted-foreground">{beamAngle}°</span>
              </div>
              <Slider
                value={[beamAngle]}
                onValueChange={([v]) => setBeamAngle(v)}
                min={15}
                max={120}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Mounting Height</Label>
                <span className="text-sm text-muted-foreground">{mountingHeight}m</span>
              </div>
              <Slider
                value={[mountingHeight]}
                onValueChange={([v]) => setMountingHeight(v)}
                min={1}
                max={10}
                step={0.5}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Color Temperature</Label>
                <span className="text-sm text-muted-foreground">{colorTemperature}K</span>
              </div>
              <Slider
                value={[colorTemperature]}
                onValueChange={([v]) => setColorTemperature(v)}
                min={2700}
                max={6500}
                step={100}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Warm</span>
                <span>Neutral</span>
                <span>Cool</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Lumens</Label>
                <span className="text-sm text-muted-foreground">{lumens} lm</span>
              </div>
              <Slider
                value={[lumens]}
                onValueChange={([v]) => setLumens(v)}
                min={100}
                max={5000}
                step={100}
              />
            </div>
          </div>
        </div>

        {/* Calculated Values */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{spreadDiameter}m</div>
            <div className="text-xs text-muted-foreground">Light Spread Diameter</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {(Math.PI * Math.pow(parseFloat(spreadDiameter) / 2, 2)).toFixed(1)}m²
            </div>
            <div className="text-xs text-muted-foreground">Coverage Area</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {(lumens / (Math.PI * Math.pow(parseFloat(spreadDiameter) / 2, 2))).toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">Approx. Lux at Floor</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LightConePreview;
