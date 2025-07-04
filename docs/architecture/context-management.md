# Context Management Architecture

## Overview

Wilk's context management system is built on LibreChat's sophisticated context handling architecture, adapted for CLI performance with SQLite storage and enhanced with agent-specific memory management. The system handles conversation context, memory integration, summarization, and context window management across multiple AI providers.

## Core Architecture

### Context Strategy Framework

Building on LibreChat's `BaseClient` context framework, Wilk implements a flexible context strategy system:

```typescript
interface ContextStrategy {
  type: 'discard' | 'summarize' | 'hybrid';
  maxContextTokens: number;
  tokenCountThreshold: number;
  summarizationTrigger: number;
  memoryIntegration: boolean;
}

class WilkContextManager {
  private strategy: ContextStrategy;
  private memoryManager: WilkMemoryManager;
  private summarizer: ConversationSummarizer;
  private tokenCounter: TokenCounter;

  constructor(strategy: ContextStrategy, memoryManager: WilkMemoryManager) {
    this.strategy = strategy;
    this.memoryManager = memoryManager;
    this.summarizer = new ConversationSummarizer();
    this.tokenCounter = new TokenCounter();
  }

  async buildContext(
    conversationId: string,
    newMessage: Message,
    agentConfig: WilkAgent,
  ): Promise<ContextResult> {
    // Load conversation history
    const messages = await this.loadConversationHistory(conversationId);

    // Apply memory integration
    const memoryContext = await this.integrateMemory(conversationId, agentConfig);

    // Handle context strategy
    const contextResult = await this.applyContextStrategy(
      messages,
      newMessage,
      memoryContext,
      agentConfig,
    );

    return contextResult;
  }
}
```

## Message Structure and Token Management

### Enhanced Message Schema

Building on LibreChat's message schema with CLI-specific enhancements:

```typescript
interface WilkMessage {
  // Core message properties (from LibreChat)
  messageId: string;
  conversationId: string;
  parentMessageId?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: MessageContent[];

  // Token management
  tokenCount: number;
  summaryTokenCount?: number;

  // Context management
  contextType: 'primary' | 'summary' | 'memory' | 'tool_output';
  contextPriority: number; // 1-10, higher = more important

  // Agent-specific metadata
  agentId?: string;
  thinkingContent?: string;
  thinkingTokens?: number;

  // Memory integration
  memoryReferences: string[]; // References to memory entries
  learningPoints: string[]; // Extracted learning points

  // Timestamps and metadata
  createdAt: Date;
  updatedAt: Date;
  isUnfinished: boolean;
  error: boolean;

  // Tool execution tracking
  toolExecutions?: ToolExecution[];
  taskExecutions?: TaskExecution[];
}

interface MessageContent {
  type: 'text' | 'think' | 'tool_call' | 'tool_result' | 'file' | 'image';
  content: string | object;
  metadata?: {
    tokens: number;
    duration?: number;
    model?: string;
    provider?: string;
  };
}
```

### Token-Aware Message Processing

Adapting LibreChat's token management for CLI efficiency:

```typescript
class TokenCounter {
  private cache: Map<string, number> = new Map();

  async getTokenCountForMessage(
    message: WilkMessage,
    provider: string,
    model: string,
  ): Promise<number> {
    const cacheKey = this.generateCacheKey(message, provider, model);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let tokenCount = this.getBaseTokensForMessage(provider, model);

    // Process content parts
    for (const contentPart of message.content) {
      switch (contentPart.type) {
        case 'text':
          tokenCount += await this.countTextTokens(contentPart.content as string, model);
          break;
        case 'think':
          tokenCount += await this.countTextTokens(contentPart.content as string, model);
          break;
        case 'tool_call':
          tokenCount += this.countToolCallTokens(contentPart.content, model);
          break;
        case 'tool_result':
          tokenCount += this.countToolResultTokens(contentPart.content, model);
          break;
      }
    }

    // Cache result
    this.cache.set(cacheKey, tokenCount);

    // Update message in database
    await this.updateMessageTokenCount(message.messageId, tokenCount);

    return tokenCount;
  }

  private getBaseTokensForMessage(provider: string, model: string): number {
    // Provider-specific token calculations (from LibreChat)
    if (provider === 'openai') {
      if (model.includes('gpt-3.5-turbo-0301')) {
        return 4; // tokens per message
      }
      return 3; // default for most OpenAI models
    }

    if (provider === 'anthropic') {
      return 1; // Claude models are more efficient
    }

    return 3; // default fallback
  }
}
```

## Context Strategy Implementation

### 1. Discard Strategy (Default)

Simple context window management without summarization:

```typescript
class DiscardContextStrategy implements ContextStrategyHandler {
  async handleContext(
    messages: WilkMessage[],
    newMessage: WilkMessage,
    config: ContextConfig,
  ): Promise<ContextResult> {
    const { maxContextTokens, instructions } = config;

    // Add instructions to context
    const contextMessages = this.addInstructions(messages, instructions);

    // Get messages within token limit
    const result = await this.getMessagesWithinTokenLimit(
      contextMessages,
      newMessage,
      maxContextTokens,
    );

    return {
      contextMessages: result.context,
      droppedMessages: result.dropped,
      tokenCount: result.tokenCount,
      strategy: 'discard',
    };
  }

  private async getMessagesWithinTokenLimit(
    messages: WilkMessage[],
    newMessage: WilkMessage,
    maxTokens: number,
  ): Promise<ContextProcessingResult> {
    let currentTokenCount = 3; // Assistant response priming
    const context: WilkMessage[] = [];
    const dropped: WilkMessage[] = [];

    // Start with the new message
    currentTokenCount += newMessage.tokenCount;
    context.push(newMessage);

    // Process messages from newest to oldest
    const reversedMessages = [...messages].reverse();

    for (const message of reversedMessages) {
      if (currentTokenCount + message.tokenCount <= maxTokens) {
        context.unshift(message);
        currentTokenCount += message.tokenCount;
      } else {
        dropped.push(message);
      }
    }

    return {
      context,
      dropped,
      tokenCount: currentTokenCount,
    };
  }
}
```

### 2. Summarize Strategy

Intelligent summarization using LibreChat's summary buffer approach:

```typescript
class SummarizeContextStrategy implements ContextStrategyHandler {
  private summarizer: ConversationSummarizer;

  constructor(summarizer: ConversationSummarizer) {
    this.summarizer = summarizer;
  }

  async handleContext(
    messages: WilkMessage[],
    newMessage: WilkMessage,
    config: ContextConfig,
  ): Promise<ContextResult> {
    const { maxContextTokens, instructions } = config;

    // Add instructions
    const contextMessages = this.addInstructions(messages, instructions);

    // Attempt to fit within token limit
    const initialResult = await this.getMessagesWithinTokenLimit(
      contextMessages,
      newMessage,
      maxContextTokens,
    );

    // If we have dropped messages, create summary
    if (initialResult.dropped.length > 0) {
      const summaryResult = await this.createSummaryContext(
        initialResult.dropped,
        initialResult.context,
        config,
      );

      return {
        contextMessages: summaryResult.contextMessages,
        droppedMessages: initialResult.dropped,
        summaryMessage: summaryResult.summaryMessage,
        tokenCount: summaryResult.tokenCount,
        strategy: 'summarize',
      };
    }

    return {
      contextMessages: initialResult.context,
      droppedMessages: [],
      tokenCount: initialResult.tokenCount,
      strategy: 'summarize',
    };
  }

  private async createSummaryContext(
    droppedMessages: WilkMessage[],
    currentContext: WilkMessage[],
    config: ContextConfig,
  ): Promise<SummaryResult> {
    // Find previous summary if it exists
    const previousSummary = this.findPreviousSummary(currentContext);

    // Create summary of dropped messages
    const summaryMessage = await this.summarizer.summarizeMessages({
      messages: droppedMessages,
      previousSummary: previousSummary?.content[0]?.content as string,
      maxTokens: Math.floor(config.maxContextTokens * 0.3), // Use 30% for summary
      model: config.model,
      provider: config.provider,
    });

    // Build final context: summary + recent messages
    const contextMessages = [summaryMessage, ...currentContext];
    const tokenCount = await this.calculateTotalTokens(contextMessages, config);

    return {
      contextMessages,
      summaryMessage,
      tokenCount,
    };
  }
}
```

### 3. Hybrid Strategy

Combines memory integration with intelligent summarization:

```typescript
class HybridContextStrategy implements ContextStrategyHandler {
  async handleContext(
    messages: WilkMessage[],
    newMessage: WilkMessage,
    config: ContextConfig,
  ): Promise<ContextResult> {
    // 1. Load relevant memory context
    const memoryContext = await this.loadRelevantMemory(newMessage, config);

    // 2. Categorize messages by importance
    const categorizedMessages = this.categorizeMessages(messages, config);

    // 3. Allocate token budget
    const tokenBudget = this.allocateTokenBudget(config.maxContextTokens);

    // 4. Build context with priorities
    const contextResult = await this.buildPriorityContext(
      categorizedMessages,
      memoryContext,
      newMessage,
      tokenBudget,
      config,
    );

    return contextResult;
  }

  private categorizeMessages(messages: WilkMessage[], config: ContextConfig): CategorizedMessages {
    return {
      critical: messages.filter((m) => m.contextPriority >= 8),
      important: messages.filter((m) => m.contextPriority >= 6 && m.contextPriority < 8),
      normal: messages.filter((m) => m.contextPriority >= 3 && m.contextPriority < 6),
      low: messages.filter((m) => m.contextPriority < 3),
    };
  }

  private allocateTokenBudget(maxTokens: number): TokenBudget {
    return {
      memory: Math.floor(maxTokens * 0.2), // 20% for memory context
      critical: Math.floor(maxTokens * 0.3), // 30% for critical messages
      important: Math.floor(maxTokens * 0.25), // 25% for important messages
      normal: Math.floor(maxTokens * 0.2), // 20% for normal messages
      buffer: Math.floor(maxTokens * 0.05), // 5% buffer
    };
  }
}
```

