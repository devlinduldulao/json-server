import {
  styles,
  createBox,
  createHeader,
  createServerBanner,
  formatError,
  formatList,
  formatHelp,
  formatDatabaseSummary,
  formatRouteRegistration,
} from '../src/utils/cli-styles';

describe('CLI Styles', () => {
  describe('styles object', () => {
    it('should have color functions', () => {
      expect(typeof styles.primary).toBe('function');
      expect(typeof styles.secondary).toBe('function');
      expect(typeof styles.success).toBe('function');
      expect(typeof styles.info).toBe('function');
      expect(typeof styles.warning).toBe('function');
      expect(typeof styles.error).toBe('function');
      expect(typeof styles.highlight).toBe('function');
      expect(typeof styles.muted).toBe('function');
    });

    it('should have structure element functions', () => {
      expect(typeof styles.header).toBe('function');
      expect(typeof styles.subheader).toBe('function');
      expect(typeof styles.border).toBe('function');
      expect(typeof styles.url).toBe('function');
      expect(typeof styles.label).toBe('function');
      expect(typeof styles.key).toBe('function');
      expect(typeof styles.value).toBe('function');
      expect(typeof styles.command).toBe('function');
      expect(typeof styles.code).toBe('function');
    });

    it('should have icon strings', () => {
      expect(styles.icons.success).toBeDefined();
      expect(styles.icons.error).toBeDefined();
      expect(styles.icons.warning).toBeDefined();
      expect(styles.icons.info).toBeDefined();
      expect(styles.icons.server).toBeDefined();
      expect(styles.icons.api).toBeDefined();
      expect(styles.icons.database).toBeDefined();
      expect(styles.icons.routes).toBeDefined();
      expect(styles.icons.config).toBeDefined();
      expect(styles.icons.watch).toBeDefined();
      expect(styles.icons.time).toBeDefined();
      expect(styles.icons.stop).toBeDefined();
      expect(styles.icons.arrow).toBeDefined();
      expect(styles.icons.star).toBeDefined();
    });

    it('should produce string output from color functions', () => {
      expect(typeof styles.primary('test')).toBe('string');
      expect(typeof styles.error('test')).toBe('string');
      expect(typeof styles.highlight('test')).toBe('string');
    });
  });

  describe('createBox', () => {
    it('should create a box with title and content', () => {
      const result = createBox('Test Title', ['Line 1', 'Line 2']);
      expect(result).toContain('Test Title');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });

    it('should create a box without title', () => {
      const result = createBox(null, ['Content line']);
      expect(result).toContain('Content line');
    });

    it('should handle empty content array', () => {
      const result = createBox('Title', []);
      expect(result).toContain('Title');
    });

    it('should apply default type styling', () => {
      const result = createBox('Default', ['content'], 'default');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should apply success type styling', () => {
      const result = createBox('Success', ['content'], 'success');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should apply error type styling', () => {
      const result = createBox('Error', ['content'], 'error');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should apply warning type styling', () => {
      const result = createBox('Warning', ['content'], 'warning');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle content wider than minimum box width', () => {
      const longContent = 'A'.repeat(100);
      const result = createBox('Title', [longContent]);
      expect(result).toContain(longContent);
    });

    it('should handle title wider than content', () => {
      const longTitle = 'A very long title that exceeds content width';
      const result = createBox(longTitle, ['short']);
      expect(result).toContain(longTitle);
    });
  });

  describe('createHeader', () => {
    it('should return a formatted header string', () => {
      const result = createHeader();
      expect(typeof result).toBe('string');
      expect(result).toContain('json-server');
      expect(result).toContain('TypeScript');
    });
  });

  describe('createServerBanner', () => {
    it('should create server banner with host and port', () => {
      const result = createServerBanner('localhost', 3000);
      expect(result).toContain('localhost');
      expect(result).toContain('3000');
      expect(result).toContain('JSON Server is running');
    });

    it('should include custom options in banner', () => {
      const options = {
        'Read Only': 'Yes',
        'API Prefix': 'Enabled',
        'Delay': '500ms',
      };
      const result = createServerBanner('0.0.0.0', 8080, options);
      expect(result).toContain('0.0.0.0');
      expect(result).toContain('8080');
      expect(result).toContain('Read Only');
      expect(result).toContain('Yes');
    });

    it('should work with empty options', () => {
      const result = createServerBanner('localhost', 3000, {});
      expect(result).toContain('localhost');
    });
  });

  describe('formatError', () => {
    it('should format error with title and message', () => {
      const result = formatError('Error Title', 'Error message');
      expect(result).toContain('Error Title');
      expect(result).toContain('Error message');
    });

    it('should include optional details', () => {
      const result = formatError('Title', 'Message', 'Details here');
      expect(result).toContain('Details here');
    });

    it('should work without details', () => {
      const result = formatError('Title', 'Message');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatList', () => {
    it('should format items with default bullet', () => {
      const result = formatList(['Item 1', 'Item 2', 'Item 3']);
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
      expect(result).toContain('Item 3');
    });

    it('should format items with custom icon', () => {
      const result = formatList(['Item 1', 'Item 2'], '→');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });

    it('should handle empty array', () => {
      const result = formatList([]);
      expect(result).toBe('');
    });
  });

  describe('formatHelp', () => {
    it('should format help sections', () => {
      const sections = {
        'Usage': 'json-server [options] <source>',
        'Options': '--port, -p  Set port',
        'Examples': 'json-server db.json',
      };
      const result = formatHelp(sections);
      expect(result).toContain('Usage');
      expect(result).toContain('Options');
      expect(result).toContain('Examples');
      expect(result).toContain('json-server');
    });

    it('should handle empty sections', () => {
      const result = formatHelp({});
      expect(typeof result).toBe('string');
    });
  });

  describe('formatDatabaseSummary', () => {
    it('should format database summary with path, collections, and items', () => {
      const result = formatDatabaseSummary('/path/to/db.json', 3, 42);
      expect(result).toContain('db.json');
      expect(result).toContain('3');
      expect(result).toContain('42');
      expect(result).toContain('Database loaded');
    });

    it('should handle zero collections and items', () => {
      const result = formatDatabaseSummary('empty.json', 0, 0);
      expect(result).toContain('empty.json');
      expect(result).toContain('0');
    });
  });

  describe('formatRouteRegistration', () => {
    it('should format route registration without target', () => {
      const result = formatRouteRegistration('GET', '/users');
      expect(result).toContain('GET');
      expect(result).toContain('/users');
    });

    it('should format route registration with target', () => {
      const result = formatRouteRegistration('POST', '/api/users', '/users');
      expect(result).toContain('POST');
      expect(result).toContain('/api/users');
      expect(result).toContain('/users');
    });

    it('should uppercase the method', () => {
      const result = formatRouteRegistration('get', '/test');
      expect(result).toContain('GET');
    });
  });
});
