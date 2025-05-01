import atlassianSearchController from './atlassian.search.controller.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';
import { McpError } from '../utils/error.util.js';

describe('Atlassian Search Controller', () => {
	// Load configuration and check for credentials before all tests
	beforeAll(() => {
		config.load(); // Ensure config is loaded
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Search Controller tests: No credentials available',
			);
		}
	});

	// Helper function to skip tests when credentials are missing
	const skipIfNoCredentials = () => !getAtlassianCredentials();

	describe('search', () => {
		it('should return a formatted search result in Markdown for a valid JQL query', async () => {
			if (skipIfNoCredentials()) return;

			const result = await atlassianSearchController.search({
				jql: 'created >= -30d',
				limit: 5,
			});

			// Verify ControllerResponse structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');
			expect(result).toHaveProperty('pagination');

			// Verify Markdown content
			expect(result.content).toMatch(/^# Jira Search Results/m); // Has header
			expect(result.content).toContain('JQL Query:'); // Shows query
			expect(result.content).toContain('created >= -30d'); // Shows the actual query

			// Check for pagination details
			expect(result.pagination).toBeDefined();
			expect(result.pagination).toHaveProperty('hasMore');
			expect(result.pagination).toHaveProperty('count');
		}, 30000);

		it('should handle pagination (limit/cursor) correctly', async () => {
			if (skipIfNoCredentials()) return;

			// First page
			const result1 = await atlassianSearchController.search({
				jql: 'created >= -90d',
				limit: 2,
			});
			expect(result1.pagination?.count).toBeLessThanOrEqual(2);

			// If there's a next page, check it's different from the first
			if (result1.pagination?.hasMore && result1.pagination.nextCursor) {
				// Parse the nextCursor (which is the next startAt value as a string)
				const nextStartAt = parseInt(result1.pagination.nextCursor, 10);
				if (isNaN(nextStartAt)) {
					throw new Error(
						`Invalid nextCursor format: ${result1.pagination.nextCursor}`,
					);
				}
				const result2 = await atlassianSearchController.search({
					jql: 'created >= -90d',
					limit: 2,
					// Pass the parsed number as startAt
					startAt: nextStartAt,
				});
				expect(result2.pagination?.count).toBeLessThanOrEqual(2);

				// Content should be different between pages
				expect(result1.content).not.toEqual(result2.content);
			} else {
				console.warn(
					'Skipping cursor test: Only one page of search results found.',
				);
			}
		}, 30000);

		it('should handle empty results gracefully', async () => {
			if (skipIfNoCredentials()) return;

			// Use a specific JQL that's unlikely to match any issues
			const uniqueQuery = `summary ~ "NONEXISTENT_TEST_ISSUE_${Date.now()}"`;
			const result = await atlassianSearchController.search({
				jql: uniqueQuery,
			});

			// Verify ControllerResponse structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');

			// Should show the search query even for empty results
			expect(result.content).toMatch(/^# Jira Search Results/m);
			expect(result.content).toContain('JQL Query:');
			expect(result.content).toContain(uniqueQuery);

			// Check for appropriate message for no results
			expect(result.content).toContain('No issues found');

			// Should have pagination but with count 0 and hasMore false
			expect(result.pagination).toBeDefined();
			expect(result.pagination).toHaveProperty('count', 0);
			expect(result.pagination).toHaveProperty('hasMore', false);
			expect(result.pagination?.nextCursor).toBeUndefined();
		}, 30000);

		it('should handle error for invalid JQL', async () => {
			if (skipIfNoCredentials()) return;

			// Use invalid JQL syntax
			try {
				await atlassianSearchController.search({
					jql: 'invalid operator === something',
				});
				fail('Expected an error for invalid JQL');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				// The error might have a generic error message, so we'll just check that it's a McpError
				expect((error as McpError).statusCode).toBe(400);
			}
		}, 30000);

		it('should perform search with empty JQL (returns all accessible issues)', async () => {
			if (skipIfNoCredentials()) return;

			const result = await atlassianSearchController.search({
				limit: 3,
			});

			// Verify ControllerResponse structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');

			// Should show the search results header
			expect(result.content).toMatch(/^# Jira Search Results/m);

			// Should have pagination details
			expect(result.pagination).toBeDefined();
			expect(result.pagination).toHaveProperty('count');
			expect(typeof result.pagination?.count).toBe('number');
		}, 30000);

		it('should support complex JQL with multiple conditions', async () => {
			if (skipIfNoCredentials()) return;

			try {
				const result = await atlassianSearchController.search({
					jql: 'created >= -60d AND type != Epic ORDER BY created DESC',
					limit: 3,
				});

				// Verify ControllerResponse structure
				expect(result).toHaveProperty('content');
				expect(typeof result.content).toBe('string');

				// Should show the search results header and query
				expect(result.content).toMatch(/^# Jira Search Results/m);
				expect(result.content).toContain('JQL Query:');

				// Should have pagination details
				expect(result.pagination).toBeDefined();
			} catch (error) {
				// Some Jira servers might not support all JQL functions, so we'll accept either
				// successful results or a properly formed error
				expect(error).toBeInstanceOf(McpError);
			}
		}, 30000);
	});
});
