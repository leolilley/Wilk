# Wilk Architecture Overview

## System Architecture

Wilk is built as a CLI-native agent operating system that leverages LibreChat's proven agent architecture while optimizing for command-line performance and developer workflows.

## Core Design Principles

### 1. CLI-First Design

- **Zero startup time** with SQLite instead of MongoDB
- **Portable configuration** using YAML files and local storage
- **Git-friendly** with human-readable configuration files
- **Offline capable** with local model support

### 2. LibreChat Foundation

- **90% code reuse** from LibreChat's sophisticated agent system
- **Battle-tested architecture** for multi-agent orchestration
- **Proven context management** with summarization and memory
- **Comprehensive tool integration** framework

### 3. Performance Optimization

- **10-50x faster startup** compared to web-based solutions
- **Low memory footprint** (1-5MB vs 50-200MB for MongoDB)
- **Efficient context management** with hierarchical strategies
- **Concurrent agent execution** with resource management

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Wilk CLI Interface                      │
├─────────────────────────────────────────────────────────────┤
│  REPL  │  Commands  │  Agent Syntax  │  Session Management  │
├─────────────────────────────────────────────────────────────┤
│                  Agent Orchestration Layer                  │
├─────────────────────────────────────────────────────────────┤
│ Agent Mgmt │ Context Mgmt │ Tool Integration │ Security     │
├─────────────────────────────────────────────────────────────┤
│              LibreChat Integration Layer                    │
├─────────────────────────────────────────────────────────────┤
│ BaseClient │ AgentClient │ ToolManager │ Permission System  │
├─────────────────────────────────────────────────────────────┤
│                    Storage Layer                            │
├─────────────────────────────────────────────────────────────┤
│   SQLite DB   │   YAML Configs   │   Agent Definitions      │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure                            │
├─────────────────────────────────────────────────────────────┤
│  Local LLMs  │  Cloud LLMs  │  MCP Servers  │  Tools        │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. CLI Interface Layer

**Purpose:** Interactive command-line interface with rich command set

**Key Components:**

