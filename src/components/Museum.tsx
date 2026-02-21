import { useEffect, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  Box3,
  Vector3,
  SpotLight,
  Object3D,
} from 'three';

const DRACO_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

interface PaintingData {
  center: [number, number, number];
  wallSide: 'left' | 'right';
}

interface MuseumProps {
  modelPath: string;
}

export default function Museum({ modelPath }: MuseumProps) {
  const { scene } = useGLTF(modelPath, DRACO_CDN);
  const groupRef = useRef<Group>(null);
  const [paintings, setPaintings] = useState<PaintingData[]>([]);

  useEffect(() => {
    if (!groupRef.current) return;

    // Force world matrix update so getWorldPosition is accurate
    groupRef.current.updateMatrixWorld(true);

    const found: PaintingData[] = [];

    groupRef.current.traverse((child) => {
      if (!(child as Mesh).isMesh) return;
      const mesh = child as Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Detect paintings: meshes with a texture map
      const mat = mesh.material as MeshStandardMaterial;
      if (!mat?.map) return;

      // Get world-space bounding box (includes parent scale)
      const box = new Box3().setFromObject(mesh);
      const size = new Vector3();
      box.getSize(size);
      const center = new Vector3();
      box.getCenter(center);

      // Paintings are flat: one dimension is very thin compared to the others
      const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
      const isFlatish = dims[0] < dims[2] * 0.15;

      // Paintings are on walls, not on the floor/ceiling (center Y roughly between 0.5 and 3.5)
      const isOnWall = center.y > 0.5 && center.y < 3.5;

      if (isFlatish && isOnWall) {
        const wallSide: 'left' | 'right' = center.x < 0 ? 'left' : 'right';
        found.push({
          center: [center.x, center.y, center.z],
          wallSide,
        });
      }
    });

    console.log(`Found ${found.length} paintings:`, found);
    setPaintings(found);
  }, [scene]);

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        scale={[0.5, 1, 1]}
        position={[0, 0, 0]}
      />
      {paintings.map((p, i) => (
        <PaintingSpotlight key={i} painting={p} />
      ))}
    </group>
  );
}

// Spot positioned above the painting, pointing down at its center
function PaintingSpotlight({ painting }: { painting: PaintingData }) {
  const lightRef = useRef<SpotLight>(null);
  const targetRef = useRef<Object3D>(null);

  const { center } = painting;

  // Spot origin: slightly in front of the painting (toward room center), up at ceiling
  const offsetX = painting.wallSide === 'left' ? 0.8 : -0.8;
  const spotPos: [number, number, number] = [center[0] + offsetX, center[1] + 2, center[2]];
  const targetPos: [number, number, number] = [center[0], center[1], center[2]];

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, []);

  return (
    <>
      <spotLight
        ref={lightRef}
        position={spotPos}
        angle={0.5}
        penumbra={0.5}
        intensity={5}
        color="#fff0d6"
        distance={6}
        decay={1.5}
        castShadow={false}
      />
      <object3D ref={targetRef} position={targetPos} />
    </>
  );
}
