export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh w-full overflow-hidden bg-[var(--room-bg)] text-white">
      {children}
    </div>
  );
}
