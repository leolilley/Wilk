# Wilk Installation Guide

## Overview

Wilk provides multiple installation methods to accommodate different development environments and platforms. The primary installation method is NPM, with alternative package managers and direct installation options available.

## Quick Start

```bash
# Install via NPM (Recommended)
npm install -g wilk

# Verify installation
wilk --version

# Run setup wizard
wilk
```

## Installation Methods

### 1. NPM Installation (Primary Method)

**System Requirements:**

- Node.js 18.0 or higher
- NPM 8.0 or higher
- 2GB available disk space
- SQLite 3.35 or higher (installed automatically)

**Installation:**

```bash
# Install globally
npm install -g wilk

# Alternative: Install locally in project
npm install wilk
npx wilk

# Install specific version
npm install -g wilk@2.1.0

# Install beta version
npm install -g wilk@beta
```

**Benefits:**

- Automatic dependency management
- Easy updates via `npm update -g wilk`
- Cross-platform compatibility
- Familiar workflow for developers

### 2. Package Manager Installation

#### macOS (Homebrew)

```bash
# Add Wilk tap
brew tap wilk-sh/wilk

# Install Wilk
brew install wilk

# Update
brew update && brew upgrade wilk

# Uninstall
brew uninstall wilk
```

#### Ubuntu/Debian (APT)

```bash
# Add Wilk repository
curl -fsSL https://packages.wilk.sh/debian/gpg | sudo apt-key add -
echo "deb https://packages.wilk.sh/debian stable main" | sudo tee /etc/apt/sources.list.d/wilk.list

# Update package list
sudo apt update

# Install Wilk
sudo apt install wilk

# Update
sudo apt update && sudo apt upgrade wilk

# Uninstall
sudo apt remove wilk
```

#### Windows (Chocolatey)

```bash
# Install Chocolatey if not already installed
# See https://chocolatey.org/install

# Install Wilk
choco install wilk

# Update
choco upgrade wilk

# Uninstall
choco uninstall wilk
```

#### Windows (Winget)

```bash
# Install via Windows Package Manager
winget install wilk.wilk

# Update
winget upgrade wilk.wilk

# Uninstall
winget uninstall wilk.wilk
```

#### Arch Linux (AUR)

```bash
# Using yay
yay -S wilk

# Using paru
paru -S wilk

# Manual installation
git clone https://aur.archlinux.org/wilk.git
cd wilk
makepkg -si
```

### 3. Direct Installation (Fallback)

#### Quick Install Script

```bash
# Automatic installation
curl -sSL https://get.wilk.sh | bash

# With custom installation directory
curl -sSL https://get.wilk.sh | bash -s -- --install-dir=/opt/wilk

# Preview commands without executing
curl -sSL https://get.wilk.sh | bash -s -- --dry-run
```

#### Manual Binary Installation

```bash
# Download latest release
WILK_VERSION=$(curl -s https://api.github.com/repos/wilk-sh/wilk/releases/latest | grep -Po '"tag_name": "\K.*?(?=")')
curl -Lo wilk.tar.gz "https://github.com/wilk-sh/wilk/releases/download/${WILK_VERSION}/wilk-$(uname -s)-$(uname -m).tar.gz"

# Extract and install
tar -xzf wilk.tar.gz
sudo mv wilk /usr/local/bin/
chmod +x /usr/local/bin/wilk

# Verify installation
wilk --version
```

#### Docker Installation

```bash
# Pull official image
docker pull wilk/wilk:latest

# Run with volume mount
docker run -it --rm \
  -v $(pwd):/workspace \
  -v ~/.wilk:/root/.wilk \
  wilk/wilk:latest

# Create alias for convenience
echo 'alias wilk="docker run -it --rm -v $(pwd):/workspace -v ~/.wilk:/root/.wilk wilk/wilk:latest"' >> ~/.bashrc
source ~/.bashrc
```

## Post-Installation Setup

### 1. Initial Configuration Wizard

Upon first run, Wilk launches an interactive setup wizard:

```bash
wilk
```

**Setup Process:**

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

