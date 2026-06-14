import { Injectable, inject } from '@angular/core';
import { z } from 'zod';
import { ApiClient } from './client';
import { SourceSchema, type Source, type SourceCreate } from '../models/schemas';

@Injectable({ providedIn: 'root' })
export class SourcesApi {
  private readonly api = inject(ApiClient);

  list(signal?: AbortSignal): Promise<Source[]> {
    return this.api.request('GET', '/sources', { schema: z.array(SourceSchema), signal });
  }

  get(slug: string, signal?: AbortSignal): Promise<Source> {
    return this.api.request('GET', `/sources/${slug}`, { schema: SourceSchema, signal });
  }

  create(body: SourceCreate): Promise<Source> {
    return this.api.request('POST', '/sources', { schema: SourceSchema, body });
  }

  update(slug: string, body: Partial<SourceCreate>): Promise<Source> {
    return this.api.request('PATCH', `/sources/${slug}`, { schema: SourceSchema, body });
  }

  remove(slug: string): Promise<void> {
    return this.api.request('DELETE', `/sources/${slug}`);
  }
}
