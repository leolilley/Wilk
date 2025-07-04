# Agent Management Architecture

## Overview

Wilk's agent management system is built on LibreChat's proven agent architecture, adapted for CLI-native performance with SQLite storage and enhanced with CLI-specific features like agent thinking transparency and task execution tracking.

## Core Agent Architecture

### Agent Definition Schema

Building on LibreChat's agent model (`/api/models/Agent.js`), Wilk agents include:

```typescript
interface WilkAgent {
  // Core identification
  id: string; // agent_${nanoid()}
  name: string; // Display name
  description: string; // Agent description

  // Behavior configuration
  instructions: string; // System prompt/instructions
  provider: string; // AI provider (openai, anthropic, etc.)
  model: string; // Model name
  model_parameters: {
    // Model configuration
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    // Provider-specific parameters
  };

  // Tool and capability configuration
  tools: string[]; // Available tools/functions
  actions: string[]; // Custom actions
  tool_resources: {
    // Tool-specific resources
    code_interpreter?: object;
    file_search?: object;
    custom_tools?: object;
  };

  // Execution control
  recursion_limit: number; // Max recursive calls (default: 5)
  hide_sequential_outputs: boolean; // UI behavior
  end_after_tools: boolean; // Stop after tool execution
  thinking_display: {
    // CLI-specific thinking display settings
    show_by_default: boolean;
    live_display: boolean;
    progressive_disclosure: boolean;
  };

  // Metadata and versioning
  author: string; // User who created the agent
  project_ids: string[]; // Associated projects
  versions: AgentVersion[]; // Version history
  is_collaborative: boolean; // Can others edit
  conversation_starters: string[]; // Suggested prompts

  // Multi-agent coordination
  agent_ids: string[]; // For multi-agent workflows

  // CLI-specific extensions
  memory_config: {
    // Memory system configuration
    use_project_memory: boolean;
    use_agent_memory: boolean;
    memory_retention_days: number;
  };
  context_strategy: 'discard' | 'summarize'; // Context management
  max_context_tokens: number; // Context window limit
}

interface AgentVersion {
  version: string; // Semantic version
  instructions: string; // Instructions at this version
  model_parameters: object; // Model config at this version
  tools: string[]; // Tools at this version
  actions: string[]; // Actions at this version
  created_at: Date; // Version creation time
  updated_at: Date; // Last modified time
  created_by: string; // Version author
  changelog?: string; // Optional change description
  actions_hash: string; // SHA256 hash for integrity
}
```

## Agent Lifecycle Management

### 1. Agent Creation

