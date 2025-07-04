# Wilk CLI Command Reference

## Overview

Wilk provides a comprehensive command-line interface with 80+ commands for agent management, conversation handling, memory management, and system administration. All commands follow consistent patterns adapted from LibreChat's proven interaction models.

## Command Structure

```bash
wilk [global-options] <command> [subcommand] [options] [arguments]
```

### Global Options

```bash
--config <path>          # Specify custom config file
--project <path>         # Set project directory
--profile <name>         # Use specific profile
--verbose, -v            # Verbose output
--quiet, -q              # Suppress non-essential output
--no-thinking            # Disable agent thinking display
--show-thinking          # Force show agent thinking
--thinking-live          # Show live thinking stream
--dry-run                # Show what would be done without executing
--format <json|yaml|table> # Output format
```

## Core Commands

### 1. Interactive Commands

#### `wilk` (No arguments)

Start interactive REPL mode with boxed input interface.

```bash
$ wilk
┌──────────────────────────────────────┐
│                                      │
│    ██╗    ██╗██╗██╗     ██╗  ██╗     │
│    ██║    ██║██║██║     ██║ ██╔╝     │
│    ██║ █╗ ██║██║██║     █████╔╝      │
│    ██║███╗██║██║██║     ██╔═██╗      │
│    ╚███╔███╔╝██║███████╗██║  ██╗     │
│     ╚══╝╚══╝ ╚═╝╚══════╝╚═╝  ╚═╝     │
│                                      │
│  CLI-Native Agent Operating System   │
│                                      │
└──────────────────────────────────────┘
Available agents: @research, @code-analyzer, @docs-writer
Memory loaded: 3 entries (847 tokens)
Type your message, or use @agent-name for specific agents
Press ↑/↓ for history, Tab for completion, Ctrl+C to exit

Tips for getting started:
1. Ask questions, edit files, or run commands
2. Be specific for the best results
3. Create WILK.md files to customize interactions
4. /help for more information

┌────────────────────────────────────────────────────────────────────────────┐
│ > Hello, help me understand this codebase                                  │
└────────────────────────────────────────────────────────────────────────────┘

```

#### `wilk chat [message]`

Send message to default agent or start conversation.

```bash
# Direct message
$ wilk chat "What's the weather like?"

# Interactive conversation
$ wilk chat
> Hello, how can I help you today?
```

### 2. Agent Management Commands

#### `wilk agent create <name>`

Create a new agent with interactive configuration.

```bash
$ wilk agent create research-assistant
Creating new agent 'research-assistant'...

Provider: [openai] anthropic, google, local
Model: [gpt-4] gpt-3.5-turbo, claude-3-sonnet, gemini-pro
Instructions: Research specialist focused on academic and technical topics
Tools: [web_search,file_ops] code_interpreter, rag_search
Memory: [enabled] disabled
Thinking display: [progressive] live, off

✅ Agent 'research-assistant' created (agent_abc123)
```

**Options:**

```bash
--provider <name>        # AI provider (openai, anthropic, google, local)
--model <name>           # Model name
--instructions <text>    # System instructions
--tools <list>           # Comma-separated tool list
--no-memory             # Disable memory for this agent
--thinking <mode>        # Thinking display mode (off, progressive, live)
--collaborative         # Allow others to edit
--template <name>        # Use agent template
--from-file <path>       # Create from YAML/JSON file
```

#### `wilk agent list`

List all available agents.

```bash
$ wilk agent list
┌─────────────────┬──────────────┬─────────────┬──────────────┬─────────────┐
│ Agent           │ Provider     │ Model       │ Tools        │ Status      │
├─────────────────┼──────────────┼─────────────┼──────────────┼─────────────┤
│ @research       │ openai       │ gpt-4       │ web, files   │ Ready       │
│ @code-analyzer  │ anthropic    │ claude-3.5  │ code, files  │ Ready       │
│ @docs-writer    │ openai       │ gpt-4       │ files, web   │ Ready       │
│ @security-audit │ anthropic    │ claude-3    │ code, shell  │ Installing  │
└─────────────────┴──────────────┴─────────────┴──────────────┴─────────────┘

Total: 4 agents (3 ready, 1 installing)
```

**Options:**

```bash
--filter <key=value>     # Filter agents (provider=openai, status=ready)
--sort <field>           # Sort by field (name, created, modified)
--format <table|json>    # Output format
--verbose                # Show detailed information
```

#### `wilk agent update <agent-id>`

Update agent configuration with versioning.

