import {
  create,
  JsonServer,
  createServer,
  ServerOptions,
  CliArgs,
  Database,
  RoutesConfig,
  CustomRoute,
  HttpMethod,
  RouteHandler,
  delayMiddleware,
  corsMiddleware,
  readOnlyMiddleware,
  apiPrefixMiddleware,
  CorsConfig,
  utils,
} from '../src/index';

describe('Main index.ts exports', () => {
  describe('create() factory function', () => {
    it('should create a server with default options', () => {
      const server = create();
      expect(server).toBeInstanceOf(JsonServer);
    });

    it('should create a server with custom port', () => {
      const server = create({ port: 4000 });
      expect(server).toBeInstanceOf(JsonServer);
    });

    it('should create a server with all options', () => {
      const server = create({
        port: 5000,
        host: '127.0.0.1',
        static: ['/public'],
        middlewares: [],
        bodyParser: false,
        noCors: true,
        noGzip: true,
        delay: 1000,
        quiet: true,
        readOnly: true,
        enableApiPrefix: true,
      });
      expect(server).toBeInstanceOf(JsonServer);
    });

    it('should apply defaults when partial options provided', () => {
      const server = create({ port: 8080 });
      expect(server).toBeInstanceOf(JsonServer);
    });

    it('should handle empty options object', () => {
      const server = create({});
      expect(server).toBeInstanceOf(JsonServer);
    });
  });

  describe('Type exports', () => {
    it('should export all types correctly', () => {
      // Verify types are importable (compile-time check, but we verify at runtime too)
      const options: Partial<ServerOptions> = { port: 3000 };
      expect(options.port).toBe(3000);

      const method: HttpMethod = 'GET';
      expect(method).toBe('GET');
    });
  });

  describe('Middleware exports', () => {
    it('should export delayMiddleware', () => {
      expect(typeof delayMiddleware).toBe('function');
      const mw = delayMiddleware(0);
      expect(typeof mw).toBe('function');
    });

    it('should export corsMiddleware', () => {
      expect(typeof corsMiddleware).toBe('function');
      const mw = corsMiddleware(true);
      expect(typeof mw).toBe('function');
    });

    it('should export readOnlyMiddleware', () => {
      expect(typeof readOnlyMiddleware).toBe('function');
      const mw = readOnlyMiddleware(false);
      expect(typeof mw).toBe('function');
    });

    it('should export apiPrefixMiddleware', () => {
      expect(typeof apiPrefixMiddleware).toBe('function');
      const mw = apiPrefixMiddleware(false);
      expect(typeof mw).toBe('function');
    });
  });

  describe('Utility exports', () => {
    it('should export utils module', () => {
      expect(utils).toBeDefined();
      expect(typeof utils.fileExists).toBe('function');
      expect(typeof utils.loadJsonFile).toBe('function');
      expect(typeof utils.saveJsonFile).toBe('function');
      expect(typeof utils.generateId).toBe('function');
      expect(typeof utils.cloneObject).toBe('function');
      expect(typeof utils.getResources).toBe('function');
      expect(typeof utils.getResourceById).toBe('function');
      expect(typeof utils.createResource).toBe('function');
      expect(typeof utils.updateResource).toBe('function');
      expect(typeof utils.deleteResource).toBe('function');
      expect(typeof utils.parseRoutesFile).toBe('function');
    });
  });

  describe('Core exports', () => {
    it('should export JsonServer class', () => {
      expect(JsonServer).toBeDefined();
      expect(typeof JsonServer).toBe('function');
    });

    it('should export createServer factory', () => {
      expect(typeof createServer).toBe('function');
    });
  });
});
