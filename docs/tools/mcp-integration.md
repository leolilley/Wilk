# Wilk Model Context Protocol (MCP) Integration

## Overview

Wilk provides comprehensive Model Context Protocol (MCP) integration, enabling agents to access external tools, data sources, and services through a standardized protocol. This integration adapts LibreChat's tool system while adding CLI-specific MCP capabilities and management features.

## MCP Architecture in Wilk

```
Wilk MCP Integration Architecture
┌─────────────────────────────────────────────────────────────┐
│                      Wilk Agent Layer                       │
├─────────────────────────────────────────────────────────────┤
│ Agent Execution │ Tool Selection │ Context Management       │
├─────────────────────────────────────────────────────────────┤
│                    MCP Client Manager                       │
├─────────────────────────────────────────────────────────────┤
│ Server Discovery │ Connection Pool │ Protocol Handling      │
├─────────────────────────────────────────────────────────────┤
│                   Transport Layer                           │
├─────────────────────────────────────────────────────────────┤
│ STDIO │ SSE │ HTTP │ WebSocket │ Local IPC                  │
├─────────────────────────────────────────────────────────────┤
│                    MCP Servers                              │
├─────────────────────────────────────────────────────────────┤
│ GitHub │ Database │ FileSystem │ APIs │ Custom Tools        │
└─────────────────────────────────────────────────────────────┘
```

## MCP Server Management

### Configuration and Discovery

**MCP Server Configuration:**

