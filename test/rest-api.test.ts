import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createServer } from '../src/lib';
import { ServerOptions } from '../src/types';

describe('REST API Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-rest-db.json');
  let server: any;
  let app: any;

  const initialData = {
    posts: [
      { id: '1', title: 'First Post', author: 'John Doe', views: 100 },
      { id: '2', title: 'Second Post', author: 'Jane Smith', views: 200 },
      { id: '3', title: 'Third Post', author: 'John Doe', views: 150 },
    ],
    users: [
      { id: '1', name: 'John Doe', email: 'john@example.com', active: true },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', active: false },
    ],
    comments: [
      { id: '1', postId: '1', text: 'Great post!', author: 'Jane Smith' },
      { id: '2', postId: '1', text: 'Thanks!', author: 'John Doe' },
      { id: '3', postId: '2', text: 'Interesting', author: 'John Doe' },
    ],
  };

  beforeAll(async () => {
    // Create test database
    fs.writeFileSync(testDbPath, JSON.stringify(initialData, null, 2));

    const options: ServerOptions = {
      port: 3456,
      host: 'localhost',
      cors: true,
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
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  beforeEach(() => {
    // Reset database before each test
    fs.writeFileSync(testDbPath, JSON.stringify(initialData, null, 2));
    server.loadDatabase(testDbPath);
  });

  describe('GET /db - Full Database', () => {
    it('should return the entire database', async () => {
      const response = await request(app).get('/db').expect(200);

      expect(response.body).toHaveProperty('posts');
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('comments');
      expect(response.body.posts).toHaveLength(3);
      expect(response.body.users).toHaveLength(2);
    });
  });

  describe('GET /:resource - List Resources', () => {
    it('should return all posts', async () => {
      const response = await request(app).get('/posts').expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toHaveProperty('title');
    });

    it('should return all users', async () => {
      const response = await request(app).get('/users').expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('John Doe');
    });

    it('should return empty array for non-existent resource', async () => {
      const response = await request(app).get('/nonexistent').expect(200);

      expect(response.body).toEqual([]);
    });

    it('should filter posts by author', async () => {
      const response = await request(app).get('/posts?author=John Doe').expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((post: any) => post.author === 'John Doe')).toBe(true);
    });

    it('should filter users by active status', async () => {
      const response = await request(app).get('/users?active=true').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].active).toBe(true);
    });

    it('should filter comments by postId', async () => {
      const response = await request(app).get('/comments?postId=1').expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((comment: any) => comment.postId === '1')).toBe(true);
    });
  });

  describe('GET /:resource/:id - Get Single Resource', () => {
    it('should return a specific post by ID', async () => {
      const response = await request(app).get('/posts/1').expect(200);

      expect(response.body).toHaveProperty('id', '1');
      expect(response.body).toHaveProperty('title', 'First Post');
    });

    it('should return 404 for non-existent post ID', async () => {
      const response = await request(app).get('/posts/999').expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('999');
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app).get('/nonexistent/1').expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('nonexistent');
    });
  });

  describe('POST /:resource - Create Resource', () => {
    it('should create a new post', async () => {
      const newPost = {
        title: 'New Post',
        author: 'Bob Wilson',
        views: 0,
      };

      const response = await request(app).post('/posts').send(newPost).expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('New Post');
      expect(response.body.author).toBe('Bob Wilson');
    });

    it('should create a new user with generated ID', async () => {
      const newUser = {
        name: 'Alice Brown',
        email: 'alice@example.com',
        active: true,
      };

      const response = await request(app).post('/users').send(newUser).expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Alice Brown');
    });

    it('should preserve provided ID when creating', async () => {
      const newPost = {
        id: 'custom-id-123',
        title: 'Post with Custom ID',
        author: 'Test Author',
      };

      const response = await request(app).post('/posts').send(newPost).expect(201);

      expect(response.body.id).toBe('custom-id-123');
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/posts')
        .send('invalid json')
        .set('Content-Type', 'text/plain')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should create new collection if it does not exist', async () => {
      const newItem = {
        name: 'New Collection Item',
      };

      const response = await request(app).post('/newcollection').send(newItem).expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('New Collection Item');
    });
  });

  describe('PUT /:resource/:id - Full Update Resource', () => {
    it('should completely replace a post', async () => {
      const updatedPost = {
        title: 'Completely Updated Post',
        author: 'Updated Author',
        views: 999,
      };

      const response = await request(app).put('/posts/1').send(updatedPost).expect(200);

      expect(response.body.id).toBe('1');
      expect(response.body.title).toBe('Completely Updated Post');
      expect(response.body.author).toBe('Updated Author');
      expect(response.body.views).toBe(999);
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .put('/posts/999')
        .send({ title: 'Test' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should preserve ID during full update', async () => {
      const updatedData = {
        id: 'should-be-ignored',
        title: 'Updated Title',
      };

      const response = await request(app).put('/posts/1').send(updatedData).expect(200);

      expect(response.body.id).toBe('1'); // Original ID should be preserved
    });
  });

  describe('PATCH /:resource/:id - Partial Update Resource', () => {
    it('should partially update a post', async () => {
      const partialUpdate = {
        title: 'Updated Title Only',
      };

      const response = await request(app).patch('/posts/1').send(partialUpdate).expect(200);

      expect(response.body.id).toBe('1');
      expect(response.body.title).toBe('Updated Title Only');
      expect(response.body.author).toBe('John Doe'); // Original value preserved
      expect(response.body.views).toBe(100); // Original value preserved
    });

    it('should update multiple fields partially', async () => {
      const partialUpdate = {
        title: 'New Title',
        views: 500,
      };

      const response = await request(app).patch('/posts/1').send(partialUpdate).expect(200);

      expect(response.body.title).toBe('New Title');
      expect(response.body.views).toBe(500);
      expect(response.body.author).toBe('John Doe'); // Unchanged
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .patch('/posts/999')
        .send({ title: 'Test' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /:resource/:id - Delete Resource', () => {
    it('should delete a post', async () => {
      const response = await request(app).delete('/posts/1').expect(200);

      expect(response.body).toHaveProperty('id', '1');

      // Verify deletion
      const getResponse = await request(app).get('/posts/1').expect(404);
      expect(getResponse.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app).delete('/posts/999').expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return deleted item data', async () => {
      const response = await request(app).delete('/posts/2').expect(200);

      expect(response.body.id).toBe('2');
      expect(response.body.title).toBe('Second Post');
    });
  });

  describe('Pagination', () => {
    it('should paginate results with _page and _limit', async () => {
      const response = await request(app).get('/posts?_page=1&_limit=2').expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      expect(response.body).toHaveProperty('pages');
      expect(response.body).toHaveProperty('items', 3);
    });

    it('should return second page', async () => {
      const response = await request(app).get('/posts?_page=2&_limit=2').expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe('3');
    });

    it('should use _per_page as alias for _limit', async () => {
      const response = await request(app).get('/posts?_page=1&_per_page=2').expect(200);

      expect(response.body.data).toHaveLength(2);
    });

    it('should include pagination metadata', async () => {
      const response = await request(app).get('/posts?_page=2&_limit=1').expect(200);

      expect(response.body).toHaveProperty('first', 1);
      expect(response.body).toHaveProperty('prev', 1);
      expect(response.body).toHaveProperty('next', 3);
      expect(response.body).toHaveProperty('last', 3);
      expect(response.body).toHaveProperty('pages', 3);
      expect(response.body).toHaveProperty('items', 3);
    });

    it('should set pagination headers', async () => {
      const response = await request(app).get('/posts?_page=1&_limit=2').expect(200);

      expect(response.headers['x-total-count']).toBe('3');
      expect(response.headers['x-total-pages']).toBe('2');
    });

    it('should handle pagination endpoint /resource/paginate', async () => {
      const response = await request(app).get('/posts/paginate?_page=1&_limit=2').expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      expect(response.body).toHaveProperty('pages');
    });

    it('should combine filtering with pagination', async () => {
      const response = await request(app)
        .get('/posts?author=John Doe&_page=1&_limit=1')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.items).toBe(2); // Total matching filtered items
      expect(response.body.data[0].author).toBe('John Doe');
    });
  });

  describe('Error Handling', () => {
    it('should return empty array for truly non-existent resource', async () => {
      // Accessing a non-existent resource returns empty array, not 404
      const response = await request(app).get('/truly-invalid-route-123').expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle malformed JSON in POST', async () => {
      const response = await request(app)
        .post('/posts')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json')
        .expect(500); // Body parser throws 500 for invalid JSON

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON in PUT', async () => {
      const response = await request(app)
        .put('/posts/1')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json')
        .expect(500); // Body parser throws 500 for invalid JSON

      expect(response.body).toHaveProperty('error');
    });
  });
});
