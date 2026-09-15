import Store from 'electron-store';

const store = new Store<{ token?: string; apiBaseUrl?: string }>();

const DEFAULT_API_BASE_URL = 'http://localhost:3100';

export function getApiBaseUrl(): string {
  return store.get('apiBaseUrl', DEFAULT_API_BASE_URL);
}

export function getToken(): string | undefined {
  return store.get('token');
}

export function setToken(token: string): void {
  store.set('token', token);
}

export function clearToken(): void {
  store.delete('token');
}

interface LicenseStatus {
  status: 'none' | 'trial' | 'active' | 'expired';
  allowed: boolean;
}

// Chamado no início do app e antes de liberar cada nova sessão de
// espelhamento (não durante uma sessão já em andamento, pra não cortar o
// usuário no meio do uso por uma falha de rede passageira).
export async function checkLicense(): Promise<LicenseStatus> {
  const token = getToken();
  if (!token) {
    return { status: 'none', allowed: false };
  }

  const res = await fetch(`${getApiBaseUrl()}/license/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    // API fora do ar não deveria travar o app pro sempre — mas também não dá
    // pra liberar de graça. v1: nega e deixa a UI explicar o motivo.
    return { status: 'none', allowed: false };
  }

  return res.json() as Promise<LicenseStatus>;
}
