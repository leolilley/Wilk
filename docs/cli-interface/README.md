# Wilk CLI Interface

## Overview

Wilk provides a comprehensive command-line interface designed for developer productivity. The interface includes an interactive REPL with 80+ commands, sophisticated agent syntax, and persistent session management.

## REPL Interface

### Welcome Screen

```
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

╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ >                                                                                                                                   │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

### Interactive Features

**Auto-completion:** Tab completion for commands, agent names, and file paths
**Command History:** Up/down arrows to navigate command history
**Multi-line Input:** Support for complex prompts and code blocks
**Syntax Highlighting:** Color-coded command syntax and responses
**Live Status:** Current session status, active agents, and token usage
**Real-time Progress:** Visual feedback during agent operations

### Multi-Choice Reply System

Wilk presents interactive choice menus for agent responses and system prompts:

```bash
# Agent suggesting multiple actions
🤖 code-analyzer: Found 3 security issues. What would you like to do?

╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ > _
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

Press ↑↓ to see suggested actions
```

```bash
# Memory system asking for scope
📝 Where should I save this memory?

╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ > save this to the team documentation folder_
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

Press ↑↓ to see suggested actions
```

```bash
# Agent installation with options - showing suggestions
📦 Multiple versions of 'typescript-helper' found:

┌─ Suggested actions ─────────────────────────────────────────┐
│   💬 Custom prompt (currently typing)                      │
│ ● ⭐ v2.1.0 (latest) - Enhanced TypeScript analysis       │
│   🔒 v2.0.5 (stable) - Production recommended            │
│   🧪 v2.2.0-beta - Experimental features                 │
│   📋 Show all versions                                    │
└─────────────────────────────────────────────────────────────┘

╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ > install the version that has the best typescript 5.0 support_
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

Press ↑↓ to navigate, Enter to select, Esc to return to typing
```

### Progress Feedback System

Wilk provides real-time feedback during agent operations to keep users informed:

```bash
# Agent execution feedback
* Analyzing codebase… (12s · ↓ 2.3k tokens · esc to interrupt)
* Running tests… (45s · ↑ 1.8k tokens · esc to interrupt)
* Generating documentation… (23s · ↓ 4.1k tokens · esc to interrupt)

# Context management feedback
* Compacting conversation… (81s · ↓ 1.8k tokens · esc to interrupt)
* Loading project memory… (3s · ↑ 0.5k tokens)
* Indexing codebase… (67s · 15,243 files processed)

# Agent installation feedback
* Downloading agent… (5s · 2.1MB/3.4MB)
* Verifying signature… (2s · security checks passed)
* Installing dependencies… (18s · 12 packages installed)
```

### Boxed Input Interface

The main input interface uses Unicode box drawing characters for a clean, professional appearance:

```
╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ > analyze this codebase for security vulnerabilities                                                                               │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

**Input Box Features:**

- **Dynamic resizing:** Expands for multi-line input
- **Syntax highlighting:** Commands and agents color-coded
- **Auto-completion:** Tab completion within the box
- **History navigation:** Up/down arrows scroll through history
- **Escape sequences:** Ctrl+C to interrupt, Ctrl+D to exit

**Multi-line Input Example:**

```
╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ > Review this pull request and:                                                                                                    │
│     1. Check for security vulnerabilities                                                                                          │
│     2. Ensure tests are comprehensive                                                                                               │
│     3. Verify documentation is updated                                                                                              │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

## Multi-Choice Reply Implementation

### Contextual Choice Generation System

The multi-choice system intelligently determines when to present choices based on the situation. It only appears when the agent response would benefit from user direction, not for every interaction.

```typescript
interface ChoiceOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  action: string; // Action prompt for the agent to execute
}

interface ChoiceContext {
  situation: string;
  agentResponse: string;
  availableTools: string[];
  currentFiles: string[];
  projectContext: string;
  userPreferences: string;
}

interface ChoiceMenu {
  title: string;
  options: ChoiceOption[];
  context: ChoiceContext;
}

class DynamicChoiceGenerator {
  private llmClient: any; // Your LLM client (OpenAI, Ollama, etc.)

  constructor(llmClient: any) {
    this.llmClient = llmClient;
  }

  /**
   * Determine if this situation warrants presenting choices
   */
  async shouldPresentChoices(context: ChoiceContext): Promise<boolean> {
    const triggers = this.getChoiceTriggers(context);

    // Only present choices if specific triggers are met
    return triggers.length > 0;
  }

