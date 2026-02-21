export default function Lights() {
  return (
    <>
      {/* Dim ambient — dark but geometry still visible */}
      <ambientLight intensity={0.12} color="#b0b0c0" />

      {/* Soft overhead fill */}
      <directionalLight
        position={[0, 8, 0]}
        intensity={0.2}
        color="#ddd8f0"
      />
    </>
  );
}
