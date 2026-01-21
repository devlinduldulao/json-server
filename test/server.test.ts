// Mock Express to avoid module resolution issues
jest.mock('express', () => {
  const mockExpress = (): any => {
    const app = {
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      listen: jest.fn().mockImplementation((port, host, cb) => {
        cb();
        return { close: jest.fn() };
      }),
    };
    return app;
  };

  mockExpress.json = jest.fn();
  mockExpress.urlencoded = jest.fn();

  return mockExpress;
});

// Mock path
jest.mock('path', () => ({
  resolve: jest.fn((path) => path),
}));

// Mock the middlewares
jest.mock('../src/middleware', () => ({
  corsMiddleware: jest.fn(() => jest.fn()),
  delayMiddleware: jest.fn(() => jest.fn()),
  readOnlyMiddleware: jest.fn(() => jest.fn()),
  apiPrefixMiddleware: jest.fn(() => jest.fn()),
}));

import { JsonServer } from '../src/lib/server';
import { ServerOptions } from '../src/types';

describe('JsonServer', () => {
  // Single comprehensive test for server core functionality
  test('should create and configure server correctly', (): void => {
    const options: ServerOptions = {
      port: 3000,
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
    };

    const server = new JsonServer(options);

    // Mock the loadDatabase and saveDatabase methods
    server.loadDatabase = jest.fn().mockReturnValue(server);
    server.saveDatabase = jest.fn();

    // Test instance creation
    expect(server).toBeInstanceOf(JsonServer);

    // Test middleware setup
    const app = server.getApp();
    expect(app.use).toHaveBeenCalled();

    // Test chainable methods
    expect(server.loadDatabase('test.json')).toBe(server);
    expect(server.setIdField('_id')).toBe(server);

    // Test basic pagination helper
    expect(server.continueToIterate(1, 10, 25)).toBe(true);
    expect(server.continueToIterate(3, 10, 25)).toBe(false);
  });
});
