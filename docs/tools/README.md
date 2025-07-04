# Wilk Tool Integration Framework

## Overview

Wilk provides a comprehensive tool integration framework that leverages LibreChat's proven tool system while adding CLI-specific capabilities. The framework supports Model Context Protocol (MCP) servers, shell commands, file operations, and external API integrations.

## Tool Architecture

```
Wilk Tool Integration Architecture
┌─────────────────────────────────────────────────────────────┐
│                    Agent Layer                              │
├─────────────────────────────────────────────────────────────┤
│ Agent Requests │ Tool Selection │ Result Processing         │
├─────────────────────────────────────────────────────────────┤
│                 Tool Orchestration Layer                    │
├─────────────────────────────────────────────────────────────┤
│ Tool Manager │ Permission Check │ Execution Context         │
├─────────────────────────────────────────────────────────────┤
│                LibreChat Tool Foundation                    │
├─────────────────────────────────────────────────────────────┤
│ Tool Loading │ Tool Registry │ Tool Configuration           │
├─────────────────────────────────────────────────────────────┤
│                   Tool Implementations                      │
├─────────────────────────────────────────────────────────────┤
│ MCP Servers │ Shell Tools │ File Tools │ API Tools          │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure                            │
├─────────────────────────────────────────────────────────────┤
│ Local System │ External APIs │ Sandboxed Execution          │
└─────────────────────────────────────────────────────────────┘
```

## Core Tool Categories

### 1. LibreChat Foundation Tools

**Inherited Tools from LibreChat:**

```typescript
interface LibreChatTools {
  // Core file operations
  file_search: {
    description: 'Search for files and content within files';
    permissions: ['filesystem:read'];
    parameters: {
      query: string;
      file_types?: string[];
      max_results?: number;
    };
  };

  // Code execution
  execute_code: {
    description: 'Execute code in various languages';
    permissions: ['shell:execute'];
    parameters: {
      language: string;
      code: string;
      timeout?: number;
    };
  };

  // Web search capabilities
  web_search: {
    description: 'Search the web for information';
    permissions: ['network:https'];
    parameters: {
      query: string;
      num_results?: number;
      time_range?: string;
    };
  };

  // File operations
  file_operations: {
    description: 'Read, write, and manipulate files';
    permissions: ['filesystem:read', 'filesystem:write'];
    parameters: {
      operation: 'read' | 'write' | 'append' | 'delete';
      path: string;
      content?: string;
    };
  };
}
```

**LibreChat Tool Integration:**

```typescript
// Adapts LibreChat's tool loading system for CLI
class WilkToolManager {
  private libreChatToolManager: ToolManager; // From LibreChat
  private wilkToolRegistry: Map<string, WilkTool>;
  private permissionEngine: PermissionEngine;

  constructor() {
    this.libreChatToolManager = new ToolManager();
    this.wilkToolRegistry = new Map();
    this.permissionEngine = new PermissionEngine();

    this.loadLibreChatTools();
    this.loadWilkSpecificTools();
  }

  private loadLibreChatTools(): void {
    // Import existing LibreChat tools
    const tools = [
      require('~/tools/file_search'),
      require('~/tools/execute_code'),
      require('~/tools/web_search'),
      require('~/tools/file_operations'),
    ];

    for (const tool of tools) {
      this.wilkToolRegistry.set(tool.name, this.adaptLibreChatTool(tool));
    }
  }

  private adaptLibreChatTool(libreChatTool: any): WilkTool {
    return {
      name: libreChatTool.name,
      description: libreChatTool.description,
      parameters: libreChatTool.parameters,
      permissions: this.inferPermissions(libreChatTool),
      execute: async (params: any, context: ExecutionContext) => {
        // Add permission checking wrapper
        await this.checkPermissions(libreChatTool.name, context);

        // Execute original LibreChat tool
        return await libreChatTool.execute(params, this.adaptContext(context));
      },
    };
  }

  async loadAgentTools(agentId: string): Promise<WilkTool[]> {
    const agent = await this.storage.getAgent(agentId);
    const tools: WilkTool[] = [];

    for (const toolName of agent.tools) {
      const tool = this.wilkToolRegistry.get(toolName);
      if (tool) {
        // Validate agent has permission to use this tool
        const hasPermission = await this.permissionEngine.validateToolAccess(agentId, toolName);

        if (hasPermission) {
          tools.push(tool);
        }
      }
    }

    return tools;
  }
}
```

### 2. Model Context Protocol (MCP) Integration

Wilk provides comprehensive MCP integration following the Claude Code patterns for server management, tool execution, resource access, and prompt handling.

**Key MCP Features:**

- **Multiple Transport Support**: STDIO, SSE, HTTP, and WebSocket
- **Scope Management**: Local, project, and user-level server configurations
- **Security Framework**: Trust validation, sandboxing, and permission controls
- **Resource Integration**: @ mention support for MCP resources
- **Prompt as Slash Commands**: `/mcp__server__prompt` format
- **OAuth2 Authentication**: Secure connection to remote MCP servers

**Quick MCP Setup:**

```bash
# Add MCP server (stdio transport)
wilk> /mcp add github-tools -- python /path/to/github-mcp-server.py

# Add MCP server (SSE transport)
wilk> /mcp add github-api --transport sse https://api.github.com/mcp

# Connect to server
wilk> /mcp connect github-tools

# List available tools
wilk> /mcp tools github-tools

# Execute MCP prompt as slash command
wilk> /mcp__github__create_issue "Bug in login" high
```

**MCP Server Configuration Example:**

