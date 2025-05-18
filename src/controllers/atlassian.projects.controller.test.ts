import atlassianProjectsController from './atlassian.projects.controller.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';
import { McpError } from '../utils/error.util.js'; // Import McpError
import { formatSeparator } from '../utils/formatter.util.js'; // Add imports

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

			// Verify structure and type
			expect(result).toBeDefined();
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');

			// Check that content does NOT contain pagination string anymore
			expect(result.content).toContain('Showing');
			expect(result.content).toContain('total items');

			// Basic Markdown content checks - check for expected formatting from live data
			if (
				result.content !==
				'No Jira projects found matching your criteria.'
			) {
				expect(result.content).toMatch(/^# Jira Projects/m); // Check for main heading
				expect(result.content).toContain('**Key**:'); // Check for key elements
				expect(result.content).toMatch(/^## \d+\. .+$/m); // Check for project heading format instead
			}
		}, 30000);

		it('should handle pagination options (limit/cursor)', async () => {
			if (skipIfNoCredentials()) return;

			// Fetch first page
			const result1 = await atlassianProjectsController.list({
				limit: 1,
			});

			// Check if content contains pagination information
			if (result1.content.includes('More results are available')) {
				// Get the next startAt value from the content
				const startAtMatch = result1.content.match(
					/Use --start-at (\d+) to view more/,
				);
				if (startAtMatch && startAtMatch[1]) {
					const nextStartAt = parseInt(startAtMatch[1], 10);

					// Fetch second page
					const result2 = await atlassianProjectsController.list({
						limit: 1,
						startAt: nextStartAt,
					});

					// If both results have content, they should be different
					if (
						result1.content !==
							'No Jira projects found matching your criteria.' &&
						result2.content !==
							'No Jira projects found matching your criteria.'
					) {
						expect(result1.content).not.toEqual(result2.content);
					}
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

			// Check if the content is well-formed
			if (
				result.content !==
				'No Jira projects found matching your criteria.'
			) {
				expect(result.content).toMatch(/^# Jira Projects/m);
				// Content should contain pagination information
				expect(result.content).toContain('Information retrieved at:');
			}
		}, 30000);

		it('should handle empty result scenario gracefully', async () => {
			if (skipIfNoCredentials()) return;

			// Use a name that is very unlikely to match any projects
			const uniqueName = `NONEXISTENT_PROJECT_${Date.now()}`;
			const result = await atlassianProjectsController.list({
				name: uniqueName,
			});

			// Verify the ControllerResponse structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');

			// Check specific empty result message including the standard footer
			expect(result.content).toContain(
				'No Jira projects found matching your criteria',
			);
			expect(result.content).toContain(formatSeparator());
			expect(result.content).toContain('Information retrieved at:');

			// Check that content does NOT contain pagination string
			expect(result.content).toContain('Showing');
			expect(result.content).toContain('total items');
		}, 30000);

		it('should handle various filtering combinations', async () => {
			if (skipIfNoCredentials()) return;

			// Find a project to use for filtering
			const listResult = await atlassianProjectsController.list({
				limit: 1,
			});
			if (
				listResult.content ===
				'No Jira projects found matching your criteria.'
			) {
				console.warn(
					'Skipping controller combined filters test: No projects found.',
				);
				return;
			}

			// Extract a project key from the content
			const keyMatch = listResult.content.match(
				/\*\*Key\*\*:\s+([^\s\n]+)/,
			);
			if (!keyMatch || !keyMatch[1]) {
				console.warn(
					'Skipping controller combined filters test: Could not extract project key.',
				);
				return;
			}
			const projectKey = keyMatch[1];

			// Test filtering by exact key (should return exactly one project)
			const result = await atlassianProjectsController.list({
				name: projectKey, // Use the key as the name filter
				orderBy: 'key',
				limit: 10,
			});

			// Verify response (might find 0 or 1 projects due to exact matching)
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');

			// If we found exactly the project we filtered for, its key should be in the content
			if (result.content.includes(projectKey)) {
				expect(result.content).toContain(`**Key**: ${projectKey}`);
			}
		}, 30000);

		it('should return an empty list when no projects match', async () => {
			// Skip if no creds
			if (skipIfNoCredentials()) return;

			// Use a name guaranteed not to match
			const uniqueName = `NONEXISTENT_${Date.now()}`;
			const result = await atlassianProjectsController.list({
				name: uniqueName,
				limit: 10,
			});

			// Check actual empty message and formatting
			expect(result.content).toContain(
				'No Jira projects found matching your criteria',
			);
			expect(result.content).toContain(formatSeparator());
			expect(result.content).toContain('Information retrieved at:');

			// Check that content does NOT contain pagination string anymore
			expect(result.content).toContain('Showing');
			expect(result.content).toContain('total items');
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

		it('should throw McpError for an invalid project key/ID format', async () => {
			if (skipIfNoCredentials()) return;

			// Use a key with invalid characters
			const invalidFormat = 'invalid!key@format#$%';

			try {
				await atlassianProjectsController.get({
					projectKeyOrId: invalidFormat,
				});
				fail('Expected an error for invalid project key format');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				// Status code should be 404 (Not Found) or 400 (Bad Request)
				expect([404, 400]).toContain((error as McpError).statusCode);
			}
		}, 30000);

		it('should throw McpError for an empty project key/ID', async () => {
			if (skipIfNoCredentials()) return;

			try {
				await atlassianProjectsController.get({
					projectKeyOrId: '',
				});
				fail('Expected an error for empty project key/ID');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				// Status code might vary by API implementation
				expect([400, 404, 405]).toContain(
					(error as McpError).statusCode,
				);
			}
		}, 30000);
	});
});
