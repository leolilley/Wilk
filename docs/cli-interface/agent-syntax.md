# Wilk Agent Syntax Guide

## Overview

Wilk provides a rich, intuitive syntax for interacting with agents, building on LibreChat's conversation patterns while adding CLI-specific enhancements. The syntax supports single agents, multi-agent coordination, memory integration, and transparent thinking display.

## Basic Agent Syntax

### Single Agent Invocation

The fundamental pattern for agent interaction:

```bash
@<agent-name> <message>
```

**Examples:**

```bash
# Basic agent interaction
$ @research "What is quantum computing?"

# Agent with specific task
$ @code-analyzer "Review this authentication function"

# Agent with file reference
$ @docs-writer "Document the API endpoints in @README.md"
```

### Agent Name Resolution

Agents can be referenced by:

- **Full name**: `@research-assistant`
- **Short name**: `@research` (if unique)
- **Agent ID**: `@agent_abc123` (for disambiguation)
- **Alias**: `@r` (if configured)

```bash
# These are equivalent (assuming unique matches)
$ @research-assistant "analyze the market trends"
$ @research "analyze the market trends"
$ @agent_abc123 "analyze the market trends"
$ @r "analyze the market trends"  # if alias configured
```

## Multi-Agent Coordination

### Sequential Agent Execution

Multiple agents process the same prompt in sequence, with each agent's output informing the next:

```bash
@<agent1> @<agent2> @<agent3> <message>
```

**Example:**

```bash
$ @research @analysis @writer "Create a comprehensive report on AI safety"

● Task(Multi-Agent Report Creation)
│
├─ Agent(research)
│  ● Task(Information Gathering)
│  │     ⎿  Web Search("AI safety 2024")
│  │        Found 25 papers (enter to expand)
│  │     ⎿  Synthesizing research...
│  │        ✓ Research complete
│  │
├─ Agent(analysis)
│  ● Task(Data Analysis)
│  │     ⎿  Analyzing research findings...
│  │        🧠 Agent thinking... (2.1s · ↑ 1.5k tokens)
│  │        ✓ Analysis complete
│  │
├─ Agent(writer)
│  ● Task(Report Generation)
│  │     ⎿  Structuring report...
│  │        ✓ Report created (2,847 words)
│
✓ Multi-agent execution complete (45.2s)
```

### Agent Coordination Patterns

#### Parallel Consultation

Different agents analyze different aspects:

```bash
$ @security @performance @maintainability "Review this codebase"

● Task(Multi-Perspective Code Review)
│
├─ Agent(security) → Security analysis
├─ Agent(performance) → Performance bottlenecks
├─ Agent(maintainability) → Code quality assessment
│
● Task(Synthesis)
│     ⎿  Correlating findings...
│        ✓ Combined recommendations ready
```

#### Specialist Chain

Agents with complementary expertise:

```bash
$ @researcher @domain-expert @implementation "Design a new authentication system"

Flow: Research → Expert Analysis → Implementation Plan
```

#### Validation Chain

Multiple agents validate each other's work:

```bash
$ @coder @reviewer @tester "Implement user registration feature"

Flow: Code → Review → Test Strategy
```

## Memory Integration Syntax

### Project Memory References

Use `@` syntax to reference files and memory:

```bash
# Reference project memory
$ @research "Based on @WILK.md, what are our current priorities?"

# Reference specific files
$ @code-analyzer "Review @src/auth.ts for security issues"

# Multiple file references
$ @docs "Update @README.md based on changes in @package.json and @CHANGELOG.md"
```

### Memory Context Expansion

```bash
# Explicit memory loading
$ @research --with-memory "What did we discuss about the API design?"

# Memory search integration
$ @assistant --search-memory "authentication" "What patterns have we used before?"

# Cross-project memory
$ @consultant --global-memory "How did we solve this in other projects?"
```

### Quick Memory Addition

The `#` syntax adds content to memory during conversation:

```bash
$ #Remember: Always validate input parameters in API endpoints
Where should this be saved?
  1. Project memory (./WILK.md)
  2. Agent memory (@code-analyzer)
  3. User memory (~/.wilk/memory/user.md)

Choice [1]: 2
✅ Added to @code-analyzer memory
```

## Thinking Display Integration

### Progressive Disclosure (Default)

Agent thinking is available on demand:

