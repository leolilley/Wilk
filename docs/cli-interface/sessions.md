# Session Management Guide

## Overview

Wilk's session management system builds on LibreChat's proven conversation handling architecture, enhanced for CLI performance with SQLite storage, thinking content preservation, and seamless context restoration. Sessions provide persistent conversation context, multi-agent coordination, and full transparency into agent reasoning processes.

## Session Architecture

### Session Structure

Building on LibreChat's conversation models with CLI-specific enhancements:

```typescript
interface WilkSession {
  // Core identification (from LibreChat patterns)
  sessionId: string; // sess_${nanoid()}
  conversationId: string; // conv_${nanoid()}
  parentMessageId?: string; // Last message in chain

  // Session metadata
  title: string; // Auto-generated or user-defined
  description?: string; // Optional session description
  status: 'active' | 'paused' | 'completed' | 'archived';

  // Participants and configuration
  agents: AgentParticipant[]; // Active agents in session
  user: string; // Session owner
  project?: string; // Associated project path

  // Context and memory
  contextStrategy: 'discard' | 'summarize' | 'hybrid';
  maxContextTokens: number;
  memoryIntegration: boolean;
  thinkingPreservation: boolean;

  // Session statistics
  messageCount: number;
  tokenUsage: TokenUsage;
  duration: number; // Total active time in seconds

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;

  // Session-specific settings
  settings: SessionSettings;
}

interface AgentParticipant {
  agentId: string;
  role: 'primary' | 'secondary' | 'observer';
  joinedAt: Date;
  messageCount: number;
  thinkingTokens: number;
  isActive: boolean;
}

interface SessionSettings {
  autoSave: boolean;
  thinkingDisplay: 'off' | 'progressive' | 'live';
  taskTracking: boolean;
  exportThinking: boolean;
  memoryUpdates: boolean;
}
```

## Session Lifecycle

### 1. Session Creation

Sessions are automatically created when starting conversations:

```bash
# Implicit session creation
$ @research "What are the latest AI developments?"
🆕 Starting new session (sess_abc123)

● Task(AI Development Research)
│     ⎿  Web Search("AI developments 2024")
│        Found 25 results (enter to expand)
│     ⎿  Analyzing trends...
│        🤔 Agent thinking... (3.2s · ↑ 1.8k tokens)
│        ✓ Analysis complete

📊 Latest AI Developments Summary:
[Response content...]

💾 Session saved: sess_abc123 (3 messages, 1 agent)
```

**Explicit session creation:**

```bash
# Create named session
$ wilk session create "AI research project"
🆕 Created session: sess_abc123 "AI research project"

# Create with specific settings
$ wilk session create "secure-analysis" --no-thinking --agents security,code-analyzer
🆕 Created session: sess_def456 "secure-analysis"
   Agents: @security, @code-analyzer
   Thinking: disabled
   Context: discard strategy
```

### 2. Session Management Commands

#### List Sessions

```bash
$ wilk sessions
Recent Sessions:

┌──────────────┬─────────────────────────────┬─────────────┬───────────┬──────────────┬─────────────┐
│ Session ID   │ Title                       │ Started     │ Messages  │ Agents       │ Status      │
├──────────────┼─────────────────────────────┼─────────────┼───────────┼──────────────┼─────────────┤
│ sess_abc123  │ AI research project         │ 2 hours ago │ 15        │ research     │ Active      │
│ sess_def456  │ Code security audit         │ 1 day ago   │ 32        │ security,code│ Paused      │
│ sess_ghi789  │ Documentation update        │ 2 days ago  │ 8         │ docs-writer  │ Completed   │
│ sess_jkl012  │ Architecture design         │ 3 days ago  │ 45        │ architect    │ Archived    │
└──────────────┴─────────────────────────────┴─────────────┴───────────┴──────────────┴─────────────┘

Current: sess_abc123 (15 messages, 1 agent, 2h active)
Total: 4 sessions (1 active, 1 paused, 1 completed, 1 archived)
```

#### Session Details