```typescript
interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'sse' | 'http' | 'websocket';
  scope: 'local' | 'project' | 'user';

  // STDIO configuration
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  working_directory?: string;

  // Network configuration (SSE/HTTP/WebSocket)
  url?: string;
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'oauth2' | 'api_key';
    credentials?: any;
  };

  // Connection settings
  timeout?: number;
  retry_attempts?: number;
  health_check?: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };

  // Security settings
  trusted: boolean;
  sandbox?: boolean;
  permissions?: string[];
}

interface MCPServerStatus {
  name: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'timeout';
  transport: string;
  uptime?: number;
  last_error?: string;
  capabilities: {
    tools: MCPTool[];
    resources: MCPResource[];
    prompts: MCPPrompt[];
  };
  metrics: {
    requests_sent: number;
    responses_received: number;
    errors: number;
    avg_response_time: number;
  };
}

class WilkMCPManager {
  private servers: Map<string, MCPServer>;
  private connections: Map<string, MCPConnection>;
  private configStore: ConfigurationStore;
  private healthMonitor: MCPHealthMonitor;
  private securityManager: MCPSecurityManager;

  constructor() {
    this.servers = new Map();
    this.connections = new Map();
    this.configStore = new ConfigurationStore();
    this.healthMonitor = new MCPHealthMonitor();
    this.securityManager = new MCPSecurityManager();
  }

  /**
   * Add MCP server configuration
   */
  async addServer(config: MCPServerConfig): Promise<string> {
    // Validate configuration
    await this.validateServerConfig(config);

    // Security validation
    await this.securityManager.validateServer(config);

    // Store configuration based on scope
    await this.configStore.saveServer(config);

    // Create server instance
    const server = await this.createServer(config);
    this.servers.set(config.name, server);

    return `✅ Added MCP server: ${config.name} (${config.transport})`;
  }

  /**
   * Connect to MCP server
   */
  async connectServer(name: string): Promise<string> {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`MCP server '${name}' not found`);
    }

    try {
      // Establish connection
      const connection = await this.establishConnection(server);
      this.connections.set(name, connection);

      // Initialize capabilities
      await this.initializeCapabilities(name, connection);

      // Start health monitoring
      this.healthMonitor.startMonitoring(server);

      return `🟢 Connected to MCP server: ${name}`;
    } catch (error) {
      await this.handleConnectionError(name, error);
      throw new Error(`Failed to connect to MCP server ${name}: ${error.message}`);
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnectServer(name: string): Promise<string> {
    const connection = this.connections.get(name);
    if (!connection) {
      return `⚠️  MCP server '${name}' is not connected`;
    }

    try {
      // Graceful shutdown
      await connection.close();
      this.connections.delete(name);

      // Stop health monitoring
      this.healthMonitor.stopMonitoring(name);

      return `🔴 Disconnected from MCP server: ${name}`;
    } catch (error) {
      return `⚠️  Error disconnecting from ${name}: ${error.message}`;
    }
  }

  /**
   * List all MCP servers
   */
  async listServers(): Promise<string> {
    const serverConfigs = await this.configStore.getAllServers();

    if (serverConfigs.length === 0) {
      return '📝 No MCP servers configured\n\nUse `/mcp add` to add a server.';
    }

    let output = 'Configured MCP servers:\n\n';

    for (const config of serverConfigs) {
      const status = await this.getServerStatus(config.name);
      const statusIcon = this.getStatusIcon(status.status);
      const scopeIcon = this.getScopeIcon(config.scope);

      output += `${statusIcon} ${config.name} (${config.transport}) ${scopeIcon}\n`;

      if (status.status === 'connected') {\n        output += `   Tools: ${status.capabilities.tools.length}, `;
        output += `Resources: ${status.capabilities.resources.length}, `;
        output += `Prompts: ${status.capabilities.prompts.length}\n`;

        if (status.uptime) {
          output += `   Uptime: ${this.formatUptime(status.uptime)}\n`;
        }
      } else if (status.last_error) {
        output += `   Error: ${status.last_error}\n`;
      }

      output += '\n';
    }

    output += '\nLegend: 🟢 Connected  🔴 Disconnected  ⚠️  Error\n';
    output += '        🏠 Local  📁 Project  👤 User';

    return output;
  }

  /**
   * Get detailed server information
   */
  async getServerInfo(name: string): Promise<string> {
    const config = await this.configStore.getServer(name);
    if (!config) {
      return `❌ MCP server '${name}' not found`;
    }

    const status = await this.getServerStatus(name);

    let output = `📊 MCP Server: ${name}\n\n`;
    output += `Transport: ${config.transport}\n`;
    output += `Scope: ${config.scope}\n`;
    output += `Status: ${status.status}\n`;

    if (config.command) {
      output += `Command: ${config.command} ${config.args?.join(' ') || ''}\n`;
    }

    if (config.url) {
      output += `URL: ${config.url}\n`;
    }

    if (status.status === 'connected') {
      output += `\n🔧 Capabilities:\n`;
      output += `  Tools: ${status.capabilities.tools.length}\n`;
      output += `  Resources: ${status.capabilities.resources.length}\n`;
      output += `  Prompts: ${status.capabilities.prompts.length}\n`;

      output += `\n📈 Metrics:\n`;
      output += `  Requests: ${status.metrics.requests_sent}\n`;
      output += `  Responses: ${status.metrics.responses_received}\n`;
      output += `  Errors: ${status.metrics.errors}\n`;
      output += `  Avg Response Time: ${status.metrics.avg_response_time}ms\n`;
    }

    return output;
  }

  /**
   * Remove MCP server
   */
  async removeServer(name: string, scope?: 'local' | 'project' | 'user'): Promise<string> {
    // Disconnect if connected
    if (this.connections.has(name)) {
      await this.disconnectServer(name);
    }

    // Remove from storage
    await this.configStore.removeServer(name, scope);

    // Remove from memory
    this.servers.delete(name);

    return `🗑️  Removed MCP server: ${name}`;
  }

  /**
   * Test MCP server connection
   */
  async testServer(name: string): Promise<string> {
    const connection = this.connections.get(name);
    if (!connection) {
      return `❌ MCP server '${name}' is not connected`;
    }

    try {
      const startTime = Date.now();

      // Test basic ping
      await connection.ping();
      const pingTime = Date.now() - startTime;

      // Test capabilities
      const tools = await connection.listTools();
      const resources = await connection.listResources();
      const prompts = await connection.listPrompts();

      let output = `✅ MCP server '${name}' test passed\n`;
      output += `   Ping time: ${pingTime}ms\n`;
      output += `   Available tools: ${tools.length}\n`;
      output += `   Available resources: ${resources.length}\n`;
      output += `   Available prompts: ${prompts.length}\n`;

      return output;
    } catch (error) {
      return `❌ MCP server '${name}' test failed: ${error.message}`;
    }
  }

  /**
   * Authenticate with remote MCP server
   */
  async authenticateServer(name: string): Promise<string> {
    const config = await this.configStore.getServer(name);
    if (!config) {
      return `❌ MCP server '${name}' not found`;
    }

    if (!config.auth || config.auth.type !== 'oauth2') {
      return `⚠️  MCP server '${name}' does not require OAuth authentication`;
    }

    try {
      const authManager = new OAuth2AuthManager();
      const credentials = await authManager.authenticate(config);

      // Update server configuration with credentials
      config.auth.credentials = credentials;
      await this.configStore.saveServer(config);

      // Reconnect with new credentials
      if (this.connections.has(name)) {
        await this.disconnectServer(name);
        await this.connectServer(name);
      }

      return `🔐 Successfully authenticated with MCP server: ${name}`;
    } catch (error) {
      return `❌ Authentication failed for ${name}: ${error.message}`;
    }
  }

  private async createServer(config: MCPServerConfig): Promise<MCPServer> {
    switch (config.transport) {
      case 'stdio':
        return new StdioMCPServer(config);
      case 'sse':
        return new SSEMCPServer(config);
      case 'http':
        return new HTTPMCPServer(config);
      case 'websocket':
        return new WebSocketMCPServer(config);
      default:
        throw new Error(`Unsupported transport: ${config.transport}`);
    }
  }

  private async establishConnection(server: MCPServer): Promise<MCPConnection> {
    const connection = await server.connect();

    // Initialize MCP protocol
    await connection.initialize({
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
        sampling: {}
      },
      clientInfo: {
        name: 'wilk',
        version: '2.1.0'
      }
    });

    return connection;
  }

  private async initializeCapabilities(name: string, connection: MCPConnection): Promise<void> {
    try {
      // Discover available capabilities
      const [tools, resources, prompts] = await Promise.all([
        connection.listTools(),
        connection.listResources(),
        connection.listPrompts()
      ]);

      // Register capabilities for tool manager
      await this.registerServerCapabilities(name, { tools, resources, prompts });
    } catch (error) {
      console.warn(`Failed to initialize capabilities for ${name}:`, error.message);
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'disconnected': return '🔴';
      case 'error': return '❌';
      case 'timeout': return '⏱️';
      default: return '❓';
    }
  }

  private getScopeIcon(scope: string): string {
    switch (scope) {
      case 'local': return '🏠';
      case 'project': return '📁';
      case 'user': return '👤';
      default: return '❓';
    }
  }
}
```