```bash
$ wilk agent update research-assistant --instructions "Updated research specialist"
Updating agent 'research-assistant'...

Current version: 1.2.0
Changes detected:
  - Instructions modified
  - Tools unchanged
  - Model parameters unchanged

Creating version 1.3.0...
✅ Agent updated to version 1.3.0
```

**Options:**

```bash
--instructions <text>    # Update system instructions
--model <name>           # Change model
--tools <list>           # Update tool list
--add-tools <list>       # Add tools to existing list
--remove-tools <list>    # Remove tools from list
--thinking <mode>        # Update thinking display mode
--force-version          # Force create new version even if no changes
--changelog <text>       # Add changelog entry
```

#### `wilk agent delete <agent-id>`

Delete an agent with confirmation.

```bash
$ wilk agent delete research-assistant
⚠️  This will permanently delete agent 'research-assistant'
   Conversations: 15
   Memory entries: 8
   Projects using: 2

Continue? [y/N]: y
✅ Agent 'research-assistant' deleted
```

#### `wilk agent versions <agent-id>`

View agent version history.

```bash
$ wilk agent versions research-assistant
Agent: research-assistant (agent_abc123)

┌─────────┬─────────────────────┬────────────┬─────────────────────────────┐
│ Version │ Created             │ Author     │ Changes                     │
├─────────┼─────────────────────┼────────────┼─────────────────────────────┤
│ 1.3.0   │ 2024-01-15 14:30:22 │ user123    │ Updated instructions        │
│ 1.2.0   │ 2024-01-10 09:15:45 │ user123    │ Added web_search tool       │
│ 1.1.0   │ 2024-01-08 16:20:10 │ user123    │ Model upgrade to gpt-4      │
│ 1.0.0   │ 2024-01-05 11:45:33 │ user123    │ Initial version             │
└─────────┴─────────────────────┴────────────┴─────────────────────────────┘
```

#### `wilk agent revert <agent-id> --version <version>`

Revert agent to a previous version.

```bash
$ wilk agent revert research-assistant --version 1.2.0
Reverting agent 'research-assistant' to version 1.2.0...

Changes:
  - Instructions: "Updated research specialist" → "Research specialist..."
  - Tools: unchanged
  - Model: unchanged

✅ Agent reverted to version 1.2.0 (new version 1.4.0 created)
```

### 3. Agent Execution Commands

#### `@<agent-name> <message>`

Execute specific agent with message.

```bash
$ @research-assistant "What are the latest developments in quantum computing?"

🤔 Agent thinking... (3.2s · ↑ 1.8k tokens)

● Task(Quantum Computing Research)
│     ⎿  Web Search("quantum computing 2024 developments")
│        Found 15 results (enter to expand)
│     ⎿  Analyzing latest papers...
│        ✓ 8 papers analyzed
│     ⎿  Synthesizing findings...
│        ✓ Research complete

🔬 Latest Quantum Computing Developments (2024)

Key breakthroughs this year include:

1. **IBM's 1000-qubit processor** - Achieved major milestone in December
2. **Google's quantum error correction** - Reduced error rates by 50%
3. **Microsoft's topological qubits** - New approach showing promise

[Detailed analysis continues...]

💭 Show agent reasoning? [y/N]:
```

#### Multi-agent execution

```bash
$ @research-assistant @security-audit "Analyze this new authentication protocol"

● Task(Multi-Agent Analysis)
│
├─ Agent(research-assistant)
│  ● Task(Protocol Research)
│  │     ⎿  Literature review...
│  │        Found 12 related papers (enter to expand)
│  │
├─ Agent(security-audit)
│  ● Task(Security Analysis)
│  │     ⎿  Threat modeling...
│  │        Identified 3 attack vectors (enter to expand)
│  │
● Task(Synthesis & Recommendations)
│     ⎿  Correlating findings...
│        ✓ Analysis complete

📋 Combined Analysis Results:
[Multi-agent synthesis...]
```

### 4. Memory Management Commands

#### `wilk memory`

Memory system management.

```bash
$ wilk memory
Current memory status:

Project Memory: ./WILK.md (847 tokens)
User Memory: ~/.wilk/memory/user.md (234 tokens)
Agent Memory: 3 agents with individual memory files

Quick actions:
  wilk memory list     - Show all memory entries
  wilk memory edit     - Edit project memory
  wilk memory search   - Search across memory
  #<content>          - Quick memory addition
```

#### `wilk memory list`

List all memory entries.

