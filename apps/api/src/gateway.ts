/**
 * Thin client for the LiteLLM admin API. The game API is the only holder of the master key.
 */
export interface GatewayModelSpec {
  id: string;
  publicName: string;
  provider: string;
  upstreamModel: string;
  upstreamBaseUrl: string;
  secretRef: string;
  rpm: number;
  tpm: number;
  inputCostPerMtok: number;
  outputCostPerMtok: number;
  contextLimit: number | null;
}

export interface GatewayKeySpec {
  alias: string;
  models: string[];
  maxBudgetUsd: number;
  rpm: number;
  tpm: number;
  expiresAt: Date;
  metadata: Record<string, string>;
}

export interface GatewayKeyInfo {
  spendUsd: number;
  maxBudgetUsd: number | null;
  blocked: boolean;
  expires: string | null;
}

export interface SpendLog {
  requestId: string;
  model: string;
  spendUsd: number;
  promptTokens: number;
  completionTokens: number;
  startTime: string;
  ip: string | null;
}

export class GatewayError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export interface Gateway {
  upsertModel(spec: GatewayModelSpec): Promise<void>;
  deleteModel(id: string): Promise<void>;
  generateKey(spec: GatewayKeySpec): Promise<{ key: string; token: string }>;
  keyInfo(token: string): Promise<GatewayKeyInfo | null>;
  blockKey(token: string): Promise<void>;
  unblockKey(token: string): Promise<void>;
  deleteKey(token: string): Promise<void>;
  deleteKeyByAlias(alias: string): Promise<void>;
  spendLogs(token: string, since: Date): Promise<SpendLog[]>;
  testModel(publicName: string): Promise<{ ok: boolean; latencyMs: number; message: string }>;
  health(): Promise<boolean>;
}

export class LiteLLMGateway implements Gateway {
  constructor(
    private readonly baseUrl: string,
    private readonly masterKey: string,
    private readonly timeoutMs = 15000,
  ) {}

  private async call<T>(method: string, path: string, body?: unknown, allow404 = false): Promise<T | null> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { authorization: `Bearer ${this.masterKey}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (allow404 && (res.status === 404 || res.status === 400)) return null;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new GatewayError(
        `gateway ${method} ${path} failed: ${res.status} ${text.slice(0, 300)}`,
        res.status,
      );
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  async upsertModel(spec: GatewayModelSpec): Promise<void> {
    await this.deleteModel(spec.id);
    await this.call('POST', '/model/new', {
      model_name: spec.publicName,
      litellm_params: {
        model: `${spec.provider}/${spec.upstreamModel}`,
        api_base: spec.upstreamBaseUrl,
        api_key: `os.environ/${spec.secretRef}`,
        rpm: spec.rpm,
        tpm: spec.tpm,
        input_cost_per_token: spec.inputCostPerMtok / 1_000_000,
        output_cost_per_token: spec.outputCostPerMtok / 1_000_000,
        ...(spec.contextLimit ? { max_tokens: spec.contextLimit } : {}),
      },
      model_info: { id: spec.id },
    });
  }

  async deleteModel(id: string): Promise<void> {
    await this.call('POST', '/model/delete', { id }, true);
  }

  async generateKey(spec: GatewayKeySpec): Promise<{ key: string; token: string }> {
    const seconds = Math.max(60, Math.floor((spec.expiresAt.getTime() - Date.now()) / 1000));
    const r = await this.call<{ key: string; token?: string; token_id?: string }>('POST', '/key/generate', {
      key_alias: spec.alias,
      models: spec.models,
      max_budget: spec.maxBudgetUsd,
      rpm_limit: spec.rpm,
      tpm_limit: spec.tpm,
      duration: `${seconds}s`,
      metadata: spec.metadata,
    });
    const token = r?.token ?? r?.token_id;
    if (!r?.key || !token) throw new GatewayError('gateway did not return a key', 502);
    return { key: r.key, token };
  }

  async keyInfo(token: string): Promise<GatewayKeyInfo | null> {
    const r = await this.call<{
      info?: {
        spend?: number;
        max_budget?: number | null;
        blocked?: boolean | null;
        expires?: string | null;
      };
    }>('GET', `/key/info?key=${encodeURIComponent(token)}`, undefined, true);
    if (!r?.info) return null;
    return {
      spendUsd: Number(r.info.spend ?? 0),
      maxBudgetUsd: r.info.max_budget ?? null,
      blocked: Boolean(r.info.blocked),
      expires: r.info.expires ?? null,
    };
  }

  async blockKey(token: string): Promise<void> {
    await this.call('POST', '/key/block', { key: token });
  }

  async unblockKey(token: string): Promise<void> {
    await this.call('POST', '/key/unblock', { key: token });
  }

  async deleteKey(token: string): Promise<void> {
    await this.call('POST', '/key/delete', { keys: [token] }, true);
  }

  async deleteKeyByAlias(alias: string): Promise<void> {
    await this.call('POST', '/key/delete', { key_aliases: [alias] }, true);
  }

  async spendLogs(token: string, since: Date): Promise<SpendLog[]> {
    const start = since.toISOString().slice(0, 10);
    const end = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const r = await this.call<unknown>(
      'GET',
      `/spend/logs?api_key=${encodeURIComponent(token)}&start_date=${start}&end_date=${end}`,
      undefined,
      true,
    );
    if (!Array.isArray(r)) return [];
    return (r as Record<string, unknown>[])
      .filter((row) => typeof row.request_id === 'string')
      .map((row) => {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        return {
          requestId: String(row.request_id),
          model: String(row.model_group || row.model || 'unknown'),
          spendUsd: Number(row.spend ?? 0),
          promptTokens: Number(row.prompt_tokens ?? 0),
          completionTokens: Number(row.completion_tokens ?? 0),
          startTime: String(row.startTime ?? row.start_time ?? ''),
          ip:
            (row.requester_ip_address as string | undefined) ||
            (meta.requester_ip_address as string | undefined) ||
            null,
        };
      });
  }

  async testModel(publicName: string): Promise<{ ok: boolean; latencyMs: number; message: string }> {
    const started = Date.now();
    try {
      await this.call('POST', '/v1/chat/completions', {
        model: publicName,
        messages: [{ role: 'user', content: 'Reply with the single word: pong' }],
        max_tokens: 8,
      });
      return { ok: true, latencyMs: Date.now() - started, message: 'Upstream responded.' };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        message: err instanceof Error ? err.message.slice(0, 300) : 'failed',
      };
    }
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health/liveliness`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}