### CLI Commands for MCP Management

**Wilk MCP Commands Implementation:**

```typescript
class MCPCommands {
  private mcpManager: WilkMCPManager;

  constructor(mcpManager: WilkMCPManager) {
    this.mcpManager = mcpManager;
  }

  /**
   * /mcp add - Add new MCP server
   */
  async addServer(args: string[]): Promise<string> {
    const { name, transport, command, url, options } = this.parseAddArgs(args);

    if (!name) {
      return this.getAddUsage();
    }

    const config: MCPServerConfig = {
      name,
      transport: transport || 'stdio',
      scope: options.scope || 'local',
      trusted: options.trusted || false,
      timeout: options.timeout || 30000,
      retry_attempts: options.retryAttempts || 3,
    };

    // Configure based on transport type
    if (transport === 'stdio') {
      if (!command) {
        return '❌ Command required for stdio transport';
      }
      config.command = command;
      config.args = options.args || [];
      config.env = options.env || {};
      config.working_directory = options.workingDirectory;
    } else {
      if (!url) {
        return `❌ URL required for ${transport} transport`;
      }
      config.url = url;
      config.headers = options.headers || {};

      if (options.auth) {
        config.auth = options.auth;
      }
    }

    try {
      const result = await this.mcpManager.addServer(config);

      // Auto-connect if requested
      if (options.connect) {
        await this.mcpManager.connectServer(name);
        return result + '\n' + (await this.mcpManager.connectServer(name));
      }

      return result;
    } catch (error) {
      return `❌ Failed to add MCP server: ${error.message}`;
    }
  }

  /**
   * /mcp connect - Connect to MCP server
   */
  async connectServer(args: string[]): Promise<string> {
    const [name] = args;

    if (!name) {
      return '❌ Server name required\nUsage: /mcp connect <server_name>';
    }

    try {
      return await this.mcpManager.connectServer(name);
    } catch (error) {
      return `❌ Failed to connect: ${error.message}`;
    }
  }

  /**
   * /mcp disconnect - Disconnect from MCP server
   */
  async disconnectServer(args: string[]): Promise<string> {
    const [name] = args;

    if (!name) {
      return '❌ Server name required\nUsage: /mcp disconnect <server_name>';
    }

    return await this.mcpManager.disconnectServer(name);
  }

  /**
   * /mcp list - List all MCP servers
   */
  async listServers(args: string[]): Promise<string> {
    const [filter] = args;

    if (filter === '--connected') {
      return await this.listConnectedServers();
    } else if (filter === '--available') {
      return await this.listAvailableServers();
    }

    return await this.mcpManager.listServers();
  }

  /**
   * /mcp info - Get detailed server information
   */
  async getServerInfo(args: string[]): Promise<string> {
    const [name] = args;

    if (!name) {
      return '❌ Server name required\nUsage: /mcp info <server_name>';
    }

    return await this.mcpManager.getServerInfo(name);
  }

  /**
   * /mcp test - Test server connection
   */
  async testServer(args: string[]): Promise<string> {
    const [name] = args;

    if (!name) {
      return '❌ Server name required\nUsage: /mcp test <server_name>';
    }

    return await this.mcpManager.testServer(name);
  }

  /**
   * /mcp auth - Authenticate with server
   */
  async authenticateServer(args: string[]): Promise<string> {
    const [name] = args;

    if (!name) {
      return await this.showAuthMenu();
    }

    return await this.mcpManager.authenticateServer(name);
  }

  /**
   * /mcp remove - Remove MCP server
   */
  async removeServer(args: string[]): Promise<string> {
    const [name, ...options] = args;

    if (!name) {
      return '❌ Server name required\nUsage: /mcp remove <server_name> [--scope local|project|user]';
    }

    const scope = this.extractOption(options, '--scope') as 'local' | 'project' | 'user';

    return await this.mcpManager.removeServer(name, scope);
  }

  /**
   * /mcp tools - List available tools from servers
   */
  async listTools(args: string[]): Promise<string> {
    const [serverName] = args;

    if (serverName) {
      return await this.listServerTools(serverName);
    }

    return await this.listAllTools();
  }

  /**
   * /mcp resources - List available resources from servers
   */
  async listResources(args: string[]): Promise<string> {
    const [serverName] = args;

    if (serverName) {
      return await this.listServerResources(serverName);
    }

    return await this.listAllResources();
  }

  /**
   * /mcp prompts - List available prompts from servers
   */
  async listPrompts(args: string[]): Promise<string> {
    const [serverName] = args;

    if (serverName) {
      return await this.listServerPrompts(serverName);
    }

    return await this.listAllPrompts();
  }

  /**
   * /mcp import - Import servers from configuration
   */
  async importServers(args: string[]): Promise<string> {
    const [source] = args;

    switch (source) {
      case 'claude-desktop':
        return await this.importFromClaudeDesktop();
      case 'config':
        return await this.importFromConfig(args[1]);
      case 'json':
        return await this.importFromJSON(args.slice(1).join(' '));
      default:
        return this.getImportUsage();
    }
  }

  private parseAddArgs(args: string[]): any {
    const options: any = { env: {}, args: [], headers: {} };
    let name = '';
    let transport = 'stdio';
    let command = '';
    let url = '';

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--transport' && i + 1 < args.length) {
        transport = args[++i];
      } else if (arg === '--scope' && i + 1 < args.length) {
        options.scope = args[++i];
      } else if (arg === '--env' && i + 1 < args.length) {
        const [key, value] = args[++i].split('=');
        options.env[key] = value;
      } else if (arg === '--header' && i + 1 < args.length) {
        const [key, value] = args[++i].split(':');
        options.headers[key.trim()] = value.trim();
      } else if (arg === '--connect') {
        options.connect = true;
      } else if (arg === '--trusted') {
        options.trusted = true;
      } else if (arg === '--timeout' && i + 1 < args.length) {
        options.timeout = parseInt(args[++i]);
      } else if (arg === '--') {
        // Everything after -- is command and args
        command = args[++i];
        options.args = args.slice(i + 1);
        break;
      } else if (!name) {
        name = arg;
      } else if (!command && !url) {
        if (transport === 'stdio') {
          command = arg;
        } else {
          url = arg;
        }
      } else {
        options.args.push(arg);
      }
    }

    return { name, transport, command, url, options };
  }

  private getAddUsage(): string {
    return (
      `Usage: /mcp add <name> [options] [command|url]\n\n` +
      `Options:\n` +
      `  --transport <stdio|sse|http|websocket>  Transport type (default: stdio)\n` +
      `  --scope <local|project|user>           Configuration scope (default: local)\n` +
      `  --env KEY=VALUE                        Environment variable\n` +
      `  --header KEY:VALUE                     HTTP header (for network transports)\n` +
      `  --connect                              Connect immediately after adding\n` +
      `  --trusted                              Mark server as trusted\n` +
      `  --timeout <ms>                         Connection timeout\n` +
      `  --                                     Everything after is command + args\n\n` +
      `Examples:\n` +
      `  /mcp add github-server --transport sse https://api.github.com/mcp\n` +
      `  /mcp add local-server -- /path/to/server arg1 arg2\n` +
      `  /mcp add db-server --env DB_URL=postgres://... -- python server.py`
    );
  }
}
```

## MCP Tool Integration

### Tool Execution Framework

**MCP Tool Execution:**

```typescript
interface MCPToolCall {
  server: string;
  tool: string;
  arguments: any;
  request_id: string;
}