```bash
$ @research "Analyze the competitive landscape"

🤔 Agent thinking... (4.3s · ↑ 2.1k tokens)

📊 Competitive Analysis Complete

The market shows three main competitors:
1. OpenAI with ChatGPT and API offerings
2. Anthropic with Claude and safety focus
3. Google with Bard and cloud integration

💭 Show agent reasoning? [y/N]: y

┌─ Agent Reasoning ───────────────────────────────────────────────────────────────┐
│ I need to analyze the competitive landscape systematically:                     │
│                                                                                  │
│ 1. Identify key players in the AI/LLM space                                    │
│    - Major tech companies (OpenAI, Google, Microsoft)                         │
│    - AI-focused startups (Anthropic, Cohere, Replicate)                       │
│    - Open source initiatives                                                    │
│                                                                                  │
│ 2. Analyze competitive positioning                                              │
│    - Product offerings and capabilities                                        │
│    - Target markets and use cases                                              │
│    - Pricing strategies                                                        │
│                                                                                  │
│ 3. Assess competitive advantages                                                │
│    - Technical capabilities                                                     │
│    - Market positioning                                                        │
│    - Partnership ecosystem                                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Live Thinking Display

Real-time thinking stream:

```bash
$ @research --thinking-live "Complex analysis of market trends"

● Task(Market Trend Analysis)
│     ⎿  Loading research tools...
│        ✓ Tools ready
│     ⎿  Agent analyzing request...
│        ╭─ Live Agent Reasoning ─────────────────────────────────────╮
│        │ 🧠 Breaking down this analysis request...                │
│        │ 🧠 I need to gather current market data...               │
│        │ 🧠 Looking for trend indicators...                       │
│        │ 🧠 Will synthesize findings into actionable insights...  │
│        ╰─────────────────────────────────────────────────────────────╯
│        ✓ Analysis strategy complete
│     ⎿  Executing analysis plan...
│        [Real-time progress continues...]
```

### Thinking Summary Mode

Condensed thinking display:

```bash
$ @code-analyzer --thinking-summary "Review this function"

● Task(Function Review)
│     ⎿  Reading code...
│        ✓ Read 45 lines
│     ⎿  Agent analysis...
│        🧠 Reasoning: structure → logic → edge cases → security → performance
│        ✓ Review complete

🔍 Function Review Results:
[Analysis results...]
```

## Advanced Syntax Features

### Conditional Agent Execution

Execute agents based on conditions:

```bash
# Execute only if files exist
$ @code-analyzer "Review authentication" --if-exists @src/auth.ts

# Execute based on project type
$ @typescript-expert "Optimize types" --if-project-type typescript

# Execute with fallback
$ @specialist "Domain analysis" --fallback @generalist
```

### Agent Configuration Override

Temporarily override agent settings:

```bash
# Override model for single execution
$ @research --model claude-3-opus "Deep analysis needed"

# Override thinking display
$ @assistant --no-thinking "Quick question"
$ @assistant --show-thinking "Complex problem"

# Override context strategy
$ @analyst --context summarize "Long conversation analysis"

# Override tool access
$ @agent --tools web_search,file_ops "Research with file access"
```

### Session and Context Control

Control conversation context and session management:

```bash
# Start new session
$ @agent --new-session "Fresh conversation start"

# Continue specific session
$ @agent --session sess_abc123 "Continue our previous discussion"

# Limit context window
$ @agent --max-context 2048 "Short context response"

# Force context summarization
$ @agent --summarize-context "Build on our long conversation"
```

### Output Format Control

Specify output format and structure:

```bash
# Structured output
$ @analyst --format json "Provide data in JSON format"
$ @reporter --format markdown "Generate markdown report"
$ @coder --format code-only "Just give me the code"

# Template-based output
$ @assistant --template meeting-notes "Summarize this meeting"
$ @writer --template blog-post "Write about quantum computing"

# Length control
$ @explainer --length brief "Quick explanation of REST APIs"
$ @researcher --length detailed "Comprehensive analysis needed"
```

## Tool Integration Syntax

### Explicit Tool Requests

Request specific tool usage:

```bash
# Request web search
$ @research --use web_search "Latest AI developments"

# Request file operations
$ @assistant --use file_ops "Create project structure"

# Request code execution
$ @developer --use code_interpreter "Test this algorithm"

