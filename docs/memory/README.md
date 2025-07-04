# Wilk Memory Management System

## Overview

Wilk provides a comprehensive memory management system that allows agents to remember preferences, context, and instructions across sessions. Built on LibreChat's context management with CLI-specific enhancements for persistent memory storage and retrieval.

## Memory Architecture

```
Wilk Memory Management Architecture
┌─────────────────────────────────────────────────────────────┐
│                     Memory Interface                        │
├─────────────────────────────────────────────────────────────┤
│ REPL Commands │ Auto-Loading │ Import System │ Context API  │
├─────────────────────────────────────────────────────────────┤
│                    Memory Storage Layer                     │
├─────────────────────────────────────────────────────────────┤
│ Project Memory │ User Memory │ Agent Memory │ Session Memory│
├─────────────────────────────────────────────────────────────┤
│                   Memory Processing                         │
├─────────────────────────────────────────────────────────────┤
│ Import Resolution │ Context Building │ Memory Validation    │
├─────────────────────────────────────────────────────────────┤
│                     Storage Backend                         │
├─────────────────────────────────────────────────────────────┤
│ SQLite Database │ File System │ Context Cache │ Vector Index│
└─────────────────────────────────────────────────────────────┘
```

## Memory Types and Locations

Wilk provides four memory locations, each serving different purposes:

| Memory Type        | Location                              | Purpose                                  | Use Case Examples                                        |
| ------------------ | ------------------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| **Project Memory** | `./WILK.md`                           | Team-shared instructions for the project | Project architecture, coding standards, common workflows |
| **User Memory**    | `~/.wilk/WILK.md`                     | Personal preferences for all projects    | Code styling preferences, personal tooling shortcuts     |
| **Agent Memory**   | `~/.wilk/agents/<agent-id>/memory.md` | Agent-specific context and preferences   | Agent behavior patterns, specialized instructions        |
| **Session Memory** | In-memory/SQLite                      | Temporary session context                | Conversation history, active file context                |

## Memory File Format and Structure

### Project Memory (./WILK.md)

**Example Project Memory:**

```markdown
# Project: Agent Kiwi Development

See @README.md for project overview and @package.json for available npm commands.

## Architecture Guidelines

- Use TypeScript for all new development
- Follow LibreChat patterns for agent integration
- SQLite for CLI performance optimization
- Comprehensive testing with Jest and Playwright

## Common Workflows

- Development setup: `./scripts/agent-kiwi.sh dev-setup`
- Run tests: `npm run test:client && npm run test:api`
- Build system: `npm run frontend && npm run backend`
- Lint and format: `npm run lint:fix && npm run format`

## Code Standards

- Default to using Python 3.11 for all new scripts
- Descriptive variable names (no single letters except iterators)
- Document all public APIs with JSDoc
- Error handling with typed exceptions

## Agent Development

- All agents stored in `~/.wilk/agents/` directory
- Use agent templates from `templates/` directory
- Test agents in sandbox before deployment
- Follow security guidelines in `docs/security/`

## Important Patterns

- LibreChat tool adaptation: @docs/librechat-integration.md
- MCP server integration: @docs/mcp-setup.md
- RAG implementation: @docs/rag-guidelines.md

## Team Preferences

- Morning standup: Focus on agent development progress
- Code reviews: Emphasize security and performance
- Documentation: Keep examples up-to-date
```

### User Memory (~/.wilk/WILK.md)

**Example User Memory:**

