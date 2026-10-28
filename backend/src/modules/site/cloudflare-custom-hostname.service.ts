import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CloudflareEnvelope<T> = { success: boolean; errors?: Array<{ message?: string }>; result?: T };
export type CloudflareCustomHostname = {
  id: string;
  hostname: string;
  status?: string;
  ssl?: {
    status?: string;
    validation_errors?: Array<{ message?: string }>;
    validation_records?: Array<{ txt_name?: string; txt_value?: string; cname_name?: string; cname_target?: string }>;
  };
  ownership_verification?: { type?: string; name?: string; value?: string };
};

@Injectable()
export class CloudflareCustomHostnameService {
  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(this.config.get<string>('CLOUDFLARE_API_TOKEN') && this.config.get<string>('CLOUDFLARE_SAAS_ZONE_ID'));
  }

  async create(hostname: string) {
    const existing = await this.request<CloudflareCustomHostname[]>(`?hostname=${encodeURIComponent(hostname)}`);
    if (existing[0]) return existing[0];
    return this.request<CloudflareCustomHostname>('', {
      method: 'POST',
      body: JSON.stringify({ hostname, ssl: { method: 'http', type: 'dv' } }),
    });
  }

  async get(id: string) {
    return this.request<CloudflareCustomHostname>(`/${encodeURIComponent(id)}`);
  }

  async remove(id: string) {
    await this.request<{ id: string }>(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.config.get<string>('CLOUDFLARE_API_TOKEN');
    const zoneId = this.config.get<string>('CLOUDFLARE_SAAS_ZONE_ID');
    if (!token || !zoneId) throw new ServiceUnavailableException('自定义域名服务尚未完成 Cloudflare 配置');
    let response: Response;
    try {
      response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException('Cloudflare 自定义域名服务暂时不可用');
    }
    const body = await response.json().catch(() => ({})) as CloudflareEnvelope<T>;
    if (!response.ok || !body.success || !body.result) {
      const message = body.errors?.map(item => item.message).filter(Boolean).join('; ') || `Cloudflare API HTTP ${response.status}`;
      throw new ServiceUnavailableException(message);
    }
    return body.result;
  }
}
