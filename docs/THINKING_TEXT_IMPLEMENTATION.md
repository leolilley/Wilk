# Wilk CLI Agent Thinking Text Implementation

## Overview

Wilk CLI will support native LLM "thinking" text that is built into models like Claude 3.5 Sonnet, OpenAI o1, and Gemini Pro. This is **model-native behavior** - the thinking happens regardless of interface. However, Wilk exposes this through **agents** that wrap and enhance the raw models with additional capabilities.

**Important Distinction**:

- **Agent Thinking** (this doc): Native reasoning from underlying LLMs exposed through Wilk agents
- **Task Execution Display** (separate doc): Agent actions, tool usage, workflow visualization

Both systems work together to provide complete transparency into agent operations, where agents orchestrate both model thinking and task execution.

## LibreChat Thinking Architecture Analysis

### Data Structure (Directly Reusable)

**Content Types** (from LibreChat `/packages/data-provider/src/types/runs.ts`):

```typescript
enum ContentTypes {
  TEXT = 'text',
  THINK = 'think',     // Thinking content type
  TOOL_CALL = 'tool_call',
  IMAGE_FILE = 'image_file',
}

type TMessageContentParts =
  | { type: ContentTypes.TEXT; text: string | (Text & PartMetadata) }
  | { type: ContentTypes.THINK; think: string | (Text & PartMetadata) }
  | { type: ContentTypes.TOOL_CALL; tool_call: ... }
```

**Message Storage** (adaptable to SQLite):

- Thinking text stored in `content` field as mixed-type array
- Each content part has `type` field indicating `ContentTypes.THINK`
- Main response stored separately, cleaned of thinking markers
- Raw thinking content preserved for replay

### Provider Implementation (95% Reusable)

**Anthropic Client** (from `/api/app/clients/AnthropicClient.js`):

```javascript
class SplitStreamHandler extends _Handler {
  getDeltaContent(chunk) {
    return (chunk?.delta?.text ?? chunk?.completion) || '';
  }
  getReasoningDelta(chunk) {
    return chunk?.delta?.thinking || ''; // Thinking extraction
  }
}

// Configuration for thinking
function configureReasoning(anthropicInput, extendedOptions = {}) {
  if (extendedOptions.thinking && /claude-3[-.]7/.test(model)) {
    updatedOptions.thinking = {
      type: 'enabled',
      budget_tokens: extendedOptions.thinkingBudget,
    };
  }
}
```

**Supported Providers**:

- **Anthropic**: Claude 3.7, Claude 3.5 Sonnet, Claude 4+ series
- **Google**: Gemini 2.5 series (Pro, Flash, Flash Lite)
- **OpenAI**: o1 series (different reasoning approach)

## CLI Agent Thinking Design

### Integration with Task Execution Display

**Combined View** - Both task execution AND agent thinking:

```bash
$ wilk @research-agent "analyze the market trends for electric vehicles"

● Task(Market Trend Analysis)
│     ⎿  Gathering data sources...
│        Found 47 sources (enter to expand)
│     ⎿  Analyzing with model...
│        🤔 Agent thinking... (5.2s · ↑ 1.2k tokens)
│        Analysis complete
│     ⎿  Generating report...
│        ✓ Report created (2.1s)

📊 Market Analysis Complete

The electric vehicle market shows strong growth with Tesla leading...
[Response continues...]

💭 Show reasoning? [y/N/s(ave)]: y
```

### Option 1: Progressive Disclosure (Recommended)

**Agent thinking shown on demand**:

```bash
💭 Show reasoning? [y/N/s(ave)]: y
```

**When user chooses to see reasoning**:

```bash
┌─ Agent Reasoning ───────────────────────────────────────────────────────────────┐
│ I need to analyze several aspects of the EV market:                             │
│                                                                                  │
│ 1. Current market size and growth rates                                         │
│    - Global EV sales have grown 55% year-over-year                             │
│    - Market now represents 14% of total auto sales                             │
│                                                                                  │
│ 2. Key players and market share                                                 │
│    - Tesla: 20% global market share                                            │
│    - BYD: 16% market share, growing rapidly                                     │
│    - Traditional automakers catching up                                        │
│                                                                                  │
│ 3. Regional differences                                                         │
│    - China: 35% EV adoption                                                    │
│    - Europe: 25% EV adoption                                                   │
│    - US: 8% EV adoption                                                        │
│                                                                                  │
│ Based on this data, I should highlight growth trends, competition, and         │
│ regional adoption patterns in my response.                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

📊 Market Analysis Complete

The electric vehicle market shows strong growth with Tesla leading...
```

### Option 2: Real-time Thinking Stream

**Live thinking display** (integrated with task execution):