```bash
$ wilk memory list
Memory Overview:

📁 Project Memory (./WILK.md)
  - Project overview and goals
  - Architecture decisions
  - Team members and roles
  - Recent discussions (5 entries)

👤 User Memory (~/.wilk/memory/user.md)
  - Personal preferences
  - Frequently used commands
  - Custom aliases

🤖 Agent Memory:
  - @research-assistant: 8 learning entries
  - @code-analyzer: 12 behavioral patterns
  - @docs-writer: 3 style preferences

📄 Imported Files:
  - @README.md (last updated: 2 hours ago)
  - @package.json (last updated: 1 day ago)
  - @src/types.ts (last updated: 3 hours ago)
```

#### `wilk memory search <query>`

Search across all memory.

```bash
$ wilk memory search "authentication"
🔍 Searching memory for "authentication"...

Results (3 found):

📁 Project Memory (./WILK.md):
  Line 23: "Authentication system uses JWT tokens with..."
  Line 45: "OAuth integration planned for Q2..."

🤖 Agent Memory (@security-audit):
  Entry 2: "Authentication patterns observed in codebase analysis..."

📄 Imported (@src/auth.ts):
  Function: authenticateUser() - JWT validation logic
```

#### `wilk memory edit [type]`

Edit memory files with preferred editor.

```bash
$ wilk memory edit project
Opening ./WILK.md in VS Code...

$ wilk memory edit user
Opening ~/.wilk/memory/user.md in VS Code...

$ wilk memory edit agent @research-assistant
Opening ~/.wilk/agents/agent_abc123/memory.md in VS Code...
```

#### `#<content>` (Quick Memory Addition)

Shortcut for adding content to memory.

```bash
$ #Remember: Use camelCase for all new TypeScript interfaces
Where should this be saved?
  1. Project memory (./WILK.md)
  2. User memory (~/.wilk/memory/user.md)
  3. New file...

Choice [1]: 1
✅ Added to project memory under "Development Guidelines"
```

### 5. Session Management Commands

#### `wilk sessions`

List and manage conversation sessions.

```bash
$ wilk sessions
Recent Sessions:

┌──────────────┬─────────────────────┬───────────┬──────────────┬─────────────┐
│ Session ID   │ Started             │ Messages  │ Agents       │ Status      │
├──────────────┼─────────────────────┼───────────┼──────────────┼─────────────┤
│ sess_abc123  │ 2024-01-15 14:30    │ 23        │ research     │ Active      │
│ sess_def456  │ 2024-01-15 12:15    │ 45        │ code,docs    │ Paused      │
│ sess_ghi789  │ 2024-01-14 16:20    │ 12        │ security     │ Completed   │
└──────────────┴─────────────────────┴───────────┴──────────────┴─────────────┘

Current session: sess_abc123 (23 messages, 1 agent)
```

#### `wilk session resume <session-id>`

Resume a previous session with full context.

```bash
$ wilk session resume sess_def456
Resuming session sess_def456...

📋 Loading context:
  - 45 messages (12.3k tokens)
  - 2 agents: @code-analyzer, @docs-writer
  - Memory context: 5 entries
  - Tool executions: 8 completed

Last message (2024-01-15 12:45):
User: "Can you review the authentication module?"
@code-analyzer: "I've identified several areas for improvement..."

✅ Session resumed - continuing conversation
```

#### `wilk session save [name]`

Save current session with optional name.

```bash
$ wilk session save "auth-module-review"
Saving current session...

Session saved:
  ID: sess_abc123
  Name: "auth-module-review"
  Messages: 23
  Agents: @research-assistant
  Memory: 3 entries
  Duration: 2h 15m

💾 Session saved and can be resumed with:
   wilk session resume sess_abc123
```

#### `wilk session export <session-id>`

Export session to file.

```bash
$ wilk session export sess_abc123 --format json
Exporting session sess_abc123...

Exported to: wilk-session-abc123.json
  Messages: 23
  Agent configs: 1
  Memory context: included
  Thinking content: included
  File size: 45.2 KB

🔄 Import with: wilk session import wilk-session-abc123.json
```

### 6. Thinking Management Commands

#### `wilk thinking`

Thinking system management.

```bash
$ wilk thinking
Agent Thinking Configuration:

Global Settings:
  show_by_default: false
  live_display: false
  progressive_disclosure: true
  export_thinking: true

Per-Agent Settings:
  @research-assistant: progressive disclosure
  @code-analyzer: live display
  @docs-writer: show by default

Recent Thinking Sessions:
  - sess_abc123: 3.2k thinking tokens, 5 reasoning chains
  - sess_def456: 1.8k thinking tokens, 8 reasoning chains
```

#### `wilk thinking show [session-id|last]`

Display thinking content from session.