```typescript
interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'sse' | 'http' | 'websocket';
  scope: 'local' | 'project' | 'user';

  // STDIO configuration
  command?: string;
  args?: string[];
  env?: Record<string, string>;

  // Network configuration
  url?: string;
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'oauth2' | 'api_key';
    credentials?: any;
  };

  // Security settings
  trusted: boolean;
  sandbox?: boolean;
  permissions?: string[];
}
```

For comprehensive MCP implementation details, see **[MCP Integration Guide](mcp-integration.md)**.

### 3. Shell Integration Tools

**Safe Shell Execution:**

```typescript
interface ShellExecutionConfig {
  allowed_commands: string[];
  blocked_commands: string[];
  allowed_interpreters: string[];
  working_directories: string[];
  environment_variables: Record<string, string>;
  resource_limits: {
    max_execution_time: number;
    max_memory_usage: string;
    max_cpu_usage: number;
  };
}

class WilkShellTool {
  private config: ShellExecutionConfig;
  private sandboxManager: SandboxManager;
  private auditLogger: AuditLogger;

  async execute(params: ShellParams, context: ExecutionContext): Promise<ShellResult> {
    const { command, args = [], working_directory, timeout } = params;

    // Validate command against security policies
    await this.validateCommand(command, args, context);

    // Create execution environment
    const sandbox = await this.sandboxManager.createShellSandbox(context.agentId, this.config);

    try {
      // Execute command in sandbox
      const result = await sandbox.executeCommand(command, args, {
        working_directory: working_directory || process.cwd(),
        timeout: timeout || this.config.resource_limits.max_execution_time,
        env: this.config.environment_variables,
      });

      // Log execution
      await this.auditLogger.logShellExecution(context.agentId, command, args, result);

      return {
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exit_code: result.exitCode,
        execution_time: result.executionTime,
      };
    } finally {
      // Clean up sandbox
      await this.sandboxManager.destroySandbox(sandbox.getId());
    }
  }

  private async validateCommand(
    command: string,
    args: string[],
    context: ExecutionContext,
  ): Promise<void> {
    const fullCommand = `${command} ${args.join(' ')}`;

    // Check against blocked commands
    for (const blocked of this.config.blocked_commands) {
      if (this.matchesPattern(fullCommand, blocked)) {
        throw new SecurityError(`Blocked command: ${fullCommand}`);
      }
    }

    // Check against allowed commands
    const isAllowed = this.config.allowed_commands.some((allowed) =>
      this.matchesPattern(fullCommand, allowed),
    );

    if (!isAllowed) {
      throw new SecurityError(`Command not in allowed list: ${fullCommand}`);
    }

    // Validate interpreter if specified
    if (this.isInterpreterCommand(command)) {
      if (!this.config.allowed_interpreters.includes(command)) {
        throw new SecurityError(`Interpreter not allowed: ${command}`);
      }
    }
  }

  private matchesPattern(command: string, pattern: string): boolean {
    // Convert shell glob pattern to regex
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(command);
  }
}
```

### 4. File System Tools

**Secure File Operations:**

