#!/usr/bin/env node

/**
 * @file Command Line Interface for json-server
 *
 * This file implements the CLI for the json-server package.
 * It parses command line arguments and starts a server instance
 * with the specified configuration.
 *
 * The CLI supports several features including:
 * - Database loading from local or remote files
 * - Custom routes and middleware
 * - API prefix support (/api/* routes)
 * - Delay simulation for network latency testing
 * - Read-only mode for safe demonstrations
 *
 * @author webmasterdevlin
 * @copyright MIT License
 */

import minimist from 'minimist';
import path from 'path';
import fs from 'fs';
import { createServer } from '../lib';
import { CliArgs, ServerOptions } from '../types';
import { fileExists } from '../utils/utils';
import {
  styles,
  createHeader,
  createBox,
  formatList,
  formatHelp,
  formatError,
} from '../utils/cli-styles';

// Default server configuration
const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0'; // Changed from 'localhost' to '0.0.0.0' to allow external connections

/**
 * Parse command line arguments into a structured object
 *
 * @returns Parsed command line arguments
 */
function parseArgs(): CliArgs {
  // Define aliases for command line arguments
  const aliases = {
    p: 'port',
    H: 'host',
    w: 'watch',
    r: 'routes',
    m: 'middlewares',
    s: 'static',
    d: 'delay',
    i: 'id',
    q: 'quiet',
    h: 'help',
    v: 'version',
    ro: 'read-only',
    nc: 'no-cors',
    ng: 'no-gzip',
    api: 'enable-api-prefix', // Short alias for enabling API prefix
  };

  // Parse command line arguments with minimist
  const argv = minimist(process.argv.slice(2), { alias: aliases });

  // Handle help flag
  if (argv.help) {
    showHelp();
    process.exit(0);
  }

  // Handle version flag
  if (argv.version) {
    showVersion();
    process.exit(0);
  }

  return argv;
}

/**
 * Display version information
 */
function showVersion(): void {
  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    console.log(
      createBox(
        '⚡️ @webmasterdevlin/json-server',
        [
          '',
          `${styles.primary('Version:')} ${styles.highlight(packageJson.version)}`,
          '',
          `${styles.secondary('TypeScript-powered REST API mock server')}`,
          '',
        ],
        'default'
      )
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(formatError('Version Error', `Error reading package version: ${errorMessage}`));
    process.exit(1);
  }
}

/**
 * Display help information with usage examples
 */
function showHelp(): void {
  // Create sections for the help display
  const sections: Record<string, string> = {
    Usage: `${styles.command('json-server')} ${styles.info('[options]')} ${styles.highlight('<source>')}`,

    Options: formatList([
      `${styles.key('--port, -p')}         ${styles.value('Set port')}${styles.muted('                                  [default: 3000]')}`,
      `${styles.key('--host, -H')}         ${styles.value('Set host')}${styles.muted('                          [default: "localhost"]')}`,
      `${styles.key('--watch, -w')}        ${styles.value('Watch for changes')}${styles.muted('                        [default: false]')}`,
      `${styles.key('--routes, -r')}       ${styles.value('Path to routes file')}${styles.muted('                               [string]')}`,
      `${styles.key('--middlewares, -m')}  ${styles.value('Path to middlewares files')}${styles.muted('                          [array]')}`,
      `${styles.key('--static, -s')}       ${styles.value('Path to static files')}${styles.muted('                               [array]')}`,
      `${styles.key('--read-only, --ro')}  ${styles.value('Allow only GET requests')}${styles.muted('                  [default: false]')}`,
      `${styles.key('--no-cors, --nc')}    ${styles.value('Disable CORS')}${styles.muted('                             [default: false]')}`,
      `${styles.key('--no-gzip, --ng')}    ${styles.value('Disable GZIP compression')}${styles.muted('                 [default: false]')}`,
      `${styles.key('--enable-api-prefix, --api')}  ${styles.value('Enable /api/* prefix')}${styles.muted('            [default: false]')}`,
      `${styles.key('--delay, -d')}        ${styles.value('Add delay to responses (ms)')}${styles.muted('                       [number]')}`,
      `${styles.key('--id, -i')}           ${styles.value('Set database id field')}${styles.muted('                     [default: "id"]')}`,
      `${styles.key('--foreignKeySuffix')} ${styles.value('Set foreign key suffix')}${styles.muted('               [default: "_id"]')}`,
      `${styles.key('--quiet, -q')}        ${styles.value('Suppress log messages')}${styles.muted('                    [default: false]')}`,
      `${styles.key('--help, -h')}         ${styles.value('Show help')}${styles.muted('                                        [boolean]')}`,
      `${styles.key('--version, -v')}      ${styles.value('Show version')}${styles.muted('                                     [boolean]')}`,
    ]),

    Examples: formatList([
      `${styles.command('json-server')} ${styles.highlight('db.json')}`,
      `${styles.command('json-server')} ${styles.highlight('db.json')} ${styles.info('--port 3001')}`,
      `${styles.command('json-server')} ${styles.highlight('db.json')} ${styles.info('--watch')}`,
      `${styles.command('json-server')} ${styles.highlight('db.json')} ${styles.info('--routes routes.json')}`,
      `${styles.command('json-server')} ${styles.highlight('db.json')} ${styles.info('--routes routes.js')}`,
      `${styles.command('json-server')} ${styles.highlight('db.json')} ${styles.info('--delay 1000')}`,
      `${styles.command('json-server')} ${styles.highlight('db.json')} ${styles.info('--id _id')}`,
      `${styles.command('json-server')} ${styles.highlight('db.json')} ${styles.info('--enable-api-prefix')}     ${styles.muted('# Enable /api/* routes')}`,
      `${styles.command('json-server')} ${styles.highlight('http://example.com/db.json')}`,
    ]),

    'More Information': `${styles.url('https://github.com/webmasterdevlin/json-server')}`,
  };

  // Display the help sections
  console.log(formatHelp(sections));
}