interface MCPToolResult {
  request_id: string;
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

class MCPToolExecutor {
  private mcpManager: WilkMCPManager;
  private permissionEngine: PermissionEngine;
  private auditLogger: AuditLogger;

  constructor(
    mcpManager: WilkMCPManager,
    permissionEngine: PermissionEngine,
    auditLogger: AuditLogger,
  ) {
    this.mcpManager = mcpManager;
    this.permissionEngine = permissionEngine;
    this.auditLogger = auditLogger;
  }

  /**
   * Execute MCP tool with security validation
   */
  async executeMCPTool(call: MCPToolCall, context: ExecutionContext): Promise<MCPToolResult> {
    const startTime = Date.now();

    try {
      // Validate permissions
      await this.validateToolPermissions(call, context);

      // Get server connection
      const connection = this.mcpManager.getConnection(call.server);
      if (!connection) {
        throw new Error(`MCP server '${call.server}' not connected`);
      }

      // Validate tool exists
      const tools = await connection.listTools();
      const tool = tools.find((t) => t.name === call.tool);
      if (!tool) {
        throw new Error(`Tool '${call.tool}' not found on server '${call.server}'`);
      }

      // Validate arguments against schema
      await this.validateToolArguments(call.arguments, tool.inputSchema);

      // Execute tool on MCP server
      const result = await connection.callTool(call.tool, call.arguments);

      // Process and validate result
      const processedResult = await this.processToolResult(result, context);

      // Log successful execution
      await this.auditLogger.logMCPToolExecution(
        context.agentId,
        call.server,
        call.tool,
        call.arguments,
        {
          success: true,
          execution_time: Date.now() - startTime,
          result_size: JSON.stringify(processedResult.content).length,
        },
      );

      return {
        request_id: call.request_id,
        content: processedResult.content,
        isError: false,
      };
    } catch (error) {
      // Log failed execution
      await this.auditLogger.logMCPToolExecution(
        context.agentId,
        call.server,
        call.tool,
        call.arguments,
        {
          success: false,
          execution_time: Date.now() - startTime,
          error: error.message,
        },
      );

      return {
        request_id: call.request_id,
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Batch execute multiple MCP tools
   */
  async executeBatchMCPTools(
    calls: MCPToolCall[],
    context: ExecutionContext,
  ): Promise<MCPToolResult[]> {
    const results: MCPToolResult[] = [];

    // Execute tools concurrently (with rate limiting)
    const maxConcurrent = 5;
    for (let i = 0; i < calls.length; i += maxConcurrent) {
      const batch = calls.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map((call) => this.executeMCPTool(call, context)),
      );
      results.push(...batchResults);
    }

    return results;
  }

  private async validateToolPermissions(
    call: MCPToolCall,
    context: ExecutionContext,
  ): Promise<void> {
    // Check server access permission
    const serverPermission = await this.permissionEngine.validatePermission(
      context.agentId,
      'mcp_server',
      'use',
      { server: call.server },
    );

    if (!serverPermission.allowed) {
      throw new SecurityError(`Agent not permitted to use MCP server: ${call.server}`);
    }

    // Check tool-specific permission
    const toolPermission = await this.permissionEngine.validatePermission(
      context.agentId,
      'mcp_tool',
      'execute',
      { server: call.server, tool: call.tool },
    );

    if (!toolPermission.allowed) {
      throw new SecurityError(`Agent not permitted to use tool: ${call.tool}`);
    }
  }

  private async validateToolArguments(args: any, schema: any): Promise<void> {
    if (!schema) return;

    const validator = new JSONSchemaValidator();
    const validation = validator.validate(args, schema);

    if (!validation.valid) {
      throw new Error(`Invalid tool arguments: ${validation.errors.join(', ')}`);
    }
  }

  private async processToolResult(
    result: any,
    context: ExecutionContext,
  ): Promise<{ content: any[] }> {
    // Security: scan result for sensitive information
    const scannedContent = await this.scanResultContent(result.content);

    // Apply output filtering based on agent permissions
    const filteredContent = await this.applyOutputFilters(scannedContent, context);

    return { content: filteredContent };
  }

  private async scanResultContent(content: any[]): Promise<any[]> {
    // Scan for sensitive information (API keys, passwords, etc.)
    const scanner = new SensitiveDataScanner();

    return content.map((item) => {
      if (item.type === 'text' && item.text) {
        const scanResult = scanner.scan(item.text);
        if (scanResult.hasSensitiveData) {
          return {
            ...item,
            text: scanResult.redactedText,
            _security_warning: 'Sensitive data was redacted from this result',
          };
        }
      }
      return item;
    });
  }
}
```

### Resource Management

**MCP Resource Integration:**

```typescript
interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  metadata?: Record<string, any>;
}

interface MCPResourceContent {
  uri: string;
  mimeType: string;
  content: string | ArrayBuffer;
  metadata?: Record<string, any>;
}

class MCPResourceManager {
  private mcpManager: WilkMCPManager;
  private cache: ResourceCache;
  private permissionEngine: PermissionEngine;