  /**
   * Identify situations that warrant choice presentation
   */
  private getChoiceTriggers(context: ChoiceContext): string[] {
    const triggers: string[] = [];

    // Error/issue situations
    if (context.agentResponse.match(/found \d+ (error|issue|problem|vulnerability)/i)) {
      triggers.push('issues_found');
    }

    // Multiple options available
    if (context.agentResponse.match(/multiple|several|various|different/i)) {
      triggers.push('multiple_options');
    }

    // Confirmation needed
    if (context.agentResponse.match(/would you like|do you want|should I|confirm/i)) {
      triggers.push('confirmation_needed');
    }

    // Selection required
    if (context.agentResponse.match(/choose|select|pick|which/i)) {
      triggers.push('selection_required');
    }

    // Ambiguous request
    if (
      context.situation.includes('ambiguous') ||
      context.agentResponse.match(/unclear|ambiguous|specify/i)
    ) {
      triggers.push('clarification_needed');
    }

    // File operations on multiple files
    if (context.currentFiles.length > 3 && context.agentResponse.match(/file|directory/i)) {
      triggers.push('multiple_files');
    }

    // Installation/setup decisions
    if (context.situation.includes('installation') || context.situation.includes('setup')) {
      triggers.push('setup_decision');
    }

    // Memory/configuration decisions
    if (context.situation.includes('memory') || context.situation.includes('config')) {
      triggers.push('configuration_choice');
    }

    return triggers;
  }

  /**
   * Generate contextual choices using LLM
   */
  async generateChoices(context: ChoiceContext): Promise<ChoiceMenu> {
    const prompt = this.buildChoiceGenerationPrompt(context);

    const response = await this.llmClient.generateCompletion({
      prompt,
      maxTokens: 500,
      temperature: 0.3, // Lower temperature for more consistent choices
      systemPrompt: `You are a choice generator for Wilk CLI. Generate 3-5 practical, actionable choices that a developer would want in this situation. Always include relevant emojis. Format as JSON with title, options array containing id, label, description, icon, and action fields.`,
    });

    try {
      const parsed = JSON.parse(response.content);
      return {
        title: parsed.title,
        options: parsed.options,
        context,
      };
    } catch (error) {
      // Fallback to basic choices if LLM fails
      return this.getFallbackChoices(context);
    }
  }

  /**
   * Build the prompt for choice generation
   */
  private buildChoiceGenerationPrompt(context: ChoiceContext): string {
    return `
Generate 3-5 practical choices for this situation:

Situation: ${context.situation}
Agent Response: ${context.agentResponse}
Available Tools: ${context.availableTools.join(', ')}
Current Files: ${context.currentFiles.slice(0, 5).join(', ')}${context.currentFiles.length > 5 ? '...' : ''}
Project Context: ${context.projectContext}

Generate choices that:
1. Are immediately actionable and relevant
2. Leverage available tools when appropriate
3. Consider the project context
4. Provide different levels of detail/scope
5. Include both automated and manual options

Return JSON format:
{
  "title": "What would you like to do?",
  "options": [
    {
      "id": "unique_id",
      "label": "🔍 Short descriptive label",
      "description": "Brief explanation of what this does",
      "icon": "🔍",
      "action": "Specific prompt for the agent to execute this action"
    }
  ]
}

Keep labels under 50 characters. Make actions specific and executable.
`;
  }

  /**
   * Fallback choices when LLM generation fails
   */
  private getFallbackChoices(context: ChoiceContext): ChoiceMenu {
    return {
      title: 'Choose an action',
      options: [
        {
          id: 'continue',
          label: '▶️ Continue with current approach',
          description: 'Proceed with the suggested action',
          icon: '▶️',
          action: 'Continue with the current approach',
        },
        {
          id: 'explain',
          label: '❓ Explain in more detail',
          description: 'Get a detailed explanation',
          icon: '❓',
          action: 'Provide a more detailed explanation of the current situation',
        },
        {
          id: 'alternatives',
          label: '🔄 Show alternatives',
          description: 'Explore other options',
          icon: '🔄',
          action: 'Show alternative approaches to this task',
        },
      ],
      context,
    };
  }
}

class SmartMultiChoiceSystem {
  private choiceGenerator: DynamicChoiceGenerator;
  private currentInput: string = '';
  private selectedIndex: number = -1; // -1 = custom typing mode
  private showingSuggestions: boolean = false;

  constructor(llmClient: any) {
    this.choiceGenerator = new DynamicChoiceGenerator(llmClient);
  }

  /**
   * Present contextually generated choices with immediate input
   */
  async presentSmartChoices(context: ChoiceContext): Promise<string | null> {
    // First check if choices are warranted
    const shouldPresent = await this.choiceGenerator.shouldPresentChoices(context);

    if (!shouldPresent) {
      return null; // No choices needed, let agent continue normally
    }

    // Generate choices using LLM
    const menu = await this.choiceGenerator.generateChoices(context);

    // Start with custom input mode
    console.log();
    this.renderInputBox();
    console.log('Press ↑↓ to see suggested actions');

    // Handle input with arrow key navigation
    return await this.handleInteractiveInput(menu);
  }

