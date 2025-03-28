import atlassianProjectsController from './atlassian.projects.controller.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';
import { McpError } from '../utils/error.util.js'; // Import McpError

describe('Atlassian Projects Controller', () => {
	// Load configuration and check for credentials before all tests
	beforeAll(() => {
		config.load(); // Ensure config is loaded
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Projects Controller tests: No credentials available',
			);
		}
	});

	// Helper function to skip tests when credentials are missing
	const skipIfNoCredentials = () => !getAtlassianCredentials();

	describe('list', () => {
		it('should return a formatted list of projects in Markdown', async () => {
			if (skipIfNoCredentials()) return;

			const result = await atlassianProjectsController.list();

			// Verify the ControllerResponse structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).toHaveProperty('pagination');

			// Basic Markdown content checks
			if (
				result.content !==
				'No Jira projects found matching your criteria.'
			) {
				expect(result.content).toMatch(/^# Jira Projects/m); // Main heading
				expect(result.content).toMatch(/^## \d+\. /m); // Numbered list item heading
				expect(result.content).toContain('**ID**:');
				expect(result.content).toContain('**Key**:');
				expect(result.content).toContain('**Type**:');
			}

			// Verify pagination structure
			expect(result.pagination).toBeDefined();
			expect(result.pagination).toHaveProperty('hasMore');
			expect(typeof result.pagination?.hasMore).toBe('boolean');
			expect(result.pagination).toHaveProperty('count'); // Should have count from service
			// nextCursor might be undefined if hasMore is false
			if (result.pagination?.hasMore) {
				expect(result.pagination).toHaveProperty('nextCursor');
				expect(typeof result.pagination?.nextCursor).toBe('string');
			}
		}, 30000); // Increased timeout

		it('should handle pagination options (limit/cursor)', async () => {
			if (skipIfNoCredentials()) return;

			// Fetch first page
			const result1 = await atlassianProjectsController.list({
				limit: 1,
			});
			expect(result1.pagination?.count).toBeLessThanOrEqual(1);

			// If there's a next page, fetch it
			if (result1.pagination?.hasMore && result1.pagination.nextCursor) {
				const result2 = await atlassianProjectsController.list({
					limit: 1,
					cursor: result1.pagination.nextCursor, // Use cursor from previous response
				});
				expect(result2.pagination?.count).toBeLessThanOrEqual(1);
				// Check if content is different (simple check)
				if (
					result1.content !==
						'No Jira projects found matching your criteria.' &&
					result2.content !==
						'No Jira projects found matching your criteria.'
				) {
					expect(result1.content).not.toEqual(result2.content);
				}
			} else {
				console.warn(
					'Skipping controller cursor test: Only one page of projects found.',
				);
			}
		}, 30000);

		it('should handle filtering (name) and sorting (orderBy)', async () => {
			if (skipIfNoCredentials()) return;

			// Find a project name to filter by
			const listResult = await atlassianProjectsController.list({
				limit: 1,
			});
			if (
				listResult.content ===
				'No Jira projects found matching your criteria.'
			) {
				console.warn(
					'Skipping controller filter/sort test: No projects found.',
				);
				return;
			}
			const nameMatch = listResult.content.match(/\*\*Name\*\*:\s+(.+)/);
			if (!nameMatch || !nameMatch[1]) {
				console.warn(
					'Skipping controller filter/sort test: Could not extract project name.',
				);
				return;
			}
			const projectNameQuery = nameMatch[1].substring(0, 3); // Use first few chars

			const result = await atlassianProjectsController.list({
				name: projectNameQuery,
				orderBy: 'key', // Sort by key
				limit: 5,
			});

			expect(result.pagination?.count).toBeLessThanOrEqual(5);
			if (
				result.content !==
				'No Jira projects found matching your criteria.'
			) {
				expect(result.content).toMatch(/^# Jira Projects/m);
				// Further checks could involve verifying sorting/filtering in Markdown, but that's complex
			}
		}, 30000);
	});

	describe('get', () => {
		// Helper to get a valid key/ID for testing 'get'
		async function getFirstProjectKeyOrIdForController(): Promise<
			string | null
		> {
			if (skipIfNoCredentials()) return null;
			try {
				const listResult = await atlassianProjectsController.list({
					limit: 1,
				});
				if (
					listResult.content ===
					'No Jira projects found matching your criteria.'
				)
					return null;
				// Extract key or ID from Markdown content
				const keyMatch = listResult.content.match(
					/\*\*Key\*\*:\s+([^\s\n]+)/,
				);
				const idMatch = listResult.content.match(
					/\*\*ID\*\*:\s+([^\s\n]+)/,
				);
				return keyMatch ? keyMatch[1] : idMatch ? idMatch[1] : null;
			} catch (error) {
				console.warn(
					"Could not fetch project list for controller 'get' test setup:",
					error,
				);
				return null;
			}
		}

		it('should return formatted details for a valid project key/ID in Markdown', async () => {
			const projectKeyOrId = await getFirstProjectKeyOrIdForController();
			if (!projectKeyOrId) {
				console.warn(
					'Skipping controller get test: No project key/ID found.',
				);
				return;
			}

			const result = await atlassianProjectsController.get({
				projectKeyOrId,
			});

			// Verify the ControllerResponse structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).not.toHaveProperty('pagination'); // 'get' shouldn't have pagination

			// Verify Markdown content
			expect(result.content).toMatch(/^# Project:/m); // Main heading for project details
			expect(result.content).toContain('## Basic Information');
			// Check if either key or ID is present, depending on what was used
			expect(result.content).toMatch(
				new RegExp(`\\*\\*(Key|ID)\\*\\*:\\s+${projectKeyOrId}`),
			);
			expect(result.content).toContain('## Components'); // Included by default
			expect(result.content).toContain('## Versions'); // Included by default
			expect(result.content).toContain('## Links');
		}, 30000);

		it('should throw McpError for an invalid project key/ID', async () => {
			if (skipIfNoCredentials()) return;

			const invalidKeyOrId = 'THIS-PROJECT-DOES-NOT-EXIST-999';

			// Expect the controller call to reject with an McpError
			await expect(
				atlassianProjectsController.get({
					projectKeyOrId: invalidKeyOrId,
				}),
			).rejects.toThrow(McpError);

			// Optionally check the status code and message via the error handler's behavior
			try {
				await atlassianProjectsController.get({
					projectKeyOrId: invalidKeyOrId,
				});
			} catch (e) {
				expect(e).toBeInstanceOf(McpError);
				expect((e as McpError).statusCode).toBe(404); // Expecting Not Found
				expect((e as McpError).message).toContain('not found');
			}
		}, 30000);
	});
});