  constructor(mcpManager: WilkMCPManager, permissionEngine: PermissionEngine) {
    this.mcpManager = mcpManager;
    this.cache = new ResourceCache();
    this.permissionEngine = permissionEngine;
  }

  /**
   * List resources from all connected MCP servers
   */
  async listAllResources(context: ExecutionContext): Promise<MCPResource[]> {
    const allResources: MCPResource[] = [];
    const connections = this.mcpManager.getActiveConnections();

    for (const [serverName, connection] of connections) {
      try {
        // Check permission to access server resources
        const permission = await this.permissionEngine.validatePermission(
          context.agentId,
          'mcp_resource',
          'list',
          { server: serverName },
        );

        if (permission.allowed) {
          const resources = await connection.listResources();
          // Add server context to each resource
          const serverResources = resources.map((resource) => ({
            ...resource,
            uri: `${serverName}:${resource.uri}`,
            metadata: {
              ...resource.metadata,
              server: serverName,
            },
          }));
          allResources.push(...serverResources);
        }
      } catch (error) {
        console.warn(`Failed to list resources from ${serverName}:`, error.message);
      }
    }

    return allResources;
  }

  /**
   * Read resource content with caching
   */
  async readResource(uri: string, context: ExecutionContext): Promise<MCPResourceContent> {
    // Parse server and resource URI
    const { serverName, resourceUri } = this.parseResourceURI(uri);

    // Check cache first
    const cacheKey = `${serverName}:${resourceUri}`;
    const cached = await this.cache.get(cacheKey);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.content;
    }

