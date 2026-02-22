import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { EffectComposer, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
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
      <color attach="background" args={['#111115']} />
      <fog attach="fog" args={['#111115', 15, 45]} />

      <Suspense fallback={null}>
        <Lights />
        <CameraController />
        <Museum modelPath="/museum-optimized.glb" />
        <Preload all />
      </Suspense>

      <EffectComposer>
        <Vignette eskil={false} offset={0.35} darkness={0.6} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
