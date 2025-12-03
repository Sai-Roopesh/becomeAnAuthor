/**
 * Import/Export Hook
 * 
 * ARCHITECTURAL EXCEPTION: This hook is permitted to directly import and use `db`
 * because it operates at the infrastructure layer performing complex cross-table
 * operations that require atomic transactions across multiple repositories.
 * 
 * This is one of the ONLY exceptions to Rule #2 (Data Access Pattern) and should
 * NOT be used as a precedent for other hooks or components.
 * 
 * Rationale:
 * - Performs full database backup/restore operations
 * - Requires atomic transactions across ALL tables
 * - Would be extremely complex to coordinate through individual repositories
 * - Is a low-level infrastructure utility, not feature code
 * 
 * Future: Consider moving to infrastructure/services/ImportExportService.ts
 */
import { db } from '@/lib/core/database';
import { toast } from '@/lib/toast-service';
import { ExportedProject, Project, DocumentNode, CodexEntry, ChatThread, ChatMessage, CodexRelation, CodexAddition, Section, Snippet, DriveBackupMetadata } from '@/lib/config/types';
import { v4 as uuidv4 } from 'uuid';
import { ExportedProjectSchema } from '@/lib/schemas/import-schema';
import { googleDriveService } from '@/lib/services/google-drive-service';

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

            // ✅ FIXED: Clear tables sequentially to prevent partial failures
            for (const table of db.tables) {
                try {
                    await table.clear();
                    console.log(`Cleared table: ${table.name}`);
                } catch (error) {
                    console.error(`Failed to clear table ${table.name}:`, error);
                    throw new Error(`Failed to clear table ${table.name}. Database restore aborted.`);
                }
            }

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

            // Get story analyses for the project
            const storyAnalyses = await db.storyAnalyses.where('projectId').equals(projectId).toArray();

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
                storyAnalyses,
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

    /**
     * Recursively rewrite UUIDs in Tiptap JSON content
     * Handles mention nodes and any other UUID references in the content
     */
    const rewriteUUIDsInTiptapJSON = (content: any, idMap: Map<string, string>): any => {
        if (!content) return content;

        // Handle arrays
        if (Array.isArray(content)) {
            return content.map(item => rewriteUUIDsInTiptapJSON(item, idMap));
        }

        // Handle objects
        if (typeof content === 'object') {
            const rewritten: any = { ...content };

            // Special handling for mention nodes
            if (rewritten.type === 'mention' && rewritten.attrs?.id) {
                const oldId = rewritten.attrs.id;
                const newId = idMap.get(oldId);
                if (newId) {
                    rewritten.attrs = { ...rewritten.attrs, id: newId };
                }
            }

            // Recursively process nested content
            if (rewritten.content) {
                rewritten.content = rewriteUUIDsInTiptapJSON(rewritten.content, idMap);
            }

            // Process all other properties that might contain UUIDs
            Object.keys(rewritten).forEach(key => {
                if (key !== 'type' && key !== 'attrs' && key !== 'content') {
                    rewritten[key] = rewriteUUIDsInTiptapJSON(rewritten[key], idMap);
                }
            });

            return rewritten;
        }

        // Return primitive values as-is
        return content;
    };

    const importProject = async (file: File) => {
        try {
            const text = await file.text();
            const rawData = JSON.parse(text);

            // ✅ SCHEMA VALIDATION: Prevent XSS, injection, and malformed data
            const validationResult = ExportedProjectSchema.safeParse(rawData);

            if (!validationResult.success) {
                console.error('Import validation errors:', validationResult.error);
                const errorMessage = validationResult.error.issues[0]?.message || 'Invalid file format';
                throw new Error(`Invalid project file: ${errorMessage}`);
            }

            const data = validationResult.data;

            // ✅ VALIDATION: Check required fields and version (already in schema, but double-check)
            if (!data.project || !data.nodes) {
                throw new Error('Invalid project file format: missing required fields');
            }

            if (!data.version || data.version !== 1) {
                throw new Error('Unsupported project file version');
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

            // Prepare all data transformations BEFORE transaction
            const newProject: Project = {
                ...data.project,
                id: newProjectId,
                title: `${data.project.title} (Imported)`,
                seriesId: data.project.seriesId || undefined, // Handle null from legacy exports
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            const newNodes = data.nodes.map(node => {
                const newNode: any = {
                    ...node,
                    id: getNewId(node.id),
                    projectId: newProjectId,
                    parentId: node.parentId ? getNewId(node.parentId) : null,
                };

                // Rewrite UUIDs in scene content (Tiptap JSON)
                if (node.type === 'scene' && (node as any).content) {
                    newNode.content = rewriteUUIDsInTiptapJSON((node as any).content, idMap);
                }

                return newNode;
            });

            const newCodex = (data.codex || []).map((entry: any) => ({
                ...entry,
                id: getNewId(entry.id),
                projectId: newProjectId,
                // Add defaults for potentially missing required fields from legacy exports
                aliases: entry.aliases || [],
                attributes: entry.attributes || {},
                references: entry.references || [],
                tags: entry.tags || [],
            }));

            const newSnippets = (data.snippets || []).map(snippet => {
                const newSnippet: any = {
                    ...snippet,
                    id: getNewId(snippet.id),
                    projectId: newProjectId,
                };

                // Rewrite UUIDs in snippet content (Tiptap JSON)
                if (snippet.content) {
                    newSnippet.content = rewriteUUIDsInTiptapJSON(snippet.content, idMap);
                }

                return newSnippet;
            });

            const newChats = (data.chats || []).map((chat: any) => ({
                ...chat,
                id: getNewId(chat.id),
                projectId: newProjectId,
                // Add defaults for potentially missing required fields from legacy exports
                name: chat.name || chat.title || 'Imported Conversation',
                pinned: chat.pinned || false,
                archived: chat.archived || false,
            }));

            const newMessages = (data.messages || []).map(msg => ({
                ...msg,
                id: getNewId(msg.id),
                threadId: getNewId(msg.threadId),
            }));

            const newRelations = (data.codexRelations || []).map((rel: any) => ({
                ...rel,
                id: getNewId(rel.id),
                parentId: getNewId(rel.parentId),
                childId: getNewId(rel.childId),
                // Add default for potentially missing required field from legacy exports
                createdAt: rel.createdAt || Date.now(),
            }));

            const newAdditions = (data.codexAdditions || []).map((add: any) => ({
                ...add,
                id: getNewId(add.id),
                sceneId: getNewId(add.sceneId),
                codexEntryId: getNewId(add.codexEntryId),
                // Add defaults for potentially missing required fields from legacy exports
                description: add.description || '',
                position: add.position || 0,
                createdAt: add.createdAt || Date.now(),
            }));

            const newSections = (data.sections || []).map((sec: any) => ({
                ...sec,
                id: getNewId(sec.id),
                sceneId: getNewId(sec.sceneId),
                // Add defaults for potentially missing required fields from legacy exports
                title: sec.title || 'Untitled Section',
                color: sec.color || '# 000000',
                content: sec.content || { type: 'doc', content: [] },
                excludeFromAI: sec.excludeFromAI ?? false,
                position: sec.position || 0,
                createdAt: sec.createdAt || Date.now(),
            }));

            // ✅ ATOMIC TRANSACTION: All database operations succeed or all fail
            await db.transaction(
                'rw',
                [db.projects, db.nodes, db.codex, db.snippets, db.chatThreads,
                db.chatMessages, db.codexRelations, db.codexAdditions, db.sections],
                async () => {
                    // All writes happen atomically - if ANY fails, ALL roll back
                    await db.projects.add(newProject);
                    await db.nodes.bulkAdd(newNodes);
                    await db.codex.bulkAdd(newCodex);

                    if (newSnippets.length > 0) {
                        await db.snippets.bulkAdd(newSnippets);
                    }

                    if (newChats.length > 0) {
                        await db.chatThreads.bulkAdd(newChats);
                    }

                    if (newMessages.length > 0) {
                        await db.chatMessages.bulkAdd(newMessages);
                    }

                    if (newRelations.length > 0) {
                        await db.codexRelations.bulkAdd(newRelations);
                    }

                    if (newAdditions.length > 0) {
                        await db.codexAdditions.bulkAdd(newAdditions);
                    }

                    if (newSections.length > 0) {
                        await db.sections.bulkAdd(newSections);
                    }
                }
            );
            // Transaction complete - all operations succeeded

            toast.success('Project imported successfully');
            return newProjectId;

        } catch (error) {
            console.error('Project import failed:', error);
            toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    };

    /**
     * Backup project to Google Drive
     */
    const backupToGoogleDrive = async (projectId: string): Promise<void> => {
        try {
            // Get project data
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

            // Get story analyses for the project
            const storyAnalyses = await db.storyAnalyses.where('projectId').equals(projectId).toArray();

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
                storyAnalyses,
            };

            // Prepare Drive backup metadata
            const backupMetadata: DriveBackupMetadata = {
                version: '1.0',
                exportedAt: Date.now(),
                appVersion: '0.1.0',
                backupType: 'manual',
                projectData: exportData,
            };

            // Generate filename
            const projectTitle = project.title.replace(/[^a-zA-Z0-9]/g, '_');
            const timestamp = new Date().toISOString().split('T')[0];
            const fileName = `${projectTitle}_backup_${timestamp}.json`;

            // Upload to Drive
            await googleDriveService.uploadBackup(backupMetadata, fileName);

            toast.success('Project backed up to Google Drive');
        } catch (error) {
            console.error('Drive backup failed:', error);
            toast.error(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    };

    /**
     * Restore project from Google Drive
     */
    const restoreFromGoogleDrive = async (fileId: string): Promise<string> => {
        try {
            // Download from Drive
            const backupMetadata = await googleDriveService.downloadBackup(fileId);

            // Extract project data
            const exportData = backupMetadata.projectData;

            // Create blob for import
            const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
            const file = new File([blob], 'drive-restore.json', { type: 'application/json' });

            // Use existing import logic
            const projectId = await importProject(file);

            toast.success('Project restored from Google Drive');
            return projectId;
        } catch (error) {
            console.error('Drive restore failed:', error);
            toast.error(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    };

    /**
     * List Google Drive backups
     */
    const listDriveBackups = async () => {
        try {
            return await googleDriveService.listBackups();
        } catch (error) {
            console.error('Failed to list Drive backups:', error);
            toast.error('Failed to load backup list');
            throw error;
        }
    };

    return {
        exportFullBackup,
        importFullBackup,
        exportProject,
        importProject,
        backupToGoogleDrive,
        restoreFromGoogleDrive,
        listDriveBackups,
    };
}