```typescript
class WilkFileSystemTool {
  private permissionEngine: PermissionEngine;
  private auditLogger: AuditLogger;

  async readFile(params: FileReadParams, context: ExecutionContext): Promise<FileResult> {
    const { path, encoding = 'utf8', max_size } = params;

    // Validate file access permissions
    await this.validateFileAccess(path, 'read', context);

    try {
      // Check file size limits
      const stats = await fs.stat(path);
      if (max_size && stats.size > max_size) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${max_size})`);
      }

      // Read file content
      const content = await fs.readFile(path, encoding);

      // Log file access
      await this.auditLogger.logFileAccess(context.agentId, 'read', path, { size: stats.size });

      return {
        success: true,
        content,
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      await this.auditLogger.logFileAccessError(context.agentId, 'read', path, error.message);

      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async writeFile(params: FileWriteParams, context: ExecutionContext): Promise<FileResult> {
    const { path, content, encoding = 'utf8', mode = 'overwrite' } = params;

    // Validate file access permissions
    await this.validateFileAccess(path, 'write', context);

    try {
      // Validate file extension
      await this.validateFileExtension(path, context);

      // Ensure directory exists
      const directory = dirname(path);
      await fs.mkdir(directory, { recursive: true });

      // Write file based on mode
      if (mode === 'append') {
        await fs.appendFile(path, content, encoding);
      } else {
        await fs.writeFile(path, content, encoding);
      }

      // Get file stats
      const stats = await fs.stat(path);

      // Log file write
      await this.auditLogger.logFileAccess(context.agentId, 'write', path, {
        size: stats.size,
        mode,
      });

      return {
        success: true,
        size: stats.size,
        modified: stats.mtime,
      };
    } catch (error) {
      await this.auditLogger.logFileAccessError(context.agentId, 'write', path, error.message);

      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async searchFiles(params: FileSearchParams, context: ExecutionContext): Promise<SearchResult> {
    const { pattern, directory = '.', include_content = false, max_results = 100 } = params;

    // Validate directory access
    await this.validateFileAccess(directory, 'read', context);

    try {
      const results: FileMatch[] = [];

      // Search for files
      const files = await this.findFiles(directory, pattern);

      for (const file of files.slice(0, max_results)) {
        const match: FileMatch = {
          path: file,
          size: (await fs.stat(file)).size,
          modified: (await fs.stat(file)).mtime,
        };

        // Include content if requested
        if (include_content) {
          const content = await fs.readFile(file, 'utf8');
          match.content = content;
          match.matches = this.findContentMatches(content, pattern);
        }

        results.push(match);
      }

      return {
        success: true,
        results,
        total_found: files.length,
      };
    } catch (error) {
      throw new Error(`File search failed: ${error.message}`);
    }
  }

  private async validateFileAccess(
    path: string,
    operation: 'read' | 'write' | 'delete',
    context: ExecutionContext,
  ): Promise<void> {
    const permission = await this.permissionEngine.validatePermission(
      context.agentId,
      'file',
      operation,
      { path },
    );

    if (!permission.allowed) {
      throw new SecurityError(`File ${operation} not permitted: ${path}`);
    }
  }

  private async validateFileExtension(path: string, context: ExecutionContext): Promise<void> {
    const agent = await this.getAgent(context.agentId);
    const allowedExtensions = agent.permissions.filesystem.metadata?.allowed_extensions;

    if (allowedExtensions) {
      const extension = extname(path);
      if (!allowedExtensions.includes(extension)) {
        throw new SecurityError(`File extension not allowed: ${extension}`);
      }
    }
  }
}
```

### 5. RAG (Retrieval-Augmented Generation) Tools

**Vector Database Integration:**

````typescript
interface RAGToolConfig {
  vector_db: {
    provider: 'chromadb' | 'pinecone' | 'weaviate' | 'qdrant' | 'local';
    url?: string;
    api_key?: string;
    collection_name: string;
    embedding_model: string;
    dimensions: number;
  };
  search: {
    similarity_threshold: number;
    max_results: number;
    rerank_model?: string;
    include_metadata: boolean;
  };
  indexing: {
    chunk_size: number;
    chunk_overlap: number;
    auto_index: boolean;
    content_filters: string[];
  };
}

interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    chunk_index: number;
    total_chunks: number;
    created_at: Date;
    embedding_model: string;
    [key: string]: any;
  };
  embedding?: number[];
  score?: number;
}

interface RAGSearchResult {
  chunks: DocumentChunk[];
  total_found: number;
  search_time: number;
  query_embedding_time: number;
  rerank_time?: number;
}

class WilkRAGTool {
  private vectorDb: VectorDatabase;
  private embeddingService: EmbeddingService;
  private chunkingService: ChunkingService;
  private rerankService?: RerankService;
  private config: RAGToolConfig;

  constructor(config: RAGToolConfig) {
    this.config = config;
    this.vectorDb = this.createVectorDatabase(config.vector_db);
    this.embeddingService = new EmbeddingService(config.vector_db.embedding_model);
    this.chunkingService = new ChunkingService(config.indexing);

    if (config.search.rerank_model) {
      this.rerankService = new RerankService(config.search.rerank_model);
    }
  }

  /**
   * Index documents for RAG retrieval
   */
  async indexDocuments(
    params: {
      documents: Array<{
        content: string;
        metadata: Record<string, any>;
        source: string;
      }>;
      collection_name?: string;
      batch_size?: number;
    },
    context: ExecutionContext,
  ): Promise<ToolResult> {
    await this.validatePermission('rag:index', context);

    const { documents, collection_name, batch_size = 100 } = params;
    const collectionName = collection_name || this.config.vector_db.collection_name;

    try {
      const startTime = performance.now();
      let totalChunks = 0;

      // Process documents in batches
      for (let i = 0; i < documents.length; i += batch_size) {
        const batch = documents.slice(i, i + batch_size);
        const batchChunks: DocumentChunk[] = [];

        for (const doc of batch) {
          // Apply content filters
          const filteredContent = await this.applyContentFilters(doc.content);

          // Chunk the document
          const chunks = await this.chunkingService.chunkDocument({
            content: filteredContent,
            source: doc.source,
            metadata: doc.metadata,
          });

          // Generate embeddings for chunks
          for (const chunk of chunks) {
            const embedding = await this.embeddingService.generateEmbedding(chunk.content);
            chunk.embedding = embedding;
            batchChunks.push(chunk);
          }
        }

        // Store batch in vector database
        await this.vectorDb.upsert(collectionName, batchChunks);
        totalChunks += batchChunks.length;

        // Progress update for large batches
        if (documents.length > 10) {
          console.log(
            `Indexed batch ${i / batch_size + 1}/${Math.ceil(documents.length / batch_size)}`,
          );
        }
      }

      const indexingTime = performance.now() - startTime;

      return {
        success: true,
        content: `Indexed ${documents.length} documents into ${totalChunks} chunks`,
        metadata: {
          documents_indexed: documents.length,
          chunks_created: totalChunks,
          indexing_time_ms: indexingTime,
          collection: collectionName,
        },
      };
    } catch (error) {
      return {
        success: false,
        content: `RAG indexing failed: ${error.message}`,
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Search RAG database for relevant content
   */
  async searchRAG(
    params: {
      query: string;
      collection_name?: string;
      max_results?: number;
      similarity_threshold?: number;
      filter_metadata?: Record<string, any>;
      include_embeddings?: boolean;
    },
    context: ExecutionContext,
  ): Promise<ToolResult> {
    await this.validatePermission('rag:search', context);

    const {
      query,
      collection_name,
      max_results = this.config.search.max_results,
      similarity_threshold = this.config.search.similarity_threshold,
      filter_metadata,
      include_embeddings = false,
    } = params;

    const collectionName = collection_name || this.config.vector_db.collection_name;

    try {
      const startTime = performance.now();

      // Generate query embedding
      const queryEmbeddingStart = performance.now();
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const queryEmbeddingTime = performance.now() - queryEmbeddingStart;

      // Search vector database
      const searchResults = await this.vectorDb.search({
        collection: collectionName,
        vector: queryEmbedding,
        limit: max_results * 2, // Get more for reranking
        threshold: similarity_threshold,
        filter: filter_metadata,
      });

      let finalResults = searchResults;
      let rerankTime = 0;

      // Apply reranking if configured
      if (this.rerankService && searchResults.length > 1) {
        const rerankStart = performance.now();
        finalResults = await this.rerankService.rerank({
          query,
          documents: searchResults,
          top_k: max_results,
        });
        rerankTime = performance.now() - rerankStart;
      } else {
        finalResults = searchResults.slice(0, max_results);
      }

      // Clean up embeddings if not requested
      if (!include_embeddings) {
        finalResults.forEach((chunk) => delete chunk.embedding);
      }

      const totalTime = performance.now() - startTime;

      // Format results for LLM consumption
      const formattedContent = this.formatRAGResults(finalResults, query);

      return {
        success: true,
        content: formattedContent,
        metadata: {
          total_found: finalResults.length,
          search_time_ms: totalTime,
          query_embedding_time_ms: queryEmbeddingTime,
          rerank_time_ms: rerankTime,
          collection: collectionName,
          similarity_scores: finalResults.map((r) => r.score || 0),
        },
      };
    } catch (error) {
      return {
        success: false,
        content: `RAG search failed: ${error.message}`,
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Semantic search with context-aware retrieval
   */
  async semanticSearch(
    params: {
      query: string;
      context?: string;
      collection_name?: string;
      search_strategy?: 'similarity' | 'mmr' | 'hybrid';
      diversity_lambda?: number;
      temporal_weight?: number;
    },
    context: ExecutionContext,
  ): Promise<ToolResult> {
    await this.validatePermission('rag:search', context);

    const {
      query,
      context: searchContext,
      collection_name,
      search_strategy = 'similarity',
      diversity_lambda = 0.5,
      temporal_weight = 0.1,
    } = params;

    try {
      // Enhance query with context if provided
      const enhancedQuery = searchContext ? `Context: ${searchContext}\n\nQuery: ${query}` : query;

      // Generate contextual embedding
      const queryEmbedding = await this.embeddingService.generateEmbedding(enhancedQuery);

      let results: DocumentChunk[];

      switch (search_strategy) {
        case 'mmr':
          results = await this.maximalMarginalRelevanceSearch({
            embedding: queryEmbedding,
            collection: collection_name || this.config.vector_db.collection_name,
            lambda: diversity_lambda,
          });
          break;

        case 'hybrid':
          results = await this.hybridSearch({
            query: enhancedQuery,
            embedding: queryEmbedding,
            collection: collection_name || this.config.vector_db.collection_name,
            temporal_weight,
          });
          break;

        case 'similarity':
        default:
          const searchResults = await this.vectorDb.search({
            collection: collection_name || this.config.vector_db.collection_name,
            vector: queryEmbedding,
            limit: this.config.search.max_results,
          });
          results = searchResults;
          break;
      }

      // Format results with enhanced context
      const formattedContent = this.formatSemanticResults(results, query, searchContext);

      return {
        success: true,
        content: formattedContent,
        metadata: {
          search_strategy,
          results_count: results.length,
          query_enhanced: !!searchContext,
        },
      };
    } catch (error) {
      return {
        success: false,
        content: `Semantic search failed: ${error.message}`,
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Generate RAG-enhanced response
   */
  async generateRAGResponse(
    params: {
      query: string;
      context?: string;
      collection_name?: string;
      response_style?: 'concise' | 'detailed' | 'technical';
      include_sources?: boolean;
      max_context_length?: number;
    },
    context: ExecutionContext,
  ): Promise<ToolResult> {
    await this.validatePermission('rag:generate', context);

    const {
      query,
      context: userContext,
      collection_name,
      response_style = 'detailed',
      include_sources = true,
      max_context_length = 4000,
    } = params;

    try {
      // Search for relevant content
      const searchResult = await this.searchRAG(
        {
          query,
          collection_name,
          max_results: 10,
        },
        context,
      );

      if (!searchResult.success) {
        return searchResult;
      }

      // Extract retrieved content
      const retrievedChunks = JSON.parse(searchResult.content).chunks as DocumentChunk[];

      // Build context from retrieved content
      const ragContext = this.buildRAGContext(retrievedChunks, max_context_length);

      // Create enhanced prompt
      const enhancedPrompt = this.createRAGPrompt({
        query,
        context: ragContext,
        userContext,
        style: response_style,
        includeSources: include_sources,
      });

      return {
        success: true,
        content: enhancedPrompt,
        metadata: {
          rag_context_length: ragContext.length,
          sources_count: retrievedChunks.length,
          response_style,
          sources: include_sources
            ? retrievedChunks.map((c) => ({
                source: c.metadata.source,
                score: c.score,
              }))
            : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        content: `RAG response generation failed: ${error.message}`,
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Manage RAG collections
   */
  async manageCollection(
    params: {
      action: 'create' | 'delete' | 'list' | 'stats' | 'update';
      collection_name?: string;
      config?: Partial<RAGToolConfig>;
    },
    context: ExecutionContext,
  ): Promise<ToolResult> {
    await this.validatePermission('rag:manage', context);

    const { action, collection_name, config } = params;

    try {
      switch (action) {
        case 'create':
          if (!collection_name) {
            throw new Error('Collection name required for create action');
          }
          await this.vectorDb.createCollection(collection_name, {
            dimension: this.config.vector_db.dimensions,
            metric: 'cosine',
          });
          return {
            success: true,
            content: `Created RAG collection: ${collection_name}`,
          };

        case 'delete':
          if (!collection_name) {
            throw new Error('Collection name required for delete action');
          }
          await this.vectorDb.deleteCollection(collection_name);
          return {
            success: true,
            content: `Deleted RAG collection: ${collection_name}`,
          };

        case 'list':
          const collections = await this.vectorDb.listCollections();
          return {
            success: true,
            content: `RAG Collections: ${collections.join(', ')}`,
            metadata: { collections },
          };

        case 'stats':
          if (!collection_name) {
            throw new Error('Collection name required for stats action');
          }
          const stats = await this.vectorDb.getCollectionStats(collection_name);
          return {
            success: true,
            content: `Collection ${collection_name} statistics`,
            metadata: stats,
          };

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return {
        success: false,
        content: `Collection management failed: ${error.message}`,
        metadata: { error: error.message },
      };
    }
  }

  private formatRAGResults(chunks: DocumentChunk[], query: string): string {
    if (chunks.length === 0) {
      return `No relevant content found for query: "${query}"`;
    }

    let formatted = `Found ${chunks.length} relevant documents for query: "${query}"\n\n`;

    chunks.forEach((chunk, index) => {
      formatted += `## Document ${index + 1} (Score: ${(chunk.score || 0).toFixed(3)})\n`;
      formatted += `Source: ${chunk.metadata.source}\n`;
      formatted += `\n${chunk.content}\n\n`;
      formatted += `---\n\n`;
    });

    return formatted;
  }

  private formatSemanticResults(chunks: DocumentChunk[], query: string, context?: string): string {
    let formatted = `Semantic search results for: "${query}"`;

    if (context) {
      formatted += ` (Context: ${context})`;
    }

    formatted += `\n\n`;

    chunks.forEach((chunk, index) => {
      formatted += `### Result ${index + 1}\n`;
      formatted += `**Source:** ${chunk.metadata.source}\n`;

      if (chunk.score) {
        formatted += `**Relevance:** ${(chunk.score * 100).toFixed(1)}%\n`;
      }

      formatted += `\n${chunk.content}\n\n`;
    });

    return formatted;
  }

  private buildRAGContext(chunks: DocumentChunk[], maxLength: number): string {
    let context = '';

    for (const chunk of chunks) {
      const addition = `[Source: ${chunk.metadata.source}]\n${chunk.content}\n\n`;

      if (context.length + addition.length > maxLength) {
        break;
      }

      context += addition;
    }

    return context;
  }

  private createRAGPrompt(options: {
    query: string;
    context: string;
    userContext?: string;
    style: string;
    includeSources: boolean;
  }): string {
    const { query, context, userContext, style, includeSources } = options;

    let prompt = `You are answering a question using relevant information retrieved from a knowledge base.\n\n`;

    if (userContext) {
      prompt += `Additional Context: ${userContext}\n\n`;
    }

    prompt += `Retrieved Information:\n${context}\n`;
    prompt += `Question: ${query}\n\n`;

    switch (style) {
      case 'concise':
        prompt += `Provide a concise, direct answer to the question using the retrieved information.`;
        break;
      case 'technical':
        prompt += `Provide a detailed technical answer with specific examples and implementation details.`;
        break;
      case 'detailed':
      default:
        prompt += `Provide a comprehensive answer that thoroughly addresses the question using the retrieved information.`;
        break;
    }

    if (includeSources) {
      prompt += ` Include source references for your claims.`;
    }

    return prompt;
  }

  private async maximalMarginalRelevanceSearch(params: {
    embedding: number[];
    collection: string;
    lambda: number;
  }): Promise<DocumentChunk[]> {
    // Implementation of MMR algorithm for diverse retrieval
    const initialResults = await this.vectorDb.search({
      collection: params.collection,
      vector: params.embedding,
      limit: this.config.search.max_results * 3,
    });

    return this.applyMMR(initialResults, params.lambda, this.config.search.max_results);
  }

  private async hybridSearch(params: {
    query: string;
    embedding: number[];
    collection: string;
    temporal_weight: number;
  }): Promise<DocumentChunk[]> {
    // Combines semantic similarity with temporal relevance
    const semanticResults = await this.vectorDb.search({
      collection: params.collection,
      vector: params.embedding,
      limit: this.config.search.max_results * 2,
    });

    // Apply temporal weighting
    const now = Date.now();
    semanticResults.forEach((result) => {
      const age = now - result.metadata.created_at.getTime();
      const temporalScore = Math.exp(-age / (365 * 24 * 60 * 60 * 1000)); // Decay over a year
      result.score =
        (result.score || 0) * (1 - params.temporal_weight) + temporalScore * params.temporal_weight;
    });

    return semanticResults
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, this.config.search.max_results);
  }

  private applyMMR(documents: DocumentChunk[], lambda: number, k: number): DocumentChunk[] {
    const selected: DocumentChunk[] = [];
    const remaining = [...documents];

    // Select first document (highest similarity)
    if (remaining.length > 0) {
      selected.push(remaining.shift()!);
    }

    // Select remaining documents using MMR
    while (selected.length < k && remaining.length > 0) {
      let bestScore = -Infinity;
      let bestIndex = 0;

      for (let i = 0; i < remaining.length; i++) {
        const doc = remaining[i];
        const similarity = doc.score || 0;

        // Calculate maximum similarity to already selected documents
        let maxSimilarityToSelected = 0;
        for (const selectedDoc of selected) {
          const sim = this.cosineSimilarity(doc.embedding || [], selectedDoc.embedding || []);
          maxSimilarityToSelected = Math.max(maxSimilarityToSelected, sim);
        }

        // MMR score: λ * similarity - (1-λ) * redundancy
        const mmrScore = lambda * similarity - (1 - lambda) * maxSimilarityToSelected;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      selected.push(remaining.splice(bestIndex, 1)[0]);
    }

    return selected;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async applyContentFilters(content: string): Promise<string> {
    let filtered = content;

    for (const filter of this.config.indexing.content_filters) {
      switch (filter) {
        case 'remove_code_blocks':
          filtered = filtered.replace(/```[\s\S]*?```/g, '[CODE_BLOCK_REMOVED]');
          break;
        case 'remove_urls':
          filtered = filtered.replace(/https?:\/\/[^\s]+/g, '[URL_REMOVED]');
          break;
        case 'remove_emails':
          filtered = filtered.replace(/[\w.-]+@[\w.-]+\.[a-zA-Z]+/g, '[EMAIL_REMOVED]');
          break;
      }
    }

    return filtered;
  }

  private createVectorDatabase(config: RAGToolConfig['vector_db']): VectorDatabase {
    switch (config.provider) {
      case 'chromadb':
        return new ChromaDBClient(config);
      case 'pinecone':
        return new PineconeClient(config);
      case 'weaviate':
        return new WeaviateClient(config);
      case 'qdrant':
        return new QdrantClient(config);
      case 'local':
        return new LocalVectorDB(config);
      default:
        throw new Error(`Unsupported vector database: ${config.provider}`);
    }
  }

  private async validatePermission(action: string, context: ExecutionContext): Promise<void> {
    const permission = await this.permissionEngine?.validatePermission(
      context.agentId,
      'rag',
      action.split(':')[1] || 'use',
      { collection: this.config.vector_db.collection_name },
    );

    if (permission && !permission.allowed) {
      throw new SecurityError(`RAG ${action} not permitted for agent ${context.agentId}`);
    }
  }
}
````

**RAG Tool Registration:**

```typescript
// Register RAG tool with Wilk tool manager
class RAGToolProvider {
  static createRAGTools(config: RAGToolConfig): WilkTool[] {
    const ragTool = new WilkRAGTool(config);

    return [
      {
        name: 'rag_index_documents',
        description: 'Index documents into RAG vector database for retrieval',
        input_schema: {
          type: 'object',
          properties: {
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  content: { type: 'string', description: 'Document content to index' },
                  source: { type: 'string', description: 'Source identifier for the document' },
                  metadata: { type: 'object', description: 'Additional metadata for the document' },
                },
                required: ['content', 'source'],
              },
              description: 'Array of documents to index',
            },
            collection_name: {
              type: 'string',
              description: 'Optional collection name, uses default if not specified',
            },
            batch_size: {
              type: 'number',
              description: 'Number of documents to process in each batch (default: 100)',
            },
          },
          required: ['documents'],
        },
        execute: ragTool.indexDocuments.bind(ragTool),
      },
      {
        name: 'rag_search',
        description: 'Search RAG database for relevant content based on a query',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to find relevant content',
            },
            collection_name: {
              type: 'string',
              description: 'Optional collection name to search in',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            similarity_threshold: {
              type: 'number',
              description: 'Minimum similarity score for results (0-1)',
            },
            filter_metadata: {
              type: 'object',
              description: 'Metadata filters to apply to search results',
            },
          },
          required: ['query'],
        },
        execute: ragTool.searchRAG.bind(ragTool),
      },
      {
        name: 'rag_semantic_search',
        description: 'Advanced semantic search with context-aware retrieval strategies',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            context: {
              type: 'string',
              description: 'Additional context to enhance the search',
            },
            search_strategy: {
              type: 'string',
              enum: ['similarity', 'mmr', 'hybrid'],
              description:
                'Search strategy: similarity (default), mmr (diverse results), or hybrid (time-weighted)',
            },
            diversity_lambda: {
              type: 'number',
              description: 'Diversity parameter for MMR (0-1, default: 0.5)',
            },
          },
          required: ['query'],
        },
        execute: ragTool.semanticSearch.bind(ragTool),
      },
      {
        name: 'rag_generate_response',
        description: 'Generate an AI response enhanced with RAG-retrieved context',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Question or prompt to answer using RAG',
            },
            context: {
              type: 'string',
              description: 'Additional context for the response',
            },
            response_style: {
              type: 'string',
              enum: ['concise', 'detailed', 'technical'],
              description: 'Style of response to generate',
            },
            include_sources: {
              type: 'boolean',
              description: 'Whether to include source citations',
            },
            max_context_length: {
              type: 'number',
              description: 'Maximum length of RAG context to use',
            },
          },
          required: ['query'],
        },
        execute: ragTool.generateRAGResponse.bind(ragTool),
      },
      {
        name: 'rag_manage_collection',
        description: 'Manage RAG vector database collections',
        input_schema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['create', 'delete', 'list', 'stats'],
              description: 'Action to perform on collections',
            },
            collection_name: {
              type: 'string',
              description: 'Collection name (required for create, delete, stats actions)',
            },
          },
          required: ['action'],
        },
        execute: ragTool.manageCollection.bind(ragTool),
      },
    ];
  }
}
```

### 6. API Integration Tools

```typescript
class WilkHTTPTool {
  private httpClient: HTTPClient;
  private permissionEngine: PermissionEngine;
  private rateLimiter: RateLimiter;

  async makeRequest(params: HTTPParams, context: ExecutionContext): Promise<HTTPResult> {
    const { url, method = 'GET', headers = {}, body, timeout = 30000 } = params;

    // Validate network permissions
    await this.validateNetworkAccess(url, context);

    // Check rate limits
    await this.rateLimiter.checkLimit(context.agentId, 'http_requests');

    try {
      const response = await this.httpClient.request({
        url,
        method,
        headers,
        body,
        timeout,
      });

      return {
        success: true,
        status: response.status,
        headers: response.headers,
        body: response.body,
        response_time: response.responseTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.status || 0,
      };
    }
  }

  private async validateNetworkAccess(url: string, context: ExecutionContext): Promise<void> {
    const parsedUrl = new URL(url);

    const permission = await this.permissionEngine.validatePermission(
      context.agentId,
      'network',
      'request',
      { host: parsedUrl.hostname, port: parsedUrl.port },
    );

    if (!permission.allowed) {
      throw new SecurityError(`Network access not permitted: ${parsedUrl.hostname}`);
    }
  }
}
```

## Tool Configuration

### Agent Tool Configuration

```yaml
# Agent tool configuration example
tools:
  # LibreChat inherited tools
  file_search:
    enabled: true
    permissions:
      - 'filesystem:read'
    config:
      max_results: 50
      search_depth: 3

  execute_code:
    enabled: true
    permissions:
      - 'shell:execute'
    config:
      allowed_languages: ['python', 'javascript', 'bash']
      timeout: 300

  # MCP server tools
  github_mcp:
    type: 'mcp_server'
    server: 'github-server'
    tools: ['create_issue', 'list_repos', 'get_file']

  # Custom shell tools
  git_operations:
    type: 'shell'
    commands:
      - 'git status'
      - 'git diff'
      - 'git log --oneline -10'
      - 'git branch'
    permissions:
      - 'shell:git'

  # File system tools
  project_files:
    type: 'filesystem'
    permissions:
      - 'filesystem:read:./src/**'
      - 'filesystem:write:./reports/**'
    config:
      max_file_size: '10MB'
      allowed_extensions: ['.ts', '.js', '.json', '.md']

  # RAG tools
  document_rag:
    type: 'rag'
    permissions:
      - 'rag:index'
      - 'rag:search'
      - 'rag:generate'
    config:
      vector_db:
        provider: 'chromadb'
        collection_name: 'agent_knowledge'
        embedding_model: 'text-embedding-3-small'
        dimensions: 1536
      search:
        similarity_threshold: 0.7
        max_results: 10
        rerank_model: 'ms-marco-MiniLM-L-6-v2'
      indexing:
        chunk_size: 1000
        chunk_overlap: 200
        auto_index: true
        content_filters: ['remove_code_blocks', 'remove_urls']

  # HTTP API tools
  external_apis:
    type: 'http'
    permissions:
      - 'network:https:api.github.com'
      - 'network:https:api.openai.com'
    config:
      timeout: 30000
      rate_limit: 60 # requests per minute
```

### Global Tool Configuration

```yaml
# ~/.wilk/config/tools.yaml
tools:
  global_settings:
    timeout: 300 # Default timeout in seconds
    max_concurrent: 5 # Max concurrent tool executions
    audit_logging: true
    performance_monitoring: true

  security:
    sandbox_all_tools: true
    permission_validation: strict
    malware_scanning: true

  mcp_servers:
    auto_discovery: true
    health_monitoring: true
    restart_on_failure: true

  rate_limits:
    http_requests: 100 # per minute per agent
    shell_commands: 20 # per minute per agent
    file_operations: 200 # per minute per agent
    rag_searches: 50 # per minute per agent
    rag_indexing: 10 # per minute per agent

  caching:
    enabled: true
    ttl: 3600 # 1 hour
    max_size: '100MB'
```

## Performance Optimization

### Tool Execution Performance

```typescript
class ToolPerformanceOptimizer {
  private executionCache: Map<string, CachedResult>;
  private performanceMetrics: PerformanceTracker;

  async optimizeToolExecution(
    tool: WilkTool,
    params: any,
    context: ExecutionContext,
  ): Promise<ToolResult> {
    // Check cache first
    const cacheKey = this.generateCacheKey(tool.name, params);
    const cached = await this.executionCache.get(cacheKey);

    if (cached && this.isCacheValid(cached)) {
      this.performanceMetrics.recordCacheHit(tool.name);
      return cached.result;
    }

    // Execute with performance monitoring
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await tool.execute(params, context);

      const executionTime = performance.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      // Record metrics
      this.performanceMetrics.recordExecution(tool.name, {
        executionTime,
        memoryUsed,
        success: true,
      });

      // Cache successful results
      if (this.shouldCache(tool.name, result)) {
        await this.executionCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
          ttl: this.getCacheTTL(tool.name),
        });
      }

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;

      this.performanceMetrics.recordExecution(tool.name, {
        executionTime,
        memoryUsed: 0,
        success: false,
        error: error.message,
      });

      throw error;
    }
  }

  async getToolPerformanceReport(): Promise<PerformanceReport> {
    return {
      tool_metrics: await this.performanceMetrics.getToolMetrics(),
      cache_statistics: await this.getCacheStatistics(),
      resource_usage: await this.getResourceUsageReport(),
      recommendations: await this.generateOptimizationRecommendations(),
    };
  }
}
```

## Integration with LibreChat Tools

### Tool Loading Adaptation

```typescript
// Adapts LibreChat's tool loading for CLI context
class LibreChatToolAdapter {
  async adaptToolsForCLI(agentId: string): Promise<WilkTool[]> {
    // Get LibreChat agent configuration
    const agent = await Agent.findById(agentId);

    // Load tools using LibreChat's loading mechanism
    const { tools } = await loadTools({
      req: this.createMockRequest(),
      res: this.createMockResponse(),
      provider: agent.provider,
      agentId: agent.id,
      tools: agent.tools,
      model: agent.model,
    });

    // Convert to Wilk tool format
    return tools.map((tool) => this.convertToWilkTool(tool));
  }

  private convertToWilkTool(libreChatTool: any): WilkTool {
    return {
      name: libreChatTool.name,
      description: libreChatTool.description,
      parameters: libreChatTool.parameters,
      permissions: this.mapPermissions(libreChatTool),
      execute: async (params: any, context: ExecutionContext) => {
        // Add CLI-specific context handling
        const adaptedContext = this.adaptExecutionContext(context);

        // Execute LibreChat tool
        const result = await libreChatTool.execute(params, adaptedContext);

        // Convert result to Wilk format
        return this.adaptToolResult(result);
      },
    };
  }
}
```

## Tool Use Examples Following Claude Pattern

### Example 1: Simple RAG Search

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "tools": [
    {
      "name": "rag_search",
      "description": "Search RAG database for relevant content based on a query",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query to find relevant content"
          },
          "max_results": {
            "type": "number",
            "description": "Maximum number of results to return"
          }
        },
        "required": ["query"]
      }
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "Find information about TypeScript interfaces in our codebase"
    }
  ]
}
```

### Example 2: Multi-Tool RAG Workflow

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 2048,
  "tools": [
    {
      "name": "file_search",
      "description": "Search for files and content within files",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" },
          "file_types": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["query"]
      }
    },
    {
      "name": "rag_index_documents",
      "description": "Index documents into RAG vector database",
      "input_schema": {
        "type": "object",
        "properties": {
          "documents": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "content": { "type": "string" },
                "source": { "type": "string" },
                "metadata": { "type": "object" }
              },
              "required": ["content", "source"]
            }
          }
        },
        "required": ["documents"]
      }
    },
    {
      "name": "rag_generate_response",
      "description": "Generate an AI response enhanced with RAG-retrieved context",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" },
          "response_style": { "type": "string", "enum": ["concise", "detailed", "technical"] }
        },
        "required": ["query"]
      }
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "Index all TypeScript files in the project and then answer questions about the architecture"
    }
  ]
}
```

