import { Injectable, inject } from '@angular/core';
import { z } from 'zod';
import { ApiClient } from './client';
import { DeliverySchema, DeliveryStatusSchema, type Delivery } from '../models/schemas';

export interface DeliveryListQuery {
  eventId?: string;
  targetId?: string;
  status?: z.infer<typeof DeliveryStatusSchema>;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class DeliveriesApi {
  private readonly api = inject(ApiClient);

  list(query: DeliveryListQuery, signal?: AbortSignal): Promise<Delivery[]> {
    return this.api.request('GET', '/deliveries', {
      schema: z.array(DeliverySchema),
      query: {
        event_id: query.eventId,
        target_id: query.targetId,
        status: query.status,
        limit: query.limit,
      },
      signal,
    });
  }

  get(id: string, signal?: AbortSignal): Promise<Delivery> {
    return this.api.request('GET', `/deliveries/${id}`, { schema: DeliverySchema, signal });
  }

  retry(id: string): Promise<{ ok: true }> {
    return this.api.request('POST', `/deliveries/${id}/retry`, {
      schema: z.object({ ok: z.literal(true) }),
    });
  }
}
