import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

interface Emissions3DVisualizationProps {
  breakdown: Array<{
    name: string;
    value: number; // total emissions for the category
    color: string;
  }>;
}

export function Emissions3DVisualization({ breakdown }: Emissions3DVisualizationProps) {
  // Normalize radii for spheres
  const maxEmission = Math.max(...breakdown.map(b => b.value), 1);
  const minRadius = 0.5;
  const maxRadius = 2.5;

  // Arrange spheres in a circle
  const angleStep = (2 * Math.PI) / breakdown.length;

  return (
    <div style={{ width: '100%', height: 400 }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} />
        {breakdown.map((cat, i) => {
          const radius = minRadius + (cat.value / maxEmission) * (maxRadius - minRadius);
          const angle = i * angleStep;
          const x = Math.cos(angle) * 4;
          const y = Math.sin(angle) * 4;
          return (
            <group key={cat.name} position={[x, y, 0]}>
              <mesh>
                <sphereGeometry args={[radius, 32, 32]} />
                <meshStandardMaterial color={cat.color} />
              </mesh>
              <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
                <div style={{
                  background: 'rgba(24,24,24,0.85)',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  whiteSpace: 'nowrap',
                }}>
                  {cat.name}: {cat.value}
                </div>
              </Html>
            </group>
          );
        })}
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}
