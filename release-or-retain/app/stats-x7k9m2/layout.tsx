export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-dvh"
      style={{
        backgroundColor: "#080C18",
        color: "#f9fafb",
        colorScheme: "dark",
      }}
    >
      {children}
    </div>
  );
}