    // Validate permissions
    await this.validateResourceAccess(serverName, resourceUri, context);

    // Get server connection
    const connection = this.mcpManager.getConnection(serverName);
    if (!connection) {
      throw new Error(`MCP server '${serverName}' not connected`);
    }

    try {
      // Read resource from server
      const content = await connection.readResource(resourceUri);

      // Cache the result
      await this.cache.set(cacheKey, {
        content,
        timestamp: Date.now(),
        ttl: this.getResourceCacheTTL(resourceUri),
      });

      return content;
    } catch (error) {
      throw new Error(`Failed to read resource ${uri}: ${error.message}`);
    }
  }

  /**
   * Search resources across all servers
   */
  async searchResources(
    query: string,
    context: ExecutionContext,
    options: {
      serverFilter?: string[];
      mimeTypeFilter?: string[];
      limit?: number;
    } = {},
  ): Promise<MCPResource[]> {
    const allResources = await this.listAllResources(context);

    // Apply filters
    let filteredResources = allResources;

    if (options.serverFilter) {
      filteredResources = filteredResources.filter((resource) =>
        options.serverFilter!.some((server) => resource.metadata?.server === server),
      );
    }

    if (options.mimeTypeFilter) {
      filteredResources = filteredResources.filter((resource) =>
        options.mimeTypeFilter!.includes(resource.mimeType || ''),
      );
    }

    // Search by query
    const searchResults = filteredResources.filter((resource) => {
      const searchText =
        `${resource.name} ${resource.description || ''} ${resource.uri}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });

    // Sort by relevance and apply limit
    const sortedResults = this.sortResourcesByRelevance(searchResults, query);

    return options.limit ? sortedResults.slice(0, options.limit) : sortedResults;
  }

  /**
   * Resource autocomplete for @ mentions
   */
  async getResourceCompletions(
    prefix: string,
    context: ExecutionContext,
  ): Promise<Array<{ uri: string; label: string; description?: string }>> {
    const resources = await this.listAllResources(context);

    const completions = resources
      .filter((resource) => {
        const searchText = `${resource.name} ${resource.uri}`.toLowerCase();
        return searchText.includes(prefix.toLowerCase());
      })
      .map((resource) => ({
        uri: resource.uri,
        label: resource.name,
        description: resource.description,
      }))
      .slice(0, 20); // Limit completions

    return completions;
  }

  private parseResourceURI(uri: string): { serverName: string; resourceUri: string } {
    const colonIndex = uri.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid resource URI format: ${uri}`);
    }

    return {
      serverName: uri.substring(0, colonIndex),
      resourceUri: uri.substring(colonIndex + 1),
    };
  }

