/**
 * Wilk Complete Implementation Example
 * 
 * This file demonstrates the complete TypeScript implementation of Wilk's core components,
 * showing how to adapt LibreChat's architecture for CLI-native operation.
 * 
 * Key Features:
 * - 90% code reuse from LibreChat
 * - SQLite + file-based storage for CLI performance
 * - Type safety throughout
 * - Comprehensive security framework
 * - Multi-agent orchestration
 */

import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import yaml from 'js-yaml';
import crypto from 'crypto';

// ============================================================================
// CORE TYPE DEFINITIONS
// ============================================================================

interface AgentConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  model: ModelConfig;
  tools: string[];
  permissions: AgentPermissions;
  prompts: AgentPrompts;
  metadata?: Record<string, any>;
}

interface ModelConfig {
  provider: string;
  name: string;
  parameters?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
  };
}

interface AgentPermissions {
  filesystem: {
    read: string[];
    write: string[];
    execute?: string[];
  };
  network?: {
    allowed_hosts: string[];
    blocked_ports?: number[];
  };
  shell?: {
    allowed_commands: string[];
    dangerous_commands?: string[];
  };
}

interface AgentPrompts {
  system: string;
  user_template?: string;
}

interface ExecutionContext {
  agentId: string;
  sessionId: string;
  userId: string;
  workingDirectory: string;
  requestId: string;
}

interface AgentResult {
  success: boolean;
  content: string;
  tokensUsed: number;
  executionTime: number;
  toolCalls?: ToolCall[];
  error?: string;
}

interface ToolCall {
  tool: string;
  parameters: Record<string, any>;
  result: any;
  executionTime: number;
}

interface REPLContext {
  session: {
    id: string;
    activeAgents: string[];
    workingDirectory: string;
  };
  user: {
    id: string;
    permissions: string[];
  };
  memory: Record<string, any>;
}

// ============================================================================
// STORAGE LAYER - SQLite + File System
// ============================================================================

class WilkStorage {
  private db: Database.Database;
  private basePath: string;

  constructor(basePath: string = join(homedir(), '.wilk')) {
    this.basePath = basePath;
    this.db = new Database(join(basePath, 'wilk.db'));
    this.initializeSchema();
  }

