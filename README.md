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

List available Jira projects with optional filtering and pagination.

```json
{}
```

_or:_

```json
{ "name": "Platform" }
```

> "Show me all my Jira projects."

---

## `jira_get_project`

Get full details for a specific project, including components and versions.

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

List issues matching a JQL (Jira Query Language) query with pagination.

```json
{ "jql": "project = DEV AND status = 'In Progress'" }
```

_or:_

```json
{ "jql": "assignee = currentUser() AND resolution = Unresolved" }
```

> "Find open bugs assigned to me in the DEV project."

---

## `jira_get_issue`

Get comprehensive details for a specific issue, including description, comments, and linked development information.

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

List all comments for a specific Jira issue with pagination.

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

Add a new comment to a specific Jira issue.

```json
{
	"issueIdOrKey": "PROJ-123",
	"commentBody": "Thanks for the update. I'll review this by end of day."
}
```

> "Add a comment to PROJ-123 saying we'll implement the fix next sprint."

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
```

---

# License

[ISC License](https://opensource.org/licenses/ISC)
