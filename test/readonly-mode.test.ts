import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createServer } from '../src/lib';
import { ServerOptions } from '../src/types';

describe('Read-Only Mode Tests', () => {
  const testDbPath = path.join(__dirname, 'test-readonly-db.json');
  let server: any;
  let app: any;

  const initialData = {
    posts: [
      { id: '1', title: 'First Post', author: 'John Doe' },
      { id: '2', title: 'Second Post', author: 'Jane Smith' },
    ],
  };

  beforeAll(async () => {
    fs.writeFileSync(testDbPath, JSON.stringify(initialData, null, 2));

    const options: ServerOptions = {
      port: 3457,
      host: 'localhost',
      cors: true,
      static: [],
      middlewares: [],
      bodyParser: true,
      noCors: false,
      noGzip: false,
      delay: 0,
      quiet: true,
      readOnly: true, // Enable read-only mode
      enableApiPrefix: false,
    };

    server = createServer(options);
    server.loadDatabase(testDbPath);
    app = server.getApp();
    
    // Initialize routes by calling start but don't actually listen
    await server.start().then((httpServer: any) => {
      if (httpServer && httpServer.close) {
        httpServer.close();
      }
    }).catch(() => {
      // Ignore port binding errors in tests
    });
  });

  afterAll(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Read-Only Mode Enforcement', () => {
    it('should allow GET requests', async () => {
      const response = await request(app).get('/posts').expect(200);
      expect(response.body).toHaveLength(2);
    });

    it('should allow GET requests for single resources', async () => {
      const response = await request(app).get('/posts/1').expect(200);
      expect(response.body.id).toBe('1');
    });

    it('should block POST requests', async () => {
      const newPost = { title: 'New Post', author: 'Test' };
      const response = await request(app).post('/posts').send(newPost).expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
      expect(response.body.message).toContain('read-only');
    });

    it('should block PUT requests', async () => {
      const updatedPost = { title: 'Updated', author: 'Test' };
      const response = await request(app).put('/posts/1').send(updatedPost).expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
      expect(response.body.message).toContain('read-only');
    });

    it('should block PATCH requests', async () => {
      const partialUpdate = { title: 'Updated' };
      const response = await request(app).patch('/posts/1').send(partialUpdate).expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
      expect(response.body.message).toContain('read-only');
    });

    it('should block DELETE requests', async () => {
      const response = await request(app).delete('/posts/1').expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
      expect(response.body.message).toContain('read-only');
    });

    it('should include method in error response', async () => {
      const response = await request(app).post('/posts').send({}).expect(403);

      expect(response.body).toHaveProperty('method', 'POST');
    });

    it('should include path in error response', async () => {
      const response = await request(app).delete('/posts/1').expect(403);

      expect(response.body).toHaveProperty('path', '/posts/1');
    });

    it('should verify database remains unchanged after blocked write', async () => {
      // Try to create
      await request(app).post('/posts').send({ title: 'New Post' }).expect(403);

      // Verify data is unchanged
      const response = await request(app).get('/posts').expect(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.every((post: any) => initialData.posts.some((p) => p.id === post.id)))
        .toBe(true);
    });
  });
});
