import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';

import atlassianProjectsCommands from './atlassian.projects.cli.js';
import atlassianIssuesCommands from './atlassian.issues.cli.js';
import atlassianSearchCommands from './atlassian.search.cli.js';

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/index.ts');

// Log CLI module initialization
cliLogger.debug('Jira CLI module initialized');

// Get the version from package.json
const VERSION = '1.13.0'; // This should match the version in src/index.ts
const NAME = '@aashari/mcp-atlassian-jira';
const DESCRIPTION =
	'A Model Context Protocol (MCP) server for Atlassian Jira integration';

export async function runCli(args: string[]) {
	const methodLogger = Logger.forContext('cli/index.ts', 'runCli');
	methodLogger.debug('Running CLI with arguments', args);

	const program = new Command();

	program.name(NAME).description(DESCRIPTION).version(VERSION);

	// Register CLI commands
	atlassianProjectsCommands.register(program);
	cliLogger.debug('Projects commands registered');

	atlassianIssuesCommands.register(program);
	cliLogger.debug('Issues commands registered');

	atlassianSearchCommands.register(program);
	cliLogger.debug('Search commands registered');

	// Handle unknown commands
	program.on('command:*', (operands) => {
		methodLogger.error(`Unknown command: ${operands[0]}`);
		console.log('');
		program.help();
		process.exit(1);
	});

	// Parse arguments; default to help if no command provided
	await program.parseAsync(args.length ? args : ['--help'], { from: 'user' });
	methodLogger.debug('CLI command execution completed');
}