```bash
$ wilk --show-thinking @research-agent "complex analysis request"

● Task(Complex Analysis)
│     ⎿  Loading research tools...
│        ✓ Tools ready
│     ⎿  Agent analyzing request...
│        ╭─ Live Agent Reasoning ───────────────────────────────────╮
│        │ 🧠 Breaking down this analysis request...               │
│        │ 🧠 I need to consider multiple data sources...          │
│        │ 🧠 Let me start with the primary market indicators...   │
│        │ 🧠 Now I'll cross-reference with historical trends...   │
│        ╰─────────────────────────────────────────────────────────╯
│        Analysis strategy complete
│     ⎿  Executing analysis plan...
│        ✓ Analysis complete

📊 Analysis Results:
The data shows...
```

### Option 3: Thinking Summary Mode

**Condensed thinking** integrated with task results:

```bash
$ wilk --thinking-summary @code-analyzer "review this function"

● Task(Code Analysis)
│     ⎿  Reading function code...
│        ✓ Read 45 lines
│     ⎿  Agent analysis...
│        🧠 Reasoning: data flow → edge cases → optimization → security
│        ✓ Analysis complete

🔍 Code Analysis Results

The function has 3 potential issues:
1. Missing null check on line 15
2. Inefficient loop on lines 23-27
3. Memory leak in cleanup function

💭 View detailed agent reasoning? [y/N]:
```

## Implementation Architecture

### 1. Message Content Structure

```typescript
// Port from LibreChat's content types
interface WilkMessageContent {
  type: 'text' | 'think' | 'tool_call' | 'file';
  content: string;
  metadata?: {
    tokens?: number;
    duration?: number;
    model?: string;
  };
}

interface WilkMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: WilkMessageContent[]; // Array of content parts
  timestamp: Date;
  agent_id?: string;
  thinking_tokens?: number; // Token count for thinking
  response_tokens?: number; // Token count for response
}
```

### 2. Stream Handling (Adapt LibreChat's SplitStreamHandler)

```typescript
class WilkStreamHandler {
  private thinkingBuffer: string = '';
  private responseBuffer: string = '';
  private isThinking: boolean = false;

  constructor(
    private options: {
      showLiveThinking?: boolean;
      thinkingCallback?: (text: string) => void;
      responseCallback?: (text: string) => void;
    },
  ) {}

  handleDelta(chunk: any) {
    // Port LibreChat's thinking detection logic
    const thinkingDelta = this.extractThinkingDelta(chunk);
    const responseDelta = this.extractResponseDelta(chunk);

    if (thinkingDelta) {
      this.thinkingBuffer += thinkingDelta;
      if (this.options.showLiveThinking) {
        this.options.thinkingCallback?.(thinkingDelta);
      }
    }

    if (responseDelta) {
      this.responseBuffer += responseDelta;
      this.options.responseCallback?.(responseDelta);
    }
  }

  getContentParts(): WilkMessageContent[] {
    const parts: WilkMessageContent[] = [];

    if (this.thinkingBuffer.trim()) {
      parts.push({
        type: 'think',
        content: this.thinkingBuffer.trim(),
        metadata: { tokens: this.countTokens(this.thinkingBuffer) },
      });
    }

    if (this.responseBuffer.trim()) {
      parts.push({
        type: 'text',
        content: this.responseBuffer.trim(),
        metadata: { tokens: this.countTokens(this.responseBuffer) },
      });
    }

    return parts;
  }
}
```

### 3. CLI Display Components

```typescript
class ThinkingDisplay {
  private currentThinking: string = '';
  private isVisible: boolean = false;

  /**
   * Show thinking in real-time during generation
   */
  showLiveThinking(delta: string) {
    if (!this.isVisible) {
      console.log('\n╭─ Live Reasoning ─────────────────────────────────────╮');
      this.isVisible = true;
    }

    this.currentThinking += delta;
    // Update current line with thinking text
    this.updateThinkingLine(this.currentThinking);
  }

  /**
   * Show completed thinking with option to expand
   */
  showCompletedThinking(
    thinkingText: string,
    options: {
      autoShow?: boolean;
      interactive?: boolean;
    } = {},
  ) {
    if (options.autoShow) {
      this.renderThinkingBox(thinkingText);
      return;
    }

    if (options.interactive) {
      const choice = this.promptForThinkingDisplay();
      if (choice === 'y' || choice === 'yes') {
        this.renderThinkingBox(thinkingText);
      } else if (choice === 's' || choice === 'save') {
        this.saveThinkingToFile(thinkingText);
      }
    }
  }

  private renderThinkingBox(text: string) {
    const lines = this.wrapText(text, 80);
    console.log(
      '\n┌─ Agent Reasoning ─────────────────────────────────────────────────────────────┐',
    );
    lines.forEach((line) => {
      console.log(`│ ${line.padEnd(79)} │`);
    });
    console.log(
      '└───────────────────────────────────────────────────────────────────────────────┘\n',
    );
  }

  private promptForThinkingDisplay(): string {
    // Use readline for interactive prompt
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      readline.question('💭 Show reasoning? [y/N/s(ave)]: ', (answer) => {
        readline.close();
        resolve(answer.toLowerCase());
      });
    });
  }
}
```