```bash
$ wilk thinking show last
Last Agent Thinking (sess_abc123, @research-assistant):

┌─ Agent Reasoning ───────────────────────────────────────────────────────────────┐
│ I need to research quantum computing developments by:                           │
│                                                                                  │
│ 1. Searching for recent papers and announcements                               │
│    - Focus on 2024 breakthroughs                                              │
│    - Look for major tech companies (IBM, Google, Microsoft)                   │
│                                                                                  │
│ 2. Analyzing the technical significance                                         │
│    - Quantum error correction improvements                                      │
│    - Qubit count milestones                                                    │
│    - Practical applications                                                     │
│                                                                                  │
│ 3. Synthesizing findings into accessible explanation                           │
│    - Explain technical concepts clearly                                        │
│    - Highlight practical implications                                          │
│    - Provide future outlook                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

Thinking tokens: 1,847
Reasoning duration: 3.2 seconds
Model: gpt-4
```

#### `wilk thinking export <session-id>`

Export thinking content to file.

```bash
$ wilk thinking export sess_abc123
Exporting thinking content from session sess_abc123...

Exported:
  - Agent reasoning chains: 5
  - Total thinking tokens: 3,247
  - File: thinking-export-sess_abc123.md
  - Format: Markdown with metadata

📄 Thinking content saved to: thinking-export-sess_abc123.md
```

#### `wilk thinking replay <session-id>`

Replay session with thinking display.

```bash
$ wilk thinking replay sess_abc123
Replaying session sess_abc123 with thinking...

Message 1: "What are the latest developments in quantum computing?"

🤔 Agent thinking... (replaying 3.2s)
[Shows original thinking content with timing]

● Task(Quantum Computing Research)
[Replays entire task execution with thinking]
```

### 7. Configuration Commands

#### `wilk config`

Show current configuration.

```bash
$ wilk config
Wilk Configuration:

Global Settings:
  default_provider: openai
  default_model: gpt-4
  max_context_tokens: 4096
  context_strategy: discard

Agent Settings:
  thinking_display: progressive
  memory_integration: true
  auto_save_sessions: true

CLI Settings:
  editor: code
  pager: less
  output_format: table
  colored_output: true

Paths:
  config_dir: ~/.wilk
  memory_dir: ~/.wilk/memory
  agents_dir: ~/.wilk/agents
  sessions_dir: ~/.wilk/sessions
```

#### `wilk config set <key> <value>`

Set configuration value.

```bash
$ wilk config set thinking.show_by_default true
✅ Set thinking.show_by_default = true

$ wilk config set default_model claude-3-sonnet
✅ Set default_model = claude-3-sonnet

$ wilk config set agent.@research.thinking live
✅ Set agent thinking mode for @research = live
```

#### `wilk config get <key>`

Get specific configuration value.

```bash
$ wilk config get thinking.show_by_default
thinking.show_by_default = false

$ wilk config get agent.@research.model
agent.@research.model = gpt-4
```

### 8. Tool and MCP Commands

#### `wilk tools`

List available tools.

```bash
$ wilk tools
Available Tools:

Built-in Tools:
  ✅ file_operations    - Read, write, and manage files
  ✅ shell_executor     - Execute shell commands safely
  ✅ web_search        - Search the web for information
  ✅ rag_search        - Search project documentation
  ✅ code_interpreter  - Execute Python/JavaScript code

MCP Tools:
  ✅ filesystem        - Enhanced file operations
  ✅ github            - GitHub repository integration
  ⚠️  database         - Database query tool (needs config)
  ❌ slack             - Slack integration (not installed)

Total: 8 tools (6 ready, 1 needs config, 1 not installed)
```

#### `wilk mcp`

MCP server management.

```bash
$ wilk mcp
Model Context Protocol (MCP) Status:

Active Servers:
  ✅ filesystem       - Local file operations
  ✅ github          - GitHub API integration
  ⚠️  database        - PostgreSQL connector (config needed)

Available Servers:
  📦 slack           - Slack workspace integration
  📦 notion          - Notion API connector
  📦 calendar        - Google Calendar integration

Install with: wilk mcp add <server-name>
```

#### `wilk mcp add <server>`

Install MCP server.

```bash
$ wilk mcp add slack
Installing MCP server: slack...

📦 Installing @modelcontextprotocol/server-slack
🔧 Configuring server...

Configuration needed:
  SLACK_BOT_TOKEN: Bot token for workspace access
  SLACK_SIGNING_SECRET: Signing secret for verification

Set with: wilk mcp env slack SLACK_BOT_TOKEN your_token_here

✅ MCP server 'slack' installed (configuration required)
```

