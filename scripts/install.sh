#!/bin/bash
# Oh-My-Claude-Sisyphus Installer
# Automated installation for oh-my-claudecode

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Oh-My-ClaudeCode Installer v1.0        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Claude Code config directory
CLAUDE_CONFIG_DIR="$HOME/.claude"

# Check if Claude Code is installed
if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    echo -e "${RED}✗ Claude Code not found${NC}"
    echo "  Please install Claude Code first: https://docs.anthropic.com/claude-code"
    exit 1
fi

echo -e "${GREEN}✓ Claude Code detected${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect package manager
if command_exists bun; then
    PKG_MANAGER="bun"
    INSTALL_CMD="bun install -g"
elif command_exists npm; then
    PKG_MANAGER="npm"
    INSTALL_CMD="npm install -g"
elif command_exists pnpm; then
    PKG_MANAGER="pnpm"
    INSTALL_CMD="pnpm install -g"
else
    echo -e "${RED}✗ No package manager found${NC}"
    echo "  Please install Node.js and npm: https://nodejs.org/"
    exit 1
fi

echo -e "${BLUE}Installation Method:${NC}"
echo ""
echo "Choose how you want to install oh-my-claudecode:"
echo ""
echo "  ${GREEN}1)${NC} Plugin Installation (Recommended)"
echo "     - Installs via Claude Code plugin system"
echo "     - Automatic updates"
echo "     - Integrated setup wizard"
echo ""
echo "  ${YELLOW}2)${NC} NPM Global Installation"
echo "     - Installs CLI tools globally"
echo "     - Manual configuration required"
echo "     - Package: oh-my-claude-sisyphus"
echo ""

if [ -t 0 ]; then
    read -p "Choose installation method (1/2): " -n 1 -r METHOD
    echo
else
    if [ -c /dev/tty ]; then
        echo -n "Choose installation method (1/2): " >&2
        read -n 1 -r METHOD < /dev/tty
        echo
    else
        echo -e "${YELLOW}Non-interactive mode - defaulting to plugin installation${NC}"
        METHOD="1"
    fi
fi

case "$METHOD" in
    1)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════${NC}"
        echo -e "${BLUE}  Plugin Installation${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════${NC}"
        echo ""
        echo "To complete the installation, run these commands in Claude Code:"
        echo ""
        echo -e "${GREEN}  /plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode${NC}"
        echo -e "${GREEN}  /plugin install oh-my-claudecode${NC}"
        echo -e "${GREEN}  /omc-setup${NC}"
        echo ""
        echo -e "${YELLOW}Note:${NC} Copy and paste these commands into Claude Code CLI"
        echo ""

        # Check if clipboard command exists and offer to copy
        if command_exists pbcopy; then
            read -p "Copy commands to clipboard? (y/N) " -n 1 -r COPY
            echo
            if [[ $COPY =~ ^[Yy]$ ]]; then
                echo "/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
/omc-setup" | pbcopy
                echo -e "${GREEN}✓ Commands copied to clipboard${NC}"
            fi
        elif command_exists xclip; then
            read -p "Copy commands to clipboard? (y/N) " -n 1 -r COPY
            echo
            if [[ $COPY =~ ^[Yy]$ ]]; then
                echo "/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
/omc-setup" | xclip -selection clipboard
                echo -e "${GREEN}✓ Commands copied to clipboard${NC}"
            fi
        fi
        ;;

    2)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════${NC}"
        echo -e "${BLUE}  NPM Global Installation${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════${NC}"
        echo ""
        echo -e "Package manager: ${GREEN}$PKG_MANAGER${NC}"
        echo ""

        read -p "Install oh-my-claude-sisyphus globally? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Cancelled."
            exit 0
        fi

        echo ""
        echo -e "${BLUE}Installing oh-my-claude-sisyphus...${NC}"

        if $INSTALL_CMD oh-my-claude-sisyphus; then
            echo ""
            echo -e "${GREEN}✓ Package installed successfully${NC}"
            echo ""
            echo -e "${YELLOW}Next steps:${NC}"
            echo "  1. Configure Claude Code settings"
            echo "  2. Set up hooks and agents manually"
            echo "  3. See: https://yeachan-heo.github.io/oh-my-claudecode-website"
        else
            echo ""
            echo -e "${RED}✗ Installation failed${NC}"
            echo "  Try running: $INSTALL_CMD oh-my-claude-sisyphus"
            exit 1
        fi
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation Guide Complete${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Resources:${NC}"
echo "  • Documentation: https://yeachan-heo.github.io/oh-my-claudecode-website"
echo "  • GitHub: https://github.com/Yeachan-Heo/oh-my-claudecode"
echo "  • Issues: https://github.com/Yeachan-Heo/oh-my-claudecode/issues"
echo ""
echo -e "${GREEN}Happy coding!${NC}"
echo ""
