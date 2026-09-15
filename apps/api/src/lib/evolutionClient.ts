import { env } from './env';

// Cliente fino para a Evolution API compartilhada do ZapScript (mesmo
// servidor Vultr). O ZapMirror é um "tenant" a mais nessa Evolution, isolado
// por nome de instância — não é dono do servidor nem tem acesso a instâncias
// de outros produtos. Payloads seguem a API pública da Evolution
// (https://doc.evolution-api.com) — ajustar campos aqui se a versão rodando
// no servidor divergir.

interface CreateInstanceResult {
  instanceName: string;
  apiKey: string;
  qrCode?: string;
}

async function evolutionFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${env.EVOLUTION_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: env.EVOLUTION_API_KEY,
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Evolution API ${path} respondeu ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export function instanceNameFor(userId: string): string {
  return `${env.EVOLUTION_INSTANCE_PREFIX}${userId}`;
}

export async function createEvolutionInstance(userId: string): Promise<CreateInstanceResult> {
  const instanceName = instanceNameFor(userId);

  return evolutionFetch<CreateInstanceResult>('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }),
  });
}

export async function getConnectionState(instanceName: string) {
  return evolutionFetch<{ instance: { state: string } }>(
    `/instance/connectionState/${instanceName}`,
  );
}

export async function fetchQrCode(instanceName: string) {
  return evolutionFetch<{ base64?: string }>(`/instance/connect/${instanceName}`);
}

export async function deleteEvolutionInstance(instanceName: string) {
  return evolutionFetch<{ status: string }>(`/instance/delete/${instanceName}`, {
    method: 'DELETE',
  });
}