### 9. Installation and Package Management

#### `wilk install <package>`

Install agents, tools, or MCP servers.

```bash
$ wilk install @community/typescript-expert
Installing agent package: @community/typescript-expert...

📦 Downloading from registry...
🔍 Validating package integrity...
📋 Checking dependencies:
  - Tools: code_interpreter, file_operations ✅
  - Models: Compatible with gpt-4, claude-3 ✅

Installing:
  Agent: typescript-expert
  Templates: 3 conversation starters
  Memory: TypeScript best practices
  Tools: Custom TypeScript analysis tools

✅ Agent @typescript-expert installed and ready
```

#### `wilk search <query>`

Search for agents, tools, or packages.

```bash
$ wilk search typescript
🔍 Searching for "typescript"...

Agents (3 found):
  @community/typescript-expert    - Advanced TypeScript development
  @tools/ts-analyzer             - TypeScript code analysis
  @edu/typescript-tutor          - TypeScript learning assistant

Tools (2 found):
  typescript-compiler            - Compile and validate TypeScript
  ts-ast-analyzer               - Abstract syntax tree analysis

MCP Servers (1 found):
  typescript-language-server     - TypeScript language server integration
```

### 10. System Commands

#### `wilk status`

System status and health check.

```bash
$ wilk status
Wilk System Status:

🟢 Core System:
  Database: SQLite (healthy, 45.2 MB)
  Memory: 89.3 MB used, 3.2 GB available
  Agents: 4 loaded, 4 ready
  Sessions: 1 active, 15 total

🟢 Providers:
  OpenAI: Connected (quota: 85% remaining)
  Anthropic: Connected (quota: 92% remaining)
  Google: Not configured
  Local: Ollama running (3 models loaded)

🟢 Tools:
  Built-in: 5/5 ready
  MCP: 3/4 ready (1 needs config)

🟡 Warnings:
  - Database backup overdue (last: 3 days ago)
  - Memory cleanup recommended

Overall: Healthy ✅
```

#### `wilk update`

Update Wilk and components.

```bash
$ wilk update
Checking for updates...

Updates available:
  🔄 Wilk CLI: 1.2.3 → 1.3.0
  🔄 Agent @research: 2.1.0 → 2.2.0
  🔄 MCP server github: 1.0.5 → 1.1.0

Download size: 15.2 MB

Update all? [Y/n]: y

Updating...
✅ Wilk CLI updated to 1.3.0
✅ Agent @research updated to 2.2.0
✅ MCP server github updated to 1.1.0

🎉 All updates complete! Restart recommended.
```

#### `wilk doctor`

Diagnose and fix common issues.

```bash
$ wilk doctor
🩺 Running diagnostics...

✅ Configuration files: Valid
✅ Database integrity: OK
✅ Agent definitions: Valid (4 agents)
✅ Memory files: Accessible
✅ Provider connections: Online
⚠️  Tool permissions: Some tools need elevated access
❌ MCP server 'database': Configuration incomplete

Issues found: 2

🔧 Auto-fix available issues? [Y/n]: y

Fixing issues...
✅ Updated tool permissions
⚠️  MCP server 'database' requires manual configuration
    Run: wilk mcp config database

Diagnostics complete. 1 manual action required.
```

## Advanced Usage Patterns

### Chaining Commands

```bash
# Create agent and immediately test
$ wilk agent create test-agent --model gpt-3.5-turbo && @test-agent "Hello"

# Export session and thinking together
$ wilk session export sess_abc123 --with-thinking && wilk thinking export sess_abc123

# Batch update multiple agents
$ wilk agent list --filter provider=openai | xargs -I {} wilk agent update {} --model gpt-4
```

### Using Pipes and Filters

```bash
# Search and install multiple packages
$ wilk search security | grep agent | head -3 | xargs -I {} wilk install {}

# Export multiple sessions
$ wilk sessions --status completed | jq -r '.id' | xargs -I {} wilk session export {}

# Find agents using specific tools
$ wilk agent list --format json | jq '.[] | select(.tools[] | contains("code_interpreter"))'
```

### Configuration Profiles

```bash
# Switch to development profile
$ wilk --profile dev config set thinking.show_by_default true

# Production profile with restricted thinking
$ wilk --profile prod config set thinking.show_by_default false
$ wilk --profile prod config set agent.*.thinking off
```

This comprehensive command reference provides detailed documentation for all Wilk CLI commands, following LibreChat patterns while adding CLI-specific optimizations and the new thinking transparency features.

