# Wilk Storage Architecture

## Overview

Wilk uses a hybrid storage approach optimized for CLI performance and developer workflows. The architecture combines SQLite for fast metadata queries with human-readable YAML files for configuration and agent definitions.

## Design Philosophy

### CLI-Optimized Storage

- **Zero startup time** with SQLite (vs 2-5s for MongoDB)
- **10-50x better performance** for typical CLI operations
- **1-5MB memory usage** vs 50-200MB for traditional databases
- **Portable storage** with single database file

### Developer-Friendly Configuration

- **Human-readable YAML** for agent definitions and configuration
- **Git-friendly** with meaningful diffs and merge capabilities
- **Version control** integration for agent development
- **Local development** without external dependencies

### LibreChat Model Adaptation

- **90% code reuse** from LibreChat's data models
- **Proven data structures** for agents, conversations, and files
- **Familiar patterns** for developers already using LibreChat
- **Seamless migration** from existing LibreChat installations

## Storage Architecture

```
Wilk Storage Architecture
┌──────────────────────────────────────────────────────┐
│               Application Layer                      │
├──────────────────────────────────────────────────────┤
│  Agent Mgmt  │  Session Mgmt  │  Registry            │
├──────────────────────────────────────────────────────┤
│              Storage Abstraction                     │
├──────────────────────────────────────────────────────┤
│   SQLite    │   File Manager  │   Cache              │
│  (Metadata) │  (Configs/Defs) │ (Performance)        │
├──────────────────────────────────────────────────────┤
│              Physical Storage                        │
├──────────────────────────────────────────────────────┤
│ ~/.wilk/wilk.db │ ~/.wilk/agents/ │ ~/.wilk/cache/   │
└──────────────────────────────────────────────────────┘
```

## Storage Components

### 1. SQLite Database Layer

**Purpose:** Fast metadata queries and session management

**Location:** `~/.wilk/wilk.db`

**Advantages:**

- **Instant startup:** No server startup time
- **ACID compliance:** Reliable transactions
- **Zero configuration:** No setup required
- **High performance:** Optimized for local access
- **Portable:** Single file storage

**Schema Design:**

```sql
-- Core tables for fast queries
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    version TEXT,
    is_installed BOOLEAN DEFAULT 1,
    install_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    name TEXT,
    working_directory TEXT,
    active_agents JSON,
    context_strategy TEXT DEFAULT 'summarize',
    max_tokens INTEGER DEFAULT 8192,
    default_model TEXT DEFAULT 'gpt-4',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id),
    role TEXT CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT,
    agent_id TEXT,
    tokens_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
);

CREATE TABLE registry_cache (
    package_name TEXT PRIMARY KEY,
    version TEXT,
    category TEXT,
    tags JSON,
    downloads INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0,
    description TEXT,
    author TEXT,
    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);
```

### 2. File-Based Configuration Layer

**Purpose:** Human-readable configuration and agent definitions

**Location:** `~/.wilk/agents/`, `~/.wilk/config/`

**File Structure:**

```
~/.wilk/
├── config.yaml              # Global configuration
├── agents/                  # Agent definitions
│   ├── code-analyzer/
│   │   ├── agent.yaml       # Agent definition
│   │   ├── tools/           # Custom tools
│   │   └── workflows/       # Workflows
│   └── doc-generator/
│       └── agent.yaml
├── prompts/                 # Custom prompts
│   ├── code-review.yaml
│   └── security-audit.yaml
└── sessions/                # Session data
    ├── current.json         # Current session
    └── saved/               # Saved sessions
```

**Agent Definition Format:**

