import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { Database } from '../types';

/**
 * Check if a file exists at the specified path
 *
 * @param filePath - Path to the file to check
 * @returns boolean indicating if the file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`Error checking if file exists: ${filePath}`, error);
    return false;
  }
}

/**
 * Load and parse JSON data from a file
 *
 * @param filePath - Path to the JSON file to load
 * @returns Parsed JSON object or empty object if file doesn't exist/can't be parsed
 * @throws Error if the file exists but isn't valid JSON
 */
export function loadJsonFile(filePath: string): Record<string, any> {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path provided');
  }

  if (!fileExists(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    const data = fs.readFileSync(filePath, 'utf8');

    if (!data || data.trim() === '') {
      console.warn(`Warning: Empty JSON file: ${filePath}`);
      return {};
    }

    try {
      const parsed = JSON.parse(data);
      
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('JSON content must be an object');
      }

      return parsed;
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(`Invalid JSON in file ${filePath}: ${errorMessage}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid JSON')) {
      throw error;
    }
    console.error(`Error loading JSON file: ${filePath}`, error);
    throw error;
  }
}

/**
 * Save JSON data to a file with pretty formatting
 *
 * @param filePath - Path to save the JSON file
 * @param data - Data to save as JSON
 * @throws Error if the file can't be written
 */
export function saveJsonFile(filePath: string, data: unknown): void {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf8');
  } catch (error) {
    console.error(`Error saving JSON file: ${filePath}`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to write to ${filePath}: ${errorMessage}`);
  }
}

/**
 * Generate a unique ID string
 *
 * @returns A unique string ID
 */
export function generateId(): string {
  // nanoid produces a more secure, collision-resistant ID than simple random strings
  return nanoid(10);
}

/**
 * Create a deep copy of an object
 *
 * @param obj - Object to clone
 * @returns Deep copy of the input object
 */
export function cloneObject<T>(obj: T): T {
  // JSON parse/stringify is a simple way to create deep copies
  // but doesn't handle all JS types (functions, undefined, etc.)
  // For most data objects used in JSON server, this is sufficient
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Find all resources for a specific collection
 *
 * @param db - Database object
 * @param name - Collection name
 * @returns Array of resources or empty array if collection doesn't exist
 */
export function getResources(db: Database, name: string): Array<Record<string, any>> {
  if (!db[name]) {
    return [];
  }

  return db[name];
}

/**
 * Find a resource by ID in a specific collection
 *
 * @param db - Database object
 * @param name - Collection name
 * @param id - Resource ID to find
 * @param idField - Field name to use as ID (default: 'id')
 * @returns Resource object if found, undefined otherwise
 */
export function getResourceById(
  db: Database,
  name: string,
  id: string,
  idField: string = 'id'
): Record<string, any> | undefined {
  const resources = getResources(db, name);

  // Normalize IDs to strings for comparison
  return resources.find((item) => String(item[idField]) === String(id));
}

/**
 * Create a new resource in a collection
 *
 * @param db - Database object
 * @param name - Collection name
 * @param data - Resource data
 * @param idField - Field name to use as ID (default: 'id')
 * @returns The created resource with generated ID
 * @throws Error if invalid parameters are provided
 */
export function createResource(
  db: Database,
  name: string,
  data: Record<string, any>,
  idField: string = 'id'
): Record<string, any> {
  if (!db || typeof db !== 'object') {
    throw new Error('Invalid database object');
  }

  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error('Invalid collection name');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid resource data: must be an object');
  }

  // Create collection if it doesn't exist
  if (!db[name]) {
    db[name] = [];
  }

  const newResource = { ...data };

  // Generate ID if not provided
  if (!newResource[idField]) {
    newResource[idField] = generateId();
  }

  db[name].push(newResource);
  return newResource;
}

/**
 * Update an existing resource
 *
 * @param db - Database object
 * @param name - Collection name
 * @param id - Resource ID to update
 * @param data - Updated data (will be merged with existing resource)
 * @param idField - Field name to use as ID (default: 'id')
 * @returns Updated resource or undefined if resource not found
 * @throws Error if invalid parameters are provided
 */
export function updateResource(
  db: Database,
  name: string,
  id: string,
  data: Record<string, any>,
  idField: string = 'id'
): Record<string, any> | undefined {
  if (!db || typeof db !== 'object') {
    throw new Error('Invalid database object');
  }

  if (!name || typeof name !== 'string') {
    throw new Error('Invalid collection name');
  }

  if (id === undefined || id === null) {
    throw new Error('Invalid resource ID');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid update data: must be an object');
  }

  const resources = getResources(db, name);
  const index = resources.findIndex((item) => String(item[idField]) === String(id));

  if (index === -1) {
    return undefined;
  }

  // Create a merged resource, ensuring ID doesn't change
  const updatedResource = { ...resources[index], ...data };
  updatedResource[idField] = resources[index][idField];

  db[name][index] = updatedResource;
  return updatedResource;
}

/**
 * Delete a resource from a collection
 *
 * @param db - Database object
 * @param name - Collection name
 * @param id - Resource ID to delete
 * @param idField - Field name to use as ID (default: 'id')
 * @returns boolean indicating success of the operation
 * @throws Error if invalid parameters are provided
 */
export function deleteResource(
  db: Database,
  name: string,
  id: string,
  idField: string = 'id'
): boolean {
  if (!db || typeof db !== 'object') {
    throw new Error('Invalid database object');
  }

  if (!name || typeof name !== 'string') {
    throw new Error('Invalid collection name');
  }

  if (id === undefined || id === null) {
    throw new Error('Invalid resource ID');
  }

  const resources = getResources(db, name);
  const index = resources.findIndex((item) => String(item[idField]) === String(id));

  if (index === -1) {
    return false;
  }

  db[name].splice(index, 1);
  return true;
}

/**
 * Parse routes configuration from a JSON or JS file
 *
 * @param routesPath - Path to routes configuration file
 * @returns Routes configuration object or empty object if file can't be parsed
 */
export async function parseRoutesFile(routesPath: string): Promise<Record<string, any>> {
  if (!fileExists(routesPath)) {
    console.error(`Routes file not found: ${routesPath}`);
    return {};
  }

  try {
    if (routesPath.endsWith('.json')) {
      return loadJsonFile(routesPath);
    } else if (routesPath.endsWith('.js')) {
      try {
        const module = await import(path.resolve(routesPath));
        return module.default || module;
      } catch (importError) {
        const errorMessage =
          importError instanceof Error ? importError.message : String(importError);
        throw new Error(`Error importing routes file: ${errorMessage}`);
      }
    } else {
      throw new Error(`Unsupported routes file format: ${routesPath}`);
    }
  } catch (error) {
    console.error(`Error parsing routes file: ${routesPath}`, error);
    return {};
  }
}