Welcome to Wilk! Let's set up your environment.

1. LLM Provider Configuration
   Choose your LLM provider:
   ○ OpenAI (API key required)
   ○ Anthropic (API key required)
   ○ Ollama (local models)
   ○ Azure OpenAI (endpoint required)
   ○ Custom endpoint

   Selection: ollama

2. Default Model Selection
   Available Ollama models:
   ○ llama3.2:8b (Recommended)
   ○ codellama:7b
   ○ mistral:7b
   ○ Install new model

   Selection: llama3.2:8b

3. Registry Configuration
   Registry URL [https://registry.wilk.sh]: (press Enter)

4. Directory Setup
   Wilk data directory [~/.wilk]: (press Enter)

5. Security Settings
   Enable audit logging? [Y/n]: y
   Enable permission validation? [Y/n]: y

✅ Configuration complete! You're ready to use Wilk.

Type '/help' for available commands or start with:
  /install @community/starter-pack
```

### 2. Manual Configuration

#### LLM Provider Setup

**OpenAI Configuration:**

```bash
wilk> /config set llm.provider openai
✅ LLM provider set to 'openai'

wilk> /api-key add openai sk-your-api-key-here
✅ OpenAI API key configured

wilk> /config set llm.model gpt-4
✅ Default model set to 'gpt-4'
```

**Ollama Configuration:**

```bash
# Install Ollama first (if not already installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull recommended model
ollama pull llama3.2:8b

# Configure Wilk
wilk> /config set llm.provider ollama
✅ LLM provider set to 'ollama'

wilk> /config set llm.model llama3.2:8b
✅ Default model set to 'llama3.2:8b'

wilk> /config set llm.endpoint http://localhost:11434
✅ Ollama endpoint configured
```

**Azure OpenAI Configuration:**

```bash
wilk> /config set llm.provider azure
✅ LLM provider set to 'azure'

wilk> /config set llm.endpoint https://your-resource.openai.azure.com
✅ Azure endpoint configured

wilk> /api-key add azure your-azure-api-key
✅ Azure API key configured

wilk> /config set llm.deployment your-deployment-name
✅ Azure deployment name set
```

#### Registry Configuration

```bash
# Default public registry
wilk> /config set registry.url https://registry.wilk.sh
✅ Registry URL configured

# Enterprise private registry
wilk> /config set registry.url https://registry.company.com
✅ Private registry URL configured

wilk> /config set registry.auth.method oauth2
✅ Authentication method set

wilk> /config set registry.auth.provider github
✅ Authentication provider set
```

### 3. Verification and Health Check

```bash
# Comprehensive system check
wilk> /doctor
🔍 Running Wilk system health check...

📋 System Information:
   ✅ Wilk Version: 2.1.0
   ✅ Node.js Version: 18.17.0
   ✅ Platform: linux-x64
   ✅ Architecture: x64

🗄️  Storage:
   ✅ Database: ~/.wilk/wilk.db (accessible)
   ✅ Agents Directory: ~/.wilk/agents/ (writable)
   ✅ Cache Directory: ~/.wilk/cache/ (67MB available)
   ✅ Disk Space: 2.3GB available

🤖 LLM Connectivity:
   ✅ Provider: ollama
   ✅ Endpoint: http://localhost:11434 (reachable)
   ✅ Model: llama3.2:8b (available)
   ✅ Test Query: 105ms response time

🌐 Registry Access:
   ✅ Registry: https://registry.wilk.sh (reachable)
   ✅ Authentication: Anonymous (working)
   ✅ Catalog: 1,247 agents available

🔧 Agent System:
   ✅ Installed Agents: 0
   ✅ Active Session: default-session
   ✅ Working Directory: /home/user/project

🔒 Security:
   ✅ Permission Engine: Active
   ✅ Audit Logging: Enabled
   ✅ Sandbox Support: Available

📊 Performance:
   ✅ Database Queries: <1ms average
   ✅ Memory Usage: 15MB (baseline)
   ✅ Startup Time: 87ms

No issues detected. Wilk is healthy and ready to use!

💡 Recommendations:
   • Install starter pack: /install @community/starter-pack
   • Configure IDE integration: /ide setup
   • Enable auto-updates: /config set updates.auto true
```

## Advanced Installation Options

### 1. Enterprise Installation

#### Automated Deployment Script

```bash
#!/bin/bash
# enterprise-install.sh - Automated Wilk deployment for enterprises

set -euo pipefail

# Configuration
WILK_VERSION="${WILK_VERSION:-latest}"
INSTALL_DIR="${INSTALL_DIR:-/opt/wilk}"
CONFIG_DIR="${CONFIG_DIR:-/etc/wilk}"
LOG_DIR="${LOG_DIR:-/var/log/wilk}"
USER="${WILK_USER:-wilk}"
GROUP="${WILK_GROUP:-wilk}"

# Create system user
sudo useradd -r -s /bin/false -d "${INSTALL_DIR}" "${USER}" || true

# Create directories
sudo mkdir -p "${INSTALL_DIR}" "${CONFIG_DIR}" "${LOG_DIR}"
sudo chown "${USER}:${GROUP}" "${INSTALL_DIR}" "${CONFIG_DIR}" "${LOG_DIR}"

# Install Wilk
if command -v npm >/dev/null 2>&1; then
    sudo npm install -g "wilk@${WILK_VERSION}"
else
    # Fallback to binary installation
    ARCH=$(uname -m)
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    curl -Lo wilk.tar.gz "https://github.com/wilk-sh/wilk/releases/download/${WILK_VERSION}/wilk-${OS}-${ARCH}.tar.gz"
    sudo tar -xzf wilk.tar.gz -C "${INSTALL_DIR}"
    sudo ln -sf "${INSTALL_DIR}/wilk" /usr/local/bin/wilk
    rm wilk.tar.gz
fi

# Install systemd service
sudo tee /etc/systemd/system/wilk.service > /dev/null <<EOF
[Unit]
Description=Wilk Agent Operating System
After=network.target

[Service]
Type=simple
User=${USER}
Group=${GROUP}
WorkingDirectory=${INSTALL_DIR}
Environment=WILK_CONFIG_DIR=${CONFIG_DIR}
Environment=WILK_LOG_DIR=${LOG_DIR}
ExecStart=/usr/local/bin/wilk daemon
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable wilk
sudo systemctl start wilk

echo "✅ Wilk enterprise installation complete"
echo "   Service status: sudo systemctl status wilk"
echo "   Logs: sudo journalctl -u wilk -f"
echo "   Configuration: ${CONFIG_DIR}/config.yaml"
```

#### Docker Compose for Production

```yaml
# docker-compose.yml
version: '3.8'

services:
  wilk:
    image: wilk/wilk:latest
    container_name: wilk-production
    restart: unless-stopped
    environment:
      - WILK_ENV=production
      - WILK_LOG_LEVEL=info
      - WILK_REGISTRY_URL=https://registry.company.com
    volumes:
      - ./config:/app/config:ro
      - wilk-data:/app/data
      - wilk-cache:/app/cache
      - /var/run/docker.sock:/var/run/docker.sock
    ports:
      - '3000:3000' # Web interface (optional)
    networks:
      - wilk-network
    healthcheck:
      test: ['CMD', 'wilk', 'status']
      interval: 30s
      timeout: 10s
      retries: 3

  ollama:
    image: ollama/ollama:latest
    container_name: wilk-ollama
    restart: unless-stopped
    volumes:
      - ollama-data:/root/.ollama
    ports:
      - '11434:11434'
    networks:
      - wilk-network

volumes:
  wilk-data:
  wilk-cache:
  ollama-data:

networks:
  wilk-network:
    driver: bridge
```

### 2. Development Installation

#### Source Installation

```bash
# Clone repository
git clone https://github.com/wilk-sh/wilk.git
cd wilk

# Install dependencies
npm install

# Build from source
npm run build

# Link for development
npm link

# Run tests
npm test

# Start in development mode
npm run dev
```

#### Development Environment Setup

```bash
#!/bin/bash
# dev-setup.sh - Development environment setup

# Install Node.js (if not installed)
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install Ollama for local development
if ! command -v ollama >/dev/null 2>&1; then
    curl -fsSL https://ollama.ai/install.sh | sh
    ollama pull llama3.2:8b
fi

# Clone and setup Wilk
git clone https://github.com/wilk-sh/wilk.git
cd wilk

# Install dependencies
npm install

# Setup development database
npm run db:setup

# Configure for development
cat > config/development.json <<EOF
{
  "llm": {
    "provider": "ollama",
    "model": "llama3.2:8b",
    "endpoint": "http://localhost:11434"
  },
  "registry": {
    "url": "https://registry.wilk.sh"
  },
  "debug": true,
  "logLevel": "debug"
}
EOF

# Start development server
npm run dev
```

## Troubleshooting

### Common Installation Issues

#### Permission Errors

```bash
# NPM permission issues
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Alternative: Use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
npm install -g wilk
```

#### Database Issues

```bash
# SQLite permission error
wilk> /doctor
❌ Database: Permission denied

# Fix permissions
chmod 755 ~/.wilk
chmod 664 ~/.wilk/wilk.db

# Reset database if corrupted
rm ~/.wilk/wilk.db
wilk  # Will recreate database
```

#### LLM Connection Issues

```bash
# Ollama not running
wilk> /doctor
❌ LLM Connectivity: Connection refused

# Start Ollama
ollama serve

# Or install Ollama
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Registry Access Issues

```bash
# Network connectivity
wilk> /doctor
❌ Registry Access: Timeout

# Check network
curl -I https://registry.wilk.sh

# Configure proxy if needed
wilk> /config set proxy.http http://proxy.company.com:8080
wilk> /config set proxy.https https://proxy.company.com:8080
```

### Diagnostic Commands

```bash
# Comprehensive diagnostics
wilk> /diagnose
🩺 Running comprehensive diagnostics...

📁 File System:
   • ~/.wilk directory: ✅ Exists, writable
   • Database file: ✅ Accessible
   • Agents directory: ✅ Writable
   • Cache directory: ✅ 1.2GB available

🔌 Network:
   • Internet connectivity: ✅ Available
   • Registry reachability: ✅ 45ms latency
   • LLM endpoint: ✅ Responding

💻 System:
   • Node.js version: ✅ 18.17.0
   • Available memory: ✅ 4.2GB
   • CPU cores: ✅ 8 cores

🔧 Configuration:
   • Valid YAML syntax: ✅ Parsed successfully
   • Required fields: ✅ All present
   • LLM provider setup: ✅ Configured

📦 Dependencies:
   • SQLite version: ✅ 3.42.0
   • Required packages: ✅ All installed

All diagnostics passed! System is healthy.
```

## Updates and Maintenance

### Automatic Updates

```bash
# Enable automatic updates
wilk> /config set updates.auto true
wilk> /config set updates.channel stable
wilk> /config set updates.check_interval daily

# Manual update check
wilk> /update check
📦 Update available: v2.1.1
   • Bug fixes for agent loading
   • Performance improvements
   • New MCP server support

wilk> /update install
⬇️  Downloading update...
✅ Updated to v2.1.1. Restart required.

wilk> /restart
```

### Backup and Restore

```bash
# Backup Wilk data
wilk> /backup create
📦 Creating backup...
✅ Backup created: ~/.wilk/backups/wilk-backup-2024-07-04.tar.gz

# Restore from backup
wilk> /backup restore ~/.wilk/backups/wilk-backup-2024-07-04.tar.gz
📦 Restoring backup...
✅ Backup restored successfully

# Automated backups
wilk> /config set backup.auto true
wilk> /config set backup.interval daily
wilk> /config set backup.retention 30d
```

## Next Steps

1. **[Setup Wizard](setup.md)** - Detailed configuration options
2. **[Health Checks](health.md)** - System diagnostics and monitoring
3. **[CLI Usage](../cli-interface/)** - Start using Wilk commands
4. **[Agent Development](../examples/agents/)** - Create your first agent

