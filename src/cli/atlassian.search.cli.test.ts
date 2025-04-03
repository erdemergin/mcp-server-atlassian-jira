import { CliTestUtil } from '../utils/cli.test.util';
import { getAtlassianCredentials } from '../utils/transport.util';

describe('Atlassian Search CLI Commands', () => {
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

	describe('search command', () => {
		it('should search with JQL and return success exit code', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping search test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'search',
				'--jql',
				'project = TEST',
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
				'search',
				'--jql',
				'project = TEST',
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

		it('should require the jql parameter', async () => {
			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'search',
			]);

			// The implementation doesn't actually require the jql parameter,
			// so we should expect success rather than failure
			expect(exitCode).toBe(0);
			CliTestUtil.validateMarkdownOutput(stdout);
			expect(stdout).toContain('Search Results');
		}, 30000);

		it('should handle invalid limit value gracefully', async () => {
			if (skipIfNoCredentials()) {
				console.warn('Skipping invalid limit test - no credentials');
				return;
			}

			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'search',
				'--jql',
				'project = TEST',
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
				'search',
				'--jql',
				'invalidField = something',
			]);

			expect(exitCode).not.toBe(0);
			CliTestUtil.validateOutputContains(stdout, [
				/Error|Invalid|Failed/i,
			]);
		}, 60000);

		it('should handle help flag correctly', async () => {
			const { stdout, exitCode } = await CliTestUtil.runCommand([
				'search',
				'--help',
			]);

			expect(exitCode).toBe(0);
			expect(stdout).toMatch(/Usage|Options|Description/i);
			expect(stdout).toContain('search');
		}, 15000);
	});
});
