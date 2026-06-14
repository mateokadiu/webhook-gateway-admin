import { Injectable, inject } from '@angular/core';
import { z } from 'zod';
import { ApiClient } from './client';
import { TargetSchema, type Target, type TargetCreate } from '../models/schemas';

@Injectable({ providedIn: 'root' })
export class TargetsApi {
  private readonly api = inject(ApiClient);

  list(signal?: AbortSignal): Promise<Target[]> {
    return this.api.request('GET', '/targets', { schema: z.array(TargetSchema), signal });
  }

  get(id: string, signal?: AbortSignal): Promise<Target> {
    return this.api.request('GET', `/targets/${id}`, { schema: TargetSchema, signal });
  }

  create(body: TargetCreate): Promise<Target> {
    return this.api.request('POST', '/targets', { schema: TargetSchema, body });
  }

  update(id: string, body: Partial<TargetCreate>): Promise<Target> {
    return this.api.request('PATCH', `/targets/${id}`, { schema: TargetSchema, body });
  }

  remove(id: string): Promise<void> {
    return this.api.request('DELETE', `/targets/${id}`);
  }
}