### Example 3: RAG with MCP Integration

```typescript
// Example Wilk agent using RAG + MCP tools
class DocumentationAgent {
  async processQuery(query: string, context: ExecutionContext): Promise<string> {
    // 1. Search existing documentation
    const ragResult = await this.toolManager.executeTool(
      'rag_search',
      {
        query,
        max_results: 5,
        similarity_threshold: 0.8,
      },
      context,
    );

    // 2. If no good results, search external sources via MCP
    if (ragResult.metadata.similarity_scores.every((score) => score < 0.8)) {
      const mcpResult = await this.toolManager.executeTool(
        'web_search',
        {
          query: query + ' documentation',
          num_results: 3,
        },
        context,
      );

      // 3. Index new findings
      if (mcpResult.success) {
        await this.toolManager.executeTool(
          'rag_index_documents',
          {
            documents: [
              {
                content: mcpResult.content,
                source: 'web_search',
                metadata: { query, timestamp: new Date().toISOString() },
              },
            ],
          },
          context,
        );
      }
    }

    // 4. Generate enhanced response
    const response = await this.toolManager.executeTool(
      'rag_generate_response',
      {
        query,
        response_style: 'detailed',
        include_sources: true,
      },
      context,
    );

    return response.content;
  }
}
```

## RAG Configuration Examples