  /**
   * Handle interactive input with arrow key navigation
   */
  private async handleInteractiveInput(menu: ChoiceMenu): Promise<string> {
    return new Promise((resolve) => {
      // Set up raw mode for key-by-key input
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const handleKeypress = (data: string) => {
        const key = data.charCodeAt(0);

        switch (key) {
          case 13: // Enter
            process.stdin.setRawMode(false);
            process.stdin.removeListener('data', handleKeypress);

            if (this.selectedIndex === -1) {
              // Custom input mode
              console.log();
              resolve(this.currentInput.trim());
            } else {
              // Selected a suggestion
              console.log();
              resolve(menu.options[this.selectedIndex].action);
            }
            break;

          case 27: // Escape
            if (this.showingSuggestions) {
              // Return to typing mode
              this.selectedIndex = -1;
              this.showingSuggestions = false;
              this.renderInterface(menu);
            }
            break;

          case 3: // Ctrl+C
            process.stdin.setRawMode(false);
            process.stdin.removeListener('data', handleKeypress);
            console.log('\\n^C');
            process.exit(0);
            break;

          default:
            if (data === '\\u001b[A') {
              // Up arrow
              this.handleArrowUp(menu);
            } else if (data === '\\u001b[B') {
              // Down arrow
              this.handleArrowDown(menu);
            } else if (key >= 32 && key <= 126) {
              // Printable characters
              if (this.selectedIndex !== -1) {
                // Switch back to typing mode
                this.selectedIndex = -1;
                this.showingSuggestions = false;
                this.currentInput = '';
              }
              this.currentInput += data;
              this.renderInterface(menu);
            } else if (key === 8 || key === 127) {
              // Backspace
              if (this.currentInput.length > 0) {
                this.currentInput = this.currentInput.slice(0, -1);
                this.renderInterface(menu);
              }
            }
            break;
        }
      };

      process.stdin.on('data', handleKeypress);
    });
  }

  private handleArrowUp(menu: ChoiceMenu): void {
    if (!this.showingSuggestions) {
      this.showingSuggestions = true;
      this.selectedIndex = 0;
    } else {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    }
    this.renderInterface(menu);
  }

  private handleArrowDown(menu: ChoiceMenu): void {
    if (!this.showingSuggestions) {
      this.showingSuggestions = true;
      this.selectedIndex = 0;
    } else {
      this.selectedIndex = Math.min(menu.options.length - 1, this.selectedIndex + 1);
    }
    this.renderInterface(menu);
  }

  private renderInterface(menu: ChoiceMenu): void {
    // Clear previous output
    process.stdout.write('\\u001b[2J\\u001b[H');

    // Re-render agent message
    console.log(`🤖 ${menu.context.agentResponse.split('\\n')[0]}`);
    console.log();

    // Show suggestions if active
    if (this.showingSuggestions) {
      this.renderSuggestionBox(menu);
      console.log();
    }

    // Always show input box
    this.renderInputBox();

    // Show help text
    if (this.showingSuggestions) {
      console.log('Press ↑↓ to navigate, Enter to select, Esc to return to typing');
    } else {
      console.log('Press ↑↓ to see suggested actions');
    }
  }

  private renderSuggestionBox(menu: ChoiceMenu): void {
    const width = 60;
    console.log(`┌─ Suggested actions ${'─'.repeat(width - 20)}┐`);

    // Custom prompt option (always first)
    const customActive = this.selectedIndex === -1;
    const customMarker = customActive ? '●' : ' ';
    const customText = customActive ? '💬 Custom prompt (currently typing)' : '💬 Custom prompt';
    console.log(`│ ${customMarker} ${customText.padEnd(width - 5)}│`);

    // Generated options
    menu.options.forEach((option, index) => {
      const isActive = this.selectedIndex === index;
      const marker = isActive ? '●' : ' ';
      const text = `${option.icon} ${option.label}`;
      console.log(`│ ${marker} ${text.padEnd(width - 5)}│`);
    });

    console.log(`└${'─'.repeat(width - 2)}┘`);
  }

  private renderInputBox(): void {
    const displayText = this.currentInput + '_';
    console.log(
      '╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮',
    );
    console.log(`│ > ${displayText.padEnd(125)}│`);
    console.log(
      '╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯',
    );
  }
}

// Usage in Wilk CLI
class WilkCLI {
  private smartChoices: SmartMultiChoiceSystem;
  private contextManager: any;

  constructor(llmClient: any, contextManager: any) {
    this.smartChoices = new SmartMultiChoiceSystem(llmClient);
    this.contextManager = contextManager;
  }

