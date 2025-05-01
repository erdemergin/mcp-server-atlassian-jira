import { CliTestUtil } from '../utils/cli.test.util';
import { getAtlassianCredentials } from '../utils/transport.util';

describe('Atlassian Issues CLI Commands', () => {
	beforeAll(() => {
		// Check if credentials are available
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'WARNING: No Atlassian credentials available. Live API tests will be skipped.',
			);
		}
	});

	/**
	 * Helper function to skip tests if Atlassian credentials are not available
	 */
	const skipIfNoCredentials = () => {
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			return true;
		}
		return false;
	};

	/**
	 * Helper to get a valid project key for testing
	 */
	const getProjectKey = async (): Promise<string | null> => {
		if (skipIfNoCredentials()) {
			return null;
		}

		try {
			// Get a project key from the ls-projects command
			const { stdout } = await CliTestUtil.runCommand([
				'ls-projects',
				'--limit',
				'1',
			]);

			// Extract project key using regex
			const keyMatch = stdout.match(/\*\*Key\*\*:\s*([A-Z0-9]+)/);
			return keyMatch ? keyMatch[1] : null;
		} catch (error) {
			console.error('Failed to get project key:', error);
			return null;
		}
	};

	/**
	 * Helper to get a valid issue key for testing
	 */
	const getIssueKey = async (): Promise<string | null> => {
		if (skipIfNoCredentials()) {
			return null;
		}

		try {
			// Get a project key first
			const projectKey = await getProjectKey();
			if (!projectKey) {
				return null;
			}

			// Get an issue from that project
			const { stdout } = await CliTestUtil.runCommand([
				'ls-issues',
				'--jql',
				`project = ${projectKey}`,
				'--limit',
				'1',
			]);

			// Extract issue key using regex
			const keyMatch = stdout.match(/\*\*Key\*\*:\s*([A-Z0-9]+-\d+)/);
			return keyMatch ? keyMatch[1] : null;
		} catch (error) {
			console.error('Failed to get issue key:', error);
			return null;
		}
	};

	describe('ls-issues command', () => {
		it('should list issues and return success exit code', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping ls-issues test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'ls-issues',
			]);

			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
			CliTestUtil.validateOutputContains(stdout, [
				'## Issues',
				/\*\*Key\*\*:/,
				/\*\*Summary\*\*:/,
			]);
		}, 60000);

		it('should support JQL filtering', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping JQL test - no credentials');
				return;
			}

			const projectKey = await getProjectKey();
			if (!projectKey) {
				console.warn('Skipping test - could not determine project key');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'ls-issues',
				'--jql',
				`project = ${projectKey}`,
			]);

			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
			CliTestUtil.validateOutputContains(stdout, ['## Issues']);
		}, 60000);

		it('should support pagination with limit flag', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping pagination test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'ls-issues',
				'--limit',
				'2',
			]);

			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
			// Check for pagination markers
			CliTestUtil.validateOutputContains(stdout, [
				/Showing \d+ issues/,
				/Next page:|No more results/,
			]);
		}, 60000);

		it('should handle invalid limit value gracefully', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping invalid limit test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'ls-issues',
				'--limit',
				'not-a-number',
			]);

			expect(exitCode).not.toBe(0);
			CliTestUtil.validateOutputContains(stdout, [
				/Error|Invalid|Failed/i,
			]);
		}, 60000);

		it('should handle invalid JQL query gracefully', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping invalid JQL test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'ls-issues',
				'--jql',
				'invalidField = something',
			]);

			expect(exitCode).not.toBe(0);
			CliTestUtil.validateOutputContains(stdout, [
				/Error|Invalid|Failed/i,
			]);
		}, 60000);
	});

	describe('get-issue command', () => {
		it('should retrieve issue details and return success code', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping get-issue test - no credentials');
				return;
			}

			const issueKey = await getIssueKey();
			if (!issueKey) {
				console.warn('Skipping test - could not determine issue key');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'get-issue',
				'--issue-id-or-key',
				issueKey,
			]);

			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
			CliTestUtil.validateOutputContains(stdout, [
				'# Jira Issue',
				`**Key**: ${issueKey}`,
				'**Summary**:',
				'**Status**:',
			]);
		}, 60000);

		it('should return error for non-existent issue', async () => {
			if (skipIfNoCredentials()) {
				console.warn(
					'Skipping non-existent issue test - no credentials',
				);
				return;
			}

			// Use an invalid issue key that's highly unlikely to exist
			const invalidKey = 'NONEXISTENT-12345';

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'get-issue',
				'--issue-id-or-key',
				invalidKey,
			]);

			expect(exitCode).not.toBe(0);
			CliTestUtil.validateOutputContains(stdout, [
				/Error|Invalid|Not found|Failed/i,
			]);
		}, 60000);

		it('should require the issue parameter', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'get-issue',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(
				/required option|missing required|specify an issue/i,
			);
		}, 30000);

		it('should handle invalid issue ID', async () => {
			const { exitCode, stderr } = await CliTestUtil.runCommand([
				'get-issue',
				'--issue-id-or-key',
				'invalid',
			]);

			expect(exitCode).toBe(1);
			expect(stderr).toContain('error');
		});
	});
});