```typescript
class WilkAgentManager {
  async createAgent(agentData: Partial<WilkAgent>, author: string): Promise<WilkAgent> {
    const agentId = `agent_${nanoid()}`;
    const timestamp = new Date();

    // Create initial version
    const initialVersion: AgentVersion = {
      version: '1.0.0',
      instructions: agentData.instructions || '',
      model_parameters: agentData.model_parameters || {},
      tools: agentData.tools || [],
      actions: agentData.actions || [],
      created_at: timestamp,
      updated_at: timestamp,
      created_by: author,
      actions_hash: this.generateActionsHash(agentData.actions || []),
    };

    const agent: WilkAgent = {
      id: agentId,
      name: agentData.name || `Agent ${agentId.slice(-8)}`,
      description: agentData.description || '',
      instructions: agentData.instructions || '',
      provider: agentData.provider || 'openai',
      model: agentData.model || 'gpt-4',
      model_parameters: agentData.model_parameters || {},
      tools: agentData.tools || [],
      actions: agentData.actions || [],
      tool_resources: agentData.tool_resources || {},
      recursion_limit: agentData.recursion_limit || 5,
      hide_sequential_outputs: agentData.hide_sequential_outputs || false,
      end_after_tools: agentData.end_after_tools || false,
      thinking_display: {
        show_by_default: false,
        live_display: false,
        progressive_disclosure: true,
        ...agentData.thinking_display,
      },
      author,
      project_ids: agentData.project_ids || [],
      versions: [initialVersion],
      is_collaborative: agentData.is_collaborative || false,
      conversation_starters: agentData.conversation_starters || [],
      agent_ids: agentData.agent_ids || [],
      memory_config: {
        use_project_memory: true,
        use_agent_memory: true,
        memory_retention_days: 30,
        ...agentData.memory_config,
      },
      context_strategy: agentData.context_strategy || 'discard',
      max_context_tokens: agentData.max_context_tokens || 4096,
    };

    // Store in SQLite
    await this.db.insert(agents).values(agent);

    // Initialize agent memory space
    await this.initializeAgentMemory(agentId);

    return agent;
  }

  private generateActionsHash(actions: string[]): string {
    const actionsString = JSON.stringify(actions.sort());
    return crypto.createHash('sha256').update(actionsString).digest('hex');
  }

  private async initializeAgentMemory(agentId: string): Promise<void> {
    const memoryPath = path.join(this.agentMemoryDir, `${agentId}.md`);
    const initialMemory = `# Agent Memory: ${agentId}\n\n## Learning Log\n\n## Behavioral Patterns\n\n## Performance Metrics\n`;
    await fs.writeFile(memoryPath, initialMemory);
  }
}
```

### 2. Agent Loading and Security

Adapting LibreChat's security model for CLI use:

```typescript
async loadAgent(agentId: string, requestingUser: string): Promise<WilkAgent> {
  const agent = await this.db.select().from(agents).where(eq(agents.id, agentId)).get();

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  // Security checks (adapted from LibreChat patterns)
  if (agent.author === requestingUser) {
    return agent; // Owner access
  }

  // Check project-based access
  const userProjects = await this.getUserProjects(requestingUser);
  const hasProjectAccess = agent.project_ids.some(projectId =>
    userProjects.includes(projectId)
  );

  if (hasProjectAccess) {
    return agent; // Project member access
  }

  // Check collaborative access
  if (agent.is_collaborative) {
    return agent; // Public collaborative agent
  }

  throw new Error(`Access denied to agent ${agentId}`);
}
```

### 3. Agent Versioning System

Building on LibreChat's sophisticated versioning:

```typescript
async updateAgent(
  agentId: string,
  updateData: Partial<WilkAgent>,
  updatingUser: string,
  options: { forceVersion?: boolean } = {}
): Promise<WilkAgent> {
  const agent = await this.loadAgent(agentId, updatingUser);

  // Check edit permissions
  const hasEditPermission = agent.author === updatingUser ||
                           agent.is_collaborative ||
                           await this.isAdmin(updatingUser);

  if (!hasEditPermission) {
    throw new Error('Permission denied: Cannot modify non-collaborative agent');
  }

  // Prepare version data
  const currentVersion = agent.versions[agent.versions.length - 1];
  const newActionsHash = this.generateActionsHash(updateData.actions || agent.actions);

  // Check for duplicate version
  const isDuplicate = this.isDuplicateVersion(updateData, currentVersion, newActionsHash);
  if (isDuplicate && !options.forceVersion) {
    throw new Error('Duplicate version detected - no changes to save');
  }

  // Create new version
  const newVersion: AgentVersion = {
    version: this.incrementVersion(currentVersion.version),
    instructions: updateData.instructions || agent.instructions,
    model_parameters: updateData.model_parameters || agent.model_parameters,
    tools: updateData.tools || agent.tools,
    actions: updateData.actions || agent.actions,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: updatingUser,
    changelog: updateData.changelog,
    actions_hash: newActionsHash
  };

  // Update agent with new version
  const updatedAgent = {
    ...agent,
    ...updateData,
    versions: [...agent.versions, newVersion]
  };

  await this.db.update(agents).set(updatedAgent).where(eq(agents.id, agentId));

  return updatedAgent;
}