### 4. Configuration Management

```typescript
interface ThinkingConfig {
  // Display options
  show_by_default: boolean; // Show thinking without prompting
  live_display: boolean; // Show thinking during generation
  summary_mode: boolean; // Show condensed thinking

  // Provider settings
  anthropic_thinking_budget: number; // Token budget for Claude
  google_thinking_budget: number; // Token budget for Gemini

  // Storage options
  save_thinking: boolean; // Save thinking to conversation
  thinking_log_file?: string; // Optional thinking log file

  // CLI-specific
  thinking_width: number; // Box width for thinking display
  interactive_prompt: boolean; // Prompt to show thinking
}

// Default config
const defaultThinkingConfig: ThinkingConfig = {
  show_by_default: false,
  live_display: false,
  summary_mode: false,
  anthropic_thinking_budget: 2000,
  google_thinking_budget: -1, // Auto-decide
  save_thinking: true,
  thinking_width: 80,
  interactive_prompt: true,
};
```

### 5. CLI Commands and Options

```bash
# Global thinking configuration
wilk config set thinking.show_by_default true
wilk config set thinking.live_display false
wilk config set thinking.budget 5000

# Per-conversation thinking control
wilk chat --show-thinking "complex question"
wilk chat --thinking-summary "quick analysis"
wilk chat --no-thinking "simple question"

# Thinking management commands
wilk thinking show last                    # Show last thinking
wilk thinking export conversation-123      # Export thinking to file
wilk thinking replay conversation-123      # Replay with thinking
```

### 6. Storage Schema (SQLite)

```sql
-- Extend message table for thinking
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content JSON NOT NULL,              -- Array of content parts
  thinking_tokens INTEGER DEFAULT 0,
  response_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  agent_id TEXT,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Index for thinking content searches
CREATE INDEX idx_messages_thinking ON messages(
  json_extract(content, '$[*].type')
) WHERE json_extract(content, '$[*].type') = 'think';
```

## Implementation Steps

### Phase 1: Core Thinking Infrastructure (Week 2)

1. **Port LibreChat's content types** to Wilk TypeScript definitions
2. **Implement WilkStreamHandler** with thinking/response separation
3. **Create basic ThinkingDisplay** component for CLI
4. **Add thinking configuration** management

### Phase 2: Provider Integration (Week 3)

1. **Adapt Anthropic client** thinking support from LibreChat
2. **Port Google/Gemini** thinking configuration
3. **Add OpenAI o1** reasoning support
4. **Implement thinking token budgets** and validation

### Phase 3: CLI Integration (Week 4)

1. **Integrate with multi-choice system** (thinking affects choice generation)
2. **Add interactive thinking prompts** with arrow key navigation
3. **Implement thinking export/replay** functionality
4. **Add thinking search** across conversations

### Phase 4: Advanced Features (Week 5-6)

1. **Live thinking streaming** with progress indicators
2. **Thinking summaries** and condensed modes
3. **Thinking analytics** (token usage, reasoning patterns)
4. **Integration with memory system** (save insights to memory)

## CLI User Experience Examples

### Basic Usage

```bash
$ wilk "What's the best approach for scaling our database?"
🤔 Thinking... (8.3s · ↑ 2.1k tokens)

For scaling your database, I recommend a multi-tier approach...

💭 Show reasoning? [y/N]: y
[Shows detailed thinking box with analysis steps]
```

### Verbose Mode

```bash
$ wilk --thinking-live "complex architecture question"
╭─ Live Reasoning ─────────────────────────────────────────────────────────────╮
│ 🧠 Analyzing the architecture requirements...                               │
│ 🧠 Considering scalability constraints...                                   │
│ 🧠 Evaluating different patterns...                                         │
╰─────────────────────────────────────────────────────────────────────────────╯

Architecture Recommendation:
Based on your requirements...
```

### Configuration

```bash
$ wilk config thinking
Current thinking settings:
  show_by_default: false
  live_display: false
  anthropic_budget: 2000 tokens
  save_thinking: true

$ wilk config set thinking.show_by_default true
✅ Agent thinking will now show by default

$ wilk config set thinking.budget 5000
✅ Agent thinking budget set to 5000 tokens
```

This implementation provides a sophisticated thinking text system for Wilk CLI that builds on LibreChat's proven architecture while optimizing for command-line use with progressive disclosure, interactive prompts, and flexible display options. The system supports any LLM with native thinking capabilities, providing transparency into agent reasoning processes through their underlying model capabilities.

