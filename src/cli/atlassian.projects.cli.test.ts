import { CliTestUtil } from '../utils/cli.test.util';
import { getAtlassianCredentials } from '../utils/transport.util';

describe('Atlassian Projects CLI Commands', () => {
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

	describe('ls-projects command', () => {
		it('should list projects and return success exit code', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping ls-projects test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'ls-projects',
			]);

			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
			CliTestUtil.validateOutputContains(stdout, [
				'# Jira Projects',
				'**Key**:',
				'**Name**:',
			]);
		}, 60000);

		it('should support pagination with limit flag', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping pagination test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'ls-projects',
				'--limit',
				'2',
			]);

			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
			CliTestUtil.validateOutputContains(stdout, [
				'# Jira Projects',
				/Showing \d+ projects/,
				/Next page: --cursor/,
			]);
		}, 60000);

		it('should filter projects by query', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping query filter test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'ls-projects',
				'--query',
				'test',
			]);

			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
		}, 60000);

		it('should sort projects by specified field', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping sort test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'ls-projects',
				'--order-by',
				'name',
			]);

			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
		}, 60000);

		it('should handle invalid limit value gracefully', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping invalid limit test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'ls-projects',
				'--limit',
				'not-a-number',
			]);

			expect(exitCode).not.toBe(0);
			CliTestUtil.validateOutputContains(stdout, [
				/Error|Invalid|Failed/i,
			]);
		}, 60000);
	});

	describe('get-project command', () => {
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

		it('should retrieve project details and return success code', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping get-project test - no credentials');
				return;
			}

			const projectKey = await getProjectKey();
			if (!projectKey) {
				console.warn('Skipping test - could not determine project key');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'get-project',
				'--project-key-or-id',
				projectKey,
			]);

			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
			CliTestUtil.validateOutputContains(stdout, [
				'# Jira Project',
				`**Key**: ${projectKey}`,
				'**ID**:',
				'**Name**:',
			]);
		}, 60000);

		it('should return error for non-existent project', async () => {
			if (skipIfNoCredentials()) {
				console.warn(
					'Skipping non-existent project test - no credentials',
				);
				return;
			}

			// Use an invalid project key that's highly unlikely to exist
			const invalidKey = 'NONEXISTENT123456789';

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'get-project',
				'--project-key-or-id',
				invalidKey,
			]);

			expect(exitCode).not.toBe(0);
			CliTestUtil.validateOutputContains(stdout, [
				/Error|Invalid|Not found|Failed/i,
			]);
		}, 60000);

		it('should require the project parameter', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'get-project',
			]);

			expect(exitCode).not.toBe(0);
			expect(stderr).toMatch(
				/required option|missing required|specify a project/i,
			);
		}, 30000);

		it('should handle invalid project ID', async () => {
			const { stderr, exitCode } = await CliTestUtil.runCommand([
				'get-project',
				'--project-key-or-id',
				'invalid',
			]);

			expect(exitCode).toBe(1);
			expect(stderr).toContain('error');
		});
	});
});
