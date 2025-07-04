# Project: Agent Kiwi - LibreChat Fork

See @README.md for project overview and @package.json for available npm commands for this project.

## Architecture Guidelines

### Core Platform

- **Base**: LibreChat v0.7.8 with Agent Kiwi customizations
- **Agent System**: Reuse 90% of LibreChat's proven agent architecture
- **CLI Interface**: New Wilk CLI for command-line agent interaction
- **Storage**: SQLite + file system for 10-50x CLI performance improvement
- **Language**: TypeScript for type safety and developer experience

### Key Components

- **LibreChat Integration**: Adapt existing models, tools, and context management
- **Wilk CLI**: Command-line interface with 80+ commands and REPL
- **Tool Framework**: RAG, MCP servers, file operations, shell integration
- **Security**: Multi-layered permissions, sandboxing, audit logging
- **Memory System**: Persistent context across sessions (project/user/agent)

## Development Workflow

### Setup and Build

- Development setup: `./scripts/agent-kiwi.sh dev-setup`
- LibreChat packages: `./scripts/agent-kiwi.sh librechat-dev-setup`
- Build custom image: `./scripts/agent-kiwi.sh build [--push] [--tag v]`

### Development Commands

- Backend dev: `npm run backend:dev`
- Frontend dev: `npm run frontend:dev`
- Build packages: `npm run build:data-provider && npm run build:api`
- Run tests: `npm run test:client && npm run test:api`
- Lint and format: `npm run lint:fix && npm run format`

### Environment Management

- Development: `docker compose -f docker-compose.dev.yml up -d`
- Health check: `./scripts/agent-kiwi.sh dev-health`
- Cache clear: `./scripts/agent-kiwi.sh libre-clear-cache [--restart]`

## Code Standards

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper error handling with typed exceptions
- Document all public APIs with JSDoc comments

### File Organization

- **LibreChat code**: Follow existing LibreChat patterns
- **Wilk CLI code**: New directory structure under `wilk/`
- **Documentation**: Comprehensive docs in `wilk-docs/`
- **Tests**: Co-located with source files

### Naming Conventions

- Use descriptive variable names (no single letters except iterators)
- PascalCase for classes and interfaces
- camelCase for functions and variables
- SCREAMING_SNAKE_CASE for constants
- kebab-case for file names

## Important Patterns

### LibreChat Integration

- **Tool Loading**: Adapt `~/tools/` directory for CLI context
- **Agent Management**: Reuse `~/api/models/` for agent definitions
- **Context Management**: Extend LibreChat's context system
- **Authentication**: Adapt user management for CLI sessions

### Performance Optimization

- **SQLite over MongoDB**: 10-50x better CLI startup performance
- **Context Caching**: Intelligent memory management
- **Tool Execution**: Parallel processing with rate limiting
- **Resource Management**: Efficient memory and CPU usage

### Security Implementation

- **Permission Engine**: Granular access controls
- **Sandboxing**: Isolated execution environments
- **Audit Logging**: Comprehensive operation tracking
- **Input Validation**: Sanitize all user inputs

## Team Guidelines

### Development Process

- **Feature branches**: Use descriptive names with scope
- **Code reviews**: Required for all changes
- **Testing**: Write tests before implementation
- **Documentation**: Update docs as you code

### Git Workflow

- **Branch naming**: `feature/`, `fix/`, `docs/`, `refactor/`
- **Commit messages**: Conventional commits format
- **Pull requests**: Include description and testing steps
- **Merge strategy**: Squash and merge for features

### Communication

- **Daily updates**: Progress on agent development
- **Code reviews**: Focus on security and performance
- **Documentation**: Keep examples current and accurate
- **Architecture decisions**: Document significant changes

## Key File Locations

### Core LibreChat Files

- **API**: `api/` - Backend services and routes
- **Client**: `client/` - React frontend components
- **Packages**: `packages/` - Shared packages and utilities
- **Models**: `api/models/` - Database models and schemas

### Agent Kiwi Extensions

- **CLI Scripts**: `scripts/agent-kiwi.sh` - Main CLI tooling
- **Documentation**: `wilk-docs/` - Technical documentation
- **Configuration**: `librechat.yaml` - Development config
- **Templates**: `templates/` - Agent and workflow templates

### Important Documentation

- **Architecture**: @wilk-docs/architecture/README.md
- **CLI Interface**: @wilk-docs/cli-interface/README.md
- **Tool Integration**: @wilk-docs/tools/README.md
- **Security Framework**: @wilk-docs/security/README.md
- **Memory System**: @wilk-docs/memory/README.md

## Current Implementation Status

### ✅ Completed (100% Documentation)

- **Architecture Overview**: Complete system design
- **CLI Interface**: 80+ commands documented with examples
- **Storage Layer**: SQLite + file system architecture
- **Security Framework**: Multi-layered security with permissions
- **Tool Integration**: RAG, MCP, file operations, shell tools
- **Memory System**: Project/user/agent persistent memory
- **Enterprise Features**: Team collaboration, compliance, monitoring

### 🚧 Implementation Ready

- **Phase 1**: Core CLI and agent execution (12-15 weeks)
- **Phase 2**: Full MVP with all features (20-25 weeks)
- **Phase 3**: Enterprise features and compliance (30-35 weeks)

### 📋 Next Steps for Development

1. Set up TypeScript + SQLite development environment
2. Create basic CLI structure with REPL interface
3. Implement LibreChat agent loading patterns
4. Build core command router and execution framework
5. Add tool integration and MCP server management

## Development Environment

### Required Tools

- Node.js 18+ for LibreChat compatibility
- TypeScript 5+ for type safety
- SQLite 3.35+ for storage backend
- Docker for containerized services
- Git for version control

### Optional Tools

- Ollama for local LLM development
- VS Code with TypeScript extensions
- Prettier and ESLint for code formatting
- Jest and Playwright for testing

### Environment Variables

- Development config: `.env.development`
- LibreChat integration: Follow existing patterns
- CLI-specific: New environment variables for Wilk

## Performance Targets

### CLI Performance Goals

- **Startup time**: <100ms (vs 2-5s for web-based)
- **Memory usage**: 1-5MB baseline (vs 50-200MB web)
- **Command response**: <50ms for local operations
- **Agent loading**: <200ms for cached agents
- **Tool execution**: Parallel processing with <1s average

### LibreChat Code Reuse

- **Agent System**: 90% reusable - saves 8-10 weeks
- **Context Management**: 85% reusable - saves 4-5 weeks
- **Tool Integration**: 80% reusable - saves 3-4 weeks
- **Security Patterns**: 75% reusable - saves 2-3 weeks

