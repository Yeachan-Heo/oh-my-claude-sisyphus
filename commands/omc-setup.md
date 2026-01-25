---
description: One-time setup for oh-my-claudecode (the ONLY command you need to learn)
---

# OMC Setup

This is the **only command you need to learn**. After running this, everything else is automatic.

## Step 1: Ask User Preference

Use the AskUserQuestion tool to prompt the user:

**Question:** "Where should I configure oh-my-claudecode?"

**Options:**
1. **Local (this project)** - Creates `.claude/CLAUDE.md` in current project directory. Best for project-specific configurations.
2. **Global (all projects)** - Creates `~/.claude/CLAUDE.md` for all Claude Code sessions. Best for consistent behavior everywhere.

## Step 2: Execute Based on Choice

### If User Chooses LOCAL:

```bash
# Create .claude directory in current project
mkdir -p .claude

# Download fresh CLAUDE.md from GitHub
curl -fsSL "https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claudecode/main/docs/CLAUDE.md" -o .claude/CLAUDE.md && \
echo "Downloaded CLAUDE.md to .claude/CLAUDE.md"
```

### If User Chooses GLOBAL:

```bash
# Download fresh CLAUDE.md to global config
curl -fsSL "https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claudecode/main/docs/CLAUDE.md" -o ~/.claude/CLAUDE.md && \
echo "Downloaded CLAUDE.md to ~/.claude/CLAUDE.md"
```

## Step 3: Setup HUD Statusline

The HUD shows real-time status in Claude Code's status bar. **Invoke the hud skill** to set up and configure:

Use the Skill tool to invoke: `hud` with args: `setup`

This will:
1. Install the HUD wrapper script to `~/.claude/hud/omc-hud.mjs`
2. Configure `statusLine` in `~/.claude/settings.json`
3. Report status and prompt to restart if needed

## Step 3.5: Verify Plugin Build

The HUD requires the plugin to be built (dist/ directory). The dist/ folder is NOT included in git - it's generated when the plugin is installed via npm.

Check if the plugin is installed and built:

```bash
# Find the installed plugin version
PLUGIN_DIR="$HOME/.claude/plugins/cache/omc/oh-my-claudecode"
if [ -d "$PLUGIN_DIR" ]; then
  PLUGIN_VERSION=$(ls "$PLUGIN_DIR" 2>/dev/null | sort -V | tail -1)
  if [ -n "$PLUGIN_VERSION" ]; then
    # Check if dist/hud/index.js exists
    if [ ! -f "$PLUGIN_DIR/$PLUGIN_VERSION/dist/hud/index.js" ]; then
      echo "Plugin not built - building now..."
      cd "$PLUGIN_DIR/$PLUGIN_VERSION" && npm install
      if [ -f "dist/hud/index.js" ]; then
        echo "Build successful - HUD is ready"
      else
        echo "Build failed - HUD may not work correctly"
      fi
    else
      echo "Plugin already built - HUD is ready"
    fi
  else
    echo "Plugin version not found"
  fi
else
  echo "Plugin not installed - install with: claude /install-plugin oh-my-claudecode"
fi
```

**Note:** The `npm install` command triggers the `prepare` script which runs `npm run build`, creating the dist/ directory with all compiled HUD files.

## Step 4: Verify Plugin Installation

```bash
grep -q "oh-my-claudecode" ~/.claude/settings.json && echo "Plugin verified" || echo "Plugin NOT found - run: claude /install-plugin oh-my-claudecode"
```

## Step 5: Offer MCP Server Configuration

MCP servers extend Claude Code with additional tools (web search, GitHub, etc.).

Ask user: "Would you like to configure MCP servers for enhanced capabilities? (Context7, Exa search, GitHub, etc.)"

If yes, invoke the mcp-setup skill:
```
/oh-my-claudecode:mcp-setup
```

If no, skip to next step.

## Step 6: Detect Upgrade from 2.x

Check if user has existing configuration:
```bash
# Check for existing 2.x artifacts
ls ~/.claude/commands/ralph-loop.md 2>/dev/null || ls ~/.claude/commands/ultrawork.md 2>/dev/null
```

If found, this is an upgrade from 2.x.

## Step 7: Show Welcome Message

### For New Users:

```
OMC Setup Complete!

You don't need to learn any commands. I now have intelligent behaviors that activate automatically.

WHAT HAPPENS AUTOMATICALLY:
- Complex tasks -> I parallelize and delegate to specialists
- "plan this" -> I start a planning interview
- "don't stop until done" -> I persist until verified complete
- "stop" or "cancel" -> I intelligently stop current operation

MAGIC KEYWORDS (optional power-user shortcuts):
Just include these words naturally in your request:

| Keyword | Effect | Example |
|---------|--------|---------|
| ralph | Persistence mode | "ralph: fix the auth bug" |
| ralplan | Iterative planning | "ralplan this feature" |
| ulw | Max parallelism | "ulw refactor the API" |
| plan | Planning interview | "plan the new endpoints" |

Combine them: "ralph ulw: migrate the database"

MCP SERVERS:
Run /oh-my-claudecode:mcp-setup to add tools like web search, GitHub, etc.

HUD STATUSLINE:
The status bar now shows OMC state. Restart Claude Code to see it.

That's it! Just use Claude Code normally.
```

### For Users Upgrading from 2.x:

```
OMC Setup Complete! (Upgraded from 2.x)

GOOD NEWS: Your existing commands still work!
- /ralph, /ultrawork, /plan, etc. all still function

WHAT'S NEW in 3.0:
You no longer NEED those commands. Everything is automatic now:
- Just say "don't stop until done" instead of /ralph
- Just say "fast" or "parallel" instead of /ultrawork
- Just say "plan this" instead of /plan
- Just say "stop" instead of /cancel

MAGIC KEYWORDS (power-user shortcuts):
| Keyword | Same as old... | Example |
|---------|----------------|---------|
| ralph | /ralph | "ralph: fix the bug" |
| ralplan | /ralplan | "ralplan this feature" |
| ulw | /ultrawork | "ulw refactor API" |
| plan | /plan | "plan the endpoints" |

HUD STATUSLINE:
The status bar now shows OMC state. Restart Claude Code to see it.

Your workflow won't break - it just got easier!
```

## Fallback

If curl fails, tell user to manually download from:
https://raw.githubusercontent.com/Yeachan-Heo/oh-my-claudecode/main/docs/CLAUDE.md