  /**
   * Handle any agent response - only presents choices when contextually appropriate
   */
  async handleAgentResponse(
    agentResponse: string,
    situation: string = 'general',
  ): Promise<string | null> {
    // Build context from current state
    const context: ChoiceContext = {
      situation,
      agentResponse,
      availableTools: await this.getAvailableTools(),
      currentFiles: await this.getCurrentFiles(),
      projectContext: await this.getProjectContext(),
      userPreferences: await this.getUserPreferences(),
    };

    // Only present choices if the situation warrants it
    const userAction = await this.smartChoices.presentSmartChoices(context);

    // Return null if no choices were presented (agent continues normally)
    return userAction;
  }

  /**
   * Example: Security vulnerabilities found (triggers choices)
   */
  async handleSecurityIssues(vulnerabilities: any[]): Promise<void> {
    const agentResponse = `Found ${vulnerabilities.length} security issues:\n${vulnerabilities.map((v) => `- ${v.severity}: ${v.description}`).join('\n')}`;

    const userAction = await this.handleAgentResponse(
      agentResponse,
      'security_vulnerabilities_found',
    );

    if (userAction) {
      // User made a choice, execute it
      await this.executeAction(userAction, { vulnerabilities });
    } else {
      // No choices presented, continue with default behavior
      console.log('🔍 Use `/security analyze` for detailed vulnerability analysis');
    }
  }

  /**
   * Example: Memory addition (triggers choices)
   */
  async handleMemoryAddition(content: string): Promise<void> {
    const agentResponse = `Ready to save: "${content}"`;

    const userAction = await this.handleAgentResponse(agentResponse, 'memory_addition');

    if (userAction) {
      await this.executeAction(userAction, { content });
    } else {
      // Default behavior - save to project memory
      console.log(`📝 Saved to project memory: "${content}"`);
    }
  }

  /**
   * Example: Agent installation (triggers choices)
   */
  async handleAgentInstallation(agentName: string, versions: any[]): Promise<void> {
    const agentResponse = `Found ${versions.length} versions of ${agentName}:\n${versions.map((v) => `- ${v.version} (${v.status})`).join('\n')}`;

    const userAction = await this.handleAgentResponse(agentResponse, 'agent_installation');

    if (userAction) {
      await this.executeAction(userAction, { agentName, versions });
    } else {
      // Default behavior - install latest stable
      console.log(`⬇️ Installing latest stable version of ${agentName}...`);
    }
  }

  /**
   * Example: Simple completion (does NOT trigger choices)
   */
  async handleSimpleCompletion(): Promise<void> {
    const agentResponse = 'Task completed successfully. All tests passed.';

    const userAction = await this.handleAgentResponse(agentResponse, 'task_completion');

    // This will return null - no choices presented for simple completions
    console.log('✅ Task completed');
  }

  /**
   * Example: Information response (does NOT trigger choices)
   */
  async handleInformationResponse(): Promise<void> {
    const agentResponse = 'Here is the current project structure:\n- src/\n- tests/\n- docs/';

    const userAction = await this.handleAgentResponse(agentResponse, 'information_request');

    // This will return null - no choices for simple information
    console.log(agentResponse);
  }

  private async executeAction(action: string, context: any): Promise<void> {
    // Send the action back to the appropriate agent for execution
    console.log(`🤖 Executing: ${action}`);
    // Implementation would delegate to the relevant agent/tool
  }

  private async getAvailableTools(): Promise<string[]> {
    // Return list of available tools
    return [
      'file_operations',
      'git_commands',
      'test_runner',
      'code_analyzer',
      'documentation_generator',
    ];
  }

  private async getCurrentFiles(): Promise<string[]> {
    // Return list of current files in context
    return ['src/main.ts', 'package.json', 'README.md'];
  }

  private async getProjectContext(): Promise<string> {
    // Return brief project context
    return 'TypeScript Node.js project with LibreChat integration';
  }

  private async getUserPreferences(): Promise<string> {
    // Return user preferences from memory
    return 'Prefers automated solutions, verbose output, security-first approach';
  }
}
```

## Progress Feedback Implementation

### Progress Indicator Types

```typescript
interface ProgressIndicator {
  type: 'spinner' | 'progress' | 'counter' | 'timer';
  message: string;
  elapsed: number;
  tokenUsage?: {
    direction: 'up' | 'down';
    count: number;
  };
  progress?: {
    current: number;
    total: number;
    units: string;
  };
  interruptible: boolean;
}

class ProgressFeedback {
  private indicators: Map<string, ProgressIndicator> = new Map();
  private updateInterval: NodeJS.Timeout;

  /**
   * Start progress feedback for agent operation
   */
  startProgress(
    operationId: string,
    message: string,
    options: {
      type?: 'spinner' | 'progress' | 'counter' | 'timer';
      interruptible?: boolean;
      trackTokens?: boolean;
    } = {},
  ): void {
    const indicator: ProgressIndicator = {
      type: options.type || 'spinner',
      message,
      elapsed: 0,
      interruptible: options.interruptible ?? true,
    };

    this.indicators.set(operationId, indicator);
    this.startUpdateLoop();
  }

