const STORAGE_KEY_ADMIN = 'telitian_admin_key';

export function getAdminToken(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ADMIN) || '';
  } catch (e) {
    return '';
  }
}

export function setAdminToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN, token.trim());
  } catch (e) {
    // Ignored
  }
}

export function clearAdminToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_ADMIN);
  } catch (e) {
    // Ignored
  }
}

export function getAdminHeaders(): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) {
    headers['x-admin-password'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