# Multiple tools
$ @analyst --use web_search,rag_search "Research competitors"
```

### Tool Constraints

Limit or control tool usage:

```bash
# Restrict tools
$ @agent --no-tools "Respond without using any tools"
$ @agent --tools-only file_ops "Only use file operations"

# Safe execution mode
$ @agent --safe-mode "Analysis with read-only tools"

# Approval required
$ @agent --confirm-tools "Ask before executing tools"
```

## Error Handling and Fallbacks

### Agent Availability Handling

```bash
# Graceful degradation
$ @preferred-agent "Task" --fallback @backup-agent

# Agent discovery
$ @*typescript* "TypeScript help"  # Matches any agent with "typescript"

# Capability-based selection
$ @{web_search,code_interpreter} "Research and implement solution"
```

### Error Recovery

```bash
# Retry with different agent
$ @agent "Task" --retry-with @backup-agent --if-error

# Simplified fallback
$ @complex-agent "Advanced task" --simple-fallback

# Error context preservation
$ @agent "Task" --preserve-context-on-error
```

## Multi-Modal Syntax

### File and Image Processing

```bash
# Image analysis
$ @vision "Analyze this screenshot" --image screenshot.png

# Document processing
$ @analyzer "Summarize" --file report.pdf

# Multiple files
$ @reviewer "Compare these implementations" --files @src/v1.ts @src/v2.ts

# Code analysis with context
$ @security "Audit this endpoint" --code @api/auth.js --context @docs/security.md
```

### Interactive Elements

```bash
# Multi-choice integration
$ @advisor "What should I focus on next?"
┌─ Suggestions ─────────────────────────────────────────────┐
│  1. 💬 Custom prompt                                      │
│  2. 🚀 Continue with feature implementation              │
│  3. 🔍 Review code quality metrics                       │
│  4. 📚 Update documentation                              │
│  5. 🧪 Add more test coverage                            │
└────────────────────────────────────────────────────────────┘

# Conversation starters
$ @agent --starters  # Show conversation starter options

# Interactive configuration
$ @agent --configure  # Interactive agent configuration
```

## Syntax Shortcuts and Aliases

### Command Aliases

```bash
# Short agent names
alias r="@research"
alias c="@code-analyzer"
alias w="@writer"

# Usage
$ r "Market analysis"
$ c @src/auth.ts
$ w --template report "Weekly update"
```

### Predefined Patterns

```bash
# Quick review pattern
$ review @src/component.tsx  # Expands to @code-analyzer --template review

# Research pattern
$ research "topic" --depth detailed  # Expands to @research --use web_search --format detailed

# Debug pattern
$ debug @logs/error.log  # Expands to @debugger --analyze-logs --suggest-fixes
```

### Macro Expansion

```bash
# Define reusable patterns
$ wilk alias create security-audit "@security @code-analyzer --tools code_interpreter,file_ops --thinking-live"

# Usage
$ security-audit "Review authentication module"
```

## Context-Aware Syntax

### Project Context Detection

```bash
# Automatic project context
$ @assistant "Help with the build process"
# Automatically includes @package.json, @README.md context

# Framework-specific agents
$ @react "Add authentication"  # In React project
$ @vue "Add authentication"    # In Vue project (auto-detected)
```

### Conversation Context

```bash
# Refer to previous interactions
$ @agent "Continue from where we left off"

# Reference specific messages
$ @agent "Expand on your previous suggestion about caching"

# Build on multi-agent discussions
$ @agent "Synthesize the findings from @research and @analysis"
```

## Advanced Coordination Patterns

### Conditional Chains

```bash
# Execute second agent only if first succeeds
$ @analyzer "Check code quality" && @fixer "Fix issues found"

# Execute fallback if first fails
$ @specialist "Advanced analysis" || @generalist "Basic analysis"

# Pipeline with validation
$ @researcher "Gather data" | @validator "Verify accuracy" | @presenter "Create summary"
```

### Parallel Execution with Synthesis

```bash
# Parallel analysis with synthesis
$ (@security + @performance + @usability) "Review application" | @synthesizer "Combine findings"

# Competitive execution (first to complete)
$ (@fast-agent ? @thorough-agent) "Get quick or detailed analysis"
```

This agent syntax provides a powerful, flexible way to interact with Wilk's agent system, supporting everything from simple queries to complex multi-agent workflows with full thinking transparency and context awareness.

