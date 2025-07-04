# Wilk MVP Implementation Roadmap

## Overview

This document outlines the concrete implementation steps to build the Wilk CLI-native agent operating system MVP. Based on the comprehensive technical documentation, this roadmap provides a practical path from current LibreChat-fork to a fully functional Wilk CLI.

## MVP Definition

The Wilk MVP includes:

- **Interactive CLI/REPL** with boxed input and progress feedback
- **Agent management** (install, run, orchestrate multiple agents)
- **Agent thinking transparency** (real-time reasoning display with progressive disclosure)
- **Task execution display** (hierarchical task breakdown with expandable details)
- **Memory system** (project/user/agent persistent memory)
- **Basic tool integration** (file operations, shell commands)
- **MCP server support** for external tools
- **SQLite storage** for optimal CLI performance
- **Multi-choice interaction system** with LLM-generated suggestions

## Phase 1: Foundation (Weeks 1-4)

### Week 1: Project Setup & CLI Structure

**Goal**: Establish basic CLI framework and project structure

**Tasks**:

1. **Create Wilk CLI entry point**

   - [ ] Create `wilk/` directory in LibreChat-fork
   - [ ] Set up `wilk/src/index.ts` as main CLI entry
   - [ ] Add npm script: `"wilk": "tsx wilk/src/index.ts"`
   - [ ] Basic argument parsing with `commander.js`

2. **Initialize SQLite database**

   - [ ] Install SQLite dependencies: `better-sqlite3`, `drizzle-orm`
   - [ ] Create database schema in `wilk/src/db/schema.ts`
   - [ ] Database migrations system
   - [ ] Connection management

3. **Basic REPL interface**
   - [ ] Implement `BoxedInput` class from CLI documentation
   - [ ] Basic command router
   - [ ] Welcome screen with ASCII art
   - [ ] Exit functionality

**Files to Create**:

```
wilk/
├── src/
│   ├── index.ts              # Main CLI entry point
│   ├── repl/
│   │   ├── BoxedInput.ts     # Input interface
│   │   ├── CommandRouter.ts  # Command routing
│   │   └── WelcomeScreen.ts  # Startup display
│   ├── db/
│   │   ├── schema.ts         # Database schema
│   │   ├── migrations.ts     # Migration system
│   │   └── connection.ts     # DB connection
│   └── types/
│       └── index.ts          # Core type definitions
├── package.json              # Wilk-specific dependencies
└── tsconfig.json            # TypeScript config
```

**Success Criteria**:

- [ ] `npm run wilk` starts REPL with boxed input
- [ ] SQLite database created on first run
- [ ] Basic commands work: `/help`, `/status`, `/exit`

### Week 2: Memory System & Agent Thinking Foundation

**Goal**: Implement memory system and core agent thinking transparency

**Tasks**:

1. **Memory Manager implementation**

   - [ ] Create `WilkMemoryManager` class from memory documentation
   - [ ] File discovery (./WILK.md, ~/.wilk/WILK.md)
   - [ ] Import resolution system (@path/to/file syntax)
   - [ ] Memory loading and caching

2. **Memory commands**

   - [ ] `/memory` command with list/edit/search subcommands
   - [ ] `/init` command for project memory initialization
   - [ ] `#<content>` shortcut for quick memory addition
   - [ ] Integration with REPL

3. **Memory storage in SQLite**

   - [ ] Memory cache table
   - [ ] Import tracking
   - [ ] Change detection and invalidation

4. **Agent thinking foundation** (See THINKING_TEXT_IMPLEMENTATION.md)
   - [ ] Port LibreChat's content types (`ContentTypes.THINK`)
   - [ ] Message content structure for agent thinking
   - [ ] SQLite schema for thinking content storage
   - [ ] Configuration system for agent thinking preferences
   - [ ] Basic progressive disclosure system (show/hide thinking on demand)

**Files to Create**:

```
wilk/src/
├── memory/
│   ├── MemoryManager.ts      # Core memory management
│   ├── ImportResolver.ts     # @path resolution
│   ├── MemoryCommands.ts     # CLI commands
│   └── MemoryCache.ts        # SQLite caching
├── thinking/
│   ├── ThinkingDisplay.ts    # CLI thinking display
│   ├── StreamHandler.ts      # Port from LibreChat SplitStreamHandler
│   └── ThinkingConfig.ts     # Thinking preferences
├── types/
│   ├── MessageTypes.ts       # Port from LibreChat content types
│   └── ThinkingTypes.ts      # Thinking-specific types
└── commands/
    ├── MemoryCommands.ts     # /memory command handlers
    └── InitCommand.ts        # /init command
```

**Success Criteria**:

- [ ] `/init` creates WILK.md with project template
- [ ] `/memory list` shows available memory files
- [ ] `#test memory` prompts for memory location
- [ ] Import resolution works: `@README.md`
- [ ] Agent thinking structure implemented (ready for agent integration)
- [ ] Thinking configuration system works: `wilk config set thinking.show_by_default true`
- [ ] Basic progressive disclosure: `💭 Show agent reasoning? [y/N]` prompt works

### Week 3: Agent System Foundation

**Goal**: Adapt LibreChat's proven agent system for CLI use

**Tasks**:

