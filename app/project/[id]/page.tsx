import { ProjectPageClient } from './client';

// For static export, provide a placeholder page that will be used as fallback
// The actual dynamic routing happens client-side in Tauri
export function generateStaticParams() {
    // Return a placeholder that allows the route to be generated
    // In Tauri, the actual ID comes from client-side URL parsing
    return [{ id: '_' }];
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <ProjectPageClient id={id} />;
}