```yaml
# ~/.wilk/agents/code-analyzer/agent.yaml
name: code-analyzer
version: 1.2.0
description: 'Advanced code analysis with security focus'
category: development
author: 'team@company.com'

model:
  provider: openai
  name: gpt-4
  parameters:
    temperature: 0.1
    max_tokens: 4096

tools:
  - file_search
  - execute_code
  - git_operations

permissions:
  filesystem:
    read:
      - './src/**'
      - './tests/**'
      - './docs/**'
    write:
      - './reports/**'
  shell:
    allowed:
      - 'git'
      - 'npm test'
      - 'eslint'
    blocked:
      - 'rm -rf'
      - 'sudo'

prompts:
  system: |
    You are an expert code analyzer specializing in security and best practices.
    Focus on identifying vulnerabilities, performance issues, and maintainability concerns.
    Provide actionable recommendations with code examples.

  user_template: |
    Please analyze the following code for:
    1. Security vulnerabilities
    2. Performance optimizations  
    3. Code quality issues
    4. Best practice violations

    Code: {code}
    Context: {context}

memory:
  project_context: true
  conversation_history: true
  max_context_tokens: 8192

metadata:
  tags: ['security', 'analysis', 'best-practices']
  documentation: './README.md'
  tests: './tests/agent.test.ts'
  license: 'MIT'
```

### 3. Cache Layer

**Purpose:** Performance optimization and temporary storage

**Location:** `~/.wilk/cache/`

**Cache Types:**

```typescript
interface CacheArchitecture {
  responses: {
    location: '~/.wilk/cache/responses/';
    format: 'JSON';
    ttl: 3600; // 1 hour
    purpose: 'LLM response caching';
  };
  context: {
    location: '~/.wilk/cache/context/';
    format: 'Binary';
    ttl: 86400; // 24 hours
    purpose: 'Context vector storage';
  };
  models: {
    location: '~/.wilk/cache/models/';
    format: 'Binary';
    ttl: 604800; // 1 week
    purpose: 'Local model caching';
  };
  registry: {
    location: '~/.wilk/cache/registry/';
    format: 'JSON';
    ttl: 3600; // 1 hour
    purpose: 'Registry metadata cache';
  };
}
```

## LibreChat Model Adaptation

### Data Model Mapping

**LibreChat Agent Model → Wilk Storage:**

```typescript
// LibreChat Agent.js model (MongoDB)
const AgentSchema = new mongoose.Schema({
  id: String,
  name: String,
  description: String,
  instructions: String,
  model: String,
  tools: [String],
  provider: String,
  versions: [AgentVersion],
  projectIds: [ObjectId],
  author: ObjectId,
});

// Wilk SQLite + YAML adaptation
interface WilkAgent {
  // SQLite metadata (fast queries)
  metadata: {
    id: string;
    name: string;
    description: string;
    category: string;
    version: string;
    is_installed: boolean;
    created_at: Date;
  };

  // YAML definition (human-readable)
  definition: {
    name: string;
    version: string;
    model: ModelConfig;
    tools: string[];
    permissions: AgentPermissions;
    prompts: AgentPrompts;
  };
}
```

### Conversation Management

**LibreChat Conversation Model → Wilk Session:**

```typescript
// LibreChat approach (MongoDB)
const ConversationSchema = {
  conversationId: String,
  title: String,
  user: ObjectId,
  endpoint: String,
  messages: [MessageSchema],
  // ... other fields
};

// Wilk approach (SQLite + optimized storage)
interface WilkSession {
  // SQLite session metadata
  session: {
    id: string;
    name: string;
    working_directory: string;
    active_agents: string[];
    created_at: Date;
    last_activity: Date;
  };

  // SQLite message storage
  messages: WilkMessage[];

  // JSON context file (when needed)
  context_file?: string; // Path to detailed context
}
```

### Tool Integration

**LibreChat Tool Loading → Wilk Tool Management:**