```bash
$ wilk session show sess_abc123
Session: sess_abc123 "AI research project"

Overview:
  Status: Active
  Started: 2024-01-15 14:30:22
  Duration: 2h 15m (active)
  Project: ~/projects/ai-research

Participants:
  👤 user123 (owner)
  🤖 @research-assistant (primary, 15 messages)

Messages: 15 total
  📨 User messages: 8
  🤖 Agent responses: 7
  💭 Thinking tokens: 12,847
  📊 Total tokens: 25,693

Context:
  Strategy: summarize
  Max tokens: 8192
  Current window: 4,234 tokens
  Summaries: 2 created

Memory Integration:
  Project memory: 3 entries loaded
  Agent memory: 5 learning points
  Imports: @README.md, @package.json

Settings:
  Thinking display: progressive
  Auto-save: enabled
  Export thinking: enabled
  Task tracking: enabled
```

### 3. Session Resume and Restoration

Building on LibreChat's conversation restoration patterns:

```bash
$ wilk session resume sess_def456
Restoring session sess_def456 "Code security audit"...

📋 Loading session context:
  ✓ 32 messages loaded
  ✓ 2 agents restored: @security, @code-analyzer
  ✓ Context window: 6,234 tokens
  ✓ Memory context: 8 entries
  ✓ Thinking content: preserved
  ✓ Task history: 12 completed tasks

🔄 Rebuilding conversation state...
  ✓ Agent configurations loaded
  ✓ Tool permissions restored
  ✓ Context strategy applied (summarize)
  ✓ Memory imports resolved

📖 Session Summary:
Last active: 1 day ago
Context: Security audit of authentication module
Agents: @security (primary), @code-analyzer (secondary)

Last exchange:
User: "Can you also check the password validation logic?"
@security: "I'll analyze the password validation. Let me examine..."

✅ Session restored - ready to continue

> Continue conversation from here...
```

**Resume with modifications:**

```bash
# Resume with different agents
$ wilk session resume sess_abc123 --add-agent docs-writer

# Resume with different thinking mode
$ wilk session resume sess_abc123 --thinking live

# Resume with context limits
$ wilk session resume sess_abc123 --max-context 4096
```

## Context Management in Sessions

### Context Strategies

#### 1. Discard Strategy (Fast)

Simple context window management without summarization:

```bash
$ wilk session create "quick-qa" --context discard --max-tokens 2048

● Session: Discard Strategy
│     Context Window: 2048 tokens
│     Behavior: Drop oldest messages when limit reached
│     Performance: Fastest
│     Memory Usage: Minimal
```

#### 2. Summarize Strategy (Balanced)

Intelligent summarization for long conversations:

```bash
$ wilk session create "deep-analysis" --context summarize --max-tokens 8192

● Session: Summarize Strategy
│     Context Window: 8192 tokens
│     Behavior: Create summaries of older messages
│     Performance: Moderate
│     Memory Usage: Medium
│
│     Summarization triggers:
│     ⎿  When context exceeds 80% of limit
│     ⎿  Preserves last 10 messages
│     ⎿  Creates rolling summaries
```

#### 3. Hybrid Strategy (Advanced)

Memory-integrated context with priority-based management:

```bash
$ wilk session create "project-work" --context hybrid --memory-integration

● Session: Hybrid Strategy
│     Context Window: Dynamic (4K-16K tokens)
│     Memory Integration: Project + Agent + User
│     Priority-based message retention
│     Intelligent import resolution
│
│     Context Allocation:
│     ⎿  Memory context: 20% (1.6K tokens)
│     ⎿  Critical messages: 30% (2.4K tokens)
│     ⎿  Recent messages: 40% (3.2K tokens)
│     ⎿  Buffer: 10% (800 tokens)
```

### Context Restoration Process

Building on LibreChat's message chain reconstruction:

