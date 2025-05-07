# Atlassian Jira MCP Server

This project provides a Model Context Protocol (MCP) server that acts as a bridge between AI assistants (like Anthropic's Claude, Cursor AI, or other MCP-compatible clients) and your Atlassian Jira instance. It allows AI to securely access and interact with your projects, issues, and other Jira resources in real time.

---

# Overview

## What is MCP?

Model Context Protocol (MCP) is an open standard that allows AI systems to securely and contextually connect with external tools and data sources.

This server implements MCP specifically for Jira Cloud, bridging your Jira data with AI assistants.

## Why Use This Server?

- **Minimal Input, Maximum Output Philosophy**: Simple identifiers like `projectKeyOrId` and `issueIdOrKey` are all you need. Each tool returns comprehensive details without requiring extra flags.

- **Complete Jira Context**: Provide your AI assistant with full visibility into projects, issues, comments, and all relevant metadata to understand your work context.

- **Rich Development Information**: Get detailed insights into branches, commits, and pull requests linked to issues, creating a bridge between your issue tracking and code repositories.

- **Secure Local Authentication**: Credentials are never stored in the server. The server runs locally, so your tokens never leave your machine and you can request only the permissions you need.

- **Intuitive Markdown Responses**: All responses use well-structured Markdown for readability with consistent formatting and navigational links.

---

# Getting Started

## Prerequisites

- **Node.js** (>=18.x): [Download](https://nodejs.org/)
- **Atlassian Account** with access to Jira Cloud

---

## Step 1: Get Your Atlassian API Token

1. Go to your Atlassian API token management page:
   [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**.
3. Give it a descriptive **Label** (e.g., `mcp-jira-access`).
4. Click **Create**.
5. **Copy the generated API token** immediately. You won't be able to see it again.

---

## Step 2: Configure Credentials

### Method A: MCP Config File (Recommended)

Create or edit `~/.mcp/configs.json`:

```json
{
	"jira": {
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

**Note:** For backward compatibility, the server will also recognize configurations under the full package name (`@aashari/mcp-server-atlassian-jira`), the unscoped package name (`mcp-server-atlassian-jira`), or the `atlassian-jira` format if the recommended `jira` key is not found. However, using the short `jira` key is preferred for new configurations.

### Method B: Environment Variables

Pass credentials directly when running the server:

```bash
ATLASSIAN_SITE_NAME="<YOUR_SITE_NAME>" \
ATLASSIAN_USER_EMAIL="<YOUR_EMAIL>" \
ATLASSIAN_API_TOKEN="<YOUR_API_TOKEN>" \
npx -y @aashari/mcp-server-atlassian-jira
```

---

## Step 3: Connect Your AI Assistant

Configure your MCP-compatible client to launch this server.

**Claude / Cursor Configuration:**

```json
{
	"mcpServers": {
		"jira": {
			"command": "npx",
			"args": ["-y", "@aashari/mcp-server-atlassian-jira"]
		}
	}
}
```

This configuration launches the server automatically at runtime.

---

# Tools

This section covers the MCP tools available when using this server with an AI assistant. Note that MCP tools use `snake_case` for tool names and `camelCase` for parameters.

## `jira_ls_projects`

Lists Jira projects accessible to the user with optional filtering and pagination.

**Parameters:**

- `name` (string, optional): Filter projects by name (case-insensitive partial match)
- `limit` (number, optional): Maximum number of projects to return (1-100, default: 25)
- `startAt` (number, optional): Index of the first project to return (0-based offset)
- `orderBy` (string, optional): Sort field - can be "name", "key", "id", or "lastIssueUpdatedTime" (default)

**Example:**

```json
{}
```

_or:_

```json
{
	"name": "Platform",
	"limit": 10,
	"orderBy": "name"
}
```

> "Show me all my Jira projects."

---

## `jira_get_project`

Gets comprehensive details for a specific project, including components, versions, and metadata.

**Parameters:**

- `projectKeyOrId` (string, required): The key (e.g., "DEV") or numeric ID (e.g., "10001") of the project

**Example:**

```json
{ "projectKeyOrId": "DEV" }
```

_or:_

```json
{ "projectKeyOrId": "10001" }
```

> "Tell me about the DEV project in Jira."

---

## `jira_ls_issues`

Searches for Jira issues using flexible filtering criteria, with pagination support.

**Parameters:**

- `jql` (string, optional): JQL query to filter issues (e.g., "project = DEV AND status = 'In Progress'")
- `projectKeyOrId` (string, optional): Filter by a specific project key or ID
- `statuses` (string[], optional): Filter by one or more status names
- `orderBy` (string, optional): JQL ORDER BY clause (e.g., "priority DESC")
- `limit` (number, optional): Maximum number of issues to return (1-100, default: 25)
- `startAt` (number, optional): Index of the first issue to return (0-based offset)

**Example:**

```json
{ "jql": "project = DEV AND status = 'In Progress'" }
```

_or:_

```json
{
	"projectKeyOrId": "DEV",
	"statuses": ["In Progress", "To Do"],
	"limit": 15
}
```

> "Find open bugs assigned to me in the DEV project."

---

## `jira_get_issue`

Gets comprehensive details for a specific issue, including description, comments, and linked development information.

**Parameters:**

- `issueIdOrKey` (string, required): The key (e.g., "PROJ-123") or numeric ID (e.g., "10001") of the issue

**Example:**

```json
{ "issueIdOrKey": "PROJ-123" }
```

_or:_

```json
{ "issueIdOrKey": "10001" }
```

> "Show me all details and linked commits for issue PROJ-123."

---

## `jira_ls_comments`

Lists all comments for a specific Jira issue with pagination.

**Parameters:**

- `issueIdOrKey` (string, required): The key or ID of the issue to get comments from
- `limit` (number, optional): Maximum number of comments to return (1-100, default: 25)
- `startAt` (number, optional): Index of the first comment to return (0-based offset)
- `orderBy` (string, optional): Field and direction to sort comments by (e.g., "created ASC" or "updated DESC")

**Example:**

```json
{ "issueIdOrKey": "PROJ-123" }
```

_or:_

```json
{
	"issueIdOrKey": "PROJ-123",
	"limit": 10,
	"orderBy": "created DESC"
}
```

> "Show me all comments on issue PROJ-123."

---

## `jira_add_comment`

Adds a new comment to a specific Jira issue.

**Parameters:**

- `issueIdOrKey` (string, required): The key or ID of the issue to add a comment to
- `commentBody` (string, required): The text content of the comment to add (plain text only)

**Example:**

```json
{
	"issueIdOrKey": "PROJ-123",
	"commentBody": "Thanks for the update. I'll review this by end of day."
}
```

> "Add a comment to PROJ-123 saying we'll implement the fix next sprint."

---

## `jira_ls_statuses`

Lists all available Jira statuses, either globally or for a specific project.

**Parameters:**

- `projectKeyOrId` (string, optional): Project key or ID to filter statuses relevant to that project's workflows

**Example:**

```json
{}
```

_or:_

```json
{ "projectKeyOrId": "DEV" }
```

> "What are the available statuses in our Jira instance?"

---

# Command-Line Interface (CLI)

The CLI uses kebab-case for commands (e.g., `ls-projects`) and options (e.g., `--project-key-or-id`).

## Quick Use with `npx`

```bash
npx -y @aashari/mcp-server-atlassian-jira ls-projects
npx -y @aashari/mcp-server-atlassian-jira get-issue --issue-id-or-key PROJ-123
npx -y @aashari/mcp-server-atlassian-jira ls-issues --jql "project = DEV AND status = 'In Progress'"
npx -y @aashari/mcp-server-atlassian-jira ls-comments --issue-id-or-key PROJ-123
npx -y @aashari/mcp-server-atlassian-jira add-comment --issue-id-or-key PROJ-123 --body "This issue has been prioritized for the next sprint."
npx -y @aashari/mcp-server-atlassian-jira ls-statuses --project-key-or-id DEV
```

## Install Globally

```bash
npm install -g @aashari/mcp-server-atlassian-jira
```

Then run directly:

```bash
mcp-atlassian-jira ls-projects
mcp-atlassian-jira get-issue --issue-id-or-key PROJ-123
mcp-atlassian-jira ls-comments --issue-id-or-key PROJ-123
```

## Available Commands

The following CLI commands are available:

### `ls-projects`

Lists Jira projects with optional filtering and pagination.

```bash
mcp-atlassian-jira ls-projects [options]

Options:
  -n, --name <value>       Filter projects by name (case-insensitive partial match)
  -l, --limit <number>     Maximum number of items to return (1-100). Default is 25
  -s, --start-at <number>  Index of the first item to return (0-based offset)
  -o, --order-by <field>   Sort field (name, key, id, or lastIssueUpdatedTime)
```

### `get-project`

Gets detailed information about a specific Jira project.

```bash
mcp-atlassian-jira get-project --project-key-or-id <value>

Options:
  --project-key-or-id <value>  The key or ID of the project to retrieve (required)
```

### `ls-issues`

Searches for Jira issues using JQL or specific filters, with pagination.

```bash
mcp-atlassian-jira ls-issues [options]

Options:
  -l, --limit <number>                Maximum number of items to return (1-100). Default is 25
  -c, --start-at <number>             Index of the first item to return (0-based offset)
  -q, --jql <jql>                     Filter issues using JQL syntax
  -p, --project-key-or-id <keyOrId>   Filter by a specific project key or ID
  -s, --statuses <statuses...>        Filter by one or more status names (repeatable)
  -o, --order-by <field>              JQL ORDER BY clause (e.g., "priority DESC")
```

### `get-issue`

Gets detailed information about a specific Jira issue.

```bash
mcp-atlassian-jira get-issue --issue-id-or-key <value>

Options:
  --issue-id-or-key <value>  The ID or key of the Jira issue to retrieve (required)
```

### `ls-comments`

Lists comments for a specific Jira issue with pagination support.

```bash
mcp-atlassian-jira ls-comments --issue-id-or-key <value> [options]

Options:
  --issue-id-or-key <value>   The ID or key of the Jira issue to get comments from (required)
  -l, --limit <number>        Maximum number of comments to return (1-100). Default is 25
  -s, --start-at <number>     Index of the first comment to return (0-based offset)
  -o, --order-by <field>      Field and direction to sort comments by
```

### `add-comment`

Adds a new comment to a specific Jira issue.

```bash
mcp-atlassian-jira add-comment --issue-id-or-key <value> --body <text>

Options:
  --issue-id-or-key <value>   The ID or key of the Jira issue to add a comment to (required)
  --body <text>               The text content of the comment to add (required)
```

### `ls-statuses`

Lists available Jira statuses globally or for a specific project.

```bash
mcp-atlassian-jira ls-statuses [options]

Options:
  --project-key-or-id <keyOrId>  Optional project key or ID to filter statuses
```

## Discover More CLI Options

Use `--help` to see flags and usage for all available commands:

```bash
mcp-atlassian-jira --help
```

Or get detailed help for a specific command:

```bash
mcp-atlassian-jira ls-projects --help
mcp-atlassian-jira get-project --help
mcp-atlassian-jira ls-issues --help
mcp-atlassian-jira get-issue --help
mcp-atlassian-jira ls-comments --help
mcp-atlassian-jira add-comment --help
mcp-atlassian-jira ls-statuses --help
```

---

# License

[ISC License](https://opensource.org/licenses/ISC)
