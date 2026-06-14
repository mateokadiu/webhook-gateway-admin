import { Injectable, computed, inject, signal } from '@angular/core';
import { z } from 'zod';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'wgw.admin.token';
const BASE_KEY = 'wgw.admin.baseOverride';

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly _token = signal<string | null>(this.readToken());
  private readonly _baseOverride = signal<string | null>(this.readBase());

  readonly hasToken = computed(() => !!this._token());
  readonly baseUrl = computed(() => this._baseOverride() ?? environment.apiBase);
  readonly token = this._token.asReadonly();

  setToken(value: string | null) {
    this._token.set(value);
    if (typeof localStorage === 'undefined') return;
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  }

  setBaseOverride(value: string | null) {
    this._baseOverride.set(value);
    if (typeof localStorage === 'undefined') return;
    if (value) localStorage.setItem(BASE_KEY, value);
    else localStorage.removeItem(BASE_KEY);
  }

  private readToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  private readBase(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(BASE_KEY);
  }

  async request<S extends z.ZodTypeAny>(
    method: string,
    path: string,
    opts: { schema?: S; body?: unknown; query?: Record<string, unknown>; signal?: AbortSignal } = {},
  ): Promise<z.infer<S>> {
    const base = this.baseUrl();
    const url = new URL(`${base}${path.startsWith('/') ? '' : '/'}${path}`, location.origin);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v === undefined || v === null || v === '') continue;
        url.searchParams.set(k, String(v));
      }
    }
    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    if (opts.body !== undefined) headers['content-type'] = 'application/json';
    const token = this._token();
    if (token) headers['authorization'] = `Bearer ${token}`;

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    });

    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const data = (await res.json()) as { message?: string; error?: string };
        message = data.message ?? data.error ?? message;
      } catch {
        /* body wasn't JSON */
      }
      throw new ApiError(res.status, message, url.toString());
    }

    if (res.status === 204) return undefined as z.infer<S>;

    const json = await res.json();
    if (opts.schema) return opts.schema.parse(json);
    return json as z.infer<S>;
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly url: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function injectApi(): ApiClient {
  return inject(ApiClient);
}
