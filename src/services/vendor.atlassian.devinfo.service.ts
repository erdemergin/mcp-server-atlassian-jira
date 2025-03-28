import {
	getAtlassianCredentials,
	fetchAtlassian,
} from '../utils/transport.util.js';
import { Logger } from '../utils/logger.util.js';
import {
	DevInfoResponse,
	DevInfoSummaryResponse,
} from './vendor.atlassian.issues.types.js';
import { createAuthMissingError } from '../utils/error.util.js';

// Create a contextualized logger for this file
const serviceLogger = Logger.forContext(
	'services/vendor.atlassian.devinfo.service.ts',
);

// Log service initialization
serviceLogger.debug('Jira development info service initialized');

/**
 * Base API path for Dev Status API
 * @constant {string}
 */
const API_PATH = '/rest/dev-status/latest';

/**
 * Get development information summary for an issue
 * @param issueId The issue ID
 * @returns Development information summary
 */
async function getSummary(issueId: string): Promise<DevInfoSummaryResponse> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.devinfo.service.ts',
		'getSummary',
	);
	methodLogger.debug(`Getting development info summary for issue ${issueId}`);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			`Get dev info summary for issue ${issueId}`,
		);
	}

	try {
		const path = `${API_PATH}/issue/summary?issueId=${issueId}`;
		methodLogger.debug(`Calling Jira API: ${path}`);
		return fetchAtlassian<DevInfoSummaryResponse>(credentials, path);
	} catch (error) {
		methodLogger.error(
			`Error fetching development info summary for issue ${issueId}:`,
			error,
		);
		throw error;
	}
}

/**
 * Get detailed commit information for an issue
 * @param issueId The issue ID
 * @returns Commit information details
 */
async function getCommits(issueId: string): Promise<DevInfoResponse> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.devinfo.service.ts',
		'getCommits',
	);
	methodLogger.debug(`Getting commits for issue ${issueId}`);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(`Get commits for issue ${issueId}`);
	}

	try {
		// Bitbucket is the application type revealed in testing
		const path = `${API_PATH}/issue/detail?issueId=${issueId}&applicationType=bitbucket&dataType=repository`;
		methodLogger.debug(`Calling Jira API: ${path}`);
		return fetchAtlassian<DevInfoResponse>(credentials, path);
	} catch (error) {
		methodLogger.error(
			`Error fetching commit information for issue ${issueId}:`,
			error,
		);
		throw error;
	}
}

/**
 * Get branch information for an issue
 * @param issueId The issue ID
 * @returns Branch information details
 */
async function getBranches(issueId: string): Promise<DevInfoResponse> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.devinfo.service.ts',
		'getBranches',
	);
	methodLogger.debug(`Getting branches for issue ${issueId}`);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(`Get branches for issue ${issueId}`);
	}

	try {
		const path = `${API_PATH}/issue/detail?issueId=${issueId}&applicationType=bitbucket&dataType=branch`;
		methodLogger.debug(`Calling Jira API: ${path}`);
		return fetchAtlassian<DevInfoResponse>(credentials, path);
	} catch (error) {
		methodLogger.error(
			`Error fetching branch information for issue ${issueId}:`,
			error,
		);
		throw error;
	}
}

/**
 * Get pull request information for an issue
 * @param issueId The issue ID
 * @returns Pull request information details
 */
async function getPullRequests(issueId: string): Promise<DevInfoResponse> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.devinfo.service.ts',
		'getPullRequests',
	);
	methodLogger.debug(`Getting pull requests for issue ${issueId}`);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(`Get pull requests for issue ${issueId}`);
	}

	try {
		const path = `${API_PATH}/issue/detail?issueId=${issueId}&applicationType=bitbucket&dataType=pullrequest`;
		methodLogger.debug(`Calling Jira API: ${path}`);
		return fetchAtlassian<DevInfoResponse>(credentials, path);
	} catch (error) {
		methodLogger.error(
			`Error fetching pull request information for issue ${issueId}:`,
			error,
		);
		throw error;
	}
}

/**
 * Get all development information for an issue (summary, commits, branches, pull requests)
 * @param issueId The issue ID
 * @returns Complete development information
 */
async function getAllDevInfo(issueId: string): Promise<{
	summary: DevInfoSummaryResponse;
	commits: DevInfoResponse;
	branches: DevInfoResponse;
	pullRequests: DevInfoResponse;
}> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.devinfo.service.ts',
		'getAllDevInfo',
	);
	methodLogger.debug(`Getting all development info for issue ${issueId}`);

	try {
		const [summary, commits, branches, pullRequests] = await Promise.all([
			getSummary(issueId),
			getCommits(issueId),
			getBranches(issueId),
			getPullRequests(issueId),
		]);

		return {
			summary,
			commits,
			branches,
			pullRequests,
		};
	} catch (error) {
		methodLogger.error(
			`Error fetching all development information for issue ${issueId}:`,
			error,
		);
		throw error;
	}
}

export default {
	getSummary,
	getCommits,
	getBranches,
	getPullRequests,
	getAllDevInfo,
};
