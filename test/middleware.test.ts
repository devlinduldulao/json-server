import { Request, Response, NextFunction } from 'express';
import {
  corsMiddleware,
  delayMiddleware,
  readOnlyMiddleware,
  apiPrefixMiddleware,
} from '../src/middleware';

describe('Middleware Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/users',
      url: '/users',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('corsMiddleware', () => {
    it('should pass through when CORS is disabled', () => {
      const middleware = corsMiddleware(false);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle CORS configuration object with enabled: false', () => {
      const middleware = corsMiddleware({ enabled: false });
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should enable CORS by default', () => {
      const middleware = corsMiddleware(true);
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should accept custom CORS configuration', () => {
      const middleware = corsMiddleware({
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      });
      expect(middleware).toBeDefined();
    });
  });

  describe('delayMiddleware', () => {
    it('should pass through immediately when delay is 0', () => {
      const middleware = delayMiddleware(0);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass through immediately when delay is negative', () => {
      const middleware = delayMiddleware(-100);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return middleware function for positive delay', () => {
      const middleware = delayMiddleware(500);
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('readOnlyMiddleware', () => {
    it('should allow GET requests when read-only is enabled', () => {
      const middleware = readOnlyMiddleware(true);
      mockReq.method = 'GET';
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block POST requests when read-only is enabled', () => {
      const middleware = readOnlyMiddleware(true);
      mockReq.method = 'POST';
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          message: expect.stringContaining('read-only'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block PUT requests when read-only is enabled', () => {
      const middleware = readOnlyMiddleware(true);
      mockReq.method = 'PUT';
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block PATCH requests when read-only is enabled', () => {
      const middleware = readOnlyMiddleware(true);
      mockReq.method = 'PATCH';
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block DELETE requests when read-only is enabled', () => {
      const middleware = readOnlyMiddleware(true);
      mockReq.method = 'DELETE';
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow all methods when read-only is disabled', () => {
      const middleware = readOnlyMiddleware(false);
      
      ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) => {
        mockReq.method = method;
        mockNext = jest.fn();
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('apiPrefixMiddleware', () => {
    it('should strip /api prefix from URL', () => {
      const middleware = apiPrefixMiddleware(true);
      (mockReq as any).path = '/api/users';
      mockReq.url = '/api/users';
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.url).toBe('/users');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle /api prefix with query parameters', () => {
      const middleware = apiPrefixMiddleware(true);
      (mockReq as any).path = '/api/users';
      mockReq.url = '/api/users?page=1&limit=10';
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.url).toBe('/users?page=1&limit=10');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not modify non-API prefixed URLs', () => {
      const middleware = apiPrefixMiddleware(true);
      (mockReq as any).path = '/users';
      mockReq.url = '/users';
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.url).toBe('/users');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass through when API prefix is disabled', () => {
      const middleware = apiPrefixMiddleware(false);
      (mockReq as any).path = '/api/users';
      mockReq.url = '/api/users';
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.url).toBe('/api/users'); // Should not be modified
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle nested /api routes', () => {
      const middleware = apiPrefixMiddleware(true);
      (mockReq as any).path = '/api/users/123/posts';
      mockReq.url = '/api/users/123/posts';
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.url).toBe('/users/123/posts');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