private isDuplicateVersion(
  updateData: Partial<WilkAgent>,
  currentVersion: AgentVersion,
  newActionsHash: string
): boolean {
  // Deep comparison of significant fields
  const fieldsToCompare = [
    'instructions', 'model_parameters', 'tools', 'recursion_limit',
    'hide_sequential_outputs', 'end_after_tools'
  ];

  const hasChanges = fieldsToCompare.some(field => {
    const newValue = updateData[field];
    const currentValue = field === 'actions' ? undefined : currentVersion[field] || agent[field];
    return newValue !== undefined && !deepEqual(newValue, currentValue);
  });

  const actionsChanged = newActionsHash !== currentVersion.actions_hash;

  return !hasChanges && !actionsChanged;
}
```

### 4. Agent Execution System

Building on LibreChat's `AgentClient` architecture:

```typescript
class WilkAgentExecutor {
  private taskTracker: TaskExecutionTracker;
  private thinkingDisplay: ThinkingDisplay;
  private memoryManager: WilkMemoryManager;

  constructor(
    private agent: WilkAgent,
    private options: {
      contextStrategy?: 'discard' | 'summarize';
      maxContextTokens?: number;
      showThinking?: boolean;
    } = {},
  ) {
    this.taskTracker = new TaskExecutionTracker();
    this.thinkingDisplay = new ThinkingDisplay(agent.thinking_display);
    this.memoryManager = new WilkMemoryManager();
  }

  async executePrompt(prompt: string, context: ExecutionContext): Promise<AgentResponse> {
    const mainTaskId = this.taskTracker.startTask(`${this.agent.name} Execution`);

    try {
      // Load agent memory and project context
      const memoryContext = await this.loadAgentContext(context);

      // Prepare execution environment
      const executionEnv = await this.prepareExecutionEnvironment(context);

      // Create message chain with context
      const messages = await this.buildMessageChain(prompt, memoryContext, context);

      // Execute agent with thinking display
      const response = await this.executeWithThinking(messages, executionEnv);

      // Update agent memory
      await this.updateAgentMemory(prompt, response, context);

      this.taskTracker.completeTask(mainTaskId, 'Agent execution completed');
      return response;
    } catch (error) {
      this.taskTracker.failTask(mainTaskId, error.message);
      throw error;
    }
  }

  private async executeWithThinking(
    messages: Message[],
    executionEnv: ExecutionEnvironment,
  ): Promise<AgentResponse> {
    const subtaskId = this.taskTracker.startSubtask('Agent Processing');

    // Show thinking if configured
    if (this.shouldShowThinking()) {
      this.thinkingDisplay.startLiveThinking();
    }

    // Create stream handler for thinking
    const streamHandler = new WilkStreamHandler({
      showLiveThinking: this.shouldShowThinking(),
      thinkingCallback: (delta) => this.thinkingDisplay.updateThinking(delta),
      responseCallback: (delta) => this.handleResponseDelta(delta),
    });

    const client = this.createProviderClient(executionEnv);
    const response = await client.chatCompletion({
      messages,
      streamHandler,
      tools: executionEnv.tools,
      abortController: executionEnv.abortController,
    });

    // Handle thinking display
    if (this.shouldShowThinking()) {
      this.thinkingDisplay.completeThinking(streamHandler.getThinkingContent(), {
        interactive: this.agent.thinking_display.progressive_disclosure,
      });
    }

    this.taskTracker.completeTask(subtaskId);
    return response;
  }

