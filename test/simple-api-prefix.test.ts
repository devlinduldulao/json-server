import request from 'supertest';
import path from 'path';
import { JsonServer } from '../src/lib/server';
import { ServerOptions } from '../src/types';

describe('Simple API Prefix Test', () => {
  let server: JsonServer;
  let app: any;

  beforeAll(async () => {
    // Create server with API prefix enabled
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
      enableApiPrefix: true, // Enable API prefix
    };

    server = new JsonServer(options);

    // Load test database
    const testDbPath = path.join(__dirname, '../test-db.json');
    server.loadDatabase(testDbPath);

    // Set up routes
    (server as any).createResourceRoutes();

    app = server.getApp();
  });

  test('should work with standard routes', async () => {
    const response = await request(app).get('/posts').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('title');
  });

  test('should work with API prefix routes', async () => {
    const response = await request(app).get('/api/posts').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('title');
  });

  test('should return same data for both routes', async () => {
    const standardResponse = await request(app).get('/posts').expect(200);

    const apiResponse = await request(app).get('/api/posts').expect(200);

    expect(standardResponse.body).toEqual(apiResponse.body);
  });

  test('should work with single item routes', async () => {
    const standardResponse = await request(app).get('/posts/1').expect(200);

    const apiResponse = await request(app).get('/api/posts/1').expect(200);

    expect(standardResponse.body).toEqual(apiResponse.body);
    expect(standardResponse.body).toHaveProperty('id', '1');
  });

  test('should work with database endpoint', async () => {
    const standardResponse = await request(app).get('/db').expect(200);

    const apiResponse = await request(app).get('/api/db').expect(200);

    expect(standardResponse.body).toEqual(apiResponse.body);
    expect(standardResponse.body).toHaveProperty('users');
    expect(standardResponse.body).toHaveProperty('posts');
    expect(standardResponse.body).toHaveProperty('comments');
  });

  test('should work with POST requests', async () => {
    const newPost = {
      title: 'Test Post',
      userId: '1',
      content: 'This is a test post',
    };

    const response = await request(app).post('/api/posts').send(newPost).expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('title', 'Test Post');
    expect(response.body).toHaveProperty('userId', '1');
    expect(response.body).toHaveProperty('content', 'This is a test post');
  });
});