```markdown
# Personal Wilk Preferences

## Code Style

- Always use async/await over Promises.then()
- Prefer const > let > var (never var)
- Use destructuring for object properties
- Single quotes for strings unless interpolation needed

## CLI Preferences

- Default to verbose output for debugging
- Auto-save session history
- Enable audit logging for all operations
- Prefer local LLMs for development work

## Shortcuts and Aliases

- Use `/q` for quick exit
- `/h <topic>` for contextual help
- `/save` to bookmark current session state
- `/load <bookmark>` to restore session

## Development Setup

- Local environment: @~/.wilk/dev-setup.md
- Testing preferences: @~/.wilk/testing-config.md
- LLM configuration: @~/.wilk/llm-settings.md

## Personal Tools

- Preferred editor: VS Code with Wilk extension
- Git workflow: Feature branches with descriptive names
- Testing: Run full suite before commits
- Documentation: Update as I code, not after

## Security Settings

- Require confirmation for file operations outside project
- Sandbox all untrusted agents
- Audit log retention: 30 days
- Enable encryption for sensitive operations
```

### Agent Memory (~/.wilk/agents/<agent-id>/memory.md)

**Example Agent Memory:**

```markdown
# Agent Memory: Code Analyzer v1.2.0

## Agent Behavior Patterns

- Focus on security vulnerabilities and performance issues
- Provide specific line numbers and code examples
- Suggest concrete improvements with code snippets
- Prioritize critical issues over style preferences

## Learned Preferences

- User prefers TypeScript-specific analysis
- Emphasize React best practices
- Focus on accessibility improvements
- Include performance metrics when available

## Context Patterns

- Analyze entire file before providing feedback
- Consider project architecture from @WILK.md
- Reference coding standards from project memory
- Use examples from similar codebases

## Tool Usage History

- file_search: Used 45 times, 92% success rate
- execute_code: Used 12 times, 100% success rate
- web_search: Used 8 times, 75% success rate
- rag_search: Used 23 times, 87% success rate

## Success Patterns

- Security analysis: High user satisfaction
- Performance optimization: Effective recommendations
- Code refactoring: Good adoption rate
- Documentation generation: Helpful output

## Areas for Improvement

- Better integration with testing frameworks
- More context-aware suggestions
- Improved error message clarity
```

## Memory Import System

### Basic Import Syntax

Wilk supports flexible imports using `@path/to/file` syntax:

```markdown
# Import examples

See @README.md for project overview
Git workflow: @docs/git-instructions.md
Personal settings: @~/.wilk/my-preferences.md
Agent guidelines: @agents/best-practices.md
```

### Import Resolution Rules

1. **Relative paths**: Resolved from current WILK.md location
2. **Absolute paths**: Resolved from filesystem root
3. **Home directory**: `@~/` expands to user's home directory
4. **Wilk directory**: `@.wilk/` expands to `~/.wilk/`
5. **Project root**: `@project/` expands to project root directory

### Advanced Import Features

**Conditional Imports:**

```markdown
# Environment-specific imports

@if:development @dev-config.md
@if:production @prod-config.md  
@if:testing @test-setup.md
```

**Sectioned Imports:**

```markdown
# Import specific sections

@docs/coding-standards.md#typescript-guidelines
@README.md#installation-section
```

**Import with Variables:**

```markdown
# Dynamic imports

@agents/${AGENT_TYPE}/instructions.md
@config/${NODE_ENV}/settings.md
```

## Memory Management Implementation

### Memory Manager Class