1. **Agent model adaptation**

   - [ ] Port `/api/models/Agent.js` to `wilk/src/agents/AgentModel.ts`
   - [ ] Adapt agent schemas from `/packages/data-schemas/src/schema/agent.ts`
   - [ ] Agent versioning system (reuse LibreChat's approach)
   - [ ] YAML/JSON agent definition format

2. **Agent CRUD operations**

   - [ ] Port `/api/server/controllers/agents/v1.js` to CLI commands
   - [ ] `wilk agent create/list/update/delete` commands
   - [ ] Agent validation using LibreChat's validation logic
   - [ ] Local agent storage in `~/.wilk/agents/`

3. **Agent execution system**
   - [ ] Adapt agent execution from `/api/server/controllers/agents/client.js`
   - [ ] Single agent execution: `@agent-name prompt`
   - [ ] Context passing from memory system
   - [ ] Response handling and display

**Files to Create**:

```
wilk/src/
├── agents/
│   ├── AgentModel.ts         # Port from /api/models/Agent.js
│   ├── AgentManager.ts       # Reuse LibreChat's agent loading logic
│   ├── AgentExecutor.ts      # Port from /api/server/controllers/agents/client.js
│   └── AgentCommands.ts      # Port from /api/server/controllers/agents/v1.js
├── providers/
│   ├── ProviderManager.ts    # Port from /api/server/services/Config/EndpointService.js
│   └── clients/              # Port from /api/app/clients/
└── types/
    ├── AgentTypes.ts         # Port from /packages/data-schemas/src/schema/agent.ts
    └── ProviderTypes.ts      # Provider type definitions
```

**Success Criteria**:

- [ ] `wilk agent create research --provider openai --model gpt-4` works
- [ ] `wilk agent list` shows installed agents
- [ ] `@research hello world` executes agent with prompt
- [ ] Agent has access to memory context from LibreChat's context system
- [ ] Agent versioning works (LibreChat's version management)

### Week 4: Agent Transparency & Interactive Systems

**Goal**: Complete agent thinking transparency, task execution display, and intelligent interaction systems

**Tasks**:

1. **Progress feedback system**

   - [ ] `ProgressFeedback` class from CLI documentation
   - [ ] Spinner animations and token counting
   - [ ] Operation timing and interrupt handling
   - [ ] Integration with agent execution

2. **LLM-powered choice generation**

   - [ ] `DynamicChoiceGenerator` class
   - [ ] Choice trigger detection logic
   - [ ] LLM prompt engineering for choice generation
   - [ ] Fallback choices for LLM failures

3. **Interactive choice interface**

   - [ ] `SmartMultiChoiceSystem` with arrow key navigation
   - [ ] Raw keyboard input handling
   - [ ] Visual choice display and selection
   - [ ] Integration with agent responses

4. **Complete agent thinking implementation** (See THINKING_TEXT_IMPLEMENTATION.md)

   - [ ] Live agent thinking streaming with progress indicators
   - [ ] Interactive thinking prompts with progressive disclosure
   - [ ] Thinking export/replay functionality
   - [ ] Integration with task execution display

5. **Task execution display system** (See TASK_EXECUTION_DISPLAY.md)
   - [ ] `TaskExecutionTracker` for hierarchical task management
   - [ ] Live task display with expandable details (`enter to expand`)
   - [ ] Tool usage tracking and visualization
   - [ ] Integration with agent execution and multi-choice system

**Files to Create**:

```
wilk/src/
├── thinking/                    # Enhanced from Week 2
│   ├── ThinkingDisplay.ts      # Progressive disclosure, live streaming
│   ├── StreamHandler.ts        # Enhanced agent thinking stream handling
│   ├── ThinkingCommands.ts     # /thinking show/export/replay commands
│   └── ThinkingIntegration.ts  # Integration with task execution
├── ui/
│   ├── ProgressFeedback.ts     # Progress indicators
│   ├── MultiChoice.ts          # Choice system
│   └── KeyboardHandler.ts      # Raw input handling
├── tasks/
│   ├── TaskExecutionTracker.ts # Hierarchical task management
│   ├── TaskDisplayManager.ts   # Live task display with expand/collapse
│   ├── TaskKeyboardHandler.ts  # Enter to expand, Ctrl+R to expand all
│   └── TaskIntegration.ts      # Integration with agents and tools
└── llm/
    ├── ChoiceGenerator.ts      # LLM choice generation
    └── LLMClient.ts            # LLM integration
```

**Success Criteria**:

- [ ] **Agent thinking transparency**: `🤔 Agent thinking... (5.2s · ↑ 1.2k tokens)` with live streaming
- [ ] **Progressive disclosure**: `💭 Show agent reasoning? [y/N]` with boxed display
- [ ] **Thinking commands**: `wilk thinking show last`, `wilk thinking export session-123`
- [ ] **Task execution displays**: `● Task(Security Analysis)` with hierarchical breakdown
- [ ] **Tool usage tracking**: `⎿ Read(file.ts)` with `Read 247 lines (enter to expand)`
- [ ] **Multi-choice integration**: Agent thinking influences choice generation
- [ ] **Keyboard controls**: Enter to expand, Ctrl+R to expand all, arrow key navigation
- [ ] **Combined transparency**: Both agent reasoning AND task execution visible together

## Phase 2: Core Agent Features (Weeks 5-8)

### Week 5: Multi-Agent Orchestration

**Goal**: Support multiple agents in conversation

**Tasks**:

1. **Session management**

   - [ ] Agent session tracking
   - [ ] Context sharing between agents
   - [ ] Agent state persistence
   - [ ] Session commands: `/agent add/remove`, `/clear`, `/compact`

2. **Agent communication**

   - [ ] Multi-agent prompt routing: `@agent1 @agent2 analyze this`
   - [ ] Response aggregation and display
   - [ ] Agent conversation history
   - [ ] Context window management

3. **Agent memory system**
   - [ ] Agent-specific memory (`~/.wilk/agents/<id>/memory.md`)
   - [ ] Learning from interactions
   - [ ] Behavioral pattern storage
   - [ ] Performance metrics tracking

**Success Criteria**:

- [ ] Multiple agents can be active in one session
- [ ] `@code-analyzer @doc-generator review this PR` works
- [ ] Agents maintain individual memory and context
- [ ] `/compact` summarizes conversation while preserving key context

### Week 6: Tool Integration Framework

**Goal**: Adapt LibreChat's tool system for CLI use

**Tasks**:

1. **Tool system adaptation**

   - [ ] Port `/api/server/services/ToolService.js` to `wilk/src/tools/ToolManager.ts`
   - [ ] Adapt LibreChat's tool discovery and loading
   - [ ] Port tool implementations from `/api/app/clients/tools/`
   - [ ] CLI-specific tool configurations

2. **Core tool implementations**

   - [ ] File operations (adapt from LibreChat's file tools)
   - [ ] Shell command execution with LibreChat's sandboxing patterns
   - [ ] Git integration tools
   - [ ] RAG search tools (port from LibreChat)

3. **Tool security and permissions**
   - [ ] Adapt LibreChat's permission system for CLI
   - [ ] Tool execution logging and audit
   - [ ] User confirmation system for dangerous operations
   - [ ] CLI-specific sandboxing improvements

**Files to Create**:

```
wilk/src/
├── tools/
│   ├── ToolManager.ts        # Port from /api/server/services/ToolService.js
│   ├── ToolExecutor.ts       # Adapt LibreChat's tool execution
│   ├── PermissionEngine.ts   # Adapt LibreChat's permission system
│   └── implementations/      # Port from /api/app/clients/tools/
│       ├── FileTools.ts      # Port from LibreChat file tools
│       ├── ShellTools.ts     # Port from LibreChat shell tools
│       ├── GitTools.ts       # Git integration (new for CLI)
│       └── RAGTools.ts       # Port from LibreChat RAG tools
└── security/
    ├── Sandbox.ts            # Adapt LibreChat's sandboxing
    └── PermissionChecker.ts   # CLI permission validation
```

**Success Criteria**:

- [ ] Agents can read/write files with user permission
- [ ] Shell commands execute in controlled environment
- [ ] `/permissions set agent-name filesystem read ./src` works
- [ ] Tool execution shows in audit log

### Week 7: MCP Server Integration

**Goal**: Reuse LibreChat's MCP implementation for CLI

**Tasks**:

1. **MCP system adaptation**

   - [ ] Port `/api/server/services/MCP.js` to `wilk/src/mcp/MCPManager.ts`
   - [ ] Adapt LibreChat's MCP server management for CLI
   - [ ] Reuse MCP tool creation and execution logic
   - [ ] CLI-specific MCP configuration management

2. **MCP management commands**

   - [ ] `/mcp list/add/remove/start/stop` commands (port from LibreChat)
   - [ ] Server configuration and environment variables
   - [ ] Health checking and diagnostics (reuse LibreChat's)
   - [ ] Package installation from npm/registry

3. **MCP tool integration**
   - [ ] MCP tools available to agents (reuse LibreChat's integration)
   - [ ] Parameter validation and conversion
   - [ ] Error handling and retry logic
   - [ ] Performance monitoring for CLI

**Files to Create**:

```
wilk/src/
├── mcp/
│   ├── MCPManager.ts         # Port from /api/server/services/MCP.js
│   ├── MCPCommands.ts        # CLI commands for MCP management
│   ├── MCPIntegration.ts     # Agent integration (adapt from LibreChat)
│   └── MCPToolFactory.ts     # Port MCP tool creation logic
└── protocols/
    └── ModelContextProtocol.ts # MCP types (reuse from LibreChat)
```

**Success Criteria**:

- [ ] `/mcp add filesystem --command "npx @modelcontextprotocol/server-filesystem"` works
- [ ] MCP server tools available to agents
- [ ] `/mcp status server-name` shows health and capabilities
- [ ] Environment variables managed: `/mcp env server GITHUB_TOKEN`

### Week 8: Context Management & Performance

**Goal**: Optimize context handling and CLI performance

**Tasks**:

1. **Context optimization**

   - [ ] Intelligent context chunking and compression
   - [ ] Relevance scoring for context selection
   - [ ] Dynamic context allocation based on interaction type
   - [ ] Context caching and persistence

2. **Performance optimization**

   - [ ] Database query optimization
   - [ ] Memory usage monitoring and limits
   - [ ] Lazy loading of agents and tools
   - [ ] Background processing for non-critical tasks

3. **Advanced REPL features**
   - [ ] Command history persistence
   - [ ] Tab completion for commands, agents, files
   - [ ] Session save/restore functionality
   - [ ] Multi-line input and editing

**Success Criteria**:

- [ ] Wilk starts in <100ms (vs 2-5s for web LibreChat)
- [ ] Memory usage stays under 50MB for typical sessions
- [ ] Tab completion works for all commands and agent names
- [ ] `/resume session-id` restores full context

## Phase 3: Community & Polish (Weeks 9-12)

### Week 9: Agent Installation System

**Goal**: Install and manage community agents

**Tasks**:

1. **Agent package format**

   - [ ] Agent definition schema (manifest, prompts, tools)
   - [ ] Version management and compatibility
   - [ ] Dependencies and requirements
   - [ ] Security scanning and validation

2. **Installation system**

   - [ ] `/install agent-name` from git repos
   - [ ] Local agent installation: `/install ./my-agent`
   - [ ] Agent updates: `/update agent-name`
   - [ ] Dependency resolution and conflicts

3. **Agent marketplace**
   - [ ] Basic registry for agent discovery
   - [ ] Search functionality: `/search typescript`
   - [ ] Agent ratings and statistics
   - [ ] Publication workflow: `/publish agent-name`

**Success Criteria**:

- [ ] `/install @community/typescript-helper` installs working agent
- [ ] `/search security` finds relevant security agents
- [ ] Local agent development and testing workflow
- [ ] Version conflicts handled gracefully

### Week 10: Advanced Memory & RAG

**Goal**: Sophisticated knowledge management and retrieval

**Tasks**:

1. **Vector storage and search**

   - [ ] Vector database integration (SQLite with vector extensions)
   - [ ] Document embedding and indexing
   - [ ] Semantic search across memory and projects
   - [ ] RAG integration with agent context

2. **Advanced memory features**

   - [ ] Memory summarization and compression
   - [ ] Cross-project memory sharing
   - [ ] Memory export/import functionality
   - [ ] Memory analytics and insights

3. **Knowledge management**
   - [ ] Document indexing and search
   - [ ] Code analysis and understanding
   - [ ] Project structure learning
   - [ ] Intelligent context suggestions

**Success Criteria**:

- [ ] `/memory search "typescript patterns"` finds relevant content
- [ ] Agents can semantic search across project documentation
- [ ] Memory automatically suggests relevant context
- [ ] RAG enhances agent responses with project knowledge

### Week 11: Enterprise Features

**Goal**: Team collaboration and professional features

**Tasks**:

1. **Team collaboration**

   - [ ] Shared agent libraries and configurations
   - [ ] Team memory spaces and permissions
   - [ ] Collaboration commands and workflows
   - [ ] Shared session and context management

2. **Security and compliance**

   - [ ] Audit logging for all operations
   - [ ] Data privacy and encryption options
   - [ ] Access control and user management
   - [ ] Compliance reporting (basic)

3. **IDE and tooling integration**
   - [ ] VS Code extension for Wilk integration
   - [ ] Git hooks for automated analysis
   - [ ] CI/CD integration scripts
   - [ ] Development workflow automation

**Success Criteria**:

- [ ] Team can share and collaborate on agent configurations
- [ ] Audit logs track all sensitive operations
- [ ] VS Code integration provides basic Wilk functionality
- [ ] Git hooks run relevant agents on commits

### Week 12: Testing, Documentation & Release

**Goal**: Production-ready MVP with comprehensive testing

**Tasks**:

1. **Comprehensive testing**

   - [ ] Unit tests for all core components
   - [ ] Integration tests for agent workflows
   - [ ] Performance benchmarks and optimization
   - [ ] Error handling and edge case testing

2. **Documentation and examples**

   - [ ] User guide and getting started tutorial
   - [ ] Agent development documentation
   - [ ] API reference and examples
   - [ ] Troubleshooting and FAQ

3. **Release preparation**
   - [ ] Packaging and distribution setup
   - [ ] Installation scripts and dependencies
   - [ ] Version management and release notes
   - [ ] Community feedback and iteration

**Success Criteria**:

- [ ] 90%+ test coverage for core functionality
- [ ] Installation works on macOS, Linux, Windows
- [ ] Documentation covers all major use cases
- [ ] Community beta testing feedback incorporated

## Implementation Priorities

### Critical Path Items

1. **SQLite database setup** - Foundation for everything
2. **Memory system** - Core differentiator from web tools
3. **Agent execution** - Primary functionality
4. **Agent thinking transparency** - Key differentiator showing reasoning processes
5. **Task execution display** - Essential visibility into agent operations
6. **Progress feedback** - Essential UX component
7. **Tool integration** - Makes agents useful

### High Impact, Lower Risk

1. **Multi-choice system** - Great UX improvement
2. **MCP integration** - Leverages existing ecosystem
3. **Performance optimization** - Key CLI advantage
4. **Agent installation** - Community growth

### Future Enhancements

1. **Advanced RAG** - Can be improved iteratively
2. **Enterprise features** - Important for adoption
3. **IDE integration** - Nice to have
4. **Compliance features** - Specific market needs

## Technical Dependencies

### External Dependencies

- **better-sqlite3**: Database foundation
- **drizzle-orm**: Type-safe database queries
- **commander.js**: CLI argument parsing
- **chalk**: Terminal colors and formatting
- **tsx**: TypeScript execution

### LibreChat Integration Points (See LIBRECHAT_INTEGRATION_ANALYSIS.md)

- **Agent System**: 95% reuse of `/api/models/Agent.js` and agent CRUD operations
- **Context Management**: 85% reuse of summary buffer and memory systems
- **Tool Framework**: 90% reuse of `/api/server/services/ToolService.js`
- **MCP Integration**: 95% reuse of `/api/server/services/MCP.js`
- **Provider Clients**: 95% reuse of all LLM provider implementations
- **Data Schemas**: 90% reuse with MongoDB → SQLite adaptation

### Critical Decisions

1. **Database schema design** - Must support future scaling
2. **Agent definition format** - Compatibility with LibreChat
3. **Memory system architecture** - Performance vs flexibility
4. **Tool security model** - Usability vs safety
5. **MCP protocol version** - Future compatibility

## Success Metrics

### MVP Success Criteria

- [ ] Wilk CLI starts and runs basic commands
- [ ] Memory system loads project and user preferences
- [ ] Agents execute and respond to prompts
- [ ] Agent thinking transparency with progressive disclosure and live streaming
- [ ] Task execution display with hierarchical breakdown and expandable details
- [ ] Multi-agent orchestration works
- [ ] Basic tool integration (file ops, shell commands)
- [ ] MCP servers can be connected and used
- [ ] Agent installation from external sources
- [ ] Performance meets 10x CLI speed improvement goal

### User Experience Goals

- [ ] <100ms startup time (vs 2-5s web LibreChat)
- [ ] Intuitive command structure and help system
- [ ] Graceful error handling and recovery
- [ ] Responsive feedback for all operations
- [ ] Seamless integration with existing dev workflows

### Technical Achievement Targets

- [ ] 90% code reuse from LibreChat (estimated 8-10 weeks saved)
- [ ] SQLite performance 10-50x better than MongoDB for CLI use
- [ ] Memory usage <50MB for typical sessions
- [ ] Support 5+ concurrent agents without performance degradation
- [ ] Plugin ecosystem with 10+ community agents

This roadmap provides a concrete path from the current LibreChat-fork to a fully functional Wilk CLI MVP in 12 weeks, leveraging existing LibreChat architecture while adding CLI-specific optimizations and features.

