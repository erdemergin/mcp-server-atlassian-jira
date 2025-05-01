/**
 * Types for Atlassian Jira Issues API
 */
import { ContentRepresentation } from './vendor.atlassian.types.js';

/**
 * Issue status
 */
export interface IssueStatus {
	iconUrl: string;
	name: string;
}

/**
 * Issue link type
 */
export interface IssueLinkType {
	id: string;
	inward: string;
	name: string;
	outward: string;
}

/**
 * Represents the minimal information about a linked issue provided within an IssueLink.
 */
export interface LinkedIssueInfo {
	id: string;
	key: string;
	self: string;
	fields: {
		summary?: string; // Make summary optional as it might not always be present
		status: IssueStatus;
		// Add other fields if needed and available in the API response for links
	};
}

/**
 * Issue link
 */
export interface IssueLink {
	id: string;
	type: IssueLinkType;
	inwardIssue?: LinkedIssueInfo; // Use the new minimal type
	outwardIssue?: LinkedIssueInfo; // Use the new minimal type
}

/**
 * Issue attachment
 */
export interface IssueAttachment {
	id: string;
	self: string;
	filename: string;
	author: {
		accountId: string;
		accountType?: string;
		active: boolean;
		displayName: string;
		self: string;
		avatarUrls?: Record<string, string>;
	};
	created: string;
	size: number;
	mimeType: string;
	content: string;
	thumbnail?: string;
}

/**
 * Issue comment
 */
export interface IssueComment {
	id: string;
	self: string;
	author: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
	};
	body: string | ContentRepresentation;
	created: string;
	updated: string;
	updateAuthor: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
	};
	visibility?: {
		identifier: string;
		type: string;
		value: string;
	};
}

/**
 * Issue worklog
 */
export interface IssueWorklog {
	id: string;
	self: string;
	author: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
	};
	comment: string | ContentRepresentation;
	created: string;
	updated: string;
	issueId: string;
	started: string;
	timeSpent: string;
	timeSpentSeconds: number;
	updateAuthor: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
	};
	visibility?: {
		identifier: string;
		type: string;
		value: string;
	};
}

/**
 * Issue time tracking
 */
export interface IssueTimeTracking {
	originalEstimate?: string;
	originalEstimateSeconds?: number;
	remainingEstimate?: string;
	remainingEstimateSeconds?: number;
	timeSpent?: string;
	timeSpentSeconds?: number;
}

/**
 * Issue watcher
 */
export interface IssueWatcher {
	isWatching: boolean;
	self: string;
	watchCount: number;
}

/**
 * Issue fields
 */
export interface IssueFields {
	watcher?: IssueWatcher;
	attachment?: IssueAttachment[];
	description?: string | ContentRepresentation;
	project: {
		id: string;
		key: string;
		name: string;
		self: string;
		avatarUrls: Record<string, string>;
		simplified: boolean;
		insight?: {
			lastIssueUpdateTime: string;
			totalIssueCount: number;
		};
		projectCategory?: {
			id: string;
			name: string;
			description?: string;
			self: string;
		};
	};
	comment?: IssueComment[];
	issuelinks?: IssueLink[];
	worklog?: IssueWorklog[];
	updated?: string | number;
	timetracking?: IssueTimeTracking;
	summary?: string;
	status?: IssueStatus;
	assignee?: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
		avatarUrls?: Record<string, string>;
	};
	priority?: {
		id: string;
		name: string;
		iconUrl: string;
		self: string;
	};
	issuetype?: {
		id: string;
		name: string;
		description: string;
		iconUrl: string;
		self: string;
		subtask: boolean;
		avatarId?: number;
		hierarchyLevel?: number;
	};
	creator?: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
		avatarUrls?: Record<string, string>;
	};
	reporter?: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
		avatarUrls?: Record<string, string>;
	};
	created?: string;
	labels?: string[];
	components?: {
		id: string;
		name: string;
		self: string;
	}[];
	fixVersions?: {
		id: string;
		name: string;
		self: string;
		released: boolean;
		archived: boolean;
		releaseDate?: string;
	}[];
	[key: string]: unknown; // For custom fields
}

