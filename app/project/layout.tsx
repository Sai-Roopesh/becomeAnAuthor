'use client';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    );
}
