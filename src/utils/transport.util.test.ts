import { getAtlassianCredentials, fetchAtlassian } from './transport.util.js';
import { config } from './config.util.js';
import { logger } from './logger.util.js';
import { ProjectsResponse } from '../services/vendor.atlassian.projects.types.js';

// Mock the logger module only to prevent console output during tests
jest.mock('./logger.util.js', () => ({
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

// NOTE: We are no longer mocking fetch, using real API calls instead

describe('Transport Utility', () => {
	// Load configuration before all tests
	beforeAll(() => {
		// Load configuration from all sources
		config.load();
	});

	describe('getAtlassianCredentials', () => {
		it('should return credentials when environment variables are set', () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Verify the structure of the credentials
			expect(credentials).toHaveProperty('siteName');
			expect(credentials).toHaveProperty('userEmail');
			expect(credentials).toHaveProperty('apiToken');

			// Verify the credentials are not empty
			expect(credentials.siteName).toBeTruthy();
			expect(credentials.userEmail).toBeTruthy();
			expect(credentials.apiToken).toBeTruthy();
		});

		it('should return null and log a warning when environment variables are missing', () => {
			// Temporarily override the config.get function
			const originalGet = config.get;
			config.get = jest.fn().mockReturnValue(undefined);

			// Call the function
			const credentials = getAtlassianCredentials();

			// Verify the result is null
			expect(credentials).toBeNull();

			// Verify that a warning was logged
			expect(logger.warn).toHaveBeenCalledWith(
				'Missing Atlassian credentials. Please set ATLASSIAN_SITE_NAME, ATLASSIAN_USER_EMAIL, and ATLASSIAN_API_TOKEN environment variables.',
			);

			// Restore the original function
			config.get = originalGet;
		});
	});

	describe('fetchAtlassian', () => {
		it('should successfully fetch data from the Atlassian API', async () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Make a call to a real API endpoint - project search
			const result = await fetchAtlassian<ProjectsResponse>(
				credentials,
				'/rest/api/3/project/search',
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);

			// Verify the response structure from real API
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
			expect(result).toHaveProperty('startAt');
			expect(result).toHaveProperty('maxResults');
			expect(result).toHaveProperty('total');

			// If projects are returned, verify their structure
			if (result.values.length > 0) {
				const project = result.values[0];
				expect(project).toHaveProperty('id');
				expect(project).toHaveProperty('key');
				expect(project).toHaveProperty('name');
			}
		}, 15000); // Increased timeout for real API call

		it('should handle API errors correctly', async () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Call a non-existent endpoint and expect it to throw
			await expect(
				fetchAtlassian(
					credentials,
					'/rest/api/3/non-existent-endpoint',
				),
			).rejects.toThrow();
		}, 15000); // Increased timeout for real API call

		it('should normalize paths that do not start with a slash', async () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Call the function with a path that doesn't start with a slash
			const result = await fetchAtlassian<ProjectsResponse>(
				credentials,
				'rest/api/3/project/search',
				{
					method: 'GET',
				},
			);

			// Verify the response structure from real API
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
			expect(result).toHaveProperty('startAt');
			expect(result).toHaveProperty('maxResults');
			expect(result).toHaveProperty('total');
		}, 15000); // Increased timeout for real API call

		it('should support custom request options', async () => {
			// This test will be skipped if credentials are not available
			const credentials = getAtlassianCredentials();
			if (!credentials) {
				console.warn(
					'Skipping test: No Atlassian credentials available',
				);
				return;
			}

			// Custom request options including pagination
			const options = {
				method: 'GET' as const,
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
			};

			// Call a real endpoint with pagination parameter
			const result = await fetchAtlassian<ProjectsResponse>(
				credentials,
				'/rest/api/3/project/search?maxResults=1',
				options,
			);

			// Verify the response structure and pagination
			expect(result).toHaveProperty('values');
			expect(Array.isArray(result.values)).toBe(true);
			expect(result).toHaveProperty('startAt');
			expect(result).toHaveProperty('maxResults', 1); // Should respect maxResults=1
			expect(result.values.length).toBeLessThanOrEqual(1);
		}, 15000); // Increased timeout for real API call
	});
});