## Memory Integration

### Project and Agent Memory Context

```typescript
class MemoryContextIntegrator {
  async integrateMemory(
    conversationId: string,
    agentConfig: WilkAgent,
    currentMessage: WilkMessage,
  ): Promise<MemoryContext> {
    const memoryContext: MemoryContext = {
      projectMemory: [],
      agentMemory: [],
      relevantImports: [],
      contextualKnowledge: [],
    };

    // Load project memory if enabled
    if (agentConfig.memory_config.use_project_memory) {
      memoryContext.projectMemory = await this.loadProjectMemory(conversationId);
    }

    // Load agent-specific memory if enabled
    if (agentConfig.memory_config.use_agent_memory) {
      memoryContext.agentMemory = await this.loadAgentMemory(agentConfig.id);
    }

    // Load relevant imports based on message content
    memoryContext.relevantImports = await this.findRelevantImports(currentMessage, agentConfig);

    // Generate contextual knowledge prompts
    memoryContext.contextualKnowledge = await this.generateContextualKnowledge(
      currentMessage,
      memoryContext,
    );

    return memoryContext;
  }

  private async loadProjectMemory(conversationId: string): Promise<MemoryEntry[]> {
    // Find project from conversation
    const conversation = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .get();

    if (!conversation?.projectPath) {
      return [];
    }

    // Load project memory files
    const projectMemoryPath = path.join(conversation.projectPath, 'WILK.md');

    if (
      await fs
        .access(projectMemoryPath)
        .then(() => true)
        .catch(() => false)
    ) {
      const memoryContent = await fs.readFile(projectMemoryPath, 'utf-8');
      return this.parseMemoryContent(memoryContent, 'project');
    }

    return [];
  }

  private async findRelevantImports(
    message: WilkMessage,
    agentConfig: WilkAgent,
  ): Promise<ImportedMemory[]> {
    const messageText = this.extractTextFromMessage(message);
    const imports: ImportedMemory[] = [];

    // Look for @path/to/file references in message
    const importRegex = /@([^\s]+)/g;
    let match;

    while ((match = importRegex.exec(messageText)) !== null) {
      const importPath = match[1];

      try {
        const resolvedPath = await this.resolveImportPath(importPath, agentConfig);
        const importContent = await this.loadImportContent(resolvedPath);

        imports.push({
          path: importPath,
          resolvedPath,
          content: importContent,
          type: this.detectImportType(resolvedPath),
        });
      } catch (error) {
        console.warn(`Failed to load import: ${importPath}`, error);
      }
    }

    return imports;
  }
}
```

## Conversation Summarization

### LangChain Integration

Building on LibreChat's summarization system:

```typescript
class ConversationSummarizer {
  private llmClients: Map<string, LLMClient> = new Map();

  async summarizeMessages(options: SummarizationOptions): Promise<WilkMessage> {
    const { messages, previousSummary, maxTokens, model, provider, conversationId } = options;

    // Prepare messages for summarization
    const formattedMessages = this.formatMessagesForSummary(messages);

    // Create summary prompt
    const summaryPrompt = this.createSummaryPrompt(formattedMessages, previousSummary, maxTokens);

    // Get appropriate LLM client
    const llmClient = this.getLLMClient(provider, model);

    // Generate summary
    const summaryResponse = await llmClient.complete({
      prompt: summaryPrompt,
      maxTokens: maxTokens,
      temperature: 0.3, // Lower temperature for consistent summaries
      stopSequences: ['---END SUMMARY---'],
    });

    // Create summary message
    const summaryMessage: WilkMessage = {
      messageId: `summary_${nanoid()}`,
      conversationId,
      role: 'system',
      content: [
        {
          type: 'text',
          content: summaryResponse.text,
          metadata: {
            tokens: summaryResponse.tokenCount,
            model,
            provider,
          },
        },
      ],
      contextType: 'summary',
      contextPriority: 9, // High priority for summaries
      tokenCount: summaryResponse.tokenCount,
      summaryTokenCount: summaryResponse.tokenCount,
      createdAt: new Date(),
      updatedAt: new Date(),
      isUnfinished: false,
      error: false,
      memoryReferences: [],
      learningPoints: [],
    };

    // Store summary in database
    await this.storeMessage(summaryMessage);

    return summaryMessage;
  }

  private createSummaryPrompt(
    messages: FormattedMessage[],
    previousSummary?: string,
    maxTokens?: number,
  ): string {
    const summaryTemplate = `
