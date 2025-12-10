/**
 * Tauri Project Repository
 * Implements IProjectRepository using file system through Tauri commands
 */

import type { IProjectRepository } from '@/domain/repositories/IProjectRepository';
import type { Project } from '@/lib/config/types';
import {
    listProjects,
    createProject,
    deleteProject as deleteProjectCommand,
    updateProject as updateProjectCommand,
    archiveProject as archiveProjectCommand,
    type ProjectMeta
} from '@/core/tauri';
import { setCurrentProjectPath } from './TauriNodeRepository';

/**
 * Convert Tauri ProjectMeta to app's Project type
 */
function projectMetaToProject(meta: ProjectMeta): Project & { _tauriPath?: string } {
    return {
        id: meta.id,
        title: meta.title,
        author: meta.author || '',
        createdAt: new Date(meta.created_at).getTime(),
        updatedAt: new Date(meta.updated_at).getTime(),
        language: 'en',
        archived: meta.archived || false,
        // Store path for later use
        _tauriPath: meta.path,
    };
}

/**
 * Tauri-based Project Repository
 * Manages projects as folders in ~/BecomeAnAuthor/Projects/
 */
export class TauriProjectRepository implements IProjectRepository {
    async get(id: string): Promise<Project | undefined> {
        const projects = await this.getAll();
        const project = projects.find(p => p.id === id);

        if (project) {
            // Set the current project path for other repos to use
            const tauriProject = project as Project & { _tauriPath?: string };
            if (tauriProject._tauriPath) {
                setCurrentProjectPath(tauriProject._tauriPath);
            }
        }

        return project;
    }

    async getAll(): Promise<Project[]> {
        try {
            const projects = await listProjects();
            return projects.map(projectMetaToProject);
        } catch (error) {
            console.error('Failed to list projects:', error);
            return [];
        }
    }

    async create(params: {
        title: string;
        author: string;
        language?: string;
        seriesId?: string;
        seriesIndex?: string;
        customPath: string;
    }): Promise<string> {
        const created = await createProject(params.title, params.author || 'Unknown', params.customPath);
        // Set the current project path so TauriNodeRepository can create nodes
        setCurrentProjectPath(created.path);
        return created.id;
    }

    async update(id: string, updates: Partial<Project>): Promise<void> {
        const projects = await listProjects();
        const project = projects.find(p => p.id === id);

        if (project) {
            await updateProjectCommand(project.path, {
                ...(updates.title !== undefined && { title: updates.title }),
                ...(updates.author !== undefined && { author: updates.author }),
                ...(updates.archived !== undefined && { archived: updates.archived }),
            });
        }
    }

    async archive(id: string): Promise<void> {
        const projects = await listProjects();
        const project = projects.find(p => p.id === id);

        if (project) {
            await archiveProjectCommand(project.path, true);
        }
    }

    async delete(id: string): Promise<void> {
        // Find project path from ID
        const projects = await listProjects();
        const project = projects.find(p => p.id === id);

        if (project) {
            // Delete via Tauri
            await deleteProjectCommand(project.path);

            // Invalidate cache so UI updates
            const { invalidateQueries } = await import('@/hooks/use-live-query');
            invalidateQueries();
        }
    }
}
