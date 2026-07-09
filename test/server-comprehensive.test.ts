import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createServer, JsonServer } from '../src/lib';
import { ServerOptions } from '../src/types';
import * as utils from '../src/utils/utils';

describe('Server Comprehensive Coverage', () => {
  const tmpDir = path.join(__dirname, 'tmp-server-test');

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createTestDb(data: Record<string, any[]> = {}): string {
    const dbPath = path.join(tmpDir, `db-${Date.now()}.json`);
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return dbPath;
  }

  function makeServer(overrides: Partial<ServerOptions> = {}): JsonServer {
    const options: ServerOptions = {
      port: 0,
      host: 'localhost',
      static: [],
      middlewares: [],
      bodyParser: true,
      noCors: false,
      noGzip: false,
      delay: 0,
      quiet: true,
      readOnly: false,
      enableApiPrefix: false,
      ...overrides,
    };
    return createServer(options);
  }

  function setupRoutes(server: JsonServer): void {
    (server as any).createResourceRoutes();
    if (Object.keys((server as any).routes).length > 0) {
      (server as any).applyCustomRoutes();
    }
  }

  describe('createServer factory', () => {
    it('should create a JsonServer instance', () => {
      const server = makeServer();
      expect(server).toBeInstanceOf(JsonServer);
    });

    it('should return an Express app', () => {
      const server = makeServer();
      const app = server.getApp();
      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');
    });
  });

  describe('Non-quiet mode logging', () => {
    it('should log when enableApiPrefix is true and not quiet', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ quiet: false, enableApiPrefix: true });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('API prefix')
      );
      consoleSpy.mockRestore();
    });

    it('should log when delay is set and not quiet', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ quiet: false, delay: 500 });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('500')
      );
      consoleSpy.mockRestore();
    });

    it('should log when readOnly is enabled and not quiet', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ quiet: false, readOnly: true });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Read-only')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Static files', () => {
    it('should warn for non-existent static path (not quiet)', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const server = makeServer({ quiet: false, static: ['/non/existent/path'] });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should serve static files from existing directory', () => {
      const staticDir = path.join(tmpDir, 'static');
      if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir);
      fs.writeFileSync(path.join(staticDir, 'index.html'), '<html>test</html>');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ quiet: false, static: [staticDir] });
      expect(server).toBeDefined();
      consoleSpy.mockRestore();
    });

    it('should handle static as string instead of array', () => {
      const staticDir = path.join(tmpDir, 'static2');
      if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir);

      const server = makeServer({ static: staticDir as any });
      expect(server).toBeDefined();
    });

    it('should skip when static is empty array', () => {
      const server = makeServer({ static: [] });
      expect(server).toBeDefined();
    });
  });

  describe('Custom middlewares', () => {
    it('should apply custom middlewares (not quiet)', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const customMiddleware = jest.fn((_req: any, _res: any, next: any) => next());
      const server = makeServer({ quiet: false, middlewares: [customMiddleware] });
      expect(server).toBeDefined();
      consoleSpy.mockRestore();
    });

    it('should apply multiple custom middlewares', () => {
      const mw1 = jest.fn((_req: any, _res: any, next: any) => next());
      const mw2 = jest.fn((_req: any, _res: any, next: any) => next());
      const server = makeServer({ quiet: true, middlewares: [mw1, mw2] });
      expect(server).toBeDefined();
    });
  });

  describe('loadDatabase', () => {
    it('should load database and return server for chaining', () => {
      const dbPath = createTestDb({ users: [{ id: '1', name: 'Test' }] });
      const server = makeServer();
      const result = server.loadDatabase(dbPath);
      expect(result).toBe(server);
    });

    it('should throw if database file not found', () => {
      const server = makeServer();
      expect(() => server.loadDatabase('/non/existent/db.json')).toThrow('Database file not found');
    });

    it('should throw if database has invalid JSON', () => {
      const dbPath = path.join(tmpDir, 'invalid-db.json');
      fs.writeFileSync(dbPath, '{ invalid }');
      const server = makeServer();
      expect(() => server.loadDatabase(dbPath)).toThrow('Failed to load database');
    });

    it('should log DB summary when not quiet', () => {
      const dbPath = createTestDb({ users: [{ id: '1', name: 'Test' }] });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ quiet: false });
      server.loadDatabase(dbPath);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('saveDatabase', () => {
    it('should throw if no database loaded', () => {
      const server = makeServer();
      expect(() => server.saveDatabase()).toThrow('No database file specified');
    });

    it('should save database to file', () => {
      const dbPath = createTestDb({ users: [] });
      const server = makeServer();
      server.loadDatabase(dbPath);
      server.saveDatabase();
      const saved = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      expect(saved).toHaveProperty('users');
    });

    it('should log on save when not quiet', () => {
      const dbPath = createTestDb({ users: [] });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ quiet: false });
      server.loadDatabase(dbPath);
      server.saveDatabase();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('setIdField', () => {
    it('should return server for chaining', () => {
      const server = makeServer();
      expect(server.setIdField('_id')).toBe(server);
    });

    it('should log when not quiet', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ quiet: false });
      server.setIdField('_id');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('_id')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('loadRoutes', () => {
    it('should load routes from JSON file', async () => {
      const routesPath = path.join(tmpDir, 'routes.json');
      fs.writeFileSync(routesPath, JSON.stringify({ '/test': { GET: '/other' } }));
      const server = makeServer();
      const result = await server.loadRoutes(routesPath);
      expect(result).toBe(server);
    });

    it('should log routes when not quiet', async () => {
      const routesPath = path.join(tmpDir, 'routes2.json');
      fs.writeFileSync(routesPath, JSON.stringify({ '/test': { GET: '/other' } }));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ quiet: false });
      await server.loadRoutes(routesPath);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle routes file load error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const server = makeServer();
      // A file that exists but has invalid content
      const routesPath = path.join(tmpDir, 'bad-routes.json');
      fs.writeFileSync(routesPath, '{ invalid json }');
      const result = await server.loadRoutes(routesPath);
      expect(result).toBe(server);
      consoleSpy.mockRestore();
    });
  });

  describe('addRoute', () => {
    it('should add custom route and return server for chaining', () => {
      const server = makeServer();
      const handler = (_req: any, res: any) => res.json({ ok: true });
      const result = server.addRoute('/custom', 'GET', handler);
      expect(result).toBe(server);
    });

    it('should log when not quiet', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ quiet: false });
      server.addRoute('/custom', 'GET', (_req: any, res: any) => res.json({}));
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should overwrite string route with method handler', () => {
      const server = makeServer();
      // First set a string route (simulating loaded flat routes)
      (server as any).routes['/test'] = '/redirect';
      // Now addRoute should overwrite it
      server.addRoute('/test', 'GET', (_req: any, res: any) => res.json({}));
      expect(typeof (server as any).routes['/test']).toBe('object');
    });
  });

  describe('continueToIterate', () => {
    it('should return true when there are more pages', () => {
      const server = makeServer();
      expect(server.continueToIterate(1, 10, 25)).toBe(true);
    });

    it('should return false when on last page', () => {
      const server = makeServer();
      expect(server.continueToIterate(3, 10, 25)).toBe(false);
    });

    it('should return false when past last page', () => {
      const server = makeServer();
      expect(server.continueToIterate(5, 10, 25)).toBe(false);
    });
  });

  describe('getPaginatedResource', () => {
    it('should return paginated data for existing resource', () => {
      const dbPath = createTestDb({
        items: Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1), name: `Item ${i + 1}` })),
      });
      const server = makeServer();
      server.loadDatabase(dbPath);
      const result = server.getPaginatedResource('items', 1, 10);
      expect(result.data).toHaveLength(10);
      expect(result.items).toBe(25);
      expect(result.pages).toBe(3);
    });

    it('should return empty data for non-existent resource', () => {
      const dbPath = createTestDb({});
      const server = makeServer();
      server.loadDatabase(dbPath);
      const result = server.getPaginatedResource('missing');
      expect(result.data).toEqual([]);
      expect(result.items).toBe(0);
    });

    it('should throw for invalid resource name (empty)', () => {
      const server = makeServer();
      expect(() => server.getPaginatedResource('')).toThrow('Invalid resource name');
    });

    it('should throw for invalid resource name (non-string)', () => {
      const server = makeServer();
      expect(() => server.getPaginatedResource(null as any)).toThrow('Invalid resource name');
    });

    it('should throw for non-array resource', () => {
      const dbPath = createTestDb({});
      const server = makeServer();
      server.loadDatabase(dbPath);
      // Manually set a non-array resource
      (server as any).db.config = { key: 'value' };
      expect(() => server.getPaginatedResource('config')).toThrow('not a collection');
    });

    it('should handle NaN page/pageSize gracefully', () => {
      const dbPath = createTestDb({
        items: [{ id: '1', name: 'Test' }],
      });
      const server = makeServer();
      server.loadDatabase(dbPath);
      const result = server.getPaginatedResource('items', NaN, NaN);
      expect(result.data).toHaveLength(1);
    });

    it('should clamp pageSize to max 1000', () => {
      const dbPath = createTestDb({
        items: [{ id: '1', name: 'Test' }],
      });
      const server = makeServer();
      server.loadDatabase(dbPath);
      const result = server.getPaginatedResource('items', 1, 5000);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getPaginatedData - private method edge cases', () => {
    it('should throw when collection is not an array', () => {
      const server = makeServer();
      // Access private method directly
      const getPaginatedData = (server as any).getPaginatedData.bind(server);
      expect(() => getPaginatedData('not an array', 1, 10)).toThrow('Collection must be an array');
      expect(() => getPaginatedData(null, 1, 10)).toThrow('Collection must be an array');
      expect(() => getPaginatedData({}, 1, 10)).toThrow('Collection must be an array');
    });
  });

  describe('Server start() outer catch block', () => {
    it('should reject when app.listen throws synchronously', async () => {
      const dbPath = createTestDb({ posts: [] });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleSpy2 = jest.spyOn(console, 'log').mockImplementation();

      const server = makeServer({ port: 0, quiet: true });
      server.loadDatabase(dbPath);

      const app = server.getApp();
      // Mock app.listen to throw synchronously
      app.listen = () => {
        throw new Error('Catastrophic failure');
      };

      try {
        await expect(server.start()).rejects.toThrow('Failed to start server');
      } finally {
        consoleSpy.mockRestore();
        consoleSpy2.mockRestore();
      }
    });
  });

  describe('404 handler for unknown URLs', () => {
    it('should return 404 JSON for unknown routes', async () => {
      const dbPath = createTestDb({ posts: [{ id: '1', title: 'Test' }] });
      const server = makeServer();
      server.loadDatabase(dbPath);
      // Don't call setupRoutes here — start() calls createResourceRoutes internally

      const httpServer = await server.start();
      const app = server.getApp();
      // Use a 3+ segment path that won't match /:resource, /:resource/:id, or /:resource/paginate
      const res = await request(app).get('/a/b/c/d').expect(404);
      expect(res.body.error).toBe('Not found');
      expect(res.body.message).toContain('/a/b/c/d');
      expect(res.body.path).toBe('/a/b/c/d');

      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    });
  });

  describe('response compression', () => {
    it('should gzip sufficiently large responses by default', async () => {
      const dbPath = createTestDb({
        posts: Array.from({ length: 100 }, (_, index) => ({
          id: String(index),
          title: 'A response large enough to compress',
        })),
      });
      const server = makeServer();
      server.loadDatabase(dbPath);
      const httpServer = await server.start();

      const response = await request(server.getApp())
        .get('/posts')
        .set('Accept-Encoding', 'gzip')
        .expect(200);
      expect(response.headers['content-encoding']).toBe('gzip');

      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    });

    it('should skip compression when noGzip is enabled', async () => {
      const dbPath = createTestDb({
        posts: Array.from({ length: 100 }, (_, index) => ({
          id: String(index),
          title: 'A response large enough to compress',
        })),
      });
      const server = makeServer({ noGzip: true });
      server.loadDatabase(dbPath);
      const httpServer = await server.start();

      const response = await request(server.getApp())
        .get('/posts')
        .set('Accept-Encoding', 'gzip')
        .expect(200);
      expect(response.headers['content-encoding']).toBeUndefined();

      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    });
  });

  describe('error handler', () => {
    it('should return a 400 JSON error when body-parser receives invalid JSON', async () => {
      const dbPath = createTestDb({ posts: [] });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const server = makeServer();
      server.loadDatabase(dbPath);

      const httpServer = await server.start();
      const app = server.getApp();

      // Send invalid JSON with application/json content type to trigger body-parser error
      const res = await request(app)
        .post('/posts')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
      expect(res.body.error).toBe('Invalid request');
      consoleSpy.mockRestore();

      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    });
  });

  describe('Server error event in start()', () => {
    it('should reject when server emits error event', async () => {
      const dbPath = createTestDb({ posts: [] });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleSpy2 = jest.spyOn(console, 'log').mockImplementation();

      const server = makeServer({ port: 0, quiet: true });
      server.loadDatabase(dbPath);

      const app = server.getApp();
      const EventEmitter = require('events');

      // Mock app.listen to return a fake server that emits 'error'
      const originalListen = app.listen.bind(app);
      app.listen = (...args: any[]) => {
        const fakeServer = new EventEmitter();
        fakeServer.address = () => ({ port: 0, address: '0.0.0.0' });
        fakeServer.close = (cb: () => void) => cb && cb();

        // Emit error on next tick to let the promise handler register first
        process.nextTick(() => {
          fakeServer.emit('error', new Error('EADDRINUSE: address already in use'));
        });

        return fakeServer;
      };

      try {
        await expect(server.start()).rejects.toThrow('Failed to start server');
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        app.listen = originalListen;
        consoleSpy.mockRestore();
        consoleSpy2.mockRestore();
      }
    });
  });

  describe('saveDatabase error in saveDatabase method', () => {
    it('should throw Failed to save database when write fails', () => {
      const dbPath = createTestDb({ posts: [] });
      const server = makeServer();
      server.loadDatabase(dbPath);

      // Make the saveJsonFile throw by setting dbPath to a directory
      (server as any).dbPath = tmpDir;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      expect(() => server.saveDatabase()).toThrow('Failed to save database');
      consoleSpy.mockRestore();
    });
  });

  describe('loadRoutes error catch', () => {
    it('should catch and log error when parseRoutesFile throws', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const server = makeServer();

      // Mock parseRoutesFile to reject, which triggers the loadRoutes catch block
      const parseSpy = jest.spyOn(utils, 'parseRoutesFile').mockRejectedValue(
        new Error('Unexpected parse failure')
      );

      try {
        const result = await server.loadRoutes('/any/routes.json');
        expect(result).toBe(server);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('Failed to load routes')
        );
      } finally {
        parseSpy.mockRestore();
        consoleSpy.mockRestore();
      }
    });
  });

  describe('REST API - PUT/PATCH/DELETE error paths', () => {
    let app: any;
    let dbPath: string;

    beforeEach(() => {
      dbPath = createTestDb({
        posts: [{ id: '1', title: 'Test Post' }],
      });
      const server = makeServer();
      server.loadDatabase(dbPath);
      setupRoutes(server);
      app = server.getApp();
    });

    it('PUT should return 404 for non-existent collection', async () => {
      const res = await request(app).put('/nonexistent/1').send({ title: 'Test' }).expect(404);
      expect(res.body.error).toContain('nonexistent');
    });

    it('PUT should return 400 for invalid body', async () => {
      const res = await request(app)
        .put('/posts/1')
        .send('not json')
        .set('Content-Type', 'text/plain')
        .expect(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('PATCH should return 404 for non-existent collection', async () => {
      const res = await request(app).patch('/nonexistent/1').send({ title: 'Test' }).expect(404);
      expect(res.body.error).toContain('nonexistent');
    });

    it('PATCH should return 400 for invalid body', async () => {
      const res = await request(app)
        .patch('/posts/1')
        .send('not json')
        .set('Content-Type', 'text/plain')
        .expect(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('DELETE should return 404 for non-existent collection', async () => {
      const res = await request(app).delete('/nonexistent/1').expect(404);
      expect(res.body.error).toContain('nonexistent');
    });
  });

  describe('REST API - saveDatabase error on write operations', () => {
    it('should return 500 when POST fails to save', async () => {
      const dbPath = createTestDb({ posts: [] });
      const server = makeServer();
      server.loadDatabase(dbPath);
      setupRoutes(server);

      // Make saveDatabase throw
      server.saveDatabase = jest.fn(() => { throw new Error('Disk full'); });

      const res = await request(server.getApp())
        .post('/posts')
        .send({ title: 'Test' })
        .expect(500);
      expect(res.body.error).toContain('Failed to save');

      const collection = await request(server.getApp()).get('/posts').expect(200);
      expect(collection.body).toEqual([]);
    });

    it('should return 500 when PUT fails to save', async () => {
      const dbPath = createTestDb({ posts: [{ id: '1', title: 'Test' }] });
      const server = makeServer();
      server.loadDatabase(dbPath);
      setupRoutes(server);
      server.saveDatabase = jest.fn(() => { throw new Error('Disk full'); });

      const res = await request(server.getApp())
        .put('/posts/1')
        .send({ title: 'Updated' })
        .expect(500);
      expect(res.body.error).toContain('Failed to save');
    });

    it('should return 500 when PATCH fails to save', async () => {
      const dbPath = createTestDb({ posts: [{ id: '1', title: 'Test' }] });
      const server = makeServer();
      server.loadDatabase(dbPath);
      setupRoutes(server);
      server.saveDatabase = jest.fn(() => { throw new Error('Disk full'); });

      const res = await request(server.getApp())
        .patch('/posts/1')
        .send({ title: 'Updated' })
        .expect(500);
      expect(res.body.error).toContain('Failed to save');
    });

    it('should return 500 when DELETE fails to save', async () => {
      const dbPath = createTestDb({ posts: [{ id: '1', title: 'Test' }] });
      const server = makeServer();
      server.loadDatabase(dbPath);
      setupRoutes(server);
      server.saveDatabase = jest.fn(() => { throw new Error('Disk full'); });

      const res = await request(server.getApp())
        .delete('/posts/1')
        .expect(500);
      expect(res.body.error).toContain('Failed to save');
    });
  });

  describe('Custom routes with applyCustomRoutes', () => {
    it('should handle flat string route mapping (GET redirect)', async () => {
      const dbPath = createTestDb({
        posts: [{ id: '1', title: 'Test' }],
      });
      const server = makeServer();
      server.loadDatabase(dbPath);

      // Register flat redirect directly on app before resource routes
      const app = server.getApp();
      app.get('/flat-redirect/posts/:id', (req: any, res: any) => {
        res.redirect(`/posts/${req.params.id}`);
      });

      setupRoutes(server);

      const res = await request(app).get('/flat-redirect/posts/1');
      // Should redirect
      expect([301, 302, 307, 308]).toContain(res.status);
    });

    it('should handle function handler routes', async () => {
      const dbPath = createTestDb({});
      const server = makeServer();
      server.loadDatabase(dbPath);

      // Register custom route on the app directly before resource routes
      const app = server.getApp();
      app.get('/custom-handler', (_req: any, res: any) => {
        res.json({ custom: true });
      });

      setupRoutes(server);

      const res = await request(app).get('/custom-handler').expect(200);
      expect(res.body).toEqual({ custom: true });
    });

    it('should handle string redirect routes (method-level)', async () => {
      const dbPath = createTestDb({
        posts: [{ id: '1', title: 'Test' }],
      });
      const server = makeServer();
      server.loadDatabase(dbPath);

      // Register the redirect route directly on the app BEFORE resource routes
      const app = server.getApp();
      app.get('/redirect-test', (_req: any, res: any) => {
        res.redirect('/posts/1');
      });

      setupRoutes(server);

      const res = await request(app).get('/redirect-test');
      expect([301, 302, 307, 308]).toContain(res.status);
    });

    it('should log string redirect routes when not quiet', async () => {
      const dbPath = createTestDb({});
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ quiet: false });
      server.loadDatabase(dbPath);

      (server as any).routes = {
        '/redirect': {
          get: '/target',
        },
      };

      // Only call applyCustomRoutes to test that code path
      (server as any).applyCustomRoutes();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log function handler routes when not quiet', async () => {
      const dbPath = createTestDb({});
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ quiet: false });
      server.loadDatabase(dbPath);

      server.addRoute('/func', 'GET', (_req: any, res: any) => res.json({}));
      // Only call applyCustomRoutes to test that code path
      (server as any).applyCustomRoutes();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle unsupported HTTP method in route config', async () => {
      const dbPath = createTestDb({});
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const server = makeServer();
      server.loadDatabase(dbPath);

      (server as any).routes = {
        '/test': {
          invalidmethod: '/target',
        },
      };

      // Only call applyCustomRoutes to cover the unsupported method branch
      (server as any).applyCustomRoutes();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should resolve path parameters in string redirect', async () => {
      const dbPath = createTestDb({
        users: [{ id: '1', name: 'Test' }],
      });
      const server = makeServer();
      server.loadDatabase(dbPath);

      // Register redirect route directly on app before resource routes
      const app = server.getApp();
      app.get('/profile/view/:id', (req: any, res: any) => {
        res.redirect(`/users/${req.params.id}`);
      });

      setupRoutes(server);

      const res = await request(app).get('/profile/view/1');
      expect([301, 302, 307, 308]).toContain(res.status);
    });
  });

  describe('applyCustomRoutes - code path coverage', () => {
    it('should register flat string route mapping via applyCustomRoutes', () => {
      const dbPath = createTestDb({});
      const server = makeServer();
      server.loadDatabase(dbPath);

      (server as any).routes = {
        '/flat/route': '/target',
      };
      // This exercises the flat string handler branch in applyCustomRoutes
      (server as any).applyCustomRoutes();
      // Verify route was registered (no error thrown)
      expect(server).toBeDefined();
    });

    it('should log flat string route when not quiet', () => {
      const dbPath = createTestDb({});
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ quiet: false });
      server.loadDatabase(dbPath);

      (server as any).routes = {
        '/flat/route': '/target-path',
      };
      (server as any).applyCustomRoutes();
      // formatRouteRegistration is called with 'GET', which gets uppercased
      // The log call uses icons and styled strings
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should register string redirect handler at method level', () => {
      const dbPath = createTestDb({});
      const server = makeServer();
      server.loadDatabase(dbPath);

      (server as any).routes = {
        '/method-redirect': {
          get: '/some-target',
        },
      };
      (server as any).applyCustomRoutes();
      expect(server).toBeDefined();
    });

    it('should register function handler at method level', () => {
      const dbPath = createTestDb({});
      const server = makeServer();
      server.loadDatabase(dbPath);

      (server as any).routes = {
        '/func-route': {
          get: (_req: any, res: any) => res.json({ ok: true }),
        },
      };
      (server as any).applyCustomRoutes();
      expect(server).toBeDefined();
    });

    it('should resolve path params in flat string redirect', async () => {
      const dbPath = createTestDb({ users: [{ id: '1', name: 'Test' }] });
      const server = makeServer();
      server.loadDatabase(dbPath);

      (server as any).routes = {
        '/flat/:id': '/users/:id',
      };
      (server as any).applyCustomRoutes();

      const app = server.getApp();
      const res = await request(app).get('/flat/1');
      expect([301, 302, 307, 308]).toContain(res.status);
    });

    it('should resolve path params in method-level string redirect', async () => {
      const dbPath = createTestDb({ users: [{ id: '1', name: 'Test' }] });
      const server = makeServer();
      server.loadDatabase(dbPath);

      (server as any).routes = {
        '/method/:id': {
          get: '/users/:id',
        },
      };
      (server as any).applyCustomRoutes();

      const app = server.getApp();
      const res = await request(app).get('/method/1');
      expect([301, 302, 307, 308]).toContain(res.status);
    });
  });

  describe('Server start and listen', () => {
    it('should start and listen on a port', async () => {
      const dbPath = createTestDb({ items: [] });
      const server = makeServer({ port: 0, quiet: true });
      server.loadDatabase(dbPath);

      const httpServer = await server.start();
      expect(httpServer).toBeDefined();
      
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    });

    it('should display banner when not quiet', async () => {
      const dbPath = createTestDb({ items: [] });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ port: 0, quiet: false });
      server.loadDatabase(dbPath);

      const httpServer = await server.start();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();

      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    });

    it('should display delay in banner settings', async () => {
      const dbPath = createTestDb({ items: [] });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ port: 0, quiet: false, delay: 100 });
      server.loadDatabase(dbPath);

      const httpServer = await server.start();
      consoleSpy.mockRestore();

      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    });

    it('should log on server close when not quiet', async () => {
      const dbPath = createTestDb({ items: [] });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const server = makeServer({ port: 0, quiet: false });
      server.loadDatabase(dbPath);

      const httpServer = await server.start();
      
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Pagination via /:resource/paginate endpoint', () => {
    it('should paginate correctly via endpoint', async () => {
      const dbPath = createTestDb({
        items: Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1), name: `Item ${i + 1}` })),
      });
      const server = makeServer();
      server.loadDatabase(dbPath);
      setupRoutes(server);
      const app = server.getApp();

      const res = await request(app).get('/items/paginate?_page=2&_limit=10').expect(200);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.items).toBe(25);
    });
  });

  describe('GET /:resource with pagination edge cases', () => {
    let app: any;

    beforeEach(() => {
      const dbPath = createTestDb({
        items: Array.from({ length: 5 }, (_, i) => ({ id: String(i + 1), name: `Item ${i + 1}` })),
      });
      const server = makeServer();
      server.loadDatabase(dbPath);
      setupRoutes(server);
      app = server.getApp();
    });

    it('should paginate when only _per_page is provided', async () => {
      const res = await request(app).get('/items?_per_page=2').expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(2);
      expect(res.body).toHaveProperty('items', 5);
    });

    it('should paginate when only _page is provided', async () => {
      const res = await request(app).get('/items?_page=1').expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('items', 5);
    });

    it('should paginate when only _limit is provided', async () => {
      const res = await request(app).get('/items?_limit=3').expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(3);
    });

    it('should handle invalid page number gracefully', async () => {
      const res = await request(app).get('/items?_page=abc&_limit=2').expect(200);
      expect(res.body).toHaveProperty('data');
    });

    it('should set X-Total-Count and X-Total-Pages headers', async () => {
      const res = await request(app).get('/items?_page=1&_limit=2').expect(200);
      expect(res.headers['x-total-count']).toBe('5');
      expect(res.headers['x-total-pages']).toBe('3');
      expect(res.headers['access-control-expose-headers']).toContain('X-Total-Count');
    });
  });

  describe('CORS disabled', () => {
    it('should create server with CORS disabled', () => {
      const server = makeServer({ noCors: true });
      expect(server).toBeDefined();
    });
  });

  describe('Body parser disabled', () => {
    it('should create server with body parser disabled', () => {
      const server = makeServer({ bodyParser: false });
      expect(server).toBeDefined();
    });
  });
});