  private async validateResourceAccess(
    serverName: string,
    resourceUri: string,
    context: ExecutionContext,
  ): Promise<void> {
    const permission = await this.permissionEngine.validatePermission(
      context.agentId,
      'mcp_resource',
      'read',
      { server: serverName, resource: resourceUri },
    );

    if (!permission.allowed) {
      throw new SecurityError(`Agent not permitted to read resource: ${resourceUri}`);
    }
  }

  private sortResourcesByRelevance(resources: MCPResource[], query: string): MCPResource[] {
    return resources.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, query);
      const bScore = this.calculateRelevanceScore(b, query);
      return bScore - aScore;
    });
  }

  private calculateRelevanceScore(resource: MCPResource, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Name match (highest weight)
    if (resource.name.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // URI match
    if (resource.uri.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // Description match
    if (resource.description?.toLowerCase().includes(queryLower)) {
      score += 3;
    }

    return score;
  }
}
```

### Prompt Management

**MCP Prompt Integration:**

```typescript
interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

interface MCPPromptResult {
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text';
      text: string;
    };
  }>;
}

class MCPPromptManager {
  private mcpManager: WilkMCPManager;
  private permissionEngine: PermissionEngine;

  constructor(mcpManager: WilkMCPManager, permissionEngine: PermissionEngine) {
    this.mcpManager = mcpManager;
    this.permissionEngine = permissionEngine;
  }

  /**
   * List all available prompts from connected servers
   */
  async listAllPrompts(context: ExecutionContext): Promise<Array<MCPPrompt & { server: string }>> {
    const allPrompts: Array<MCPPrompt & { server: string }> = [];
    const connections = this.mcpManager.getActiveConnections();

    for (const [serverName, connection] of connections) {
      try {
        // Check permission to access server prompts
        const permission = await this.permissionEngine.validatePermission(
          context.agentId,
          'mcp_prompt',
          'list',
          { server: serverName },
        );

        if (permission.allowed) {
          const prompts = await connection.listPrompts();
          const serverPrompts = prompts.map((prompt) => ({
            ...prompt,
            server: serverName,
          }));
          allPrompts.push(...serverPrompts);
        }
      } catch (error) {
        console.warn(`Failed to list prompts from ${serverName}:`, error.message);
      }
    }

    return allPrompts;
  }

  /**
   * Execute MCP prompt as slash command
   */
  async executePrompt(
    serverName: string,
    promptName: string,
    args: Record<string, any>,
    context: ExecutionContext,
  ): Promise<MCPPromptResult> {
    // Validate permissions
    await this.validatePromptAccess(serverName, promptName, context);

    // Get server connection
    const connection = this.mcpManager.getConnection(serverName);
    if (!connection) {
      throw new Error(`MCP server '${serverName}' not connected`);
    }

    try {
      // Get prompt definition
      const prompts = await connection.listPrompts();
      const prompt = prompts.find((p) => p.name === promptName);

      if (!prompt) {
        throw new Error(`Prompt '${promptName}' not found on server '${serverName}'`);
      }

      // Validate arguments
      await this.validatePromptArguments(args, prompt);

      // Execute prompt
      const result = await connection.getPrompt(promptName, args);

      return result;
    } catch (error) {
      throw new Error(`Failed to execute prompt ${promptName}: ${error.message}`);
    }
  }

  /**
   * Generate slash commands from MCP prompts
   */
  async generateSlashCommands(context: ExecutionContext): Promise<
    Array<{
      command: string;
      description: string;
      server: string;
      prompt: string;
    }>
  > {
    const prompts = await this.listAllPrompts(context);

    return prompts.map((prompt) => ({
      command: `/mcp__${prompt.server}__${prompt.name}`,
      description: prompt.description || `Execute ${prompt.name} prompt from ${prompt.server}`,
      server: prompt.server,
      prompt: prompt.name,
    }));
  }

  /**
   * Parse and execute slash command for MCP prompt
   */
  async executeSlashCommand(
    command: string,
    args: string[],
    context: ExecutionContext,
  ): Promise<string> {
    // Parse MCP slash command format: /mcp__server__prompt
    const match = command.match(/^\/mcp__(.+)__(.+)$/);
    if (!match) {
      throw new Error(`Invalid MCP slash command format: ${command}`);
    }

    const [, serverName, promptName] = match;

    // Parse arguments
    const promptArgs = this.parsePromptArguments(args);

    try {
      // Execute prompt
      const result = await this.executePrompt(serverName, promptName, promptArgs, context);

      // Format result for conversation
      return this.formatPromptResult(result);
    } catch (error) {
      return `❌ Failed to execute prompt: ${error.message}`;
    }
  }

