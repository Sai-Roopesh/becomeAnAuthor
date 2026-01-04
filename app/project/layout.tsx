'use client';

/**
 * CANONICAL PROJECT ROUTE: /project?id=xxx
 * 
 * Do NOT use /project/[id] dynamic segments — that pattern was removed
 * for Tauri static export compatibility. All navigation must use query
 * parameters: /project?id=<projectId>
 */

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-screen w-full overflow-hidden bg-background">
            {children}
        </div>
    );
}
