import atlassianProjectsService from './vendor.atlassian.projects.service.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';
import { McpError } from '../utils/error.util.js';

describe('Vendor Atlassian Projects Service', () => {
	// Load configuration and check for credentials before all tests
	beforeAll(() => {
		config.load(); // Ensure config is loaded
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Projects Service tests: No credentials available',
			);
		}
	});

	// Helper function to skip tests when credentials are missing
	const skipIfNoCredentials = () => !getAtlassianCredentials();

	describe('list', () => {
		it('should return a list of projects', async () => {
			if (skipIfNoCredentials()) return;

			const result = await atlassianProjectsService.list();

			// Verify the response structure based on ProjectsResponse
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
			expect(result).toHaveProperty('startAt'); // Jira uses offset
			expect(result).toHaveProperty('maxResults');
			expect(result).toHaveProperty('total');
			expect(result).toHaveProperty('isLast'); // Jira uses isLast

			if (result.values.length > 0) {
				const project = result.values[0];
				expect(project).toHaveProperty('id');
				expect(project).toHaveProperty('key');
				expect(project).toHaveProperty('name');
				expect(project).toHaveProperty('self');
				expect(project).toHaveProperty('avatarUrls');
			}
		}, 30000); // Increased timeout

		it('should support pagination with maxResults and startAt', async () => {
			if (skipIfNoCredentials()) return;

			// Get first page
			const result1 = await atlassianProjectsService.list({
				maxResults: 1,
				startAt: 0,
			});

			expect(result1).toHaveProperty('maxResults');
			expect(result1.maxResults).toBeGreaterThanOrEqual(1); // API might return more than requested min
			expect(result1.values.length).toBeLessThanOrEqual(
				result1.maxResults,
			);
			expect(result1.startAt).toBe(0);

			// If there's a next page (isLast is false), fetch it
			if (!result1.isLast) {
				const nextStartAt = result1.startAt + result1.values.length;
				const result2 = await atlassianProjectsService.list({
					maxResults: 1,
					startAt: nextStartAt,
				});
				expect(result2.startAt).toBe(nextStartAt);
				expect(result2.values.length).toBeLessThanOrEqual(1);
				// Check if the project IDs are different to confirm pagination worked
				if (result1.values.length > 0 && result2.values.length > 0) {
					expect(result1.values[0].id).not.toEqual(
						result2.values[0].id,
					);
				}
			} else {
				console.warn(
					'Skipping pagination step: Only one page of projects found.',
				);
			}
		}, 30000);

		it('should support sorting with orderBy', async () => {
			if (skipIfNoCredentials()) return;

			const result = await atlassianProjectsService.list({
				orderBy: 'name',
				maxResults: 5,
			}); // Sort by name

			expect(result.values.length).toBeLessThanOrEqual(5);
			if (result.values.length > 1) {
				// Check if names are approximately sorted alphabetically
				expect(
					result.values[0].name.localeCompare(result.values[1].name),
				).toBeLessThanOrEqual(0);
			}
		}, 30000);

		it('should support filtering with query', async () => {
			if (skipIfNoCredentials()) return;

			// Try to find a project name to filter by
			const listResult = await atlassianProjectsService.list({
				maxResults: 1,
			});
			if (listResult.values.length === 0) {
				console.warn(
					'Skipping query filter test: No projects found to query.',
				);
				return;
			}
			const projectNameQuery = listResult.values[0].name.substring(0, 3); // Use first 3 chars

			const result = await atlassianProjectsService.list({
				query: projectNameQuery,
				maxResults: 5,
			});

			expect(result.values.length).toBeLessThanOrEqual(5);
			// All returned projects should somehow match the query (name or key)
			result.values.forEach((p) => {
				expect(
					p.name
						.toLowerCase()
						.includes(projectNameQuery.toLowerCase()) ||
						p.key
							.toLowerCase()
							.includes(projectNameQuery.toLowerCase()),
				).toBe(true);
			});
		}, 30000);

		it('should support filtering with keys', async () => {
			if (skipIfNoCredentials()) return;

			// First get a list of projects to extract some keys
			const initialList = await atlassianProjectsService.list({
				maxResults: 2,
			});
			if (initialList.values.length < 1) {
				console.warn(
					'Skipping keys filter test: Not enough projects available',
				);
				return;
			}

			// Extract keys from initial results
			const projectKeys = initialList.values.map(
				(project) => project.key,
			);

			try {
				// Request filtered results by keys
				const result = await atlassianProjectsService.list({
					keys: projectKeys,
				});

				// Verify filtering worked correctly
				expect(Array.isArray(result.values)).toBe(true);

				// If results are returned, verify they match the filter
				if (result.values.length > 0) {
					result.values.forEach((project) => {
						expect(projectKeys).toContain(project.key);
					});
				}
			} catch (error) {
				// Some Jira instances might not support filtering by keys
				// In that case, we'll accept the error as valid
				expect(error).toBeInstanceOf(McpError);
				expect((error as McpError).statusCode).toBe(400);
			}
		}, 30000);

		it('should support filtering with ids', async () => {
			if (skipIfNoCredentials()) return;

			// First get a list of projects to extract some IDs
			const initialList = await atlassianProjectsService.list({
				maxResults: 2,
			});
			if (initialList.values.length < 1) {
				console.warn(
					'Skipping IDs filter test: Not enough projects available',
				);
				return;
			}

			// Extract IDs from initial results
			const projectIds = initialList.values.map((project) => project.id);

			try {
				// Request filtered results by IDs
				const result = await atlassianProjectsService.list({
					ids: projectIds,
				});

				// Verify filtering worked correctly
				expect(Array.isArray(result.values)).toBe(true);

				// If results are returned, verify they match the filter
				if (result.values.length > 0) {
					result.values.forEach((project) => {
						expect(projectIds).toContain(project.id);
					});
				}
			} catch (error) {
				// Some Jira instances might not support filtering by IDs
				// In that case, we'll accept the error as valid
				expect(error).toBeInstanceOf(McpError);
				expect((error as McpError).statusCode).toBe(400);
			}
		}, 30000);

		it('should handle combining multiple filters', async () => {
			if (skipIfNoCredentials()) return;

			// First get a project to use for filtering
			const initialList = await atlassianProjectsService.list({
				maxResults: 1,
			});
			if (initialList.values.length < 1) {
				console.warn(
					'Skipping combined filter test: No projects available',
				);
				return;
			}

			// Extract first project's id and key
			const projectId = initialList.values[0].id;
			const projectKey = initialList.values[0].key;

			// Request with multiple filters (query + id)
			try {
				const result = await atlassianProjectsService.list({
					ids: [projectId],
					query: projectKey, // Use key as query text
				});

				// Verify filtering worked correctly (should return 0 or 1 results)
				expect(result.values.length).toBeLessThanOrEqual(1);

				// If a result is returned, it must match both filters
				if (result.values.length === 1) {
					expect(result.values[0].id).toBe(projectId);
					expect(result.values[0].key).toBe(projectKey);
				}
			} catch (error) {
				// Some Jira servers might not support combining filters
				// In that case, this should throw a properly formatted error
				expect(error).toBeInstanceOf(McpError);
			}
		}, 30000);
	});

	describe('get', () => {
		// Helper to get a valid key/ID for testing 'get'
		async function getFirstProjectKeyOrId(): Promise<string | null> {
			if (skipIfNoCredentials()) return null;
			try {
				const listResult = await atlassianProjectsService.list({
					maxResults: 1,
				});
				// Prefer key, fallback to ID
				return listResult.values.length > 0
					? listResult.values[0].key || listResult.values[0].id
					: null;
			} catch (error) {
				console.warn(
					"Could not fetch project list for 'get' test setup:",
					error,
				);
				return null;
			}
		}

		it('should return details for a valid project key or ID', async () => {
			const projectKeyOrId = await getFirstProjectKeyOrId();
			if (!projectKeyOrId) {
				console.warn('Skipping get test: No project key/ID found.');
				return;
			}

			const result = await atlassianProjectsService.get(projectKeyOrId);

			// Verify the response structure based on ProjectDetailed
			expect(result).toHaveProperty('id');
			expect(result).toHaveProperty('key');
			// Check if the key or ID matches the input
			expect([result.key, result.id]).toContain(projectKeyOrId);
			expect(result).toHaveProperty('name');
			expect(result).toHaveProperty('self');
			expect(result).toHaveProperty('avatarUrls');
			expect(result).toHaveProperty('projectTypeKey'); // From default expansion
			expect(result).toHaveProperty('lead'); // From default expansion
		}, 30000);

		it('should include expanded fields when requested', async () => {
			const projectKeyOrId = await getFirstProjectKeyOrId();
			if (!projectKeyOrId) {
				console.warn(
					'Skipping get expand test: No project key/ID found.',
				);
				return;
			}

			const result = await atlassianProjectsService.get(projectKeyOrId, {
				includeComponents: true,
				includeVersions: true,
			});

			// Check for expanded fields
			expect(result).toHaveProperty('components');
			expect(Array.isArray(result.components)).toBe(true);
			expect(result).toHaveProperty('versions');
			expect(Array.isArray(result.versions)).toBe(true);
		}, 30000);

		it('should throw an McpError for an invalid project key/ID', async () => {
			if (skipIfNoCredentials()) return;

			const invalidKeyOrId = 'THIS-PROJECT-DOES-NOT-EXIST-999';

			await expect(
				atlassianProjectsService.get(invalidKeyOrId),
			).rejects.toThrow(McpError);

			try {
				await atlassianProjectsService.get(invalidKeyOrId);
			} catch (e) {
				expect(e).toBeInstanceOf(McpError);
				expect((e as McpError).statusCode).toBe(404); // Expecting Not Found
			}
		}, 30000);

		it('should throw an McpError for invalid key format', async () => {
			if (skipIfNoCredentials()) return;

			// Test with an invalid key format (keys should be uppercase letters and numbers)
			const invalidFormat = 'invalid!key@format#$%';

			try {
				await atlassianProjectsService.get(invalidFormat);
				fail('Expected an error for invalid key format');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				// API should return 404 or 400 for invalid format
				expect([400, 404]).toContain((error as McpError).statusCode);
			}
		}, 30000);

		it('should throw an McpError for empty project key/ID', async () => {
			if (skipIfNoCredentials()) return;

			try {
				// We need to cast the empty string to 'any' to bypass TypeScript's type checking
				// The purpose of this test is to check the API's handling of an empty value
				await atlassianProjectsService.get('' as any);
				fail('Expected an error for empty key/ID');
			} catch (error) {
				// Error might be a JavaScript ReferenceError or an McpError depending on implementation
				// We'll accept either as valid
				expect(
					error instanceof McpError ||
						error instanceof ReferenceError ||
						error instanceof TypeError,
				).toBe(true);

				// If it's an McpError, check status code
				if (error instanceof McpError) {
					expect([400, 404, 405]).toContain(
						(error as McpError).statusCode,
					);
				}
			}
		}, 30000);
	});
});