  /**
   * Update progress with token usage
   */
  updateTokenUsage(operationId: string, direction: 'up' | 'down', tokenCount: number): void {
    const indicator = this.indicators.get(operationId);
    if (indicator) {
      indicator.tokenUsage = { direction, count: tokenCount };
    }
  }

  /**
   * Update progress with specific progress data
   */
  updateProgress(
    operationId: string,
    current: number,
    total: number,
    units: string = 'items',
  ): void {
    const indicator = this.indicators.get(operationId);
    if (indicator) {
      indicator.progress = { current, total, units };
    }
  }

  /**
   * Complete progress feedback
   */
  completeProgress(operationId: string): void {
    this.indicators.delete(operationId);
    if (this.indicators.size === 0) {
      this.stopUpdateLoop();
    }
  }

  private startUpdateLoop(): void {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      this.renderProgress();
    }, 100); // Update every 100ms
  }

  private stopUpdateLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private renderProgress(): void {
    // Clear previous progress lines
    process.stdout.write('\u001b[2K\r');

    for (const [operationId, indicator] of this.indicators) {
      indicator.elapsed += 0.1; // Increment elapsed time

      let progressLine = `* ${indicator.message}`;

      // Add spinner animation
      if (indicator.type === 'spinner') {
        const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        const spinnerIndex = Math.floor(indicator.elapsed * 10) % spinnerChars.length;
        progressLine = `${spinnerChars[spinnerIndex]} ${indicator.message}`;
      }

      // Add elapsed time
      progressLine += ` (${this.formatElapsed(indicator.elapsed)}`;

      // Add token usage if available
      if (indicator.tokenUsage) {
        const direction = indicator.tokenUsage.direction === 'up' ? '↑' : '↓';
        progressLine += ` · ${direction} ${this.formatTokens(indicator.tokenUsage.count)} tokens`;
      }

      // Add progress information
      if (indicator.progress) {
        const percentage = Math.round(
          (indicator.progress.current / indicator.progress.total) * 100,
        );
        progressLine += ` · ${indicator.progress.current}/${indicator.progress.total} ${indicator.progress.units} (${percentage}%)`;
      }

      // Add interrupt hint if interruptible
      if (indicator.interruptible) {
        progressLine += ' · esc to interrupt';
      }

      progressLine += ')';

      // Output the progress line
      console.log(progressLine);
    }
  }

  private formatElapsed(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  }

  private formatTokens(count: number): string {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  }
}
```

### Input Box Implementation

````typescript
class BoxedInput {
  private width: number;
  private height: number;
  private cursor: { x: number; y: number };
  private content: string[];
  private history: string[];
  private historyIndex: number;

  constructor(width: number = 120) {
    this.width = width;
    this.height = 1;
    this.cursor = { x: 0, y: 0 };
    this.content = [''];
    this.history = [];
    this.historyIndex = -1;
  }

  /**
   * Render the input box
   */
  render(): void {
    // Clear the area
    this.clearBox();

    // Draw top border
    console.log(`╭${'─'.repeat(this.width - 2)}╮`);

    // Draw content lines
    for (let i = 0; i < this.height; i++) {
      const line = this.content[i] || '';
      const paddedLine = line.padEnd(this.width - 5); // Account for prompt and borders
      const prefix = i === 0 ? '│ > ' : '│   ';
      console.log(`${prefix}${paddedLine}│`);
    }

    // Draw bottom border
    console.log(`╰${'─'.repeat(this.width - 2)}╯`);

    // Position cursor
    this.positionCursor();
  }

  /**
   * Handle key input
   */
  handleKey(key: string, data: any): boolean {
    switch (key) {
      case 'return':
        return this.handleEnter();
      case 'backspace':
        return this.handleBackspace();
      case 'up':
        return this.handleHistoryUp();
      case 'down':
        return this.handleHistoryDown();
      case 'tab':
        return this.handleTab();
      case 'escape':
        return this.handleEscape();
      default:
        if (data && data.length === 1) {
          return this.handleCharacter(data);
        }
        return false;
    }
  }

  private handleEnter(): boolean {
    // Handle multi-line input
    if (this.isMultilineContext()) {
      this.addNewLine();
      return false;
    }

    // Execute command
    const command = this.getContent();
    if (command.trim()) {
      this.history.push(command);
      this.historyIndex = -1;
      return true; // Signal to execute
    }

    return false;
  }

  private handleBackspace(): boolean {
    if (this.cursor.x > 0) {
      const currentLine = this.content[this.cursor.y];
      this.content[this.cursor.y] =
        currentLine.slice(0, this.cursor.x - 1) + currentLine.slice(this.cursor.x);
      this.cursor.x--;
    } else if (this.cursor.y > 0) {
      // Merge with previous line
      this.cursor.x = this.content[this.cursor.y - 1].length;
      this.content[this.cursor.y - 1] += this.content[this.cursor.y];
      this.content.splice(this.cursor.y, 1);
      this.cursor.y--;
      this.height--;
    }

    this.render();
    return false;
  }

  private handleHistoryUp(): boolean {
    if (this.history.length > 0) {
      if (this.historyIndex === -1) {
        this.historyIndex = this.history.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
      }

      this.setContent(this.history[this.historyIndex]);
      this.render();
    }
    return false;
  }

  private handleHistoryDown(): boolean {
    if (this.historyIndex !== -1) {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.setContent(this.history[this.historyIndex]);
      } else {
        this.historyIndex = -1;
        this.setContent('');
      }

      this.render();
    }
    return false;
  }

  private handleTab(): boolean {
    // Implement auto-completion
    const currentContent = this.getContent();
    const completions = this.getCompletions(currentContent);

    if (completions.length === 1) {
      this.setContent(completions[0]);
      this.render();
    } else if (completions.length > 1) {
      // Show completion options
      this.showCompletions(completions);
    }

    return false;
  }

  private handleEscape(): boolean {
    // Clear input or interrupt operation
    this.setContent('');
    this.render();
    return false;
  }

  private handleCharacter(char: string): boolean {
    const currentLine = this.content[this.cursor.y];
    this.content[this.cursor.y] =
      currentLine.slice(0, this.cursor.x) + char + currentLine.slice(this.cursor.x);
    this.cursor.x++;

    // Check if we need to wrap or expand
    if (this.cursor.x >= this.width - 5) {
      this.addNewLine();
    }

    this.render();
    return false;
  }

  private addNewLine(): void {
    this.content.push('');
    this.height++;
    this.cursor.y++;
    this.cursor.x = 0;
  }

  private getContent(): string {
    return this.content.join('\n');
  }

  private setContent(content: string): void {
    this.content = content.split('\n');
    this.height = Math.max(1, this.content.length);
    this.cursor.y = this.content.length - 1;
    this.cursor.x = this.content[this.cursor.y].length;
  }

  private clearBox(): void {
    // Move cursor up by the height of the box and clear
    process.stdout.write(`\u001b[${this.height + 2}A`);
    for (let i = 0; i < this.height + 2; i++) {
      process.stdout.write('\u001b[2K\u001b[1B');
    }
    process.stdout.write(`\u001b[${this.height + 2}A`);
  }

  private positionCursor(): void {
    const absoluteX = this.cursor.x + 3; // Account for prompt
    const absoluteY = this.cursor.y + 1; // Account for top border
    process.stdout.write(`\u001b[${absoluteY};${absoluteX}H`);
  }

  private isMultilineContext(): boolean {
    const content = this.getContent();
    // Check for incomplete structures that suggest multi-line input
    return (
      content.includes('```') ||
      content.includes('{') ||
      content.includes('[') ||
      content.endsWith('\\')
    );
  }

  private getCompletions(input: string): string[] {
    // Implement completion logic for commands, agents, files
    return [];
  }

  private showCompletions(completions: string[]): void {
    // Show completion options above or below the input box
    console.log('\nCompletions:');
    completions.forEach((completion, index) => {
      console.log(`  ${index + 1}. ${completion}`);
    });
  }
}
````

