'use client';

import { TopNavigation } from '@/features/navigation/components/TopNavigation';
import { useParams } from 'next/navigation';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const projectId = params['id'] as string;

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
            <TopNavigation projectId={projectId} />
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    );
}