```typescript
class SessionContextRestorer {
  async restoreSessionContext(sessionId: string): Promise<RestoredContext> {
    // 1. Load session metadata
    const session = await this.loadSession(sessionId);

    // 2. Reconstruct message chain (LibreChat pattern)
    const messages = await this.reconstructMessageChain(
      session.conversationId,
      session.parentMessageId,
    );

    // 3. Apply context strategy
    const contextResult = await this.applyContextStrategy(
      messages,
      session.contextStrategy,
      session.maxContextTokens,
    );

    // 4. Restore memory context
    const memoryContext = await this.restoreMemoryContext(session);

    // 5. Restore thinking content
    const thinkingContext = await this.restoreThinkingContent(session);

    // 6. Restore agent states
    const agentStates = await this.restoreAgentStates(session.agents);

    return {
      messages: contextResult.messages,
      summaries: contextResult.summaries,
      memoryContext,
      thinkingContent,
      agentStates,
      tokenUsage: contextResult.tokenUsage,
    };
  }

  private async reconstructMessageChain(
    conversationId: string,
    parentMessageId?: string,
  ): Promise<WilkMessage[]> {
    // Use LibreChat's message chain reconstruction
    const messages = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt));

    if (!parentMessageId) {
      return messages.reverse(); // Chronological order
    }

    // Follow parent-child chain (LibreChat pattern)
    return this.buildMessageChain(messages, parentMessageId);
  }
}
```

## Thinking Content in Sessions

### Thinking Preservation

All agent thinking content is preserved in sessions:

```bash
$ wilk session show sess_abc123 --thinking
Session Thinking Summary:

Agent Reasoning Sessions: 7 total
Total thinking tokens: 12,847
Average reasoning time: 3.4 seconds

Recent Thinking:
┌─ Message 15: Research Query Analysis ──────────────────────────────────────────┐
│ Agent: @research-assistant                                                     │
│ Tokens: 1,847 · Duration: 3.2s                                               │
│ ────────────────────────────────────────────────────────────────────────────── │
│ I need to research AI developments by focusing on:                            │
│ 1. Recent breakthroughs in LLM capabilities                                   │
│ 2. Industry adoption patterns                                                  │
│ 3. Regulatory developments                                                     │
│ [Expand to see full reasoning...]                                             │
└────────────────────────────────────────────────────────────────────────────────┘

View full thinking content:
  wilk thinking show sess_abc123 --message 15
  wilk thinking export sess_abc123
```

### Thinking Search and Analysis

```bash
# Search thinking content across session
$ wilk session thinking search sess_abc123 "research methodology"
🔍 Searching thinking content for "research methodology"...

Found in 3 messages:
  Message 5: Agent outlined systematic research approach
  Message 12: Refined methodology based on initial findings
  Message 15: Applied methodology to current analysis

# Analyze thinking patterns
$ wilk session thinking analyze sess_abc123
📊 Thinking Pattern Analysis for sess_abc123:

Reasoning Categories:
  🔍 Research planning: 42% (5,387 tokens)
  📊 Data analysis: 28% (3,597 tokens)
  💡 Insight synthesis: 20% (2,569 tokens)
  🔧 Problem solving: 10% (1,284 tokens)

Thinking Quality Metrics:
  Average depth: 7.2/10
  Reasoning coherence: 8.5/10
  Logical structure: 9.1/10

Common patterns:
  ✓ Systematic problem breakdown
  ✓ Evidence-based reasoning
  ✓ Multiple perspective analysis
  ⚠️ Occasional reasoning loops (3 instances)
```

## Multi-Agent Session Management

### Agent Coordination in Sessions

```bash
$ @research @analysis @writer "Create comprehensive market report"

🎭 Multi-Agent Session Started (sess_mno345)
Participants: @research, @analysis, @writer

● Task(Comprehensive Market Report)
│
├─ Phase 1: Research (@research)
│  ● Task(Data Collection)
│  │     ⎿  Web Search("market trends 2024")
│  │        🤔 Agent thinking... (4.1s · ↑ 2.3k tokens)
│  │        Found 47 sources
│  │     ⎿  Industry report analysis...
│  │        ✓ 12 reports processed
│  │
├─ Phase 2: Analysis (@analysis)
│  ● Task(Data Processing)
│  │     ⎿  Statistical analysis...
│  │        📊 Processing research data
│  │        🤔 Agent thinking... (6.2s · ↑ 3.1k tokens)
│  │        ✓ Trends identified
│  │
├─ Phase 3: Writing (@writer)
│  ● Task(Report Creation)
│  │     ⎿  Structure development...
│  │        🤔 Agent thinking... (2.8s · ↑ 1.6k tokens)
│  │        ✓ Report outline created
│  │     ⎿  Content generation...
│  │        ✓ 15-page report generated
│
✅ Multi-agent collaboration complete (2m 45s)

Session Summary:
  3 agents participated
  12 individual tasks completed
  7,023 thinking tokens across agents
  Final deliverable: comprehensive_market_report.md
```