## Command Categories

### Agent Interaction & Information

```bash
# Direct agent interaction
<prompt>                    # Execute with active agents
@agent-name <prompt>        # Execute specific agent
@agent1 @agent2 <prompt>    # Execute multiple agents

# Agent information
/list-agents               # Show available agents
/help <command>           # Get contextual help
/doctor                   # Run health diagnostics
/status [agent]           # Show agent/system status
```

### Session & Context Management

```bash
# Agent session management
/agent add <agent-names>      # Add agents to session
/agent remove <agent-name>    # Remove agent from session

# Context management
/switch-context <project>     # Change project context
/add-dir <directory>         # Add working directory
/clear                       # Clear conversation history
/compact [instructions]      # Summarize conversation
/resume [session-id]         # Resume previous conversation

# Memory management
/memory                      # Edit memory files
#<message>                   # Add to memory (prompts for scope)
```

### Agent Management & Development

```bash
# Installation & updates
/install <identifier>        # Install agent from registry or file
/uninstall <agent-name>     # Remove installed agent
/update <agent-name>        # Update to latest version
/list --installed           # List installed agents

# Agent development
/agent create               # Interactive agent creation
/agent edit <agent-name>    # Edit agent configuration
/agent duplicate <source>   # Create modifiable copy
/agent tools add <agent> <tool>    # Add tool to agent
/agent tools remove <agent> <tool> # Remove tool from agent
```

### Community & Discovery