```typescript
interface MemoryLocation {
  type: 'project' | 'user' | 'agent' | 'session';
  path: string;
  content: string;
  imports: MemoryImport[];
  lastModified: Date;
  checksum: string;
}

interface MemoryImport {
  path: string;
  resolvedPath: string;
  section?: string;
  conditional?: string;
  depth: number;
}

interface MemoryContext {
  projectMemory?: MemoryLocation;
  userMemory?: MemoryLocation;
  agentMemory?: MemoryLocation;
  sessionMemory: Map<string, any>;
  resolvedContent: string;
  totalTokens: number;
}

class WilkMemoryManager {
  private cache: Map<string, MemoryLocation>;
  private importResolver: ImportResolver;
  private contextBuilder: ContextBuilder;
  private vectorIndex: VectorIndex;

  constructor() {
    this.cache = new Map();
    this.importResolver = new ImportResolver();
    this.contextBuilder = new ContextBuilder();
    this.vectorIndex = new VectorIndex();
  }

  /**
   * Load all relevant memories for current context
   */
  async loadMemories(
    workingDirectory: string,
    agentId?: string,
    sessionId?: string,
  ): Promise<MemoryContext> {
    const context: MemoryContext = {
      sessionMemory: new Map(),
      resolvedContent: '',
      totalTokens: 0,
    };

    // Load project memory (traverse up directory tree)
    context.projectMemory = await this.loadProjectMemory(workingDirectory);

    // Load user memory
    context.userMemory = await this.loadUserMemory();

    // Load agent-specific memory
    if (agentId) {
      context.agentMemory = await this.loadAgentMemory(agentId);
    }

    // Load session memory
    if (sessionId) {
      context.sessionMemory = await this.loadSessionMemory(sessionId);
    }

    // Resolve imports and build context
    context.resolvedContent = await this.buildResolvedContent(context);
    context.totalTokens = await this.countTokens(context.resolvedContent);

    return context;
  }

  /**
   * Save memory to specific location
   */
  async saveMemory(
    type: 'project' | 'user' | 'agent',
    content: string,
    context: {
      workingDirectory?: string;
      agentId?: string;
    },
  ): Promise<string> {
    let filePath: string;

    switch (type) {
      case 'project':
        filePath = path.join(context.workingDirectory || process.cwd(), 'WILK.md');
        break;
      case 'user':
        filePath = path.join(os.homedir(), '.wilk', 'WILK.md');
        break;
      case 'agent':
        if (!context.agentId) {
          throw new Error('Agent ID required for agent memory');
        }
        filePath = path.join(os.homedir(), '.wilk', 'agents', context.agentId, 'memory.md');
        break;
      default:
        throw new Error(`Unknown memory type: ${type}`);
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Save content
    await fs.writeFile(filePath, content, 'utf8');

    // Update cache
    await this.updateCache(filePath);

    return `✅ Saved ${type} memory to ${filePath}`;
  }

  /**
   * Quick add memory using # shortcut
   */
  async quickAddMemory(
    content: string,
    context: {
      workingDirectory: string;
      agentId?: string;
    },
  ): Promise<string> {
    // Determine available memory locations
    const locations = await this.getAvailableMemoryLocations(context);

    // For CLI, auto-select based on content type
    const memoryType = this.inferMemoryType(content, context);

    // Append to existing memory or create new
    await this.appendToMemory(memoryType, content, context);

    return `📝 Added to ${memoryType} memory: "${content.substring(0, 50)}..."`;
  }

  /**
   * Search across all memories
   */
  async searchMemories(
    query: string,
    context: MemoryContext,
    options: {
      memoryTypes?: Array<'project' | 'user' | 'agent' | 'session'>;
      fuzzy?: boolean;
      limit?: number;
    } = {},
  ): Promise<
    Array<{
      type: string;
      content: string;
      location: string;
      score: number;
    }>
  > {
    const results: Array<{
      type: string;
      content: string;
      location: string;
      score: number;
    }> = [];

    // Search project memory
    if (!options.memoryTypes || options.memoryTypes.includes('project')) {
      if (context.projectMemory) {
        const matches = await this.searchMemoryContent(
          query,
          context.projectMemory,
          'project',
          options.fuzzy,
        );
        results.push(...matches);
      }
    }

    // Search user memory
    if (!options.memoryTypes || options.memoryTypes.includes('user')) {
      if (context.userMemory) {
        const matches = await this.searchMemoryContent(
          query,
          context.userMemory,
          'user',
          options.fuzzy,
        );
        results.push(...matches);
      }
    }

    // Search agent memory
    if (!options.memoryTypes || options.memoryTypes.includes('agent')) {
      if (context.agentMemory) {
        const matches = await this.searchMemoryContent(
          query,
          context.agentMemory,
          'agent',
          options.fuzzy,
        );
        results.push(...matches);
      }
    }

    // Search session memory
    if (!options.memoryTypes || options.memoryTypes.includes('session')) {
      const sessionMatches = await this.searchSessionMemory(query, context.sessionMemory);
      results.push(...sessionMatches);
    }

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);

    return options.limit ? results.slice(0, options.limit) : results;
  }

  private async loadProjectMemory(workingDirectory: string): Promise<MemoryLocation | undefined> {
    // Walk up directory tree looking for WILK.md files
    let currentDir = path.resolve(workingDirectory);
    const memories: MemoryLocation[] = [];

    while (currentDir !== path.dirname(currentDir)) {
      // Until root
      const wilkPath = path.join(currentDir, 'WILK.md');

      if (await this.fileExists(wilkPath)) {
        const memory = await this.loadMemoryFile(wilkPath, 'project');
        if (memory) {
          memories.push(memory);
        }
      }

      currentDir = path.dirname(currentDir);
    }

    // Merge memories (closer to working directory takes precedence)
    return memories.length > 0 ? await this.mergeProjectMemories(memories) : undefined;
  }

  private async loadUserMemory(): Promise<MemoryLocation | undefined> {
    const userMemoryPath = path.join(os.homedir(), '.wilk', 'WILK.md');

    if (await this.fileExists(userMemoryPath)) {
      return await this.loadMemoryFile(userMemoryPath, 'user');
    }

    return undefined;
  }

  private async loadAgentMemory(agentId: string): Promise<MemoryLocation | undefined> {
    const agentMemoryPath = path.join(os.homedir(), '.wilk', 'agents', agentId, 'memory.md');

    if (await this.fileExists(agentMemoryPath)) {
      return await this.loadMemoryFile(agentMemoryPath, 'agent');
    }

    return undefined;
  }

  private async loadMemoryFile(
    filePath: string,
    type: 'project' | 'user' | 'agent',
  ): Promise<MemoryLocation | undefined> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);

      // Parse imports
      const imports = await this.importResolver.parseImports(content, filePath);

      const memory: MemoryLocation = {
        type,
        path: filePath,
        content,
        imports,
        lastModified: stats.mtime,
        checksum: this.calculateChecksum(content),
      };

      // Cache the memory
      this.cache.set(filePath, memory);

      return memory;
    } catch (error) {
      console.warn(`Failed to load memory file ${filePath}:`, error.message);
      return undefined;
    }
  }

  private async buildResolvedContent(context: MemoryContext): Promise<string> {
    let resolvedContent = '';

    // Add user memory first (lowest precedence)
    if (context.userMemory) {
      const userContent = await this.resolveImports(context.userMemory);
      resolvedContent += `# User Memory\n${userContent}\n\n`;
    }

    // Add project memory (medium precedence)
    if (context.projectMemory) {
      const projectContent = await this.resolveImports(context.projectMemory);
      resolvedContent += `# Project Memory\n${projectContent}\n\n`;
    }

    // Add agent memory (highest precedence)
    if (context.agentMemory) {
      const agentContent = await this.resolveImports(context.agentMemory);
      resolvedContent += `# Agent Memory\n${agentContent}\n\n`;
    }

    // Add relevant session memory
    if (context.sessionMemory.size > 0) {
      resolvedContent += `# Session Context\n`;
      for (const [key, value] of context.sessionMemory.entries()) {
        resolvedContent += `${key}: ${JSON.stringify(value)}\n`;
      }
      resolvedContent += '\n';
    }

    return resolvedContent;
  }

  private async resolveImports(memory: MemoryLocation, depth: number = 0): Promise<string> {
    if (depth > 5) {
      console.warn('Maximum import depth reached');
      return memory.content;
    }

    let resolvedContent = memory.content;

    for (const importDef of memory.imports) {
      try {
        // Resolve import path
        const resolvedPath = await this.importResolver.resolvePath(
          importDef.path,
          path.dirname(memory.path),
        );

        // Load imported content
        const importedContent = await fs.readFile(resolvedPath, 'utf8');

        // Handle sectioned imports
        const sectionContent = importDef.section
          ? this.extractSection(importedContent, importDef.section)
          : importedContent;

        // Handle conditional imports
        if (importDef.conditional && !this.evaluateCondition(importDef.conditional)) {
          continue;
        }

        // Recursively resolve imports in imported file
        const importMemory: MemoryLocation = {
          type: memory.type,
          path: resolvedPath,
          content: sectionContent,
          imports: await this.importResolver.parseImports(sectionContent, resolvedPath),
          lastModified: new Date(),
          checksum: this.calculateChecksum(sectionContent),
        };

        const nestedContent = await this.resolveImports(importMemory, depth + 1);

        // Replace import statement with resolved content
        resolvedContent = resolvedContent.replace(
          `@${importDef.path}`,
          `\n<!-- Imported from ${importDef.path} -->\n${nestedContent}\n`,
        );
      } catch (error) {
        console.warn(`Failed to resolve import ${importDef.path}:`, error.message);
        // Leave import statement as-is if resolution fails
      }
    }

    return resolvedContent;
  }

  private inferMemoryType(
    content: string,
    context: { workingDirectory: string; agentId?: string },
  ): 'project' | 'user' | 'agent' {
    // Analyze content to determine appropriate memory location
    const lowerContent = content.toLowerCase();

    // Project-specific keywords
    if (
      lowerContent.includes('project') ||
      lowerContent.includes('team') ||
      lowerContent.includes('workflow') ||
      lowerContent.includes('build') ||
      lowerContent.includes('deploy')
    ) {
      return 'project';
    }

    // Agent-specific keywords
    if (
      context.agentId &&
      (lowerContent.includes('agent') ||
        lowerContent.includes('behavior') ||
        lowerContent.includes('pattern') ||
        lowerContent.includes('learn'))
    ) {
      return 'agent';
    }

    // Default to user memory for personal preferences
    return 'user';
  }

  private calculateChecksum(content: string): string {
    return require('crypto').createHash('md5').update(content).digest('hex');
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
```

## Memory Commands

### CLI Memory Commands

```typescript
class MemoryCommands {
  private memoryManager: WilkMemoryManager;

  constructor(memoryManager: WilkMemoryManager) {
    this.memoryManager = memoryManager;
  }

  /**
   * /memory - Show and manage memory files
   */
  async showMemoryMenu(args: string[]): Promise<string> {
    const [action] = args;

    switch (action) {
      case 'list':
        return await this.listMemories();
      case 'edit':
        return await this.editMemory(args[1]);
      case 'search':
        return await this.searchMemories(args.slice(1).join(' '));
      case 'clear':
        return await this.clearMemory(args[1]);
      case 'export':
        return await this.exportMemory(args[1]);
      case 'import':
        return await this.importMemory(args[1]);
      default:
        return this.getMemoryUsage();
    }
  }

  /**
   * # shortcut - Quick add memory
   */
  async quickAddMemory(content: string, context: ExecutionContext): Promise<string> {
    // Remove leading # and trim
    const memoryContent = content.substring(1).trim();

    if (!memoryContent) {
      return '❌ Empty memory content';
    }

    return await this.memoryManager.quickAddMemory(memoryContent, {
      workingDirectory: context.workingDirectory,
      agentId: context.agentId,
    });
  }

  /**
   * /init - Initialize project memory
   */
  async initializeProjectMemory(args: string[]): Promise<string> {
    const workingDirectory = process.cwd();
    const projectName = path.basename(workingDirectory);

    // Read package.json if it exists for additional context
    let packageInfo = '';
    try {
      const packagePath = path.join(workingDirectory, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      packageInfo = `
## Available Commands
See @package.json for all available npm scripts. Common commands:
${Object.entries(packageJson.scripts || {})
  .slice(0, 10) // Show first 10 scripts
  .map(([script, command]) => `- \`npm run ${script}\`: ${command}`)
  .join('\n')}
`;
    } catch {
      packageInfo = '\n## Project Commands\n- Add your common project commands here\n';
    }

    const templateContent = `# Project: ${projectName}

See @README.md for project overview${packageInfo ? ' and @package.json for available commands.' : '.'}
${packageInfo}
## Architecture Guidelines
- Add your project's architectural decisions here
- Document coding standards and conventions
- Include important patterns and practices

## Development Workflow
- Setup: Add setup instructions
- Testing: Add testing procedures  
- Building: Add build process
- Deployment: Add deployment steps

## Code Standards
- Use consistent formatting and naming conventions
- Document public APIs
- Include error handling
- Write meaningful tests

## Team Guidelines
- Code review process
- Git workflow
- Communication preferences
- Documentation standards

## Important Files and Directories
- Add key project structure information
- Document configuration files
- Explain important modules or components
`;

    const result = await this.memoryManager.saveMemory('project', templateContent, {
      workingDirectory,
    });

    return `🎉 Initialized project memory for ${projectName}\n${result}\n\nEdit with: /memory edit project`;
  }

  private async listMemories(): Promise<string> {
    const context = await this.memoryManager.loadMemories(process.cwd(), undefined, undefined);

    let output = '📚 Memory Status:\n\n';

    if (context.projectMemory) {
      output += `📁 Project Memory: ${context.projectMemory.path}\n`;
      output += `   Last modified: ${context.projectMemory.lastModified.toLocaleDateString()}\n`;
      output += `   Imports: ${context.projectMemory.imports.length}\n\n`;
    } else {
      output += `📁 Project Memory: Not found (run /init to create)\n\n`;
    }

    if (context.userMemory) {
      output += `👤 User Memory: ${context.userMemory.path}\n`;
      output += `   Last modified: ${context.userMemory.lastModified.toLocaleDateString()}\n`;
      output += `   Imports: ${context.userMemory.imports.length}\n\n`;
    } else {
      output += `👤 User Memory: Not found\n\n`;
    }

    if (context.agentMemory) {
      output += `🤖 Agent Memory: ${context.agentMemory.path}\n`;
      output += `   Last modified: ${context.agentMemory.lastModified.toLocaleDateString()}\n`;
      output += `   Imports: ${context.agentMemory.imports.length}\n\n`;
    }

    output += `📊 Total context: ${context.totalTokens} tokens\n`;
    output += `\nUse '/memory edit <type>' to edit memory files`;

    return output;
  }

  private async editMemory(type: string): Promise<string> {
    let filePath: string;

    switch (type) {
      case 'project':
        filePath = path.join(process.cwd(), 'WILK.md');
        break;
      case 'user':
        filePath = path.join(os.homedir(), '.wilk', 'WILK.md');
        break;
      case 'agent':
        // Would need agent context
        return '❌ Agent ID required for agent memory editing';
      default:
        return '❌ Unknown memory type. Use: project, user, or agent';
    }

    // Open in system editor
    try {
      const editor = process.env.EDITOR || 'nano';
      const { spawn } = require('child_process');

      return new Promise((resolve) => {
        const child = spawn(editor, [filePath], {
          stdio: 'inherit',
        });

        child.on('exit', () => {
          resolve(`✅ Edited ${type} memory file: ${filePath}`);
        });
      });
    } catch (error) {
      return `❌ Failed to open editor: ${error.message}`;
    }
  }

  private async searchMemories(query: string): Promise<string> {
    if (!query) {
      return '❌ Search query required\nUsage: /memory search <query>';
    }

    const context = await this.memoryManager.loadMemories(process.cwd());
    const results = await this.memoryManager.searchMemories(query, context, {
      limit: 10,
    });

    if (results.length === 0) {
      return `🔍 No memories found for: "${query}"`;
    }

    let output = `🔍 Found ${results.length} memories for: "${query}"\n\n`;

    for (const result of results) {
      output += `**${result.type} memory** (score: ${result.score.toFixed(2)})\n`;
      output += `${result.content.substring(0, 200)}...\n`;
      output += `Location: ${result.location}\n\n`;
    }

    return output;
  }

  private getMemoryUsage(): string {
    return `📚 Wilk Memory Management

Available commands:
  /memory list                List all memory files
  /memory edit <type>         Edit memory file (project/user/agent)
  /memory search <query>      Search across all memories
  /memory clear <type>        Clear memory file
  /memory export <type>       Export memory to file
  /memory import <file>       Import memory from file
  
  /init                       Initialize project memory
  # <content>                 Quick add memory (prompts for location)

Memory locations:
  📁 Project: ./WILK.md       Team-shared project instructions
  👤 User: ~/.wilk/WILK.md    Personal preferences across projects
  🤖 Agent: ~/.wilk/agents/<id>/memory.md  Agent-specific context
  
Import syntax:
  @README.md                  Import relative file
  @~/path/file.md            Import from home directory
  @.wilk/config.md           Import from wilk directory
  @docs/guide.md#section     Import specific section`;
  }
}
```

## Memory Best Practices

### Content Organization

**Structure Your Memories:**

```markdown
# Well-organized memory structure

## Categories with Clear Headers

Use descriptive markdown headers to organize content

### Specific Guidelines

- Be specific: "Use 2-space indentation" vs "Format code properly"
- Use bullet points for individual items
- Group related items under headers

### Examples and Context

- Include code examples where helpful
- Reference specific files or patterns
- Provide context for decisions

### Regular Maintenance

- Review and update memories as project evolves
- Remove outdated information
- Consolidate redundant entries
```

**Import Strategy:**

```markdown
# Strategic import usage

## Project Overview

See @README.md for current project status

## Detailed Guidelines

- Architecture decisions: @docs/architecture.md
- Coding standards: @docs/coding-standards.md
- Git workflow: @docs/git-workflow.md

## Personal Extensions (not committed)

- My shortcuts: @~/.wilk/my-shortcuts.md
- Development setup: @~/.wilk/dev-config.md
```

### Memory Hierarchy

1. **Session Memory** (highest precedence) - Active conversation context
2. **Agent Memory** - Agent-specific learned behaviors
3. **Project Memory** - Project-specific guidelines
4. **User Memory** (lowest precedence) - Personal preferences

### Performance Considerations

**Memory Size Management:**

- Keep individual memory files under 10KB for optimal performance
- Use imports to break large memories into focused sections
- Regular cleanup of outdated session memories
- Vector indexing for large memory collections

**Caching Strategy:**

- Memory files cached based on modification time
- Import resolution cached for session duration
- Context building optimized for repeated access
- Background indexing for search performance

## Integration with LibreChat Context

### Context Merging Strategy

```typescript
class LibreChatContextIntegration {
  async mergeWilkMemoryWithLibreChatContext(
    wilkMemory: MemoryContext,
    libreChatContext: any,
  ): Promise<EnhancedContext> {
    // Combine Wilk memories with LibreChat conversation context
    const enhancedContext = {
      // LibreChat conversation history
      messages: libreChatContext.messages,

      // Wilk persistent memory
      persistentContext: wilkMemory.resolvedContent,

      // Active files and tools from LibreChat
      activeFiles: libreChatContext.files,
      availableTools: libreChatContext.tools,

      // Agent-specific learned behaviors
      agentBehaviors: wilkMemory.agentMemory?.content,

      // Project and user preferences
      projectGuidelines: wilkMemory.projectMemory?.content,
      userPreferences: wilkMemory.userMemory?.content,

      // Combined token count
      totalTokens: wilkMemory.totalTokens + libreChatContext.tokenCount,
    };

    return enhancedContext;
  }
}
```

This comprehensive memory system provides Wilk with sophisticated context management that persists across sessions while maintaining the flexibility and performance required for CLI operation.

