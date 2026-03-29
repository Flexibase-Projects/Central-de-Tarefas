export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function requireString(value: unknown, fieldName: string, options?: { minLength?: number; maxLength?: number }): string {
  const normalized = getTrimmedString(value);
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  if (options?.minLength && normalized.length < options.minLength) {
    throw new Error(`${fieldName} must have at least ${options.minLength} characters`);
  }
  if (options?.maxLength && normalized.length > options.maxLength) {
    throw new Error(`${fieldName} must have at most ${options.maxLength} characters`);
  }
  return normalized;
}

export function optionalString(value: unknown, fieldName: string, options?: { maxLength?: number }): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  const normalized = value.trim();
  if (!normalized) return null;
  if (options?.maxLength && normalized.length > options.maxLength) {
    throw new Error(`${fieldName} must have at most ${options.maxLength} characters`);
  }
  return normalized;
}

export function optionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`);
  }
  return value;
}

export function optionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a number`);
  }
  return parsed;
}

export function requirePositiveInt(value: unknown, fieldName: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return parsed;
}

export function requireArrayOfStrings(value: unknown, fieldName: string, options?: { minLength?: number }): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
  const items = value.map((item) => {
    if (typeof item !== 'string') {
      throw new Error(`${fieldName} items must be strings`);
    }
    const normalized = item.trim();
    if (!normalized) {
      throw new Error(`${fieldName} items cannot be empty`);
    }
    if (options?.minLength && normalized.length < options.minLength) {
      throw new Error(`${fieldName} items must have at least ${options.minLength} characters`);
    }
    return normalized;
  });
  return items;
}

export function requireOneOf<T extends string>(value: unknown, fieldName: string, allowed: readonly T[]): T {
  const normalized = requireString(value, fieldName);
  if (!allowed.includes(normalized as T)) {
    throw new Error(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }
  return normalized as T;
}

export function parseGitHubRepositoryUrl(value: unknown): { owner: string; repo: string } | null {
  const input = getTrimmedString(value);
  if (!input) return null;
  try {
    const url = new URL(input.includes('://') ? input : `https://${input}`);
    if (url.hostname !== 'github.com' && !url.hostname.endsWith('.github.com')) return null;
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return null;
    const owner = segments[0]?.trim();
    const repo = segments[1]?.replace(/\.git$/i, '').trim();
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

export function isValidationError(error: unknown): error is Error {
  return error instanceof Error && / is required$| must /i.test(error.message);
}
