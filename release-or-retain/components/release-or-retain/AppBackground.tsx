export default function AppBackground() {
  return (
    <div
      className="fixed inset-0 -z-10"
      style={{
        background: "radial-gradient(ellipse at center, #0F1629 0%, #080C18 100%)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><filter id=\"noise\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" result=\"noise\" /></filter><rect width=\"100\" height=\"100\" fill=\"%23080C18\" filter=\"url(%23noise)\" opacity=\"0.03\" /></svg>')",
        }}
      />
    </div>
  );
}