/**
 * Get source file path from arguments
 *
 * @param args - Command line arguments
 * @returns Source file path or null if not found
 */
function getSourcePath(args: string[]): string | null {
  // Find the first argument that doesn't start with -
  const source = args.find((arg) => !arg.startsWith('-') && !arg.startsWith('--'));
  return source || null;
}

/**
 * Entry point for the CLI application
 */
async function main(): Promise<void> {
  try {
    const cliArgs = parseArgs();
    const args = process.argv.slice(2);

    // Show welcome banner
    if (!cliArgs.quiet) {
      console.log(createHeader());
    }

    // Get database source
    const source = getSourcePath(args);
    if (!source) {
      console.error(
        formatError(
          'Missing Source',
          'No database source provided.',
          'Please specify a JSON file or URL to use as database.'
        )
      );
      showHelp();
      process.exit(1);
    }

    // Check if source file exists (if it's a local file)
    if (source.startsWith('http://') || source.startsWith('https://')) {
      console.log(
        styles.icons.database,
        styles.info(`Using remote database: ${styles.url(source)}`)
      );
    } else if (!fileExists(source)) {
      console.error(
        formatError(
          'Database Error',
          `Database file not found: ${source}`,
          'Make sure the file exists and you have permissions to read it.'
        )
      );
      process.exit(1);
    }

    // Create server options from CLI arguments
    const options: ServerOptions = {
      port: cliArgs.port || DEFAULT_PORT,
      host: cliArgs.host || DEFAULT_HOST,
      static: cliArgs.static || [],
      middlewares: [],
      bodyParser: true,
      noCors: cliArgs['no-cors'] || false,
      noGzip: cliArgs['no-gzip'] || false,
      delay: cliArgs.delay || 0,
      quiet: cliArgs.quiet || false,
      readOnly: cliArgs['read-only'] || false,
      enableApiPrefix: cliArgs['enable-api-prefix'] || false, // Enable API prefix feature if specified
    };

    // Create and configure the server
    const server = createServer(options);

    // Set ID field if specified
    if (cliArgs.id) {
      server.setIdField(cliArgs.id);
    }

    // Load custom routes if specified
    if (cliArgs.routes) {
      if (!fileExists(cliArgs.routes)) {
        console.warn(
          styles.icons.warning,
          styles.warning(`Routes file not found: ${styles.highlight(cliArgs.routes)}`)
        );
      } else {
        await server.loadRoutes(cliArgs.routes);
      }
    }

    // Load database from source file
    server.loadDatabase(source);

    // Start the server
    await server.start();

    // Set up file watcher if requested
    if (cliArgs.watch && !source.startsWith('http')) {
      setupFileWatcher(source, server);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(formatError('Server Error', `Error starting server: ${errorMessage}`));
    process.exit(1);
  }
}

/**
 * Set up a file watcher for auto-reloading when the database changes
 *
 * @param dbPath - Path to the database file
 * @param server - Server instance
 */
function setupFileWatcher(dbPath: string, server: any): void {
  try {
    // Use Node's fs.watch API to monitor file changes
    fs.watch(dbPath, (eventType) => {
      if (eventType === 'change') {
        console.log(
          styles.icons.watch,
          styles.info(`${styles.highlight(dbPath)} changed, reloading database...`)
        );
        try {
          server.loadDatabase(dbPath);
          console.log(styles.icons.success, styles.success('Database reloaded successfully'));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(
            styles.icons.error,
            styles.error(`Error reloading database: ${errorMessage}`)
          );
        }
      }
    });

    console.log(
      styles.icons.watch,
      styles.info(`Watching for changes: ${styles.highlight(dbPath)}`)
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      styles.icons.error,
      styles.error(`Error setting up file watcher: ${errorMessage}`)
    );
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n' + styles.icons.stop, styles.info('Received SIGINT. Shutting down...'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n' + styles.icons.stop, styles.info('Received SIGTERM. Shutting down...'));
  process.exit(0);
});

// Start the application
main().catch((error) => {
  console.error(formatError('Fatal Error', error.message));
  process.exit(1);
});
