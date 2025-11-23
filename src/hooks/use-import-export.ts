import { db } from '@/lib/db';
import { toast } from '@/lib/toast-service';
import { ExportedProject, Project, DocumentNode, CodexEntry, ChatThread, ChatMessage, CodexRelation, CodexAddition, Section, Snippet } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export function useImportExport() {

    const exportFullBackup = async () => {
        try {
            const { exportDB } = await import('dexie-export-import');
            const blob = await exportDB(db);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `novel-backup-${new Date().toISOString()}.json`;
            a.click();
            toast.success('Full backup created successfully');
        } catch (error) {
            console.error('Backup failed:', error);
            toast.error('Backup failed. See console for details.');
        }
    };

    const importFullBackup = async (file: File) => {
        try {
            const { importDB } = await import('dexie-export-import');

            // Manually clear tables before import since options are not typed correctly
            await Promise.all(db.tables.map(table => table.clear()));

            await importDB(file);
            toast.success('Database restored successfully');
            window.location.reload(); // Reload to reflect changes
        } catch (error) {
            console.error('Restore failed:', error);
            toast.error('Restore failed. Ensure this is a valid backup file.');
        }
    };

    const exportProject = async (projectId: string) => {
        try {
            const project = await db.projects.get(projectId);
            if (!project) throw new Error('Project not found');

            const nodes = await db.nodes.where('projectId').equals(projectId).toArray();
            const codex = await db.codex.where('projectId').equals(projectId).toArray();
            const chats = await db.chatThreads.where('projectId').equals(projectId).toArray();
            const snippets = await db.snippets.where('projectId').equals(projectId).toArray();

            // Fetch related data
            const threadIds = chats.map(c => c.id);
            const messages = await db.chatMessages.where('threadId').anyOf(threadIds).toArray();

            const codexIds = codex.map(c => c.id);
            const codexRelations = await db.codexRelations.where('parentId').anyOf(codexIds).or('childId').anyOf(codexIds).toArray();

            const sceneIds = nodes.filter(n => n.type === 'scene').map(n => n.id);
            const codexAdditions = await db.codexAdditions.where('sceneId').anyOf(sceneIds).toArray();
            const sections = await db.sections.where('sceneId').anyOf(sceneIds).toArray();

            const exportData: ExportedProject = {
                version: 1,
                project,
                nodes,
                codex,
                chats,
                messages,
                codexRelations,
                codexAdditions,
                sections,
                snippets,
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `project-${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            a.click();
            toast.success(`Project "${project.title}" exported successfully`);
        } catch (error) {
            console.error('Project export failed:', error);
            toast.error('Failed to export project.');
        }
    };

    const importProject = async (file: File) => {
        try {
            const text = await file.text();
            const data: ExportedProject = JSON.parse(text);

            if (!data.project || !data.nodes) {
                throw new Error('Invalid project file format');
            }

            // Generate new Project ID to avoid conflicts
            const oldProjectId = data.project.id;
            const newProjectId = uuidv4();

            // Map old IDs to new IDs
            const idMap = new Map<string, string>();
            idMap.set(oldProjectId, newProjectId);

            // Helper to get new ID
            const getNewId = (oldId: string) => {
                if (!idMap.has(oldId)) {
                    idMap.set(oldId, uuidv4());
                }
                return idMap.get(oldId)!;
            };

            // 1. Import Project
            const newProject: Project = {
                ...data.project,
                id: newProjectId,
                title: `${data.project.title} (Imported)`,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            await db.projects.add(newProject);

            // 2. Import Nodes
            const newNodes = data.nodes.map(node => ({
                ...node,
                id: getNewId(node.id),
                projectId: newProjectId,
                parentId: node.parentId ? getNewId(node.parentId) : null,
            }));
            await db.nodes.bulkAdd(newNodes);

            // 3. Import Codex
            const newCodex = data.codex.map(entry => ({
                ...entry,
                id: getNewId(entry.id),
                projectId: newProjectId,
            }));
            await db.codex.bulkAdd(newCodex);

            // 4. Import Snippets
            const newSnippets = (data.snippets || []).map(snippet => ({
                ...snippet,
                id: getNewId(snippet.id),
                projectId: newProjectId,
            }));
            await db.snippets.bulkAdd(newSnippets);

            // 5. Import Chats & Messages
            const newChats = (data.chats || []).map(chat => ({
                ...chat,
                id: getNewId(chat.id),
                projectId: newProjectId,
            }));
            await db.chatThreads.bulkAdd(newChats);

            const newMessages = (data.messages || []).map(msg => ({
                ...msg,
                id: getNewId(msg.id),
                threadId: getNewId(msg.threadId),
            }));
            await db.chatMessages.bulkAdd(newMessages);

            // 6. Import Relations, Additions, Sections
            const newRelations = (data.codexRelations || []).map(rel => ({
                ...rel,
                id: getNewId(rel.id),
                parentId: getNewId(rel.parentId),
                childId: getNewId(rel.childId),
            }));
            await db.codexRelations.bulkAdd(newRelations);

            const newAdditions = (data.codexAdditions || []).map(add => ({
                ...add,
                id: getNewId(add.id),
                sceneId: getNewId(add.sceneId),
                codexEntryId: getNewId(add.codexEntryId),
            }));
            await db.codexAdditions.bulkAdd(newAdditions);

            const newSections = (data.sections || []).map(sec => ({
                ...sec,
                id: getNewId(sec.id),
                sceneId: getNewId(sec.sceneId),
            }));
            await db.sections.bulkAdd(newSections);

            toast.success('Project imported successfully');
            return newProjectId;

        } catch (error) {
            console.error('Project import failed:', error);
            toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    };

    return {
        exportFullBackup,
        importFullBackup,
        exportProject,
        importProject
    };
}
