# Character Arcs Module

Track character evolution across your series with rich, temporal context for AI-powered writing assistance.

## Overview

The Character Arcs module allows you to define how characters change and develop at specific points in your series. This provides the AI with temporal context—knowing exactly what a character knows, feels, and wants at any given moment in your story.

## Key Features

### 📍 Arc Points
Define character state at specific story moments:
- **Event-based**: Link to books, scenes, or custom milestones
- **Temporal tracking**: Age, status, location at each point
- **Stats visualization**: Graph character development over time
- **Relationships**: How connections evolve

### 🧠 Phase 5: Enhanced AI Context
Provide rich context for authentic AI-generated content:

**Knowledge State**
- What character knows vs. doesn't know yet (dramatic irony)
- Beliefs and misconceptions
- Prevents plot holes and spoilers

**Emotional State**
- Primary emotion and intensity (1-10)
- Mental state (traumatized, confident, etc.)
- Internal conflicts

**Goals & Motivations**
- Primary and secondary goals
- Fears and desires
- Obstacles facing the character

## Quick Start

### 1. Open a Character
Navigate to a character in your Codex and click the **Character Arc** tab.

### 2. Add Your First Arc Point
Click **Add Milestone** and fill in:
- **Event Label**: "Book 1 - Beginning" or "Learns magic"
- **Book**: Select from your series
- **Description**: How the character has changed
- **Age** (optional): Character's age at this point

### 3. Add Phase 5 Context (Optional)
Expand the collapsible sections to add:
- **Knowledge & Beliefs**: What they know, don't know, or believe
- **Emotional State**: Their primary emotion and mental state
- **Goals & Motivations**: What drives them

### 4. View the Timeline
The timeline shows:
- Visual markers for each arc point
- Stats graph (if you've added stats)
- Phase 5 context cards showing key information

## Use Cases

### Dramatic Irony
```
Book 2 - After Meeting Mentor
Knowledge State:
  Knows: ["Magic exists", "I have powers"]
  Doesn't Know Yet: ["Mentor is actually my father"]
  Believes: ["Mentor is just a teacher"]
```

AI will respect this—never revealing the father relationship too early.

### Character Growth
```
Book 1: Confidence = 20/100
Book 2: Confidence = 45/100
Book 3: Confidence = 75/100
```

The stats graph visualizes this progression automatically.

### Authentic Dialogue
```
Emotional State:
  Primary Emotion: Grief (Intensity: 9/10)
  Mental State: ["traumatized", "withdrawn"]
  Internal Conflict: "Wants revenge vs. honoring mentor's peaceful ways"
```

AI uses this to generate dialogue that matches character's emotional state.

## Best Practices

### When to Create Arc Points
- **Beginning of each book**: Establish baseline
- **Major revelations**: Character learns crucial information
- **Transformative events**: Deaths, betrayals, victories
- **Relationship changes**: Allies become enemies, etc.

### Granularity
- **Minimum**: One arc point per book
- **Recommended**: 3-5 key moments per book
- **Maximum**: Use scene-level linking for critical moments

### Phase 5 Tips
**Knowledge State**
- Track what character learns chapter-by-chapter if complex
- Use "Doesn't Know Yet" to prevent AI spoilers
- Update "Believes" when character is deceived

**Emotional State**
- Update after traumatic events
- Track mental state progression (e.g., grief → acceptance)
- Note internal conflicts for richer character depth

**Goals & Motivations**
- Update when character's objectives change
- Track evolving fears and desires
- Note new obstacles as they arise

## Integration with AI

### @Mentions
When you @mention a character in your manuscript:
- Shows age-appropriate description
- Includes current emotional state hint
- Uses temporal context from current book

### Chat Context
When character is in chat context:
- Full arc state included
- ⚠️ Warnings for "doesn't know yet" information
- Stats, relationships, Phase 5 fields all provided

### Analysis
Use "Analyze Character Arc" to:
- Detect age inconsistencies
- Find knowledge contradictions (character forgetting things)
- Get suggestions for richer arc tracking

## Migration

Existing characters automatically get an initial arc point created from their first book in the series. You can then:
1. Edit this arc point to add details
2. Create additional points for evolution
3. Add Phase 5 context progressively

## Technical Details

### Data Model
```typescript
interface ArcPoint {
  eventLabel: string;      // "Book 3 - Learns Truth"
  bookId?: string;         // Link to book
  sceneId?: string;        // Optional scene link
  age?: number;
  description: string;
  stats: Record<string, number>;
  knowledgeState?: {...};  // Phase 5
  emotionalState?: {...};  // Phase 5
  goalsAndMotivations?: {...}; // Phase 5
}
```

### Storage
Arc points are stored in the Codex entry JSON file:
```
~/BecomeAnAuthor/Projects/{series}/codex/{category}/{entry}.json
```

## Troubleshooting

**Timeline not showing**
- Ensure at least one arc point exists
- Check that arcPoints array is not empty

**Stats graph empty**
- Add stats to at least 2 arc points
- Use consistent stat names across points

**AI revealing secrets**
- Add to "Doesn't Know Yet" field
- Verify current book selection in arc point

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open arc editor | Click any timeline point |
| Add milestone | Click "+ Add Milestone" |
| Save arc point | Ctrl/Cmd + S (within editor) |

## Future Enhancements

Planned features:
- [ ] Bulk import from outline
- [ ] Arc templates (Hero's Journey, etc.)
- [ ] Multi-character comparison view
- [ ] Export arc as visual chart
- [ ] Location and magic system timelines

## Examples

### Harry Potter Style
```
Arc Point: "Book 1 - Discovers Magic"
Age: 11
Knowledge: ["I'm a wizard", "Parents were murdered"]
Doesn't Know: ["I'm the chosen one", "Horcruxes exist"]
Emotional: Awe (Intensity: 8/10)
Goal: "Learn magic and fit in"
```

### Character Transformation
```
Book 1: Status = "Naive farm boy", Confidence = 15
Book 2: Status = "Apprentice", Confidence = 40
Book 3: Status = "Hero", Confidence = 85
```

The graph shows the transformation visually.

---

**Need help?** Check the implementation plan or reach out to support.