You are tasked with creating a comprehensive summary of a conversation. Your goal is to capture the key points, decisions, and context while being concise.

${
  previousSummary
    ? `
Current Summary:
${previousSummary}

`
    : ''
}New Messages to Integrate:
${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}

Instructions:
1. Integrate the new messages with the current summary
2. Preserve important context and decisions
3. Remove redundant or outdated information
4. Maintain chronological flow of key events
5. Keep the summary under ${maxTokens || 500} tokens
6. Focus on actionable insights and conclusions

Updated Summary:`;

    return summaryTemplate;
  }
}
```

## Performance Optimizations

### Context Caching System

```typescript
class ContextCache {
  private cache: Map<string, CachedContext> = new Map();
  private maxCacheSize: number = 1000;
  private ttl: number = 5 * 60 * 1000; // 5 minutes

  async getContext(
    conversationId: string,
    messageCount: number,
    strategy: string,
  ): Promise<CachedContext | null> {
    const cacheKey = `${conversationId}:${messageCount}:${strategy}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached;
    }

    return null;
  }

  async setContext(
    conversationId: string,
    messageCount: number,
    strategy: string,
    context: ContextResult,
  ): Promise<void> {
    const cacheKey = `${conversationId}:${messageCount}:${strategy}`;

    // Implement LRU eviction
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(cacheKey, {
      context,
      timestamp: Date.now(),
      messageCount,
    });
  }
}
```

### Database Query Optimization

```typescript
class ConversationHistoryLoader {
  async loadConversationHistory(
    conversationId: string,
    options: LoadOptions = {},
  ): Promise<WilkMessage[]> {
    const {
      limit = 100,
      includeSystemMessages = true,
      includeToolMessages = false,
      sinceMessageId,
      beforeMessageId,
    } = options;

    // Build optimized query
    let query = this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // Apply filters
    if (!includeSystemMessages) {
      query = query.where(ne(messages.role, 'system'));
    }

    if (!includeToolMessages) {
      query = query.where(ne(messages.role, 'tool'));
    }

    if (sinceMessageId) {
      const sinceMessage = await this.getMessageTimestamp(sinceMessageId);
      query = query.where(gte(messages.createdAt, sinceMessage.createdAt));
    }

    const results = await query.execute();

    // Build message chain using parent-child relationships
    return this.buildMessageChain(results, options.parentMessageId);
  }

  private async buildMessageChain(
    messages: WilkMessage[],
    parentMessageId?: string,
  ): Promise<WilkMessage[]> {
    if (!parentMessageId) {
      return messages.reverse(); // Chronological order
    }

    // Follow parent-child chain (LibreChat pattern)
    const messageMap = new Map(messages.map((m) => [m.messageId, m]));
    const chain: WilkMessage[] = [];
    let currentId = parentMessageId;

    while (currentId && messageMap.has(currentId)) {
      const message = messageMap.get(currentId)!;
      chain.unshift(message);
      currentId = message.parentMessageId;
    }

    return chain;
  }
}
```

## CLI Integration

### Context Management Commands

```bash
# Context configuration
wilk config set context.strategy summarize
wilk config set context.max_tokens 8192
wilk config set context.memory_integration true

# Context inspection
wilk context show [conversation-id]
wilk context summary [conversation-id]
wilk context memory [conversation-id]
wilk context stats [conversation-id]

# Context management
wilk context compact [conversation-id]    # Force summarization
wilk context clear [conversation-id]      # Clear history
wilk context export [conversation-id]     # Export context
wilk context import --file context.json   # Import context

# Memory integration
wilk memory import @path/to/file
wilk memory search "query terms"
wilk memory relevance [conversation-id]
```

### Usage Examples

```bash
# Configure agent with summarization
$ wilk agent config research-agent context.strategy summarize
$ wilk agent config research-agent context.max_tokens 16384

# Execute with context inspection
$ wilk --show-context @research-agent "analyze the codebase"
📋 Context: 8 messages (3.2k tokens) + project memory (1.1k tokens)
💭 Agent thinking... (showing)
🔍 Context includes:
  - 2 summaries (1.8k tokens)
  - 6 recent messages (1.4k tokens)
  - WILK.md project memory (1.1k tokens)
  - 3 imported files (@README.md, @package.json, @src/types.ts)

● Task(Codebase Analysis)
│     ⎿  Loading project context...
│        ✓ Project memory loaded (1.1k tokens)
│     ⎿  Analyzing code structure...
│        Found 47 TypeScript files
[Analysis continues...]
```

This context management system provides sophisticated conversation handling while maintaining CLI performance through intelligent caching, optimized queries, and flexible strategy selection.