  private async validatePromptAccess(
    serverName: string,
    promptName: string,
    context: ExecutionContext,
  ): Promise<void> {
    const permission = await this.permissionEngine.validatePermission(
      context.agentId,
      'mcp_prompt',
      'execute',
      { server: serverName, prompt: promptName },
    );

    if (!permission.allowed) {
      throw new SecurityError(`Agent not permitted to execute prompt: ${promptName}`);
    }
  }

  private async validatePromptArguments(
    args: Record<string, any>,
    prompt: MCPPrompt,
  ): Promise<void> {
    if (!prompt.arguments) return;

    // Check required arguments
    for (const arg of prompt.arguments) {
      if (arg.required && !(arg.name in args)) {
        throw new Error(`Missing required argument: ${arg.name}`);
      }
    }
  }

  private parsePromptArguments(args: string[]): Record<string, any> {
    const parsedArgs: Record<string, any> = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        // Named argument: --key value
        const key = arg.substring(2);
        if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          parsedArgs[key] = args[++i];
        } else {
          parsedArgs[key] = true; // Flag argument
        }
      } else {
        // Positional argument
        const argIndex = Object.keys(parsedArgs).length;
        parsedArgs[`arg${argIndex}`] = arg;
      }
    }

    return parsedArgs;
  }

  private formatPromptResult(result: MCPPromptResult): string {
    let output = '';

    if (result.description) {
      output += `${result.description}\n\n`;
    }

    for (const message of result.messages) {
      if (message.role === 'user') {
        output += `**User:** ${message.content.text}\n\n`;
      } else {
        output += `**Assistant:** ${message.content.text}\n\n`;
      }
    }

    return output.trim();
  }
}
```

## Configuration Examples

### Project-Level MCP Configuration

```json
{
  "mcpServers": {
    "github-api": {
      "transport": "sse",
      "url": "https://api.github.com/mcp",
      "headers": {
        "Authorization": "Bearer ${GITHUB_TOKEN}"
      },
      "scope": "project",
      "trusted": true
    },
    "database-tools": {
      "transport": "stdio",
      "command": "python",
      "args": ["/path/to/db-mcp-server.py"],
      "env": {
        "DATABASE_URL": "${DB_URL}"
      },
      "scope": "project"
    },
    "file-operations": {
      "transport": "stdio",
      "command": "/usr/local/bin/file-mcp-server",
      "args": ["--workspace", "./"],
      "scope": "local"
    }
  }
}
```

### User-Level Global Configuration

```yaml
# ~/.wilk/config/mcp.yaml
mcp:
  global_servers:
    personal-notes:
      transport: stdio
      command: python
      args: ['/Users/me/tools/notes-mcp-server.py']
      env:
        NOTES_DIR: '/Users/me/Documents/notes'

    web-search:
      transport: sse
      url: 'https://search-api.example.com/mcp'
      headers:
        X-API-Key: '${SEARCH_API_KEY}'

  security:
    require_approval_for_project_servers: true
    sandbox_untrusted_servers: true
    audit_all_mcp_calls: true

  performance:
    connection_timeout: 30000
    max_concurrent_connections: 10
    health_check_interval: 60000
```

## Security and Trust Model

### MCP Security Framework

```typescript
class MCPSecurityManager {
  private trustStore: TrustStore;
  private sandboxManager: SandboxManager;

  async validateServer(config: MCPServerConfig): Promise<void> {
    // Check if server is in trust store
    const trustLevel = await this.trustStore.getTrustLevel(config);

    if (trustLevel === 'blocked') {
      throw new SecurityError(`MCP server is blocked: ${config.name}`);
    }

    if (trustLevel === 'untrusted' && !config.sandbox) {
      throw new SecurityError(`Untrusted MCP server requires sandboxing: ${config.name}`);
    }

    // Validate transport security
    await this.validateTransportSecurity(config);

    // Check for suspicious patterns
    await this.scanForSuspiciousPatterns(config);
  }

  private async validateTransportSecurity(config: MCPServerConfig): Promise<void> {
    if (config.transport === 'http' && config.url?.startsWith('http://')) {
      throw new SecurityError('HTTP transport not allowed, use HTTPS');
    }

    if (config.transport === 'stdio' && config.command?.includes('../')) {
      throw new SecurityError('Path traversal in command not allowed');
    }
  }
}
```

This comprehensive MCP integration provides Wilk with powerful external tool and data source capabilities while maintaining security, performance, and usability standards expected in a production CLI agent system.
