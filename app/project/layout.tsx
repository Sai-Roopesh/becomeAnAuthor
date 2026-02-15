"use client";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-background">
      {children}
    </div>
  );
}