### Local Development Setup

```yaml
# ~/.wilk/config/rag.yaml
rag:
  vector_db:
    provider: 'local' # Uses local SQLite vector storage
    collection_name: 'dev_knowledge'
    embedding_model: 'text-embedding-3-small'
    dimensions: 1536

  search:
    similarity_threshold: 0.7
    max_results: 10
    include_metadata: true

  indexing:
    chunk_size: 800
    chunk_overlap: 100
    auto_index: true
    content_filters: ['remove_code_blocks']

  caching:
    enabled: true
    embedding_cache_size: '50MB'
    result_cache_ttl: 3600
```

### Production Setup with ChromaDB

```yaml
# Production RAG configuration
rag:
  vector_db:
    provider: 'chromadb'
    url: 'http://chromadb.company.com:8000'
    collection_name: 'production_knowledge'
    embedding_model: 'text-embedding-3-large'
    dimensions: 3072

  search:
    similarity_threshold: 0.75
    max_results: 15
    rerank_model: 'ms-marco-MiniLM-L-12-v2'

  indexing:
    chunk_size: 1200
    chunk_overlap: 200
    auto_index: true
    content_filters: ['remove_code_blocks', 'remove_urls', 'remove_emails']

  performance:
    batch_size: 50
    max_concurrent_requests: 10
    embedding_cache_size: '200MB'
```

### Enterprise Setup with Security

```yaml
# Enterprise RAG with enhanced security
rag:
  vector_db:
    provider: 'pinecone'
    api_key: '${PINECONE_API_KEY}'
    environment: 'us-west1-gcp'
    index_name: 'enterprise-knowledge'

  security:
    encryption_at_rest: true
    access_control: 'rbac'
    audit_logging: true
    data_classification: 'confidential'

  compliance:
    data_retention_days: 2555 # 7 years
    gdpr_compliant: true
    hipaa_compliant: true

  monitoring:
    performance_metrics: true
    usage_analytics: true
    alerting:
      slow_queries: 5000 # ms
      high_error_rate: 0.05 # 5%
```

## Next Steps

1. **[RAG Implementation](rag-implementation.md)** - Detailed RAG system implementation
2. **[Vector Databases](vector-databases.md)** - Comprehensive vector database integration
3. **[MCP Integration](mcp.md)** - Detailed Model Context Protocol implementation
4. **[LibreChat Tools](librechat-tools.md)** - Adapting existing LibreChat tools
5. **[Security](../security/)** - Tool execution security and sandboxing
6. **[Performance](../performance/)** - Tool execution optimization strategies

