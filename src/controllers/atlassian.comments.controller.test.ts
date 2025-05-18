import atlassianCommentsController from './atlassian.comments.controller.js';
import atlassianIssuesController from './atlassian.issues.controller.js';
import { config } from '../utils/config.util.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { McpError } from '../utils/error.util.js';

describe('Atlassian Comments Controller', () => {
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

	// Helper to get a valid issue key for testing
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

	describe('listComments', () => {
		it('should format comments list correctly', async () => {
			if (skipIfNoCredentials()) return;

			// Get a valid issue key first
			const issueKey = await getFirstIssueKey();
			if (!issueKey) {
				console.warn('Skipping comments test: No issue key found');
				return;
			}

			// Call the controller
			const result = await atlassianCommentsController.listComments({
				issueIdOrKey: issueKey,
				limit: 10,
			});

			// Check the structure and types
			expect(result).toBeDefined();
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');

			// Either we should have comments or a message saying there are no comments
			if (result.content.includes('No comments found')) {
				expect(result.content).toContain('No comments found');
			} else {
				expect(result.content).toContain('# Comments for Issue');
			}

			// Check if pagination information is included in content
			expect(result.content).toContain('Information retrieved at:');
		}, 30000);

		it('should handle error for invalid issue key', async () => {
			if (skipIfNoCredentials()) return;

			try {
				await atlassianCommentsController.listComments({
					issueIdOrKey: 'INVALID-KEY-99999',
				});
				fail('Expected an error for invalid issue key');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				// API might return 404 for invalid issue key
				expect((error as McpError).statusCode).toBe(404);
			}
		}, 30000);
	});

	/*
	 * NOTE: Write operations tests are commented out to avoid modifying data during testing
	 * according to project requirements. If needed, these tests could be modified to use
	 * controlled test environments where write operations are safe to perform.
	 */
	/*
	describe('addComment', () => {
		it('should add a comment successfully', async () => {
			if (skipIfNoCredentials()) return;

			// Get a valid issue key first
			const issueKey = await getFirstIssueKey();
			if (!issueKey) {
				console.warn('Skipping comment add test: No issue key found');
				return;
			}

			try {
				// Add a simple comment
				const result = await atlassianCommentsController.addComment({
					issueIdOrKey: issueKey,
					commentBody: `Test comment from automated tests ${Date.now()}`,
				});

				// Check the structure and content
				expect(result).toBeDefined();
				expect(result).toHaveProperty('content');
				expect(typeof result.content).toBe('string');
				expect(result.content).toContain('Comment Added Successfully');
				expect(result.content).toContain(issueKey);
			} catch (error) {
				// Some Jira instances might restrict comment adding, so we'll log and skip
				console.warn(
					'Unable to add comment, possibly due to permissions:',
					error,
				);
			}
		}, 30000);

		it('should handle empty comment body error', async () => {
			if (skipIfNoCredentials()) return;

			// Get a valid issue key first
			const issueKey = await getFirstIssueKey();
			if (!issueKey) {
				console.warn('Skipping comment error test: No issue key found');
				return;
			}

			try {
				await atlassianCommentsController.addComment({
					issueIdOrKey: issueKey,
					commentBody: '',
				});
				fail('Expected an error for empty comment body');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				expect((error as McpError).message).toContain('empty');
				expect((error as McpError).statusCode).toBe(400);
			}
		}, 30000);

		it('should handle error for non-existent issue key', async () => {
			if (skipIfNoCredentials()) return;

			try {
				await atlassianCommentsController.addComment({
					issueIdOrKey: 'NONEXISTENT-99999',
					commentBody: 'Test comment for non-existent issue',
				});
				fail('Expected an error for non-existent issue key');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				expect((error as McpError).statusCode).toBe(404);
			}
		}, 30000);
	});
	*/
});
