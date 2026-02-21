import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import Lights from './Lights';
import CameraController from './CameraController';
import Museum from './Museum';

export default function Scene() {
  return (
    <Canvas
      shadows
      camera={{ fov: 60, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0a0a12']} />
      <fog attach="fog" args={['#0a0a12', 12, 40]} />

      <Suspense fallback={null}>
        <Lights />
        <CameraController />
        <Museum modelPath="/museum-optimized.glb" />
        <Preload all />
      </Suspense>
    </Canvas>
  );
}
