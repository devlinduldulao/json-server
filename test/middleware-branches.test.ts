import { Request, Response, NextFunction } from 'express';
import {
  corsMiddleware,
  delayMiddleware,
  readOnlyMiddleware,
  apiPrefixMiddleware,
} from '../src/middleware';

describe('Middleware - Branch Coverage', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/test',
      url: '/test',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('corsMiddleware edge cases', () => {
    it('should use default CORS when called with true', () => {
      const mw = corsMiddleware(true);
      expect(typeof mw).toBe('function');
    });

    it('should use default CORS when called without arguments', () => {
      const mw = corsMiddleware();
      expect(typeof mw).toBe('function');
    });

    it('should accept config object with custom origin', () => {
      const mw = corsMiddleware({
        origin: 'http://example.com',
      });
      expect(typeof mw).toBe('function');
    });

    it('should accept config object with custom methods', () => {
      const mw = corsMiddleware({
        methods: ['GET', 'POST'],
      });
      expect(typeof mw).toBe('function');
    });

    it('should accept config object with custom allowedHeaders', () => {
      const mw = corsMiddleware({
        allowedHeaders: ['X-Custom-Header'],
      });
      expect(typeof mw).toBe('function');
    });

    it('should accept config object with credentials false', () => {
      const mw = corsMiddleware({
        credentials: false,
      });
      expect(typeof mw).toBe('function');
    });

    it('should handle config with enabled: true', () => {
      const mw = corsMiddleware({ enabled: true });
      expect(typeof mw).toBe('function');
    });

    it('should pass through when config has enabled: false', () => {
      const mw = corsMiddleware({ enabled: false });
      mw(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('delayMiddleware edge cases', () => {
    it('should pass through with no arguments', () => {
      const mw = delayMiddleware();
      mw(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return connect-pause middleware for positive delay', () => {
      const mw = delayMiddleware(100);
      expect(typeof mw).toBe('function');
      // Don't actually call it as it introduces real delay
    });
  });

  describe('readOnlyMiddleware edge cases', () => {
    it('should pass through with default (false) argument', () => {
      const mw = readOnlyMiddleware();
      mockReq.method = 'POST';
      mw(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow OPTIONS requests even in read-only mode', () => {
      const mw = readOnlyMiddleware(true);
      mockReq.method = 'OPTIONS';
      mw(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should include method and path in 403 response', () => {
      const mw = readOnlyMiddleware(true);
      mockReq.method = 'DELETE';
      Object.defineProperty(mockReq, 'path', { value: '/users/1', writable: true });
      mw(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          path: '/users/1',
        })
      );
    });
  });

  describe('apiPrefixMiddleware edge cases', () => {
    it('should pass through with default argument', () => {
      const mw = apiPrefixMiddleware();
      (mockReq as any).path = '/api/test';
      mockReq.url = '/api/test';
      mw(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.url).toBe('/test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle /api/ root path', () => {
      const mw = apiPrefixMiddleware(true);
      (mockReq as any).path = '/api/';
      mockReq.url = '/api/';
      mw(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.url).toBe('/');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not modify /api path without trailing slash', () => {
      const mw = apiPrefixMiddleware(true);
      (mockReq as any).path = '/api';
      mockReq.url = '/api';
      mw(mockReq as Request, mockRes as Response, mockNext);
      // /api does not start with /api/, so it shouldn't be modified
      expect(mockReq.url).toBe('/api');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not modify /apiVersion path', () => {
      const mw = apiPrefixMiddleware(true);
      (mockReq as any).path = '/apiVersion';
      mockReq.url = '/apiVersion';
      mw(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.url).toBe('/apiVersion');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
