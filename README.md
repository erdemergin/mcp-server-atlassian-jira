# Atlassian Jira MCP Server

This project provides a Model Context Protocol (MCP) server that acts as a bridge between AI assistants (like Anthropic's Claude, Cursor AI, or other MCP-compatible clients) and your Atlassian Jira instance. It allows AI to securely access and interact with your projects, issues, and other Jira resources in real-time.

## What is MCP and Why Use This Server?

Model Context Protocol (MCP) is an open standard enabling AI models to connect securely to external tools and data sources. This server implements MCP specifically for Jira.

**Benefits:**

- **Real-time Access:** Your AI assistant can directly access up-to-date Jira project and issue data.
- **Eliminate Copy/Paste:** No need to manually transfer information between Jira and your AI assistant.
- **Enhanced AI Capabilities:** Enables AI to search for issues, analyze issue details, summarize project status, and work with your tickets contextually.
- **Security:** You control access via an Atlassian API token. The AI interacts through the server, and sensitive operations remain contained.

## Available Tools

This MCP server exposes the following capabilities as standardized "Tools" for AI assistants:

| Tool Name       | Key Parameter(s)          | Description                                        | Example Conversational Use              | AI Tool Call Example (Simplified)                           |
| :-------------- | :------------------------ | :------------------------------------------------- | :-------------------------------------- | :---------------------------------------------------------- |
| `list-projects` | _None required_           | List available Jira projects.                      | "Show me all my Jira projects"          | `{}`                                                        |
| `get-project`   | `projectKeyOrId` (string) | Get detailed information about a project.          | "Tell me about the 'DEV' project"       | `{ projectKeyOrId: "DEV" }`                                 |
| `list-issues`   | `jql` (string, optional)  | Search for issues using JQL (Jira Query Language). | "Find all open bugs in the DEV project" | `{ jql: "project = DEV AND type = Bug AND status = Open" }` |
| `get-issue`     | `issueIdOrKey` (string)   | Get detailed information about a specific issue.   | "Show me all details for PROJ-123"      | `{ issueIdOrKey: "PROJ-123" }`                              |

## Interface Philosophy: Minimal Interface, Maximal Detail

This server is designed to be simple for both humans (via CLI) and AI (via MCP Tools) to use, while providing rich information:

1.  **Simple Commands/Tools:** Interfaces require only the essential identifiers or filters (like `projectKeyOrId`, `issueIdOrKey`, `jql`).
2.  **Comprehensive Results by Default:** Operations that retrieve a specific item (`get-project`, `get-issue`) automatically fetch and return all relevant details (metadata, fields, comments, components, versions, etc.) without needing extra "include" flags.

This philosophy ensures you get the full picture without complex commands, letting the AI focus on using the information rather than configuring requests.

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
5.  **Immediately copy the generated API token.** You won't be able to see it again. Store it securely (e.g., in a password manager).

### Step 2: Configure the Server Credentials

Choose **one** of the following methods:

#### Method A: Global MCP Config File (Recommended for Persistent Use)

This is the preferred method as it keeps credentials separate from your AI client configuration.

1.  **Create the directory** (if it doesn't exist):
    - macOS/Linux: `mkdir -p ~/.mcp`
    - Windows: Create a folder named `.mcp` in your user profile directory (e.g., `C:\Users\<YourUsername>\.mcp`)
2.  **Create the config file:** Inside the `.mcp` directory, create a file named `configs.json`.
3.  **Add the configuration:** Paste the following JSON structure into `configs.json`, replacing the placeholder values:

    ```json
    {
    	"@aashari/mcp-server-atlassian-jira": {
    		"environments": {
    			"ATLASSIAN_SITE_NAME": "<YOUR_SITE_NAME>",
    			"ATLASSIAN_USER_EMAIL": "<YOUR_ATLASSIAN_EMAIL>",
    			"ATLASSIAN_API_TOKEN": "<YOUR_COPIED_API_TOKEN>"
    		}
    	}
    	// You can add configurations for other @aashari MCP servers here too
    }
    ```

    - `<YOUR_SITE_NAME>`: Your Atlassian site name (e.g., if your URL is `mycompany.atlassian.net`, enter `mycompany`).
    - `<YOUR_ATLASSIAN_EMAIL>`: The email address associated with your Atlassian account.
    - `<YOUR_COPIED_API_TOKEN>`: The API token you generated in Step 1.

#### Method B: Environment Variables (Alternative / Temporary)

You can set environment variables directly when running the server. This is less convenient for regular use but useful for testing.

```bash
# Example for running the server directly (adjust for client config)
ATLASSIAN_SITE_NAME=<YOUR_SITE_NAME> \
ATLASSIAN_USER_EMAIL=<YOUR_ATLASSIAN_EMAIL> \
ATLASSIAN_API_TOKEN=<YOUR_COPIED_API_TOKEN> \
npx -y @aashari/mcp-server-atlassian-jira
```

### Step 3: Connect Your AI Assistant

Configure your MCP client (Claude Desktop, Cursor, etc.) to run this server.

#### Option 1: Claude Desktop

1.  Open Claude Desktop settings (gear icon).
2.  Click **Edit Config**.
3.  Add or merge the following into the `mcpServers` section:

    ```json
    {
    	"mcpServers": {
    		"aashari/mcp-server-atlassian-jira": {
    			"command": "npx",
    			"args": ["-y", "@aashari/mcp-server-atlassian-jira"]
    		}
    		// Add other servers here if needed
    	}
    }
    ```

4.  Save the configuration file.
5.  **Restart Claude Desktop.**
6.  Verify the connection: Click the "Tools" (hammer) icon. You should see the Jira tools listed (e.g., `list-projects`, `get-issue`).

#### Option 2: Cursor AI

1.  Open the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`).
2.  Search for and select **Cursor Settings > MCP**.
3.  Click **+ Add new MCP server**.
4.  Fill in the details:
    - **Name**: `aashari/mcp-server-atlassian-jira` (or another name you prefer)
    - **Type**: `command`
    - **Command**: `npx -y @aashari/mcp-server-atlassian-jira`
5.  Click **Add**.
6.  Wait for the indicator next to the server name to turn green, confirming it's running and connected.

### Step 4: Using the Tools

Now you can ask your AI assistant questions related to your Jira instance:

- "List all the Jira projects."
- "Tell me about the 'Marketing' project in Jira."
- "Search Jira for open issues assigned to me in the DEV project using JQL." (e.g., `project = DEV AND assignee = currentUser() AND status = Open`)
- "Get the details for Jira issue DEV-123."
- "Summarize the description and latest comments for issue CORE-456."

## Using as a Command-Line Tool (CLI)

You can also use this package directly from your terminal for quick checks or scripting.

#### Method 1: `npx` (No Installation Needed)

Run commands directly using `npx`:

```bash
# Ensure credentials are set via ~/.mcp/configs.json or environment variables first!
npx -y @aashari/mcp-server-atlassian-jira list-projects --limit 10
npx -y @aashari/mcp-server-atlassian-jira get-project --project DEV
npx -y @aashari/mcp-server-atlassian-jira list-issues --jql "project = DEV AND status = 'In Progress'"
```

#### Method 2: Global Installation (for Frequent Use)

1.  Install globally: `npm install -g @aashari/mcp-server-atlassian-jira`
2.  Run commands using the `mcp-jira` alias:

```bash
# Ensure credentials are set via ~/.mcp/configs.json or environment variables first!
mcp-jira list-projects --query "Platform"
mcp-jira get-issue --issue PROJ-123
mcp-jira list-issues --jql "project = TEAM AND priority = High" --limit 10
mcp-jira --help # See all commands
mcp-jira get-project --help # Help for a specific command
```

## Troubleshooting

- **Authentication Errors (401/403):**
    - Double-check your `ATLASSIAN_SITE_NAME`, `ATLASSIAN_USER_EMAIL`, and `ATLASSIAN_API_TOKEN` in your `~/.mcp/configs.json` or environment variables.
    - Ensure the API token is still valid and hasn't been revoked.
    - Verify your user account has permission to access the Jira instance, projects, and issues you're querying.
- **Server Not Connecting (in AI Client):**
    - Ensure the command in your AI client configuration (`npx -y @aashari/mcp-server-atlassian-jira`) is correct.
    - Check if Node.js/npm are correctly installed and in your system's PATH.
    - Try running the `npx` command directly in your terminal to see if it outputs any errors.
- **Resource Not Found (404 Errors):**
    - Verify the project key/ID or issue key/ID you are using is correct (project/issue keys are usually case-sensitive).
    - Ensure you have permissions to view the specific project or issue.
- **JQL Query Errors (400 Errors):**
    - Check your JQL syntax carefully. Ensure field names, operators (`=`, `!=`, `IN`, `~`, etc.), functions (`currentUser()`), and values (especially strings needing quotes) are correct. Refer to the [Atlassian JQL documentation](https://support.atlassian.com/jira-software-cloud/docs/jql-fields/).
    - Make sure you are using valid field names and values available in your Jira instance.
- **Enable Debug Logs:** Set the `DEBUG` environment variable to `true` for more detailed logs. Add `"DEBUG": "true"` inside the `environments` block in `configs.json` or run like `DEBUG=true npx ...`.

## For Developers: Contributing

Contributions are welcome! Please follow the established architecture and guidelines.

### Project Architecture

This MCP server adheres to a layered architecture promoting separation of concerns:

1.  **`src/cli`**: Defines the command-line interface using `commander`. Minimal logic, mainly argument parsing and calling controllers.
2.  **`src/tools`**: Defines the MCP tool interface for AI clients using `@modelcontextprotocol/sdk` and `zod` for schemas. Minimal logic, maps arguments and calls controllers.
3.  **`src/controllers`**: Contains the core application logic. Orchestrates calls to services, uses formatters, handles pagination, and ensures consistent responses. Implements the "maximal detail" principle for 'get' operations.
4.  **`src/services`**: Acts as an adapter to the specific vendor (Atlassian Jira) API. Uses `transport.util` for actual HTTP calls.
5.  **`src/formatters`**: Responsible for converting data into user-friendly Markdown output, heavily utilizing `formatter.util`. Handles potential ADF content via `adf.util`.
6.  **`src/utils`**: Holds shared, reusable utilities (config, logging, errors, formatting, transport, pagination, defaults, ADF conversion).
7.  **`src/types`**: Defines shared internal TypeScript types (`ControllerResponse`, etc.).

### Setting Up Development

1.  Clone the repository: `git clone <repository-url>`
2.  Navigate to the project directory: `cd mcp-server-atlassian-jira`
3.  Install dependencies: `npm install`
4.  Run the server in development mode (uses `ts-node` and watches for changes): `npm run dev:server`
5.  Run CLI commands during development: `npm run dev:cli -- <command> [options]` (e.g., `npm run dev:cli -- list-projects`)

### Key Development Scripts

- `npm run dev:server`: Start the MCP server via stdio transport with hot-reloading.
- `npm run dev:cli -- [args]`: Execute CLI commands using `ts-node`.
- `npm run build`: Compile TypeScript to JavaScript in `dist/`.
- `npm test`: Run unit and integration tests using Jest.
- `npm run lint`: Run ESLint to check for code style issues.
- `npm run format`: Format code using Prettier.

### Adding a New Feature (Tool/Command)

1.  **API Research:** Identify the target Jira Cloud REST API (v3) endpoint(s).
2.  **Service Layer:** Add function(s) in `src/services/vendor.atlassian.*.service.ts` using `fetchAtlassian`. Define API types in `src/services/vendor.*.types.ts`.
3.  **Controller Layer:** Add function in `src/controllers/*.controller.ts`. Define internal types (`*Options`, `*Identifier`) in `src/controllers/*.types.ts`. Call the service, ensure maximum detail for 'get' operations, call the formatter, handle pagination (`extractPaginationInfo` with `PaginationType.OFFSET`), return `ControllerResponse`, and wrap logic in `handleControllerError`.
4.  **Formatter:** Add/update function in `src/controllers/*.formatter.ts` using `formatter.util` and `adf.util` if needed.
5.  **Tool Layer:** Define Zod schema in `src/tools/*.types.ts` (minimal args). Define tool in `src/tools/*.tool.ts` using `server.tool()`, including the standard documentation template. Implement handler calling the controller.
6.  **CLI Layer:** Define command in `src/cli/*.cli.ts` using `commander` (options matching tool args). Implement action calling the controller, formatting output, and using `handleCliError`.
7.  **Testing:** Add relevant tests (unit, integration, CLI execution).
8.  **Documentation:** Update this README and ensure tool/CLI descriptions are accurate.

### Standard Tool Documentation Template

Use this template within the description string for `server.tool()`:

```markdown
PURPOSE: [Briefly explain what the tool does and its primary goal.]

WHEN TO USE:

- [Describe the main scenario(s) where this tool is useful.]
- [Mention specific situations or questions it answers.]

WHEN NOT TO USE:

- [Point to alternative tools if they are better suited for certain tasks.]
- [Mention any limitations or anti-patterns.]

RETURNS: [Describe the structure and key information included in the Markdown output. Mention that details are comprehensive by default for 'get' operations.]

EXAMPLES:

- [Provide a simple AI tool call example: { param: "value" }]
- [Provide a more complex example if applicable, e.g., with filters.]

ERRORS:

- [List common error scenarios (e.g., "Not Found", "Permission Denied", "Invalid JQL").]
- [Briefly suggest potential causes or checks (e.g., "Verify the ID/Key", "Check credentials/permissions", "Check JQL syntax").]
```

### File Naming Convention

- Utility files in `src/utils/` use `kebab-case`: `config.util.ts`, `error-handler.util.ts`.
- Feature-specific files (CLI, Controller, Formatter, Service, Tool, Types) use the pattern `atlassian.{feature}.{layer}.ts` or `vendor.atlassian.{feature}.{layer}.ts` (for services/service-types), e.g., `atlassian.projects.cli.ts`, `atlassian.issues.controller.ts`, `vendor.atlassian.projects.service.ts`.

## Versioning Note

This project (`@aashari/mcp-server-atlassian-jira`) follows Semantic Versioning. It is versioned independently from other `@aashari/mcp-server-*` packages (like Confluence or Bitbucket). Version differences between these related projects are expected and reflect their individual development cycles.

## License

[ISC](https://opensource.org/licenses/ISC)