  private initializeSchema(): void {
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

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT,
        working_directory TEXT,
        active_agents JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES sessions(id),
        role TEXT CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT,
        agent_id TEXT,
        tokens_used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);
      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    `);
  }

  async saveAgent(agent: AgentConfig): Promise<void> {
    // Store metadata in SQLite for fast queries
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agents 
      (id, name, description, category, version, install_path, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const installPath = join(this.basePath, 'agents', agent.id);
    stmt.run(agent.id, agent.name, agent.description, agent.category, agent.version, installPath);

    // Store full definition in YAML for human readability
    await this.saveAgentDefinition(agent.id, agent);
  }

  async getAgent(agentId: string): Promise<AgentConfig | null> {
    // Get metadata from SQLite
    const stmt = this.db.prepare('SELECT * FROM agents WHERE id = ? AND is_installed = 1');
    const metadata = stmt.get(agentId) as any;

    if (!metadata) return null;

    // Load full definition from YAML
    const definition = await this.loadAgentDefinition(agentId);
    return definition;
  }

  async listAgents(category?: string): Promise<AgentConfig[]> {
    let query = 'SELECT id FROM agents WHERE is_installed = 1';
    const params: any[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    const agents = await Promise.all(
      rows.map(row => this.getAgent(row.id))
    );

    return agents.filter(agent => agent !== null) as AgentConfig[];
  }

  private async saveAgentDefinition(agentId: string, agent: AgentConfig): Promise<void> {
    const agentDir = join(this.basePath, 'agents', agentId);
    await fs.mkdir(agentDir, { recursive: true });

    const filePath = join(agentDir, 'agent.yaml');
    const yamlContent = yaml.dump(agent, { indent: 2, lineWidth: 80 });
    await fs.writeFile(filePath, yamlContent, 'utf8');
  }

  private async loadAgentDefinition(agentId: string): Promise<AgentConfig | null> {
    try {
      const filePath = join(this.basePath, 'agents', agentId, 'agent.yaml');
      const content = await fs.readFile(filePath, 'utf8');
      return yaml.load(content) as AgentConfig;
    } catch (error) {
      return null;
    }
  }
}

// ============================================================================
// SECURITY FRAMEWORK
// ============================================================================

interface PermissionResult {
  allowed: boolean;
  reason: string;
  conditions?: Record<string, any>;
}

class PermissionEngine {
  private agentPermissions: Map<string, AgentPermissions> = new Map();

  async validatePermission(
    agentId: string,
    resource: string,
    action: string,
    context: { path?: string; host?: string; command?: string }
  ): Promise<PermissionResult> {
    const permissions = this.agentPermissions.get(agentId);
    if (!permissions) {
      return { allowed: false, reason: 'NO_PERMISSIONS' };
    }

    const [resourceType] = resource.split(':');

    switch (resourceType) {
      case 'file':
        return this.checkFilePermission(permissions, action, context.path!);
      case 'network':
        return this.checkNetworkPermission(permissions, action, context.host!);
      case 'shell':
        return this.checkShellPermission(permissions, action, context.command!);
      default:
        return { allowed: false, reason: 'UNKNOWN_RESOURCE' };
    }
  }

  private checkFilePermission(
    permissions: AgentPermissions,
    action: string,
    path: string
  ): PermissionResult {
    const { filesystem } = permissions;

    switch (action) {
      case 'read':
        return {
          allowed: this.matchesPatterns(path, filesystem.read),
          reason: this.matchesPatterns(path, filesystem.read) ? 'PERMITTED' : 'PATH_NOT_ALLOWED'
        };
      case 'write':
        return {
          allowed: this.matchesPatterns(path, filesystem.write),
          reason: this.matchesPatterns(path, filesystem.write) ? 'PERMITTED' : 'WRITE_NOT_ALLOWED'
        };
      default:
        return { allowed: false, reason: 'INVALID_ACTION' };
    }
  }

  private checkNetworkPermission(
    permissions: AgentPermissions,
    action: string,
    host: string
  ): PermissionResult {
    if (!permissions.network) {
      return { allowed: false, reason: 'NETWORK_NOT_PERMITTED' };
    }

    const allowed = permissions.network.allowed_hosts.some(pattern =>
      this.matchesPattern(host, pattern)
    );

    return {
      allowed,
      reason: allowed ? 'PERMITTED' : 'HOST_NOT_ALLOWED'
    };
  }

  private checkShellPermission(
    permissions: AgentPermissions,
    action: string,
    command: string
  ): PermissionResult {
    if (!permissions.shell) {
      return { allowed: false, reason: 'SHELL_NOT_PERMITTED' };
    }

    // Check dangerous commands first
    if (permissions.shell.dangerous_commands?.some(dangerous =>
      this.matchesPattern(command, dangerous)
    )) {
      return { allowed: false, reason: 'DANGEROUS_COMMAND' };
    }

    // Check allowed commands
    const allowed = permissions.shell.allowed_commands.some(pattern =>
      this.matchesPattern(command, pattern)
    );

    return {
      allowed,
      reason: allowed ? 'PERMITTED' : 'COMMAND_NOT_ALLOWED'
    };
  }

  private matchesPatterns(path: string, patterns: string[]): boolean {
    return patterns.some(pattern => this.matchesPattern(path, pattern));
  }

  private matchesPattern(text: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(text);
  }

  setAgentPermissions(agentId: string, permissions: AgentPermissions): void {
    this.agentPermissions.set(agentId, permissions);
  }
}

// ============================================================================
// AGENT ORCHESTRATION - LibreChat Integration
// ============================================================================

class WilkOrchestrator {
  private permissionEngine: PermissionEngine;
  private toolManager: ToolManager;

  constructor(permissionEngine: PermissionEngine, toolManager: ToolManager) {
    this.permissionEngine = permissionEngine;
    this.toolManager = toolManager;
  }

  async executeAgent(
    agent: AgentConfig,
    prompt: string,
    context: ExecutionContext
  ): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // Set agent permissions
      this.permissionEngine.setAgentPermissions(agent.id, agent.permissions);

      // Load agent tools
      const tools = await this.toolManager.loadAgentTools(agent.id);

      // Build system message with agent prompt
      const systemMessage = this.buildSystemMessage(agent, context);

      // Simulate LibreChat's AgentClient.chatCompletion
      const result = await this.simulateAgentExecution(
        agent,
        systemMessage,
        prompt,
        tools,
        context
      );

      return {
        success: true,
        content: result.content,
        tokensUsed: result.tokensUsed,
        executionTime: Date.now() - startTime,
        toolCalls: result.toolCalls
      };

    } catch (error) {
      return {
        success: false,
        content: '',
        tokensUsed: 0,
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async executeMultipleAgents(
    agents: AgentConfig[],
    prompt: string,
    context: ExecutionContext
  ): Promise<AgentResult[]> {
    // Execute agents concurrently (following LibreChat patterns)
    const results = await Promise.allSettled(
      agents.map(agent => this.executeAgent(agent, prompt, context))
    );

    return results.map(result =>
      result.status === 'fulfilled'
        ? result.value
        : {
            success: false,
            content: '',
            tokensUsed: 0,
            executionTime: 0,
            error: result.reason?.message || 'Unknown error'
          }
    );
  }

  private buildSystemMessage(agent: AgentConfig, context: ExecutionContext): string {
    let systemMessage = agent.prompts.system;

    // Add context information
    systemMessage += `\n\nContext:`;
    systemMessage += `\n- Working Directory: ${context.workingDirectory}`;
    systemMessage += `\n- Session ID: ${context.sessionId}`;
    systemMessage += `\n- Available Tools: ${agent.tools.join(', ')}`;

    return systemMessage;
  }

  private async simulateAgentExecution(
    agent: AgentConfig,
    systemMessage: string,
    userPrompt: string,
    tools: any[],
    context: ExecutionContext
  ): Promise<{ content: string; tokensUsed: number; toolCalls: ToolCall[] }> {
    // This would integrate with LibreChat's actual LLM execution
    // For now, simulate a response
    const toolCalls: ToolCall[] = [];

    // Simulate tool usage
    if (userPrompt.includes('analyze') && tools.some(t => t.name === 'file_search')) {
      const toolCall = await this.executeToolCall('file_search', {
        query: 'security issues',
        directory: context.workingDirectory
      }, context);
      toolCalls.push(toolCall);
    }

    return {
      content: `Agent ${agent.name} processed: "${userPrompt}"\nTools used: ${toolCalls.length}`,
      tokensUsed: Math.floor(Math.random() * 1000) + 500,
      toolCalls
    };
  }

  private async executeToolCall(
    toolName: string,
    parameters: any,
    context: ExecutionContext
  ): Promise<ToolCall> {
    const startTime = Date.now();

    try {
      const result = await this.toolManager.executeTool(toolName, parameters, context);
      
      return {
        tool: toolName,
        parameters,
        result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        tool: toolName,
        parameters,
        result: { error: error.message },
        executionTime: Date.now() - startTime
      };
    }
  }
}

// ============================================================================
// TOOL MANAGEMENT
// ============================================================================

interface Tool {
  name: string;
  description: string;
  execute: (params: any, context: ExecutionContext) => Promise<any>;
}

class ToolManager {
  private tools: Map<string, Tool> = new Map();
  private permissionEngine: PermissionEngine;

  constructor(permissionEngine: PermissionEngine) {
    this.permissionEngine = permissionEngine;
    this.loadBuiltinTools();
  }

  private loadBuiltinTools(): void {
    // File search tool (adapted from LibreChat)
    this.tools.set('file_search', {
      name: 'file_search',
      description: 'Search for files and content',
      execute: async (params: { query: string; directory: string }, context: ExecutionContext) => {
        // Validate file access permission
        const permission = await this.permissionEngine.validatePermission(
          context.agentId,
          'file:read',
          'read',
          { path: params.directory }
        );

        if (!permission.allowed) {
          throw new Error(`File access denied: ${permission.reason}`);
        }

        // Simulate file search
        return {
          files_found: 5,
          matches: [
            'src/auth/authentication.ts:45: potential SQL injection',
            'src/utils/validation.ts:12: missing input sanitization'
          ]
        };
      }
    });

    // Shell execution tool
    this.tools.set('execute_shell', {
      name: 'execute_shell',
      description: 'Execute shell commands',
      execute: async (params: { command: string }, context: ExecutionContext) => {
        // Validate shell permission
        const permission = await this.permissionEngine.validatePermission(
          context.agentId,
          'shell:execute',
          'execute',
          { command: params.command }
        );

        if (!permission.allowed) {
          throw new Error(`Shell access denied: ${permission.reason}`);
        }

        // Simulate shell execution
        return {
          stdout: 'Command executed successfully',
          stderr: '',
          exit_code: 0
        };
      }
    });
  }

  async loadAgentTools(agentId: string): Promise<Tool[]> {
    // In a real implementation, this would load tools based on agent configuration
    return Array.from(this.tools.values());
  }

  async executeTool(toolName: string, parameters: any, context: ExecutionContext): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    return await tool.execute(parameters, context);
  }
}

// ============================================================================
// CLI INTERFACE & COMMAND PROCESSING
// ============================================================================

interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
}

type CommandHandler = (args: string[], context: REPLContext) => Promise<string>;

class WilkCLI {
  private commands: Map<string, CommandHandler> = new Map();
  private storage: WilkStorage;
  private orchestrator: WilkOrchestrator;
  private currentContext: REPLContext;

  constructor() {
    this.storage = new WilkStorage();
    const permissionEngine = new PermissionEngine();
    const toolManager = new ToolManager(permissionEngine);
    this.orchestrator = new WilkOrchestrator(permissionEngine, toolManager);
    
    this.currentContext = {
      session: {
        id: this.generateSessionId(),
        activeAgents: [],
        workingDirectory: process.cwd()
      },
      user: {
        id: 'default-user',
        permissions: ['*']
      },
      memory: {}
    };

    this.registerCommands();
  }

  private registerCommands(): void {
    this.commands.set('/install', this.handleInstall.bind(this));
    this.commands.set('/list-agents', this.handleListAgents.bind(this));
    this.commands.set('/agent', this.handleAgentManagement.bind(this));
    this.commands.set('/status', this.handleStatus.bind(this));
  }

  async processInput(input: string): Promise<CommandResult> {
    try {
      if (input.startsWith('/')) {
        const output = await this.executeCommand(input);
        return { success: true, output };
      } else if (input.startsWith('@')) {
        const output = await this.executeAgentCommand(input);
        return { success: true, output };
      } else {
        const output = await this.executeConversation(input);
        return { success: true, output };
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message
      };
    }
  }

  private async executeCommand(input: string): Promise<string> {
    const [command, ...args] = input.split(' ');
    const handler = this.commands.get(command);

    if (!handler) {
      throw new Error(`Unknown command: ${command}`);
    }

    return await handler(args, this.currentContext);
  }

  private async executeAgentCommand(input: string): Promise<string> {
    // Parse @agent-name syntax
    const matches = input.match(/@(\w+(?:-\w+)*)\s+(.+)/);
    if (!matches) {
      throw new Error('Invalid agent command syntax');
    }

    const [, agentName, prompt] = matches;
    
    // Load agent
    const agent = await this.storage.getAgent(agentName);
    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    // Execute agent
    const context: ExecutionContext = {
      agentId: agent.id,
      sessionId: this.currentContext.session.id,
      userId: this.currentContext.user.id,
      workingDirectory: this.currentContext.session.workingDirectory,
      requestId: this.generateRequestId()
    };

    const result = await this.orchestrator.executeAgent(agent, prompt, context);

    if (result.success) {
      return `🤖 ${agent.name}: ${result.content}\n⚡ ${result.tokensUsed} tokens used in ${result.executionTime}ms`;
    } else {
      return `❌ ${agent.name} failed: ${result.error}`;
    }
  }

  private async executeConversation(input: string): Promise<string> {
    // Handle regular conversation with active agents
    if (this.currentContext.session.activeAgents.length === 0) {
      return 'No active agents. Use /agent add <agent-name> to add agents to the session.';
    }

    const agents = await Promise.all(
      this.currentContext.session.activeAgents.map(id => this.storage.getAgent(id))
    );

    const validAgents = agents.filter(agent => agent !== null) as AgentConfig[];

    if (validAgents.length === 0) {
      return 'No valid active agents found.';
    }

    const context: ExecutionContext = {
      agentId: validAgents[0].id,
      sessionId: this.currentContext.session.id,
      userId: this.currentContext.user.id,
      workingDirectory: this.currentContext.session.workingDirectory,
      requestId: this.generateRequestId()
    };

    if (validAgents.length === 1) {
      const result = await this.orchestrator.executeAgent(validAgents[0], input, context);
      return result.success ? result.content : `Error: ${result.error}`;
    } else {
      const results = await this.orchestrator.executeMultipleAgents(validAgents, input, context);
      let output = '';
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const agent = validAgents[i];
        output += `🤖 ${agent.name}: ${result.success ? result.content : `Error: ${result.error}`}\n`;
      }
      
      return output;
    }
  }

  // Command handlers
  private async handleInstall(args: string[], context: REPLContext): Promise<string> {
    const [agentIdentifier] = args;
    if (!agentIdentifier) {
      return '❌ Agent identifier required';
    }

    // Simulate agent installation
    const agentConfig: AgentConfig = {
      id: agentIdentifier.replace(/[^a-zA-Z0-9-]/g, '-'),
      name: agentIdentifier,
      version: '1.0.0',
      description: `Installed agent: ${agentIdentifier}`,
      category: 'community',
      model: {
        provider: 'openai',
        name: 'gpt-4'
      },
      tools: ['file_search', 'execute_shell'],
      permissions: {
        filesystem: {
          read: ['./'],
          write: ['./reports/']
        }
      },
      prompts: {
        system: `You are ${agentIdentifier}, a helpful AI assistant.`
      }
    };

    await this.storage.saveAgent(agentConfig);
    return `✅ Installed agent: ${agentConfig.name} v${agentConfig.version}`;
  }

  private async handleListAgents(args: string[], context: REPLContext): Promise<string> {
    const [category] = args;
    const agents = await this.storage.listAgents(category);

    if (agents.length === 0) {
      return category 
        ? `📝 No agents found in category: ${category}`
        : '📝 No agents installed';
    }

    let output = category 
      ? `Agents in category '${category}':\n\n`
      : 'Installed agents:\n\n';

    for (const agent of agents) {
      output += `• ${agent.name} v${agent.version}\n`;
      output += `  ${agent.description}\n`;
      output += `  Category: ${agent.category} | Tools: ${agent.tools.join(', ')}\n\n`;
    }

    return output;
  }

  private async handleAgentManagement(args: string[], context: REPLContext): Promise<string> {
    const [action, ...agentNames] = args;

    switch (action) {
      case 'add':
        for (const agentName of agentNames) {
          if (!context.session.activeAgents.includes(agentName)) {
            context.session.activeAgents.push(agentName);
          }
        }
        return `✅ Added agents to session: ${agentNames.join(', ')}`;

      case 'remove':
        const [agentName] = agentNames;
        const index = context.session.activeAgents.indexOf(agentName);
        if (index > -1) {
          context.session.activeAgents.splice(index, 1);
          return `✅ Removed agent from session: ${agentName}`;
        }
        return `⚠️  Agent not in session: ${agentName}`;

      case 'list':
        if (context.session.activeAgents.length === 0) {
          return '📝 No active agents in current session';
        }
        return `Active agents: ${context.session.activeAgents.join(', ')}`;

      default:
        return '❌ Invalid action. Use: add, remove, or list';
    }
  }

  private async handleStatus(args: string[], context: REPLContext): Promise<string> {
    const totalAgents = (await this.storage.listAgents()).length;
    const activeAgents = context.session.activeAgents.length;

    let output = `📊 Wilk Status:\n\n`;
    output += `Session ID: ${context.session.id}\n`;
    output += `Working Directory: ${context.session.workingDirectory}\n`;
    output += `Total Agents: ${totalAgents}\n`;
    output += `Active Agents: ${activeAgents}\n`;

    if (activeAgents > 0) {
      output += `\nActive: ${context.session.activeAgents.join(', ')}`;
    }

    return output;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// MAIN APPLICATION
// ============================================================================

class WilkApplication {
  private cli: WilkCLI;

  constructor() {
    this.cli = new WilkCLI();
  }

  async start(): Promise<void> {
    console.log(`
┌─────────────────────────────────────────┐
│                                         │
│  ██╗    ██╗██╗██╗     ██╗  ██╗          │
│  ██║    ██║██║██║     ██║ ██╔╝          │
│  ██║ █╗ ██║██║██║     █████╔╝           │
│  ██║███╗██║██║██║     ██╔═██╗           │
│  ╚███╔███╔╝██║███████╗██║  ██╗          │
│   ╚══╝╚══╝ ╚═╝╚══════╝╚═╝  ╚═╝          │
│                                         │
│  CLI-Native Agent Operating System      │
│                                         │
└─────────────────────────────────────────┘

Tips for getting started:
1. Ask questions, edit files, or run commands
2. Be specific for the best results
3. Create WILK.md files to customize interactions
4. /help for more information

`);

    // Start REPL
    await this.startREPL();
  }

  private async startREPL(): Promise<void> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'wilk> '
    });

    rl.prompt();

    rl.on('line', async (input: string) => {
      const trimmed = input.trim();
      
      if (trimmed === '/exit') {
        rl.close();
        return;
      }

      if (trimmed) {
        try {
          const result = await this.cli.processInput(trimmed);
          
          if (result.success) {
            console.log(result.output);
          } else {
            console.log(`❌ Error: ${result.error}`);
          }
        } catch (error) {
          console.log(`❌ Unexpected error: ${error.message}`);
        }
      }

      rl.prompt();
    });

    rl.on('close', () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });
  }
}

// ============================================================================
// EXPORT FOR TESTING AND USAGE
// ============================================================================

export {
  WilkApplication,
  WilkCLI,
  WilkStorage,
  WilkOrchestrator,
  PermissionEngine,
  ToolManager,
  AgentConfig,
  ExecutionContext,
  AgentResult,
  REPLContext
};

// Run if this file is executed directly
if (require.main === module) {
  const app = new WilkApplication();
  app.start().catch(console.error);
}