```bash
# Publishing
/publish <agent-name>                    # Publish to community
/publish --private --team <team>         # Private team publishing
/publish --category <cat> --tags <tags>  # Categorized publishing

# Discovery
/search <query>                          # Search agents by keyword
/search --category <cat> --rating <min>  # Filter by category/rating
/browse --category <category>            # Browse by category
/browse --trending --last-week          # Browse trending agents

# Showcase
/showcase --featured                     # View featured agents
/showcase --new-releases                 # View new releases
/showcase --community-picks              # View community favorites
/stats <agent-identifier>               # View agent statistics
```

### MCP Server Management

```bash
# Server lifecycle
/mcp list                   # List configured MCP servers
/mcp add <name> <config>    # Add MCP server
/mcp start <server-name>    # Start MCP server
/mcp stop <server-name>     # Stop MCP server
/mcp restart <server-name>  # Restart MCP server
/mcp remove <server-name>   # Remove MCP server

# Server information
/mcp status <server-name>   # Show server status
/mcp logs <server-name>     # View server logs
/mcp test <server-name>     # Test server connectivity
/mcp tools <server-name>    # List server tools
/mcp resources <server-name> # List server resources

# Package management
/mcp install <package>      # Install MCP package
/mcp uninstall <package>    # Uninstall MCP package
/mcp search <query>         # Search MCP packages
/mcp update <server>        # Update MCP server

# Configuration
/mcp config <server-name>   # View/edit server config
/mcp env <server> <key> <value>  # Set environment variable
/mcp env <server> --list    # List environment variables
```

### Prompt Management

```bash
# Prompt lifecycle
/prompt add <name> <content>     # Add custom prompt
/prompt edit <prompt-name>       # Edit existing prompt
/prompt remove <prompt-name>     # Remove custom prompt
/prompt list                     # List all prompts

# Community prompts
/prompt upload <name>            # Upload to community
/prompt download <identifier>    # Download community prompt

# Prompt execution
%<prompt-name> [args]           # Execute prompt with arguments
%code-review --focus security   # Example with arguments
%summarize --length short       # Example with parameters
```

### API Key & Configuration Management

```bash
# API keys
/api-key add <service> <key>    # Add API key
/api-key list                   # List configured keys (masked)
/api-key remove <service>       # Remove API key

# Configuration
/config                         # Open config panel
/config set <key> <value>       # Set configuration value
/config get <key>               # Get configuration value
/config validate                # Validate configuration
```

### Permissions & Security

```bash
# Permission management
/permissions set <agent> <resource> <action>  # Grant permission
/permissions view <agent>                     # View agent permissions
/permissions revoke <agent> <resource> <action> # Revoke permission

# Security
/doctor                         # Health check
/diagnose                       # Run full diagnostics
```

### Development & Integration

```bash
# Development tools
/hooks                          # Manage hook configurations
/ide                           # Manage IDE integrations
/init                          # Initialize WILK.md file
/vim                           # Toggle Vim mode

# Git integration
/install-github-app            # Setup GitHub Actions
/pr-comments <number>          # Get PR comments
/review                        # Review pull request
```

### Debug & Troubleshooting

```bash
# Debug mode
/debug <agent> [--debug] [--trace-level <level>]  # Enable debug mode
/logs [component|agent]                           # View logs
/trace <agent-name>                              # Start execution trace

# System diagnostics
/diagnose                      # Run system diagnostics
/cost                         # Show token usage and costs
/status                       # Show system status
```

### System Utilities

```bash
# System commands
/help [command]               # Get help
/exit                        # Exit REPL
/clear                       # Clear screen
/release-notes               # View release notes
/bug                         # Submit bug report
/migrate-installer           # Migrate installation
```

## Agent Syntax

### Direct Agent Execution

```bash
# Single agent
@code-analyzer analyze this codebase for security issues

# Multiple agents
@code-analyzer @doc-generator analyze code and update documentation

# Chained execution
@data-cleaner clean dataset then @chart-generator create visualization
```

### Prompt Execution

```bash
# Basic prompt execution
%code-review                           # Execute code-review prompt

# Parameterized prompts
%bug-checklist --target ./src/utils/   # Execute with specific target
%summarize --length short --format bullets  # Multiple parameters
%test-generator --framework jest --coverage true  # Complex parameters
```

### Memory Management

```bash
# Add to memory with scope selection
#Default to using Python 3.11 for all new scripts  # Prompts for scope selection
#Remember: John prefers TypeScript    # Project-specific memory
#Company coding standards require tests  # Team/organization memory
```

## Session Management

### Session Context

```typescript
interface REPLContext {
  session: {
    id: string;
    name: string;
    workingDirectory: string;
    activeAgents: string[];
    createdAt: Date;
    lastActivity: Date;
  };
  user: {
    id: string;
    preferences: UserPreferences;
    permissions: Permission[];
  };
  memory: {
    project: Record<string, any>;
    session: Record<string, any>;
    global: Record<string, any>;
  };
  tokens: {
    used: number;
    limit: number;
    cost: number;
  };
}
```

