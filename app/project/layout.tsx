"use client";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      {children}
    </div>
  );
}
