# Atlassian Jira MCP Server

This project provides a Model Context Protocol (MCP) server that acts as a bridge between AI assistants (like Anthropic's Claude, Cursor AI, or other MCP-compatible clients) and your Atlassian Jira instance. It allows AI to securely access and interact with your projects, issues, and other Jira resources in real-time.

### What is MCP and Why Use This Server?

Model Context Protocol (MCP) is an open standard enabling AI models to connect securely to external tools and data sources. This server implements MCP specifically for Jira Cloud.

**Benefits:**

- **Real-time Access:** Your AI assistant can directly access up-to-date Jira project and issue data.
- **Eliminate Copy/Paste:** No need to manually transfer information between Jira and your AI assistant.
- **Enhanced AI Capabilities:** Enables AI to search for issues, analyze issue details, summarize project status, and work with your tickets contextually.
- **Security:** You control access via an Atlassian API token. The AI interacts through the server, and sensitive operations remain contained.

### Interface Philosophy: Simple Input, Rich Output

This server follows a "Minimal Interface, Maximal Detail" approach:

1.  **Simple Tools:** Ask for only essential identifiers or filters (like `projectKeyOrId`, `issueIdOrKey`, `jql`).
2.  **Rich Details:** When you ask for a specific item (like `get-project` or `get-issue`), the server provides all relevant information by default (description, fields, comments, components, versions, links, development information, etc.) without needing extra flags.

## Available Tools

This MCP server provides the following tools for your AI assistant:

### List Projects (`list-projects`)

**Purpose:** Discover available Jira projects and find their 'keys' or 'IDs'.

**Use When:** You need to know which projects exist, find a project's key/ID for JQL queries or `get-project`.

**Conversational Example:** "Show me all my Jira projects."

**Parameter Example:** `{}` (no parameters needed for basic list) or `{ query: "Mobile App" }` (to filter).

### Get Project (`get-project`)

**Purpose:** Retrieve detailed information about a _specific_ project using its key or ID. Includes components and versions.

**Use When:** You know the project key (e.g., "DEV") or ID (e.g., "10001") and need its full details, components, or versions.

**Conversational Example:** "Tell me about the 'DEV' project in Jira."

**Parameter Example:** `{ projectKeyOrId: "DEV" }` or `{ projectKeyOrId: "10001" }`

### List Issues (`list-issues`)

**Purpose:** Search for Jira issues using JQL (Jira Query Language). Provides issue keys/IDs needed for `get-issue`.

**Use When:** You need to find issues matching specific criteria (project, status, assignee, text, labels, dates, etc.) using JQL.

**Conversational Example:** "Find open bugs assigned to me in the DEV project."

**Parameter Example:** `{ jql: "project = DEV AND assignee = currentUser() AND status = Open" }` or `{ jql: "text ~ 'performance bug'" }`.

### Get Issue (`get-issue`)

**Purpose:** Retrieve comprehensive details for a _specific_ issue using its key or ID. Includes description, comments, attachments, links, etc. **Now with development information** showing related commits, branches, and pull requests.

**Use When:** You know the issue key (e.g., "PROJ-123") or ID (e.g., "10001") and need its full context, description, comments, or other details for analysis or summarization.

**Development Information:** Automatically fetches and displays associated Git commits, branches, and pull requests linked to the issue (requires Development Information integration in your Jira instance).

**Conversational Example:** "Show me the details for Jira issue PROJ-123 including linked commits."

**Parameter Example:** `{ issueIdOrKey: "PROJ-123" }` or `{ issueIdOrKey: "10001" }`

## Prerequisites

- **Node.js and npm:** Ensure you have Node.js (which includes npm) installed. Download from [nodejs.org](https://nodejs.org/).
- **Atlassian Account:** An active Atlassian account with access to the Jira instance, projects, and issues you want to connect to.

## Quick Start Guide

Follow these steps to connect your AI assistant to Jira:

### Step 1: Get Your Atlassian API Token

**Important:** Treat your API token like a password. Do not share it or commit it to version control.

1.  Go to your Atlassian API token management page:
    [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2.  Click **Create API token**.
3.  Give it a descriptive **Label** (e.g., `mcp-jira-access`).
4.  Click **Create**.
5.  **Immediately copy the generated API token.** You won't be able to see it again. Store it securely.

### Step 2: Configure the Server Credentials

Choose **one** of the following methods:

#### Method A: Global MCP Config File (Recommended)

This keeps credentials separate and organized.

1.  **Create the directory** (if needed): `~/.mcp/`
2.  **Create/Edit the file:** `~/.mcp/configs.json`
3.  **Add the configuration:** Paste the following JSON structure, replacing the placeholders:

    ```json
    {
    	"@aashari/mcp-server-atlassian-jira": {
    		"environments": {
    			"ATLASSIAN_SITE_NAME": "<YOUR_SITE_NAME>",
    			"ATLASSIAN_USER_EMAIL": "<YOUR_ATLASSIAN_EMAIL>",
    			"ATLASSIAN_API_TOKEN": "<YOUR_COPIED_API_TOKEN>"
    		}
    	}
    }
    ```

    - `<YOUR_SITE_NAME>`: Your Jira site name (e.g., `mycompany` for `mycompany.atlassian.net`).
    - `<YOUR_ATLASSIAN_EMAIL>`: Your Atlassian account email.
    - `<YOUR_COPIED_API_TOKEN>`: The API token from Step 1.

#### Method B: Environment Variables (Alternative)

Set environment variables when running the server.

```bash
ATLASSIAN_SITE_NAME="<YOUR_SITE_NAME>" \
ATLASSIAN_USER_EMAIL="<YOUR_EMAIL>" \
ATLASSIAN_API_TOKEN="<YOUR_API_TOKEN>" \
npx -y @aashari/mcp-server-atlassian-jira
```

### Step 3: Connect Your AI Assistant

Configure your MCP client (Claude Desktop, Cursor, etc.) to run this server.

#### Claude Desktop

1.  Open Settings (gear icon) > Edit Config.
2.  Add or merge into `mcpServers`:

    ```json
    {
    	"mcpServers": {
    		"aashari/mcp-server-atlassian-jira": {
    			"command": "npx",
    			"args": ["-y", "@aashari/mcp-server-atlassian-jira"]
    		}
    	}
    }
    ```

3.  Save and **Restart Claude Desktop**.
4.  **Verify:** Click the "Tools" (hammer) icon; Jira tools should be listed.

#### Cursor AI

1.  Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) > **Cursor Settings > MCP**.
2.  Click **+ Add new MCP server**.
3.  Enter:
    - Name: `aashari/mcp-server-atlassian-jira`
    - Type: `command`
    - Command: `npx -y @aashari/mcp-server-atlassian-jira`
4.  Click **Add**.
5.  **Verify:** Wait for the indicator next to the server name to turn green.

### Step 4: Using the Tools

You can now ask your AI assistant questions related to your Jira instance:

- "List the Jira projects."
- "Tell me about the 'Marketing' project in Jira."
- "Search Jira for open issues assigned to me in the DEV project using JQL."
- "Get the details for Jira issue DEV-123."
- "Show me the commits and pull requests linked to issue CORE-456."
- "Summarize the description and latest comments for issue CORE-456."

## Using as a Command-Line Tool (CLI)

You can also use this package directly from your terminal:

### Quick Use with `npx`

No installation required - run directly using npx:

```bash
# List projects
npx -y @aashari/mcp-server-atlassian-jira list-projects --limit 10

# Get project details
npx -y @aashari/mcp-server-atlassian-jira get-project --project DEV

# Search for issues
npx -y @aashari/mcp-server-atlassian-jira list-issues --jql "project = DEV AND status = 'In Progress'"

# Get issue details
npx -y @aashari/mcp-server-atlassian-jira get-issue --issue PROJ-123
```

### Global Installation

For frequent use, you can install the package globally on your system:

1. **Install globally** using npm:

    ```bash
    npm install -g @aashari/mcp-server-atlassian-jira
    ```

2. **Verify installation** by checking the version:

    ```bash
    mcp-atlassian-jira --version
    ```

3. **Use the commands** without npx prefix:

    ```bash
    # List projects
    mcp-atlassian-jira list-projects --limit 10

    # Filter projects by name
    mcp-atlassian-jira list-projects --query "Platform"

    # Get project details
    mcp-atlassian-jira get-project --project DEV

    # Search for issues with JQL
    mcp-atlassian-jira list-issues --jql "project = TEAM AND priority = High" --limit 10

    # Get issue details including linked development information
    mcp-atlassian-jira get-issue --issue PROJ-123
    ```

### Configuration with Global Installation

When installed globally, you can still use the same configuration methods:

1. **Using environment variables**:

    ```bash
    ATLASSIAN_SITE_NAME="<YOUR_SITE_NAME>" \
    ATLASSIAN_USER_EMAIL="<YOUR_EMAIL>" \
    ATLASSIAN_API_TOKEN="<YOUR_API_TOKEN>" \
    mcp-atlassian-jira list-projects
    ```

2. **Using global MCP config file** (recommended):
   Set up the `~/.mcp/configs.json` file as described in the Quick Start Guide.

## Feature: Development Information Integration

The `get-issue` command includes development information related to Jira issues, showing Git commits, branches, and pull requests associated with an issue. This helps track implementation progress and code changes directly through your AI assistant.

## License

[ISC](https://opensource.org/licenses/ISC)
