import { RequestHandler } from 'express';

/**
 * Configuration options for the JSON server
 * @interface ServerOptions
 */
export interface ServerOptions {
  /** Port to run the server on */
  port: number;

  /** Host address to bind the server to */
  host: string;

  /** Path(s) to static files to serve */
  static: string | string[];

  /** Array of custom Express middleware functions */
  middlewares: RequestHandler[];

  /** Whether to enable body parsing */
  bodyParser: boolean;

  /** Whether to disable CORS (alternative to cors property) */
  noCors: boolean;

  /** Whether to disable gzip compression */
  noGzip: boolean;

  /** Artificial delay to add to responses (in ms) */
  delay: number;

  /** Whether to suppress console output */
  quiet: boolean;

  /** Whether to make the server read-only (no POST, PUT, PATCH, DELETE) */
  readOnly: boolean;

  /**
   * Whether to enable API prefix (/api/*) for all routes
   * When enabled, all routes can be accessed both directly (/users)
   * and with an /api prefix (/api/users)
   */
  enableApiPrefix: boolean;
}

/**
 * HTTP Method types for improved type safety
 * @enum
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

/**
 * Command line arguments structure
 * @interface CliArgs
 */
export interface CliArgs {
  /** Port to run the server on */
  port?: number;

  /** Host address to bind the server to */
  host?: string;

  /** Whether to watch for changes in the database file */
  watch?: boolean;

  /** Path to routes configuration file */
  routes?: string;

  /** Array of paths to custom middleware files */
  middlewares?: string[];

  /** Path(s) to static files to serve */
  static?: string | string[];

  /** Whether to make the server read-only */
  'read-only'?: boolean;

  /** Whether to disable CORS */
  'no-cors'?: boolean;

  /** Whether to disable gzip compression */
  'no-gzip'?: boolean;

  /** Artificial delay to add to responses (in ms) */
  delay?: number;

  /** Whether to suppress console output */
  quiet?: boolean;

  /** Field name to use as the ID field */
  id?: string;

  /** Suffix to use for foreign keys */
  foreignKeySuffix?: string;

  /** Path to file for database snapshots */
  snapshot?: string;

  /**
   * Whether to enable API prefix feature
   * When enabled, all routes can be accessed with /api/* prefix
   */
  'enable-api-prefix'?: boolean;

  /** Additional, unknown command line arguments */
  [key: string]: any;
}

/**
 * Database structure containing collections of items
 * @interface Database
 */
export interface Database {
  [collectionName: string]: Array<Record<string, any>>;
}

/**
 * Handler function type for custom routes
 */
export type RouteHandler = (req: any, res: any, next?: any) => void;

/**
 * Custom route definition
 * @interface CustomRoute
 */
export interface CustomRoute {
  /** Path pattern for the route */
  path: string;

  /** HTTP method for the route */
  method: HttpMethod | string;

  /** Handler function for the route */
  handler: RouteHandler;
}

/**
 * Routes configuration structure
 * @interface RoutesConfig
 */
export interface RoutesConfig {
  [path: string]: {
    [method: string]: string | RouteHandler;
  };
}