```typescript
// LibreChat tool loading pattern
const loadTools = async ({ req, res, provider, agentId, tools }) => {
  const toolMap = new Map();
  for (const toolName of tools) {
    const tool = await loadTool(toolName, { req, res, provider });
    toolMap.set(toolName, tool);
  }
  return { tools: Array.from(toolMap.values()) };
};

// Wilk adaptation for CLI context
class WilkToolManager {
  private toolRegistry: Map<string, ToolDefinition>;
  private agentTools: Map<string, string[]>;

  async loadAgentTools(agentId: string): Promise<Tool[]> {
    const agent = await this.storage.getAgent(agentId);
    return await Promise.all(agent.tools.map((toolName) => this.loadTool(toolName)));
  }

  private async loadTool(toolName: string): Promise<Tool> {
    // Reuse LibreChat's tool loading logic
    return await this.toolRegistry.get(toolName).load();
  }
}
```

## Storage Implementation

### Database Layer Implementation

```typescript
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

interface DatabaseConfig {
  path: string;
  readonly?: boolean;
  timeout?: number;
  verbose?: boolean;
}

class WilkDatabase {
  private db: Database.Database;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig = {}) {
    this.config = {
      path: config.path || join(homedir(), '.wilk', 'wilk.db'),
      readonly: config.readonly || false,
      timeout: config.timeout || 5000,
      verbose: config.verbose || false,
    };

    this.db = new Database(this.config.path, {
      readonly: this.config.readonly,
      timeout: this.config.timeout,
      verbose: this.config.verbose ? console.log : undefined,
    });

    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Create tables with proper indexes for performance
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        category TEXT,
        version TEXT,
        is_installed BOOLEAN DEFAULT 1,
        install_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);
      CREATE INDEX IF NOT EXISTS idx_agents_installed ON agents(is_installed);
      
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT,
        working_directory TEXT,
        active_agents JSON,
        context_strategy TEXT DEFAULT 'summarize',
        max_tokens INTEGER DEFAULT 8192,
        default_model TEXT DEFAULT 'gpt-4',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_sessions_activity ON sessions(last_activity);
      
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES sessions(id),
        role TEXT CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT,
        agent_id TEXT,
        tokens_used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata JSON
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    `);
  }

  // Agent management
  async saveAgent(agent: AgentMetadata): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agents 
      (id, name, description, category, version, is_installed, install_path, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      agent.id,
      agent.name,
      agent.description,
      agent.category,
      agent.version,
      agent.is_installed ? 1 : 0,
      agent.install_path,
    );
  }

  async getAgent(agentId: string): Promise<AgentMetadata | null> {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE id = ?');
    const row = stmt.get(agentId) as any;

    if (!row) return null;

    return {
      ...row,
      is_installed: Boolean(row.is_installed),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  async listAgents(filter: AgentFilter = {}): Promise<AgentMetadata[]> {
    let query = 'SELECT * FROM agents WHERE is_installed = 1';
    const params: any[] = [];

    if (filter.category) {
      query += ' AND category = ?';
      params.push(filter.category);
    }

    if (filter.name) {
      query += ' AND name LIKE ?';
      params.push(`%${filter.name}%`);
    }

    query += ' ORDER BY updated_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      ...row,
      is_installed: Boolean(row.is_installed),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    }));
  }

  // Session management
  async saveSession(session: SessionData): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions
      (id, name, working_directory, active_agents, context_strategy, max_tokens, default_model, last_activity)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      session.id,
      session.name,
      session.working_directory,
      JSON.stringify(session.active_agents),
      session.context_strategy,
      session.max_tokens,
      session.default_model,
    );
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt.get(sessionId) as any;

    if (!row) return null;

    return {
      ...row,
      active_agents: JSON.parse(row.active_agents || '[]'),
      created_at: new Date(row.created_at),
      last_activity: new Date(row.last_activity),
    };
  }

  // Message management
  async saveMessage(message: MessageData): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content, agent_id, tokens_used, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.id,
      message.session_id,
      message.role,
      message.content,
      message.agent_id,
      message.tokens_used,
      JSON.stringify(message.metadata || {}),
    );
  }

  async getMessages(sessionId: string, limit?: number): Promise<MessageData[]> {
    let query = 'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC';
    const params: any[] = [sessionId];

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}'),
      created_at: new Date(row.created_at),
    }));
  }

  close(): void {
    this.db.close();
  }
}
```

### File Manager Implementation

```typescript
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import yaml from 'js-yaml';