  private shouldShowThinking(): boolean {
    return this.options.showThinking ?? this.agent.thinking_display.show_by_default;
  }
}
```

## Multi-Agent Coordination

### Sequential Agent Execution

Adapting LibreChat's multi-agent patterns:

```typescript
class MultiAgentOrchestrator {
  async executeAgentSequence(
    agents: WilkAgent[],
    initialPrompt: string,
    context: ExecutionContext,
  ): Promise<MultiAgentResponse> {
    const mainTaskId = this.taskTracker.startTask('Multi-Agent Execution');
    const responses: AgentResponse[] = [];
    let currentContext = context;

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const isFirst = i === 0;
      const isLast = i === agents.length - 1;

      const agentTaskId = this.taskTracker.startSubtask(
        `Agent ${i + 1}: ${agent.name}`,
        mainTaskId,
      );

      // Build prompt for this agent
      const agentPrompt = isFirst
        ? initialPrompt
        : this.buildSequentialPrompt(initialPrompt, responses, agent);

      // Execute agent
      const executor = new WilkAgentExecutor(agent, {
        contextStrategy: agent.context_strategy,
        maxContextTokens: agent.max_context_tokens,
        showThinking: agent.thinking_display.show_by_default,
      });

      const response = await executor.executePrompt(agentPrompt, currentContext);
      responses.push(response);

      // Update context for next agent
      currentContext = this.updateContextFromResponse(currentContext, response);

      this.taskTracker.completeTask(agentTaskId);

      // Stop if this agent indicated completion
      if (agent.end_after_tools && response.toolExecutions?.length > 0) {
        break;
      }
    }

    this.taskTracker.completeTask(mainTaskId);

    return {
      agents: agents.map((a) => a.id),
      responses,
      finalResponse: responses[responses.length - 1],
      context: currentContext,
    };
  }
}
```

## Agent Discovery and Installation

### Local Agent Registry

```typescript
class AgentRegistry {
  async searchAgents(query: string, filters: AgentFilters = {}): Promise<AgentSearchResult[]> {
    let queryBuilder = this.db.select().from(agents);

    // Apply search filters
    if (query) {
      queryBuilder = queryBuilder.where(
        or(
          ilike(agents.name, `%${query}%`),
          ilike(agents.description, `%${query}%`),
          ilike(agents.instructions, `%${query}%`),
        ),
      );
    }

    if (filters.provider) {
      queryBuilder = queryBuilder.where(eq(agents.provider, filters.provider));
    }

    if (filters.tools) {
      // Search for agents with specific tools
      for (const tool of filters.tools) {
        queryBuilder = queryBuilder.where(sql`json_extract(${agents.tools}, '$') LIKE '%${tool}%'`);
      }
    }

    return await queryBuilder.execute();
  }

  async installAgent(source: string, options: InstallOptions = {}): Promise<WilkAgent> {
    // Support different installation sources
    if (source.startsWith('http')) {
      return this.installFromUrl(source, options);
    } else if (source.includes('/')) {
      return this.installFromGit(source, options);
    } else {
      return this.installFromRegistry(source, options);
    }
  }

  private async installFromGit(gitUrl: string, options: InstallOptions): Promise<WilkAgent> {
    const tempDir = await this.cloneRepository(gitUrl);
    const agentManifest = await this.loadAgentManifest(tempDir);

    // Validate agent definition
    await this.validateAgentManifest(agentManifest);

    // Install dependencies if needed
    if (agentManifest.dependencies) {
      await this.installAgentDependencies(agentManifest.dependencies);
    }

    // Create agent from manifest
    const agent = await this.createAgent(agentManifest, options.author);

    // Clean up
    await fs.rm(tempDir, { recursive: true });

    return agent;
  }
}
```

## CLI Integration

### Agent Commands

```bash
# Agent management commands
wilk agent create <name> --provider openai --model gpt-4
wilk agent list [--filter provider=anthropic]
wilk agent update <agent-id> --instructions "New instructions"
wilk agent delete <agent-id>
wilk agent versions <agent-id>
wilk agent revert <agent-id> --version 1.2.0

# Agent execution
wilk @agent-name "prompt here"
wilk @agent1 @agent2 "multi-agent prompt"

# Agent configuration
wilk agent config <agent-id> thinking.show_by_default true
wilk agent config <agent-id> memory.retention_days 60
wilk agent export <agent-id> --file agent-backup.yaml
wilk agent import --file agent-backup.yaml

# Agent installation
wilk install github.com/user/agent-repo
wilk install @community/typescript-helper
wilk install ./local-agent-directory
wilk search agents --query "security" --tools code_interpreter
```

This agent management system provides a robust foundation for Wilk CLI, building on LibreChat's proven patterns while adding CLI-specific enhancements for performance, thinking transparency, and developer workflow integration.