### Agent Session Roles

```bash
# Add agent to existing session
$ wilk session add-agent sess_abc123 code-analyzer --role secondary
✅ Added @code-analyzer as secondary agent to sess_abc123

# Change agent role
$ wilk session agent-role sess_abc123 research primary
✅ Changed @research to primary role in sess_abc123

# Remove agent from session
$ wilk session remove-agent sess_abc123 docs-writer
✅ Removed @docs-writer from sess_abc123 (preserving message history)
```

## Session Persistence and Storage

### SQLite Schema for Sessions

Building on LibreChat's MongoDB schema, adapted for SQLite:

```sql
-- Main sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  parent_message_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  user_id TEXT NOT NULL,
  project_path TEXT,

  -- Context management
  context_strategy TEXT DEFAULT 'discard',
  max_context_tokens INTEGER DEFAULT 4096,
  memory_integration BOOLEAN DEFAULT true,
  thinking_preservation BOOLEAN DEFAULT true,

  -- Statistics
  message_count INTEGER DEFAULT 0,
  token_usage_total INTEGER DEFAULT 0,
  thinking_tokens INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,

  -- Settings
  settings JSON,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Session participants (agents)
CREATE TABLE session_agents (
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  role TEXT DEFAULT 'secondary',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  thinking_tokens INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  PRIMARY KEY (session_id, agent_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Session thinking content
CREATE TABLE session_thinking (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  thinking_content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  reasoning_type TEXT, -- 'analysis', 'planning', 'synthesis', etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (message_id) REFERENCES messages(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Session context summaries
CREATE TABLE session_summaries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  summary_content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  messages_summarized INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### Session Auto-Save and Recovery

```typescript
class SessionManager {
  private autoSaveInterval: NodeJS.Timeout;

  constructor() {
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.autoSaveActiveSessions();
    }, 30000);
  }

  async autoSaveActiveSessions(): Promise<void> {
    const activeSessions = await this.getActiveSessions();

    for (const session of activeSessions) {
      try {
        await this.saveSessionState(session);
      } catch (error) {
        console.warn(`Failed to auto-save session ${session.id}:`, error);
      }
    }
  }

  async recoverCorruptedSession(sessionId: string): Promise<WilkSession | null> {
    try {
      // Attempt message chain reconstruction
      const messages = await this.reconstructMessageChain(sessionId);

      // Rebuild session metadata from messages
      const rebuiltSession = await this.rebuildSessionFromMessages(sessionId, messages);

      // Restore thinking content if available
      await this.restoreThinkingContent(rebuiltSession);

      return rebuiltSession;
    } catch (error) {
      console.error(`Failed to recover session ${sessionId}:`, error);
      return null;
    }
  }
}
```

## Session Export and Import

### Export Formats

```bash
# Export complete session
$ wilk session export sess_abc123
Exporting session sess_abc123...

📦 Export Contents:
  ✓ 15 messages with full content
  ✓ Agent configurations and versions
  ✓ Thinking content (12,847 tokens)
  ✓ Memory context and imports
  ✓ Task execution history
  ✓ Session metadata and settings

📄 Exported to: session-export-abc123.json (127.3 KB)

Import with: wilk session import session-export-abc123.json
```

**Export options:**

```bash
# Export without thinking content
$ wilk session export sess_abc123 --no-thinking

# Export specific message range
$ wilk session export sess_abc123 --from-message 10 --to-message 15

# Export with external file references
$ wilk session export sess_abc123 --include-files

# Export as markdown conversation
$ wilk session export sess_abc123 --format markdown
```

### Import and Restore

```bash
$ wilk session import session-export-abc123.json
Importing session from session-export-abc123.json...

🔍 Analyzing export file...
  Session: sess_abc123 "AI research project"
  Messages: 15
  Agents: @research-assistant
  Thinking tokens: 12,847
  File size: 127.3 KB