- **REPL Engine:** Interactive read-eval-print loop
- **Command Router:** Routes commands to appropriate handlers
- **Input Parser:** Parses agent syntax (@agent, %prompt, #memory)
- **Session Manager:** Manages conversation state and context

**LibreChat Integration:**

```typescript
// Adapts LibreChat's route handlers for CLI commands
class WilkCommandRouter {
  private commands: Map<string, CommandHandler>;

  async executeCommand(input: string, context: REPLContext): Promise<string> {
    // Use LibreChat's service patterns
    const handler = this.commands.get(command);
    return await handler.execute(args, context);
  }
}
```

### 2. Agent Orchestration Layer

**Purpose:** Coordinates multiple agents with parallel/sequential execution

**Key Components:**

- **Agent Manager:** Agent lifecycle and configuration
- **Orchestrator:** Multi-agent coordination and communication
- **Context Manager:** Context preservation and optimization
- **Tool Integration:** MCP servers and tool management

**LibreChat Integration:**

```typescript
// Reuses LibreChat's AgentClient for orchestration
class WilkOrchestrator {
  private agentClient: AgentClient; // From LibreChat

  async executeMultipleAgents(commands: AgentCommand[]): Promise<Result[]> {
    // Use LibreChat's concurrent execution patterns
    return await Promise.allSettled(commands.map((cmd) => this.agentClient.chatCompletion(cmd)));
  }
}
```

### 3. Storage Layer

**Purpose:** Lightweight, portable storage optimized for CLI use

**Key Components:**

- **SQLite Database:** Fast queries for metadata and sessions
- **File Manager:** Agent definitions and configurations in YAML
- **Config Manager:** User preferences and system settings
- **Cache System:** LLM responses and context optimization

**Architecture:**

```typescript
interface StorageArchitecture {
  metadata: {
    database: 'SQLite';
    location: '~/.wilk/wilk.db';
    purpose: 'Fast queries, session management';
  };
  configurations: {
    format: 'YAML';
    location: '~/.wilk/agents/*/agent.yaml';
    purpose: 'Human-readable, Git-friendly';
  };
  cache: {
    format: 'JSON/Binary';
    location: '~/.wilk/cache/';
    purpose: 'Performance optimization';
  };
}
```

### 4. Security Framework

**Purpose:** Multi-layered security with granular permissions

**Key Components:**

- **Permission Engine:** Capability-based access control
- **Sandboxing:** Agent isolation and resource limits
- **Audit Logger:** Comprehensive security logging
- **Encryption:** API keys and sensitive data protection

**LibreChat Integration:**

```typescript
// Extends LibreChat's Role-based access control
class WilkSecurityManager {
  private permissionManager: PermissionManager; // From LibreChat

  async validateAgentPermission(
    agentId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    // Use LibreChat's permission checking patterns
    return await this.permissionManager.checkPermission(agentId, `${resource}:${action}`);
  }
}
```

## Data Flow Architecture

### 1. User Interaction Flow

```
User Input → Input Parser → Command Router → Handler → Agent(s) → Response
     ↓              ↓             ↓           ↓         ↓          ↓
  Syntax         @agent      /install    Agent Mgmt  LLM Call   Format
 Analysis        %prompt     /search      Registry   Tool Use   Output
```

### 2. Agent Execution Flow

```
Agent Command → Agent Loader → Context Assembly → LLM Execution → Tool Calls → Response
      ↓              ↓              ↓                  ↓            ↓          ↓
   Parse @agent   Load Config   Build Context      Send Prompt   Execute    Format
   Extract Args   Get Tools     Add Memory         Get Response  Tools      Result
```

### 3. Context Management Flow

```
Input → Context Manager → Token Counter → Strategy → LLM → Response → Update Context
  ↓           ↓              ↓            ↓        ↓       ↓            ↓
Add to    Check Limits   Count Tokens  Summarize Send   Process    Store in
Context   Apply Rules    Fit Window    Or Trim   Call   Result     Memory
```

## Technology Stack

### Core Technologies

- **Language:** TypeScript for type safety and reliability
- **Runtime:** Node.js for cross-platform compatibility
- **Database:** SQLite for zero-config, high-performance storage
- **Configuration:** YAML for human-readable, Git-friendly configs

### LibreChat Integration

- **Agent System:** LibreChat's agent architecture (90% reuse)
- **Context Management:** BaseClient for sophisticated context handling
- **Tool Integration:** Existing tool framework and MCP support
- **Security:** Role-based permission system

### Performance Optimizations

- **Storage:** SQLite provides 10-50x better performance than MongoDB
- **Memory:** Lazy loading and efficient caching strategies
- **Concurrency:** Resource-aware multi-agent execution
- **Latency:** Local vs cloud LLM routing strategies

## Deployment Architecture

### Development Environment

```
~/.wilk/
├── wilk.db                    # SQLite database
├── config.yaml                # User configuration
├── agents/                    # Installed agents
│   ├── my-agent/
│   │   ├── agent.yaml         # Agent definition
│   │   └── tools/             # Custom tools
├── sessions/                  # Session persistence
├── cache/                     # Performance cache
└── registry/                  # Local registry cache
```

### Enterprise Environment

```
Corporate Registry (Git)
├── agents/                    # Approved agents
├── templates/                 # Organization templates
├── policies/                  # Security policies
└── compliance/                # Audit configurations

Team Shared Configuration
├── shared-agents.yaml         # Team agent definitions
├── security-policies.yaml    # Organization security
└── integration-configs.yaml  # CI/CD and tool integrations
```

## Integration Points

### 1. LibreChat Components

**Direct Reuse (90% of code):**

- `api/models/Agent.js` - Agent data models
- `api/app/clients/BaseClient.js` - Context management
- `api/server/controllers/agents/client.js` - Agent orchestration
- `api/server/services/Tools/` - Tool integration
- `api/models/Role.js` - Permission system

**Adaptation Required:**

- Database queries (MongoDB → SQLite)
- Configuration format (JS objects → YAML)
- Web routes → CLI commands

### 2. External Systems

**LLM Providers:**

- OpenAI, Anthropic, Google (cloud)
- Ollama, LM Studio (local)
- Custom endpoints

**Tool Integration:**

- MCP Servers (Model Context Protocol)
- Shell commands and scripts
- File system operations
- External APIs

**Development Tools:**

- Git integration
- IDE plugins (planned)
- CI/CD systems (planned)

## Performance Characteristics

### Startup Performance

- **Cold start:** <100ms (vs 2-5s for web interfaces)
- **Memory usage:** 1-5MB initial (vs 50-200MB for MongoDB)
- **Database queries:** <1ms typical (SQLite local access)

### Runtime Performance

- **Context switching:** <10ms between agents
- **Command execution:** <50ms for most commands
- **Multi-agent coordination:** Concurrent execution with resource limits
- **Context management:** Hierarchical strategies with smart caching

### Scalability

- **Agent limit:** 100+ concurrent agents per session
- **Context size:** Dynamic management up to model limits
- **Storage growth:** Linear with actual usage (no overhead)
- **Memory usage:** Constant base + linear per active agent

## Security Architecture

### Multi-Layer Security

1. **Agent Isolation:** Namespace-based sandboxing
2. **Permission Control:** Granular capability-based access
3. **Resource Limits:** CPU, memory, and network restrictions
4. **Audit Logging:** Comprehensive activity tracking

### Enterprise Features

- **Compliance:** SOC2, GDPR, HIPAA support
- **Team Management:** Shared repositories and permissions
- **Audit Trails:** Complete activity logging and reporting
- **Integration Security:** Encrypted communication with external systems

## Next Steps

1. **[Agent Management](agent-management.md)** - Detailed agent lifecycle documentation
2. **[Context Management](context-management.md)** - Context and memory system design
3. **[CLI Interface](../cli-interface/README.md)** - Command-line interface specification
4. **[Storage Layer](../storage/README.md)** - Database and file system design

