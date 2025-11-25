'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/core/database';
import { seedDatabase } from '@/lib/seed';
import { Button } from '@/components/ui/button';

export default function TestDBPage() {
    const projects = useLiveQuery(() => db.projects.toArray());

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Database Test</h1>
            <Button onClick={() => seedDatabase()}>Seed Database</Button>

            <div className="mt-8">
                <h2 className="text-xl font-semibold">Projects</h2>
                <pre className="bg-slate-100 p-4 rounded mt-2">
                    {JSON.stringify(projects, null, 2)}
                </pre>
            </div>
        </div>
    );
}