⚠️  Conflict Resolution:
  Session ID exists: sess_abc123
  Options:
    1. Create new session with different ID
    2. Merge with existing session
    3. Overwrite existing session
    4. Cancel import

Choice [1]: 1

✅ Session imported as sess_pqr678 "AI research project (imported)"

Resume with: wilk session resume sess_pqr678
```

## Session Performance Optimization

### Context Caching

```typescript
class SessionContextCache {
  private cache: Map<string, CachedSessionContext> = new Map();
  private maxCacheSize: number = 100;
  private ttl: number = 10 * 60 * 1000; // 10 minutes

  async getCachedContext(sessionId: string): Promise<CachedSessionContext | null> {
    const cached = this.cache.get(sessionId);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      // Refresh TTL on access
      cached.timestamp = Date.now();
      return cached;
    }

    return null;
  }

  async setCachedContext(sessionId: string, context: SessionContext): Promise<void> {
    // Implement LRU eviction
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(sessionId, {
      context,
      timestamp: Date.now(),
    });
  }
}
```

### Lazy Loading Strategies

```typescript
class LazySessionLoader {
  async loadSessionIncremental(sessionId: string): Promise<SessionLoadResult> {
    // 1. Load session metadata first (fast)
    const sessionMeta = await this.loadSessionMetadata(sessionId);

    // 2. Load recent messages (immediate display)
    const recentMessages = await this.loadRecentMessages(sessionId, 10);

    // 3. Load agent configurations (background)
    const agentLoadPromise = this.loadAgentConfigurations(sessionMeta.agents);

    // 4. Load thinking content on demand
    const thinkingLoader = this.createThinkingLoader(sessionId);

    // 5. Load memory context (background)
    const memoryLoadPromise = this.loadMemoryContext(sessionMeta);

    return {
      session: sessionMeta,
      messages: recentMessages,
      agentConfigsPromise: agentLoadPromise,
      thinkingLoader,
      memoryPromise: memoryLoadPromise,
    };
  }
}
```

## Session Analytics and Insights

### Session Statistics

```bash
$ wilk session stats sess_abc123
📊 Session Statistics: sess_abc123

Message Flow:
  Total messages: 15
  User messages: 8 (53.3%)
  Agent responses: 7 (46.7%)
  Average response time: 4.2 seconds

Token Usage:
  Total tokens: 25,693
  Thinking tokens: 12,847 (50.0%)
  Response tokens: 12,846 (50.0%)
  Context efficiency: 84.2%

Agent Performance:
  @research-assistant:
    Messages: 7
    Avg thinking time: 3.4s
    Thinking depth: 8.2/10
    Tool usage: 12 executions

Conversation Quality:
  Topic coherence: 9.1/10
  Context maintenance: 8.8/10
  Goal achievement: 8.5/10

Time Analysis:
  Total duration: 2h 15m
  Active conversation: 18m
  Thinking time: 24s total
  Idle time: 1h 57m
```

### Session Insights

```bash
$ wilk session insights sess_abc123
💡 Session Insights: AI research project

🎯 Conversation Patterns:
  ✓ Focused research methodology
  ✓ Systematic information gathering
  ✓ Evidence-based conclusions
  ⚠️ Could benefit from more diverse sources

🤖 Agent Behavior:
  @research-assistant showed:
  ✓ Thorough analysis approach
  ✓ Good source verification
  ✓ Clear reasoning documentation
  ⚠️ Occasional over-explanation

💭 Thinking Quality:
  Strengths:
  ✓ Logical reasoning structure
  ✓ Multiple perspective analysis
  ✓ Transparent decision-making

  Areas for improvement:
  ⚠️ Sometimes circular reasoning
  ⚠️ Could use more creative approaches

📈 Productivity Metrics:
  Research efficiency: 8.7/10
  Question answering: 9.2/10
  Task completion: 8.1/10

🎯 Recommendations:
  1. Consider adding @creativity-agent for diverse perspectives
  2. Enable live thinking for complex analysis tasks
  3. Increase context window for longer research sessions
```

This comprehensive session management system provides persistent, transparent, and efficient conversation handling while maintaining the full context and reasoning capabilities that make Wilk a powerful CLI-native agent operating system.

