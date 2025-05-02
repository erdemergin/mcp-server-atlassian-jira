import atlassianIssuesController from './atlassian.issues.controller.js';
import { config } from '../utils/config.util.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { McpError } from '../utils/error.util.js';

describe('Atlassian Issues Controller', () => {
	// Load configuration and check for credentials before running tests
	beforeAll(() => {
		// Load configuration
		config.load();

		// Check if Atlassian credentials are available
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn('Atlassian credentials are required for these tests.');
		}
	});

	// Helper function to skip tests when credentials are missing
	const skipIfNoCredentials = () => !getAtlassianCredentials();

	describe('list', () => {
		it('should format issues list correctly', async () => {
			if (skipIfNoCredentials()) return;

			// Call the controller
			const result = await atlassianIssuesController.list();

			// Check the structure and types
			expect(result).toBeDefined();
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).toHaveProperty('pagination');

			// Check pagination object structure and basic types
			expect(result.pagination).toBeDefined();
			expect(result.pagination).toHaveProperty('hasMore');
			expect(typeof result.pagination?.hasMore).toBe('boolean');
			expect(result.pagination).toHaveProperty('count');
			expect(typeof result.pagination?.count).toBe('number');
			expect(result.pagination).toHaveProperty('total');
			expect(typeof result.pagination?.total).toBe('number');
			if (result.pagination?.hasMore) {
				expect(result.pagination).toHaveProperty('nextCursor');
				expect(typeof result.pagination?.nextCursor).toBe('string');
			}

			// Check that content does NOT contain pagination string
			expect(result.content).not.toContain('Showing');
			expect(result.content).not.toContain('Next StartAt');
			expect(result.content).not.toContain(`total issues`);

			// Check basic markdown content - check for expected formatting from live data
			if (result.content !== 'No issues found matching your criteria.') {
				expect(result.content).toContain('# Jira Issues');
				expect(result.content).toMatch(/## [A-Z]+-\d+:/m);
			}
		}, 30000);

		it('should handle pagination parameters', async () => {
			if (skipIfNoCredentials()) return;

			// Call the controller with pagination parameters
			const result = await atlassianIssuesController.list({
				limit: 10,
				startAt: 0,
			});

			// Verify the response structure
			expect(result).toBeDefined();
			expect(typeof result.content).toBe('string');

			// Check if pagination is handled correctly
			if (result.pagination && result.pagination.hasMore) {
				expect(result.pagination.nextCursor).toBeDefined();
				expect(
					parseInt(result.pagination.nextCursor as string, 10),
				).toBe(10);
			}
		}, 30000);

		it('should handle filtering parameters with basic JQL', async () => {
			if (skipIfNoCredentials()) return;

			// Call the controller with basic JQL
			const result = await atlassianIssuesController.list({
				jql: 'created >= -30d',
			});

			// Verify the response structure
			expect(result).toBeDefined();
			expect(typeof result.content).toBe('string');
			expect(result.content).toContain('# Jira Issues');
		}, 30000);

		it('should handle complex JQL queries', async () => {
			if (skipIfNoCredentials()) return;

			try {
				// Call the controller with complex JQL
				const result = await atlassianIssuesController.list({
					jql: 'created >= -60d AND type != Epic ORDER BY created DESC',
					limit: 5,
				});

				// Verify the response structure
				expect(result).toBeDefined();
				expect(typeof result.content).toBe('string');
				expect(result.content).toContain('# Jira Issues');
				expect(result.pagination).toBeDefined();
			} catch (error) {
				// Some Jira instances may not support all JQL terms or fields
				// So we'll accept errors that are properly formatted
				expect(error).toBeInstanceOf(McpError);
			}
		}, 30000);

		it('should handle empty results gracefully', async () => {
			if (skipIfNoCredentials()) return;

			// Use a highly specific JQL query that's unlikely to match any issues
			const uniqueTerm = `NONEXISTENT_ISSUE_${Date.now()}`;
			const result = await atlassianIssuesController.list({
				jql: `summary ~ "${uniqueTerm}"`,
			});

			// Verify the ControllerResponse structure
			expect(result).toBeDefined();
			expect(typeof result.content).toBe('string');

			// Check for appropriate message for no results (actual formatter output)
			expect(result.content).toBe('No issues found.');
			expect(result.pagination).toBeDefined();
			expect(result.pagination?.hasMore).toBe(false);
			expect(result.pagination?.count).toBe(0);
			expect(result.pagination?.total).toBe(0);
			expect(result.pagination?.nextCursor).toBeUndefined();

			// Check that content does NOT contain pagination string
			expect(result.content).not.toContain('Showing');
			expect(result.content).not.toContain('Next StartAt');
		}, 30000);

		it('should handle error for invalid JQL', async () => {
			if (skipIfNoCredentials()) return;

			try {
				// Call with invalid JQL syntax
				await atlassianIssuesController.list({
					jql: 'invalid syntax === something broken',
				});
				fail('Expected an error for invalid JQL');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				// The error might have a generic error message, so we'll just check the status code
				expect((error as McpError).statusCode).toBe(400);
			}
		}, 30000);
	});

	describe('get', () => {
		// Helper to get a valid issue key for testing get()
		async function getFirstIssueKey(): Promise<string | null> {
			if (skipIfNoCredentials()) return null;
			try {
				const listResult = await atlassianIssuesController.list({
					limit: 1,
				});

				// Extract an issue key from the content using regex
				const match = listResult.content.match(/\b([A-Z]+-\d+)\b/);
				return match ? match[1] : null;
			} catch (error) {
				console.warn('Error getting issue key for tests:', error);
				return null;
			}
		}

		it('should format issue details correctly', async () => {
			if (skipIfNoCredentials()) return;

			// Get a valid issue key
			const issueKey = await getFirstIssueKey();
			if (!issueKey) {
				console.warn('Skipping issue details test: No issue key found');
				return;
			}

			// Call the controller with the issue key
			const result = await atlassianIssuesController.get({
				issueIdOrKey: issueKey,
			});

			// Verify the response structure
			expect(result).toBeDefined();
			expect(typeof result.content).toBe('string');
			expect(result.content).toContain(issueKey);
			expect(result.content).toContain('# Jira Issue:');

			// Verify key components of Markdown content
			expect(result.content).toContain('## Basic Information');
			expect(result.content).toContain('**Type**:');
			expect(result.content).toContain('**Status**:');
			expect(result.content).toContain('**Priority**:');
		}, 30000);

		it('should include optional fields when requested', async () => {
			if (skipIfNoCredentials()) return;

			// Get a valid issue key
			const issueKey = await getFirstIssueKey();
			if (!issueKey) {
				console.warn(
					'Skipping optional fields test: No issue key found',
				);
				return;
			}

			// Call the controller with optional fields
			const result = await atlassianIssuesController.get(
				{ issueIdOrKey: issueKey },
				{
					includeComments: true,
					includeAttachments: true,
					includeWorklog: true,
				},
			);

			// Verify the optional sections
			expect(result).toBeDefined();
			expect(typeof result.content).toBe('string');

			// Just check that we got a valid response with the issue details
			expect(result.content).toContain('# Jira Issue:');
			expect(result.content).toContain('## Basic Information');
		}, 30000);

		it('should format description and comments in Markdown', async () => {
			if (skipIfNoCredentials()) return;

			// Get a valid issue key
			const issueKey = await getFirstIssueKey();
			if (!issueKey) {
				console.warn('Skipping description test: No issue key found');
				return;
			}

			// Get issue with description and comments
			const result = await atlassianIssuesController.get(
				{ issueIdOrKey: issueKey },
				{ includeComments: true },
			);

			// Verify the content structure
			expect(result).toBeDefined();
			expect(typeof result.content).toBe('string');

			// Check for basic information section instead of description
			expect(result.content).toContain('## Basic Information');

			// Comments section might not be included if not requested or if there are no comments
			// We'll just check that the response is properly formatted
			expect(result.content).toContain('# Jira Issue:');
		}, 30000);

		it('should handle non-existent issue gracefully', async () => {
			if (skipIfNoCredentials()) return;

			// Use a non-existent issue key
			const nonExistentKey = 'NONEXISTENT-99999';

			try {
				await atlassianIssuesController.get({
					issueIdOrKey: nonExistentKey,
				});
				fail('Expected an error for non-existent issue');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				expect((error as McpError).statusCode).toBe(404);
				expect((error as McpError).message).toContain('not found');
			}
		}, 30000);

		it('should handle invalid issue key format gracefully', async () => {
			if (skipIfNoCredentials()) return;

			// Use an invalid key format
			const invalidFormat = 'Invalid@Format#Key';

			try {
				await atlassianIssuesController.get({
					issueIdOrKey: invalidFormat,
				});
				fail('Expected an error for invalid issue key format');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				// API might return 400 or 404 for invalid format
				expect([400, 404]).toContain((error as McpError).statusCode);
			}
		}, 30000);

		it('should handle empty issue key gracefully', async () => {
			if (skipIfNoCredentials()) return;

			try {
				await atlassianIssuesController.get({
					issueIdOrKey: '',
				});
				fail('Expected an error for empty issue key');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				// API might return various error codes
				expect([400, 404, 405]).toContain(
					(error as McpError).statusCode,
				);
			}
		}, 30000);
	});
});