/**
 * Issue object returned from the API
 */
export interface Issue {
	id: string;
	key: string;
	self: string;
	expand?: string;
	fields: IssueFields;
}

/**
 * Parameters for searching issues
 */
export interface SearchIssuesParams {
	jql?: string;
	startAt?: number;
	maxResults?: number;
	fields?: string[];
	expand?: string[];
	validateQuery?: boolean;
	properties?: string[];
	fieldsByKeys?: boolean;
	nextPageToken?: string;
	reconcileIssues?: boolean;
}

/**
 * Parameters for getting an issue by ID or key
 */
export interface GetIssueByIdParams {
	fields?: string[];
	expand?: string[];
	properties?: string[];
	fieldsByKeys?: boolean;
	updateHistory?: boolean;
}

/**
 * API response for searching issues
 */
export interface IssuesResponse {
	expand?: string;
	startAt: number;
	maxResults: number;
	total: number;
	issues: Issue[];
	warningMessages?: string[];
	names?: Record<string, string>;
	schema?: Record<string, unknown>;
	nextPageToken?: string;
}

/**
 * Development information for issues
 */
export interface DevInfoCommit {
	id: string;
	displayId: string;
	message: string;
	author?: {
		name: string;
		avatar?: string;
	};
	authorTimestamp: string;
	url: string;
	fileCount: number;
	merge: boolean;
	files: Array<unknown>;
}

export interface DevInfoRepository {
	id: string;
	name: string;
	avatar: string;
	url: string;
	commits?: DevInfoCommit[];
}

export interface DevInfoBranch {
	name: string;
	url: string;
	createPullRequestUrl: string;
	repository?: {
		id: string;
		name: string;
		avatar: string;
		url: string;
	};
	lastCommit?: DevInfoCommit;
}

export interface DevInfoReviewer {
	name: string;
	avatar?: string;
	approved: boolean;
}

export interface DevInfoPullRequest {
	id: string;
	name: string;
	commentCount: number;
	source?: {
		branch: string;
		url: string;
	};
	destination?: {
		branch: string;
		url: string;
	};
	reviewers?: DevInfoReviewer[];
	status: string;
	url: string;
	lastUpdate: string;
	repositoryId: string;
	repositoryName: string;
	repositoryUrl: string;
	repositoryAvatarUrl: string;
	author?: {
		name: string;
		avatar?: string;
	};
}

export interface DevInfoInstance {
	singleInstance: boolean;
	baseUrl: string;
	name: string;
	typeName: string;
	id: string;
	type: string;
}

export interface DevInfoDetail {
	repositories?: DevInfoRepository[];
	branches?: DevInfoBranch[];
	pullRequests?: DevInfoPullRequest[];
	_instance?: DevInfoInstance;
}

export interface DevInfoResponse {
	errors: string[];
	detail: DevInfoDetail[];
}

export interface DevInfoSummaryRepository {
	count: number;
	lastUpdated: string | null;
	dataType: string;
}

export interface DevInfoSummaryPullRequest {
	count: number;
	lastUpdated: string | null;
	stateCount: number;
	state: string | null;
	dataType: string;
	open: boolean;
}

export interface DevInfoSummaryBranch {
	count: number;
	lastUpdated: string | null;
	dataType: string;
}

export interface DevInfoSummaryData {
	pullrequest: {
		overall: DevInfoSummaryPullRequest;
		byInstanceType: Record<string, { count: number; name: string }>;
	};
	repository: {
		overall: DevInfoSummaryRepository;
		byInstanceType: Record<string, { count: number; name: string }>;
	};
	branch: {
		overall: DevInfoSummaryBranch;
		byInstanceType: Record<string, { count: number; name: string }>;
	};
}

export interface DevInfoSummaryResponse {
	errors: string[];
	configErrors: string[];
	summary: DevInfoSummaryData;
}
