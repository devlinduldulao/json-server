// filepath: /Users/devlinduldulao/Downloads/json-server/test/pagination.test.ts
import { JsonServer } from '../src/lib/server';
import { ServerOptions } from '../src/types';
import request from 'supertest';
import express from 'express';

// Mock the file utilities
jest.mock('../src/utils/utils', () => ({
  fileExists: jest.fn(() => true),
  loadJsonFile: jest.fn(() => ({
    // Create 30 test posts
    posts: Array.from({ length: 30 }, (_, i) => ({
      id: String(i + 1),
      title: `Post ${i + 1}`,
      authorId: Math.floor(i / 10) + 1,
    })),
    // Empty collection
    emptyCollection: [],
  })),
  saveJsonFile: jest.fn(),
  parseRoutesFile: jest.fn(),
}));

describe('Pagination Tests', () => {
  let server: JsonServer;
  let app: express.Express;

  beforeEach((): void => {
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

    // Create a server instance for testing
    server = new JsonServer(options);
    server.loadDatabase('test-db.json');
    app = server.getApp();

    // Setup routes without starting the server
    const originalStart = server.start;
    server.start = jest.fn().mockImplementation((): Promise<void> => {
      (server as any).createResourceRoutes();
      (server as any).applyCustomRoutes();
      return Promise.resolve();
    });
    server.start();
    server.start = originalStart;
  });

  // Core pagination test - covers the most important functionality
  test('should paginate data with correct structure and values', async (): Promise<void> => {
    const response = await request(app).get('/posts?_page=2&_per_page=10').expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveLength(10);
    expect(response.body.data[0].id).toBe('11');
    expect(response.body).toHaveProperty('first', 1);
    expect(response.body).toHaveProperty('prev', 1);
    expect(response.body).toHaveProperty('next', 3);
    expect(response.body).toHaveProperty('pages', 3);
    expect(response.body).toHaveProperty('items', 30);
  });

  // Edge case - empty collection
  test('should handle empty collections', async (): Promise<void> => {
    const response = await request(app).get('/emptyCollection?_page=1&_per_page=10').expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveLength(0);
    expect(response.body).toHaveProperty('pages', 1);
    expect(response.body).toHaveProperty('items', 0);
  });

  // Advanced feature - filtering with pagination
  test('should apply filters before pagination', async (): Promise<void> => {
    const response = await request(app).get('/posts?authorId=1&_page=1&_per_page=5').expect(200);

    // Should only include posts with authorId=1
    expect(
      response.body.data.every((post: { authorId: number }): boolean => post.authorId === 1)
    ).toBe(true);
  });
});
