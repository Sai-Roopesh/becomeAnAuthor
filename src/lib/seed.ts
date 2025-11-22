import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

export async function seedDatabase() {
    const projectCount = await db.projects.count();
    if (projectCount > 0) return;

    const projectId = uuidv4();

    await db.projects.add({
        id: projectId,
        title: 'The Lost City of Z',
        author: 'Arthur Conan Doyle',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });

    // Create Act 1
    const actId = uuidv4();
    await db.nodes.add({
        id: actId,
        projectId,
        parentId: null,
        type: 'act',
        title: 'Act I: The Departure',
        order: 100,
        expanded: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });

    // Create Chapter 1
    const chapterId = uuidv4();
    await db.nodes.add({
        id: chapterId,
        projectId,
        parentId: actId,
        type: 'chapter',
        title: 'Chapter 1: The Letter',
        order: 100,
        expanded: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });

    // Create Scene 1
    await db.nodes.add({
        id: uuidv4(),
        projectId,
        parentId: chapterId,
        type: 'scene',
        title: 'The Arrival',
        order: 100,
        expanded: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'It was a dark and stormy night.' }] }] },
        summary: 'The protagonist receives a mysterious letter.',
        status: 'draft',
        wordCount: 7,
    });

    console.log('Database seeded!');
}