interface FileManagerConfig {
  basePath: string;
  agentsPath: string;
  configPath: string;
  promptsPath: string;
}

class WilkFileManager {
  private config: FileManagerConfig;

  constructor(config?: Partial<FileManagerConfig>) {
    const basePath = config?.basePath || join(homedir(), '.wilk');

    this.config = {
      basePath,
      agentsPath: config?.agentsPath || join(basePath, 'agents'),
      configPath: config?.configPath || join(basePath, 'config'),
      promptsPath: config?.promptsPath || join(basePath, 'prompts'),
      ...config,
    };
  }

  async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.config.basePath, { recursive: true });
    await fs.mkdir(this.config.agentsPath, { recursive: true });
    await fs.mkdir(this.config.configPath, { recursive: true });
    await fs.mkdir(this.config.promptsPath, { recursive: true });
  }

  // Agent definition management
  async saveAgentDefinition(agentId: string, definition: AgentDefinition): Promise<void> {
    const agentDir = join(this.config.agentsPath, agentId);
    await fs.mkdir(agentDir, { recursive: true });

    const filePath = join(agentDir, 'agent.yaml');
    const yamlContent = yaml.dump(definition, {
      indent: 2,
      lineWidth: 80,
      noRefs: true,
    });

    await fs.writeFile(filePath, yamlContent, 'utf8');
  }

  async loadAgentDefinition(agentId: string): Promise<AgentDefinition | null> {
    try {
      const filePath = join(this.config.agentsPath, agentId, 'agent.yaml');
      const content = await fs.readFile(filePath, 'utf8');
      return yaml.load(content) as AgentDefinition;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async deleteAgentDefinition(agentId: string): Promise<void> {
    const agentDir = join(this.config.agentsPath, agentId);
    await fs.rm(agentDir, { recursive: true, force: true });
  }

  async listAgentDefinitions(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.config.agentsPath, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  // Configuration management
  async saveConfig(config: WilkConfig): Promise<void> {
    const filePath = join(this.config.configPath, 'config.yaml');
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: 80,
      noRefs: true,
    });

    await fs.writeFile(filePath, yamlContent, 'utf8');
  }

  async loadConfig(): Promise<WilkConfig | null> {
    try {
      const filePath = join(this.config.configPath, 'config.yaml');
      const content = await fs.readFile(filePath, 'utf8');
      return yaml.load(content) as WilkConfig;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  // Prompt management
  async savePrompt(name: string, prompt: PromptDefinition): Promise<void> {
    const filePath = join(this.config.promptsPath, `${name}.yaml`);
    const yamlContent = yaml.dump(prompt, {
      indent: 2,
      lineWidth: 80,
      noRefs: true,
    });

    await fs.writeFile(filePath, yamlContent, 'utf8');
  }

  async loadPrompt(name: string): Promise<PromptDefinition | null> {
    try {
      const filePath = join(this.config.promptsPath, `${name}.yaml`);
      const content = await fs.readFile(filePath, 'utf8');
      return yaml.load(content) as PromptDefinition;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async listPrompts(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.config.promptsPath);
      return entries
        .filter((entry) => entry.endsWith('.yaml') || entry.endsWith('.yml'))
        .map((entry) => entry.replace(/\.(yaml|yml)$/, ''));
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}
```

## Performance Optimizations

### Query Optimization

```typescript
// Optimized queries with proper indexing
class OptimizedQueries {
  // Fast agent lookup by category
  static getAgentsByCategory = `
    SELECT * FROM agents 
    WHERE category = ? AND is_installed = 1 
    ORDER BY updated_at DESC
  `;

  // Recent sessions with agent counts
  static getRecentSessions = `
    SELECT s.*, COUNT(m.id) as message_count
    FROM sessions s
    LEFT JOIN messages m ON s.id = m.session_id
    WHERE s.last_activity > datetime('now', '-7 days')
    GROUP BY s.id
    ORDER BY s.last_activity DESC
    LIMIT 10
  `;

  // Agent usage statistics
  static getAgentUsageStats = `
    SELECT agent_id, COUNT(*) as usage_count, AVG(tokens_used) as avg_tokens
    FROM messages 
    WHERE agent_id IS NOT NULL 
      AND created_at > datetime('now', '-30 days')
    GROUP BY agent_id
    ORDER BY usage_count DESC
  `;
}
```

### Caching Strategy

```typescript
interface CacheConfig {
  responses: {
    ttl: number; // 1 hour
    maxSize: string; // 50MB
    compression: boolean;
  };
  context: {
    ttl: number; // 24 hours
    maxSize: string; // 100MB
    persistence: boolean;
  };
  registry: {
    ttl: number; // 1 hour
    maxSize: string; // 10MB
    refreshInterval: number;
  };
}

class WilkCache {
  private config: CacheConfig;
  private memoryCache: Map<string, CacheEntry>;

  async get<T>(key: string, type: CacheType): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Check disk cache
    const diskEntry = await this.getDiskCache<T>(key, type);
    if (diskEntry && !this.isExpired(diskEntry)) {
      // Promote to memory cache
      this.memoryCache.set(key, diskEntry);
      return diskEntry.data;
    }

    return null;
  }

  async set<T>(key: string, data: T, type: CacheType): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: this.config[type].ttl,
      type,
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);

    // Store in disk cache for persistence
    await this.setDiskCache(key, entry, type);
  }
}
```

## Migration Strategy

### From LibreChat

```typescript
class LibreChatMigration {
  async migrateAgents(mongoUri: string): Promise<MigrationResult> {
    // Connect to existing LibreChat MongoDB
    const mongoAgents = await this.fetchMongoAgents(mongoUri);
    const results: MigrationResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const mongoAgent of mongoAgents) {
      try {
        // Convert MongoDB agent to Wilk format
        const wilkAgent = this.convertAgent(mongoAgent);

        // Save to SQLite + YAML
        await this.wilkStorage.saveAgent(wilkAgent.metadata);
        await this.fileManager.saveAgentDefinition(wilkAgent.metadata.id, wilkAgent.definition);

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          agentId: mongoAgent._id,
          error: error.message,
        });
      }
    }

    return results;
  }

  private convertAgent(mongoAgent: any): WilkAgent {
    return {
      metadata: {
        id: mongoAgent._id.toString(),
        name: mongoAgent.name,
        description: mongoAgent.description,
        category: this.inferCategory(mongoAgent),
        version: mongoAgent.version || '1.0.0',
        is_installed: true,
        created_at: mongoAgent.createdAt,
        updated_at: mongoAgent.updatedAt,
      },
      definition: {
        name: mongoAgent.name,
        version: mongoAgent.version || '1.0.0',
        model: {
          provider: mongoAgent.provider,
          name: mongoAgent.model,
          parameters: mongoAgent.model_parameters || {},
        },
        tools: mongoAgent.tools || [],
        permissions: this.convertPermissions(mongoAgent),
        prompts: {
          system: mongoAgent.instructions || '',
          user_template: mongoAgent.user_template || '',
        },
      },
    };
  }
}
```

## Next Steps

1. **[Database Design](database.md)** - Detailed SQLite schema and queries
2. **[File Management](files.md)** - YAML structure and file operations
3. **[LibreChat Adaptation](librechat-adaptation.md)** - Model conversion patterns
4. **[Performance](../performance/README.md)** - Storage optimization strategies

