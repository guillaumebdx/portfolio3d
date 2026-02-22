// Ceiling lights along the corridor — like track lighting
const CEILING_LIGHTS_Z = [-8, -5, -2, 1, 4, 7];

export default function Lights() {
  return (
    <>
      {/* Ambient base */}
      <ambientLight intensity={0.4} color="#b0b0c0" />

      {/* Soft overhead fill */}
      <directionalLight
        position={[0, 8, 0]}
        intensity={0.35}
        color="#ddd8f0"
      />

      {/* Ceiling point lights — warm downward glow along the corridor */}
      {CEILING_LIGHTS_Z.map((z) => (
        <pointLight
          key={z}
          position={[0, 3.8, z]}
          intensity={1.5}
          color="#ffe8cc"
          distance={7}
          decay={1.5}
        />
      ))}
    </>
  );
}