### Context Switching

```bash
# Switch between projects
/switch-context frontend-app         # Switch to frontend project
/switch-context backend-services     # Switch to backend project

# Multiple working directories
/add-dir ./frontend                  # Add frontend directory
/add-dir ./backend                   # Add backend directory
/add-dir ./docs                      # Add documentation directory
```

### Session Persistence

```bash
# Save and resume sessions
/save-session frontend-deployment   # Save current session
/resume frontend-deployment         # Resume saved session
/list-sessions                      # List all saved sessions
/delete-session <session-id>        # Delete saved session
```

## Command Examples

### Multi-Agent Workflow

```bash
wilk> /agent add code-analyzer doc-generator test-generator
✅ Added agents: code-analyzer, doc-generator, test-generator

wilk> Analyze the authentication module, update docs, and generate tests
🤖 code-analyzer: Scanning authentication module...
🔍 Found 2 security issues, 5 optimization opportunities
🤖 doc-generator: Updating API documentation...
📝 Generated authentication.md with security notes
🤖 test-generator: Creating test suite...
✅ Generated 15 test cases covering security scenarios

wilk> @security-auditor review the changes and @deployment-agent prepare staging
🤖 security-auditor: Reviewing security changes...
✅ Security review passed with recommendations
🤖 deployment-agent: Preparing staging environment...
🚀 Staging deployment ready at https://staging.example.com
```

### Registry Interaction

```bash
wilk> /search "code review"
Found 5 agents:
⭐ secure-code-reviewer (4.9/5, 2.3k downloads)
⭐ pr-assistant (4.7/5, 1.8k downloads)
⭐ code-quality-checker (4.6/5, 1.2k downloads)

wilk> /install secure-code-reviewer
⬇️  Downloading secure-code-reviewer v2.1.0...
✅ Installed: secure-code-reviewer
🔧 Configured with default security policies

wilk> /agent add secure-code-reviewer
✅ Added agent: secure-code-reviewer to current session

wilk> @secure-code-reviewer review the authentication changes
🤖 secure-code-reviewer: Analyzing authentication changes...
🔍 Security Analysis Complete:
✅ Input validation: Excellent
⚠️  Rate limiting: Consider stricter limits
❌ Error handling: Sensitive info in error messages
📋 Generated security-review-report.md
```

### Prompt Management

```bash
wilk> /prompt add security-checklist "Review code for: 1) Input validation 2) Authentication 3) Authorization 4) Data sanitization 5) Error handling"
✅ Added prompt: security-checklist

wilk> %security-checklist --target ./src/auth/
📝 Running security-checklist on ./src/auth/
✅ Input validation: PASS
✅ Authentication: PASS
⚠️  Authorization: Minor issues found
✅ Data sanitization: PASS
❌ Error handling: Information disclosure risk

wilk> /prompt upload security-checklist --description "Comprehensive security review checklist"
🚀 Uploaded prompt 'security-checklist' to community registry
```

## Performance Features

### Command Optimization

- **Instant startup:** <100ms cold start time
- **Fast completion:** Tab completion with <10ms response
- **Efficient parsing:** Optimized command parsing and routing
- **Smart caching:** Frequently used commands cached

### Context Management

- **Hierarchical context:** Immediate, working, background, archive
- **Smart summarization:** Automatic context compression when needed
- **Memory optimization:** Lazy loading of conversation history
- **Token awareness:** Real-time token usage tracking

### Concurrent Execution

- **Parallel agents:** Multiple agents can run simultaneously
- **Resource management:** CPU and memory limits per agent
- **Queue management:** Intelligent queuing of agent requests
- **Error isolation:** Agent failures don't affect other agents

## Integration Points

### LibreChat Integration

```typescript
// Reuses LibreChat's command handling patterns
class WilkCLIHandler {
  private commandRouter: CommandRouter;
  private agentClient: AgentClient; // From LibreChat

  async processCommand(input: string): Promise<CommandResult> {
    // Adapt LibreChat route handling for CLI
    const command = this.parseCommand(input);
    return await this.commandRouter.execute(command);
  }
}
```

### External Tool Integration

- **Shell commands:** Execute system commands with permission control
- **File operations:** Read, write, and manipulate files safely
- **Git integration:** Direct git operations with agent assistance
- **MCP servers:** Comprehensive Model Context Protocol support

## Next Steps

1. **[Command Reference](commands.md)** - Detailed documentation for each command
2. **[Agent Syntax](agent-syntax.md)** - Complete agent interaction syntax
3. **[Session Management](sessions.md)** - Session persistence and context handling
4. **[Examples](../examples/cli/)** - Practical usage examples and workflows

