import express, { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import path from 'path';
import fs from 'fs';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import serveStatic from 'serve-static';
import { ServerOptions, Database, RoutesConfig, HttpMethod } from '../types';
import {
  corsMiddleware,
  delayMiddleware,
  readOnlyMiddleware,
  apiPrefixMiddleware,
} from '../middleware';
import { fileExists, loadJsonFile, saveJsonFile, parseRoutesFile } from '../utils/utils';
import {
  styles,
  createServerBanner,
  formatDatabaseSummary,
  formatRouteRegistration,
  formatError,
} from '../utils/cli-styles';

/**
 * Main JsonServer class that handles all server functionality
 *
 * @class JsonServer
 */
export class JsonServer {
  /** Express application instance */
  private app: Express;

  /** In-memory database */
  private db: Database = {};

  /** Path to the JSON database file */
  private dbPath: string = '';

  /** Custom routes configuration */
  private routes: RoutesConfig = {};

  /** Field to use as the primary key/ID (default: 'id') */
  private idField: string = 'id';

  /**
   * Creates an instance of JsonServer
   *
   * @param options - Server configuration options
   */
  constructor(private options: ServerOptions) {
    this.app = express();
    this.setupMiddlewares();
  }

  /**
   * Get the Express application instance
   *
   * @returns The Express application
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Setup all middleware for the server
   *
   * @private
   */
  private setupMiddlewares(): void {
    // Add logging middleware if not in quiet mode
    if (!this.options.quiet) {
      this.app.use(morgan('dev'));
    }

    // CORS middleware
    this.app.use(corsMiddleware(!this.options.noCors));

    // Body parser middleware
    if (this.options.bodyParser) {
      this.app.use(bodyParser.json({ limit: '10mb' }));
      this.app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' }));
    }

    // API Prefix middleware - allows accessing routes with /api/* prefix
    // This enables both standard routes (/users) and prefixed routes (/api/users)
    if (this.options.enableApiPrefix) {
      this.app.use(apiPrefixMiddleware(this.options.enableApiPrefix));
      if (!this.options.quiet) {
        console.log(
          styles.icons.api,
          styles.info('API prefix middleware enabled. Routes can be accessed with /api/* prefix.')
        );
      }
    }

    // Delay middleware for simulating network latency
    if (this.options.delay > 0) {
      this.app.use(delayMiddleware(this.options.delay));
      if (!this.options.quiet) {
        console.log(
          styles.icons.time,
          styles.info(`Response delay: ${styles.highlight(`${this.options.delay}ms`)}`)
        );
      }
    }

    // Read-only middleware to prevent data modifications
    this.app.use(readOnlyMiddleware(this.options.readOnly) as RequestHandler);
    if (this.options.readOnly && !this.options.quiet) {
      console.log(
        styles.icons.warning,
        styles.warning('Read-only mode enabled. Write operations are disabled.')
      );
    }

    // Serve static files if configured
    this.setupStaticFiles();

    // Custom middlewares
    this.setupCustomMiddlewares();
  }

  /**
   * Set up static file serving
   *
   * @private
   */
  private setupStaticFiles(): void {
    if (
      !this.options.static ||
      (Array.isArray(this.options.static) && this.options.static.length === 0)
    ) {
      return;
    }

    const statics = Array.isArray(this.options.static)
      ? this.options.static
      : [this.options.static];

    statics.forEach((staticPath) => {
      if (!fs.existsSync(path.resolve(staticPath))) {
        console.warn(
          styles.icons.warning,
          styles.warning(`Static path not found: ${styles.highlight(staticPath)}`)
        );
        return;
      }

      this.app.use(
        serveStatic(path.resolve(staticPath), {
          index: ['index.html'],
        })
      );

      if (!this.options.quiet) {
        console.log(
          styles.icons.info,
          styles.info(`Serving static files from: ${styles.highlight(staticPath)}`)
        );
      }
    });
  }

  /**
   * Set up custom middlewares provided in options
   *
   * @private
   */
  private setupCustomMiddlewares(): void {
    if (Array.isArray(this.options.middlewares) && this.options.middlewares.length > 0) {
      this.options.middlewares.forEach((middleware, index) => {
        this.app.use(middleware);
        if (!this.options.quiet) {
          console.log(
            styles.icons.config,
            styles.info(`Applied custom middleware #${styles.highlight((index + 1).toString())}`)
          );
        }
      });
    }
  }

  /**
   * Creates pagination metadata based on request parameters
   *
   * @param total - Total number of items
   * @param page - Current page number
   * @param perPage - Items per page
   * @returns Pagination metadata with first, prev, next, last, pages, and items
   */
  private createPaginationMetadata(
    total: number,
    page: number,
    perPage: number
  ): Record<string, any> {
    // Validate and sanitize inputs
    total = Math.max(0, Math.floor(Number(total)) || 0);
    page = Math.max(1, Math.floor(Number(page)) || 1);
    perPage = Math.max(1, Math.min(1000, Math.floor(Number(perPage)) || 10)); // Cap at 1000

    const totalPages = Math.ceil(total / perPage);

    return {
      first: 1,
      prev: page > 1 ? page - 1 : null,
      next: page < totalPages ? page + 1 : null,
      last: totalPages || 1,
      pages: totalPages || 1,
      items: total,
    };
  }

  /**
   * Get paginated data with metadata
   *
   * @param collection - Data collection to paginate
   * @param page - Current page number (default: 1)
   * @param perPage - Items per page (default: 10)
   * @returns Paginated data with metadata
   */
  private getPaginatedData(
    collection: any[],
    page: number = 1,
    perPage: number = 10
  ): Record<string, any> {
    // Validate and sanitize inputs
    if (!Array.isArray(collection)) {
      throw new Error('Collection must be an array');
    }

    // Ensure valid page and perPage values
    page = Math.max(1, Math.floor(Number(page)) || 1);
    perPage = Math.max(1, Math.min(1000, Math.floor(Number(perPage)) || 10)); // Cap at 1000

    const total = collection.length;
    const totalPages = Math.ceil(total / perPage);
    
    // Clamp page to valid range
    page = Math.min(page, Math.max(1, totalPages));
    
    const start = (page - 1) * perPage;
    const end = Math.min(start + perPage, total);

    // Get the data slice for the current page
    const data = collection.slice(start, end);

    return {
      data,
      first: 1,
      prev: page > 1 ? page - 1 : null,
      next: page < totalPages ? page + 1 : null,
      last: totalPages || 1,
      pages: totalPages || 1,
      items: total,
    };
  }

  /**
   * Checks if pagination should continue based on current page and total items
   *
   * @param currentPage - Current page number
   * @param pageSize - Number of items per page
   * @param totalItems - Total number of items in the collection
   * @returns Boolean indicating if there are more pages
   */
  continueToIterate(currentPage: number, pageSize: number, totalItems: number): boolean {
    return currentPage * pageSize < totalItems;
  }

  /**
   * Get paginated resources from a collection
   *
   * @param resourceName - Name of the resource collection
   * @param page - Current page number (default: 1)
   * @param pageSize - Number of items per page (default: 10)
   * @returns Object containing paginated data and metadata
   */
  getPaginatedResource(
    resourceName: string,
    page: number = 1,
    pageSize: number = 10
  ): Record<string, any> {
    // Validate resource name
    if (!resourceName || typeof resourceName !== 'string') {
      throw new Error('Invalid resource name');
    }

    if (!this.db[resourceName]) {
      return {
        data: [],
        first: 1,
        prev: null,
        next: null,
        last: 1,
        pages: 1,
        items: 0,
      };
    }

    const collection = this.db[resourceName];
    
    if (!Array.isArray(collection)) {
      throw new Error(`Resource '${resourceName}' is not a collection`);
    }

    const totalItems = collection.length;

    // Ensure page and pageSize are valid numbers
    page = Math.max(1, Math.floor(Number(page)) || 1);
    pageSize = Math.max(1, Math.min(1000, Math.floor(Number(pageSize)) || 10)); // Cap at 1000

    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, totalItems);
    const data = collection.slice(start, end);

    const paginationMeta = this.createPaginationMetadata(totalItems, page, pageSize);

    return {
      data: data,
      ...paginationMeta,
    };
  }

  /**
   * Load database from JSON file
   *
   * @param dbPath - Path to the database JSON file
   * @returns This server instance for chaining
   * @throws Error if database file doesn't exist
   */
  loadDatabase(dbPath: string): JsonServer {
    this.dbPath = path.resolve(dbPath);

    if (!fileExists(this.dbPath)) {
      throw new Error(`Database file not found: ${this.dbPath}`);
    }

    try {
      this.db = loadJsonFile(this.dbPath);

      if (!this.options.quiet) {
        // Log number of collections and total items
        const collections = Object.keys(this.db);
        const totalItems = collections.reduce((sum, coll) => sum + this.db[coll].length, 0);
        console.log(formatDatabaseSummary(this.dbPath, collections.length, totalItems));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load database: ${errorMessage}`);
    }

    return this;
  }

  /**
   * Save the current database state to the JSON file
   *
   * @throws Error if no database file is specified or if save fails
   */
  saveDatabase(): void {
    if (!this.dbPath) {
      throw new Error('No database file specified. Call loadDatabase() first.');
    }

    try {
      saveJsonFile(this.dbPath, this.db);

      if (!this.options.quiet) {
        console.log(
          styles.icons.success,
          styles.success(`Database saved to ${styles.highlight(this.dbPath)}`)
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to save database: ${errorMessage}`);
    }
  }

  /**
   * Set the ID field name (default is 'id')
   *
   * @param idField - Field name to use as ID
   * @returns This server instance for chaining
   */
  setIdField(idField: string): JsonServer {
    this.idField = idField;

    if (!this.options.quiet) {
      console.log(
        styles.icons.config,
        styles.info(`Using ${styles.highlight(idField)} as the ID field`)
      );
    }

    return this;
  }

  /**
   * Load custom routes from a configuration file
   *
   * @param routesPath - Path to the routes configuration file
   * @returns This server instance for chaining
   */
  async loadRoutes(routesPath: string): Promise<JsonServer> {
    const fullPath = path.resolve(routesPath);

    try {
      this.routes = (await parseRoutesFile(fullPath)) as RoutesConfig;

      if (!this.options.quiet) {
        const routeCount = Object.keys(this.routes).length;
        console.log(
          styles.icons.routes,
          styles.info(
            `Loaded ${styles.highlight(routeCount.toString())} custom routes from ${styles.highlight(fullPath)}`
          )
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(styles.icons.error, styles.error(`Failed to load routes: ${errorMessage}`));
    }

    return this;
  }

  /**
   * Add a custom route
   *
   * @param path - Route path
   * @param method - HTTP method
   * @param handler - Route handler function
   * @returns This server instance for chaining
   */
  addRoute(
    routePath: string,
    method: HttpMethod | string,
    handler: (req: Request, res: Response) => void
  ): JsonServer {
    if (!this.routes[routePath]) {
      this.routes[routePath] = {};
    }

    this.routes[routePath][method.toLowerCase()] = handler;

    if (!this.options.quiet) {
      console.log(formatRouteRegistration(method, routePath));
    }

    return this;
  }

  /**
   * Create API endpoints for all resources in the database
   *
   * @private
   */
  private createResourceRoutes(): void {
    // Get entire database
    this.app.get('/db', ((req: Request, res: Response) => {
      res.json(this.db);
    }) as RequestHandler);

    // Get paginated results for a resource
    this.app.get('/:resource/paginate', ((req: Request, res: Response) => {
      const { resource } = req.params;
      const page = parseInt(req.query._page as string) || 1;
      const pageSize = parseInt(req.query._limit as string) || 10;

      const paginatedResult = this.getPaginatedResource(resource, page, pageSize);
      res.json(paginatedResult);
    }) as RequestHandler);

    // Get all entries for a resource
    this.app.get('/:resource', ((req: Request, res: Response) => {
      const { resource } = req.params;
      const resourceData = this.db[resource] || [];

      // Filter data based on non-pagination query parameters first
      let filteredData = [...resourceData];
      if (Object.keys(req.query).length > 0) {
        filteredData = resourceData.filter((item) => {
          return Object.entries(req.query).every(([key, value]) => {
            // Skip special query parameters like _page, _per_page, _limit
            if (key.startsWith('_')) return true;
            return String(item[key]) === String(value);
          });
        });
      }

      // Handle pagination
      const pageParam = req.query._page;
      const perPageParam = req.query._per_page || req.query._limit;

      // Check if any pagination parameter is present
      if (pageParam !== undefined || perPageParam !== undefined) {
        // Convert to integers with defaults if parsing fails
        const page = pageParam ? Math.max(1, parseInt(pageParam as string) || 1) : 1;
        const perPage = perPageParam ? Math.max(1, parseInt(perPageParam as string) || 10) : 10;

        // Get paginated data with proper metadata using the getPaginatedData method
        const paginatedResult = this.getPaginatedData(filteredData, page, perPage);

        // Set pagination headers
        res.setHeader('X-Total-Count', paginatedResult.items.toString());
        res.setHeader('X-Total-Pages', paginatedResult.pages.toString());
        res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Total-Pages');

        // Return the paginated result
        return res.json(paginatedResult);
      }

      res.json(filteredData);
    }) as RequestHandler);

    // Get single entry by ID
    this.app.get('/:resource/:id', ((req: Request, res: Response) => {
      const { resource, id } = req.params;

      if (!this.db[resource]) {
        return res.status(404).json({
          error: `Resource '${resource}' not found`,
          message: `The resource '${resource}' does not exist in the database`,
        });
      }

      const item = this.db[resource].find((item: any) => String(item[this.idField]) === String(id));

      if (!item) {
        return res.status(404).json({
          error: `Item with ID '${id}' not found`,
          message: `No item with ID '${id}' exists in resource '${resource}'`,
        });
      }

      res.json(item);
    }) as RequestHandler);

    // Create new entry
    this.app.post('/:resource', ((req: Request, res: Response) => {
      const { resource } = req.params;
      const newItem = req.body;

      if (!newItem || typeof newItem !== 'object') {
        return res.status(400).json({
          error: 'Invalid request body',
          message: 'Request body must be a valid JSON object',
        });
      }

      if (!this.db[resource]) {
        this.db[resource] = [];
      }

      // Generate ID if not provided
      if (!newItem[this.idField]) {
        newItem[this.idField] = Date.now().toString();
      }

      this.db[resource].push(newItem);

      try {
        this.saveDatabase();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return res.status(500).json({
          error: 'Failed to save database',
          message: errorMessage,
        });
      }

      res.status(201).json(newItem);
    }) as RequestHandler);

    // Update entry (PUT - full update)
    this.app.put('/:resource/:id', ((req: Request, res: Response) => {
      const { resource, id } = req.params;
      const updateData = req.body;

      if (!updateData || typeof updateData !== 'object') {
        return res.status(400).json({
          error: 'Invalid request body',
          message: 'Request body must be a valid JSON object',
        });
      }

      if (!this.db[resource]) {
        return res.status(404).json({
          error: `Resource '${resource}' not found`,
          message: `The resource '${resource}' does not exist in the database`,
        });
      }

      const index = this.db[resource].findIndex(
        (item: any) => String(item[this.idField]) === String(id)
      );

      if (index === -1) {
        return res.status(404).json({
          error: `Item with ID '${id}' not found`,
          message: `No item with ID '${id}' exists in resource '${resource}'`,
        });
      }

      // Preserve the ID
      updateData[this.idField] = this.db[resource][index][this.idField];

      this.db[resource][index] = updateData;

      try {
        this.saveDatabase();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return res.status(500).json({
          error: 'Failed to save database',
          message: errorMessage,
        });
      }

      res.json(updateData);
    }) as RequestHandler);

    // Update entry (PATCH - partial update)
    this.app.patch('/:resource/:id', ((req: Request, res: Response) => {
      const { resource, id } = req.params;
      const updateData = req.body;

      if (!updateData || typeof updateData !== 'object') {
        return res.status(400).json({
          error: 'Invalid request body',
          message: 'Request body must be a valid JSON object',
        });
      }

      if (!this.db[resource]) {
        return res.status(404).json({
          error: `Resource '${resource}' not found`,
          message: `The resource '${resource}' does not exist in the database`,
        });
      }

      const index = this.db[resource].findIndex(
        (item: any) => String(item[this.idField]) === String(id)
      );

      if (index === -1) {
        return res.status(404).json({
          error: `Item with ID '${id}' not found`,
          message: `No item with ID '${id}' exists in resource '${resource}'`,
        });
      }

      // Preserve the ID and merge with existing data
      const updatedItem = { ...this.db[resource][index], ...updateData };
      updatedItem[this.idField] = this.db[resource][index][this.idField];

      this.db[resource][index] = updatedItem;

      try {
        this.saveDatabase();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return res.status(500).json({
          error: 'Failed to save database',
          message: errorMessage,
        });
      }

      res.json(updatedItem);
    }) as RequestHandler);

    // Delete entry
    this.app.delete('/:resource/:id', ((req: Request, res: Response) => {
      const { resource, id } = req.params;

      if (!this.db[resource]) {
        return res.status(404).json({
          error: `Resource '${resource}' not found`,
          message: `The resource '${resource}' does not exist in the database`,
        });
      }

      const index = this.db[resource].findIndex(
        (item: any) => String(item[this.idField]) === String(id)
      );

      if (index === -1) {
        return res.status(404).json({
          error: `Item with ID '${id}' not found`,
          message: `No item with ID '${id}' exists in resource '${resource}'`,
        });
      }

      const deletedItem = this.db[resource][index];
      this.db[resource].splice(index, 1);

      try {
        this.saveDatabase();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return res.status(500).json({
          error: 'Failed to save database',
          message: errorMessage,
        });
      }

      res.json(deletedItem);
    }) as RequestHandler);
  }

  /**
   * Apply custom routes defined in routes config
   *
   * @private
   */
  private applyCustomRoutes(): void {
    Object.entries(this.routes).forEach(([routePath, handlers]) => {
      Object.entries(handlers).forEach(([method, handler]) => {
        const routeMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';

        if (typeof this.app[routeMethod] !== 'function') {
          console.error(
            styles.icons.error,
            styles.error(`Unsupported HTTP method: ${styles.highlight(method)}`)
          );
          return;
        }

        if (typeof handler === 'string') {
          // String handler: redirect or proxy to another route
          const targetPath = handler;
          this.app[routeMethod](routePath, ((req: Request, res: Response) => {
            // Replace path parameters in target path
            let resolvedPath = targetPath;
            const pathParamsMatch = routePath.match(/:[a-zA-Z0-9_]+/g);

            if (pathParamsMatch) {
              pathParamsMatch.forEach((paramName) => {
                const paramKey = paramName.substring(1); // Remove the ':'
                if (req.params[paramKey]) {
                  resolvedPath = resolvedPath.replace(paramName, req.params[paramKey]);
                }
              });
            }

            res.redirect(resolvedPath);
          }) as RequestHandler);

          if (!this.options.quiet) {
            console.log(formatRouteRegistration(method, routePath, targetPath));
          }
        } else if (typeof handler === 'function') {
          // Function handler: direct route handler
          this.app[routeMethod](routePath, handler as RequestHandler);

          if (!this.options.quiet) {
            console.log(formatRouteRegistration(method, routePath));
          }
        }
      });
    });
  }

  /**
   * Start the server
   *
   * @returns A promise resolving to the server instance
   */
  start(): Promise<any> {
    // Create API routes for resources
    this.createResourceRoutes();

    // Apply custom routes if defined
    if (Object.keys(this.routes).length > 0) {
      this.applyCustomRoutes();
    }

    // Handle 404 errors
    this.app.use(((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not found',
        message: `The requested URL ${req.url} was not found on this server`,
        path: req.url,
      });
    }) as RequestHandler);

    // Handle server errors (500)
    this.app.use(((err: Error, req: Request, res: Response, _next: NextFunction) => {
      console.error(styles.icons.error, styles.error('Server error:'), err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message || 'An unexpected error occurred',
      });
    }) as unknown as RequestHandler);

    // Start the server
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(this.options.port, this.options.host, () => {
          if (!this.options.quiet) {
            // Create a settings object to display in the banner
            const settings: Record<string, any> = {
              'Read Only': this.options.readOnly ? 'Yes' : 'No',
              'API Prefix': this.options.enableApiPrefix ? 'Enabled' : 'Disabled',
              CORS: !this.options.noCors ? 'Enabled' : 'Disabled',
            };

            // Add delay if set
            if (this.options.delay > 0) {
              settings['Delay'] = `${this.options.delay}ms`;
            }

            // Show the beautiful server banner
            console.log(createServerBanner(this.options.host, this.options.port, settings));
          }
          resolve(server);
        });

        // Handle server close
        server.on('close', () => {
          if (!this.options.quiet) {
            console.log(styles.icons.stop, styles.info('JSON Server has been stopped'));
          }
        });

        // Handle server errors
        server.on('error', (err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const formattedError = formatError('Server Startup Failed', errorMessage);
          console.error(formattedError);
          reject(new Error(`Failed to start server: ${errorMessage}`));
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const formattedError = formatError('Server Error', errorMessage);
        console.error(formattedError);
        reject(new Error(`Failed to start server: ${errorMessage}`));
      }
    });
  }
}
