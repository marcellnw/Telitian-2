/**
 * Safe Error and Message Utility Helper
 * 
 * Prevents React Error #31 ("Objects are not valid as a React child")
 * by ensuring that any error, message, response, or API return object
 * is reliably converted to a clean string before being rendered into JSX
 * or passed into state/toasts.
 */

/**
 * Extracts a safe string message from any error or object.
 * Guarantees that an object is NEVER returned.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Terjadi kesalahan yang tidak diketahui.'
): string {
  if (error === null || error === undefined) {
    return fallback;
  }

  // If already a string
  if (typeof error === 'string') {
    const trimmed = error.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  // If standard JS Error instance
  if (error instanceof Error) {
    if (typeof error.message === 'string' && error.message.trim().length > 0) {
      return error.message.trim();
    }
    return fallback;
  }

  // If an object
  if (typeof error === 'object') {
    const errObj = error as Record<string, any>;

    // 1. Direct string message property: { message: "..." }
    if (typeof errObj.message === 'string' && errObj.message.trim().length > 0) {
      return errObj.message.trim();
    }

    // 2. Direct string error property: { error: "..." }
    if (typeof errObj.error === 'string' && errObj.error.trim().length > 0) {
      return errObj.error.trim();
    }

    // 3. Nested object error: { error: { message: "..." } } (Standard Google Cloud / GAS / Firebase format)
    if (
      errObj.error &&
      typeof errObj.error === 'object' &&
      typeof errObj.error.message === 'string' &&
      errObj.error.message.trim().length > 0
    ) {
      return errObj.error.message.trim();
    }

    // 4. Nested object message: { message: { message: "..." } }
    if (
      errObj.message &&
      typeof errObj.message === 'object' &&
      typeof errObj.message.message === 'string' &&
      errObj.message.message.trim().length > 0
    ) {
      return errObj.message.message.trim();
    }

    // 5. Code with message or code alone: { code: "...", message: ... }
    if (typeof errObj.code === 'string' && errObj.code.trim().length > 0) {
      const subMsg =
        typeof errObj.message === 'string' && errObj.message.trim().length > 0
          ? errObj.message.trim()
          : typeof errObj.error === 'string' && errObj.error.trim().length > 0
          ? errObj.error.trim()
          : '';
      return subMsg ? `[${errObj.code}] ${subMsg}` : `Error: ${errObj.code}`;
    }

    // 6. statusText from Response
    if (typeof errObj.statusText === 'string' && errObj.statusText.trim().length > 0) {
      return errObj.statusText.trim();
    }

    // 7. Details field
    if (typeof errObj.details === 'string' && errObj.details.trim().length > 0) {
      return errObj.details.trim();
    }

    // 8. Stringify fallback if meaningful JSON
    try {
      const jsonStr = JSON.stringify(error);
      if (jsonStr && jsonStr !== '{}' && jsonStr !== '[]') {
        // Truncate if excessively long
        return jsonStr.length > 200 ? jsonStr.slice(0, 200) + '...' : jsonStr;
      }
    } catch (_) {
      // Fallback
    }

    return fallback;
  }

  // Numbers, booleans, or other primitives
  try {
    return String(error);
  } catch (_) {
    return fallback;
  }
}

/**
 * Safe JSON parser for localStorage and API responses.
 * Prevents throwing SyntaxError and returns fallback gracefully.
 */
export function safeParseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value || typeof value !== 'string') {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('[safeParseJSON Error]', error);
    return fallback;
  }
}

/**
 * Standard API request wrapper that validates JSON and throws standard readable errors
 */
export async function safeRequestApi<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, options);

    let result: any = null;
    const text = await response.text();
    try {
      result = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(
        `Respons server (${response.status}) bukan JSON yang valid: ${text.slice(0, 100)}`
      );
    }

    if (!response.ok) {
      const msg = getErrorMessage(
        result,
        `Request gagal dengan status HTTP ${response.status}`
      );
      throw new Error(msg);
    }

    if (result && typeof result === 'object' && result.success === false) {
      const msg = getErrorMessage(result, 'Operasi database gagal.');
      throw new Error(msg);
    }

    return result as T;
  } catch (error) {
    console.error('[safeRequestApi Error]', {
      url,
      message: getErrorMessage(error),
      originalError: error,
    });
    throw error;
  }
}
