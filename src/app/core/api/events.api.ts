import { Injectable, inject } from '@angular/core';
import { z } from 'zod';
import { ApiClient } from './client';
import {
  EventDetailSchema,
  EventSchema,
  type EventStatusSchema,
  type Event,
  type EventDetail,
} from '../models/schemas';

export interface EventListQuery {
  sourceId?: string;
  status?: z.infer<typeof EventStatusSchema>;
  q?: string;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class EventsApi {
  private readonly api = inject(ApiClient);

  list(query: EventListQuery, signal?: AbortSignal): Promise<Event[]> {
    return this.api.request('GET', '/events', {
      schema: z.array(EventSchema),
      query: {
        source_id: query.sourceId,
        status: query.status,
        q: query.q,
        limit: query.limit,
      },
      signal,
    });
  }

  get(id: string, signal?: AbortSignal): Promise<EventDetail> {
    return this.api.request('GET', `/events/${id}`, { schema: EventDetailSchema, signal });
  }

  replay(id: string): Promise<{ ok: true }> {
    return this.api.request('POST', `/events/${id}/replay`, {
      schema: z.object({ ok: z.literal(true) }),
    });
  }

  bulkReplay(ids: string[]): Promise<{ scheduled: number }> {
    return this.api.request('POST', '/events/bulk/replay', {
      schema: z.object({ scheduled: z.number().int().nonnegative() }),
      body: { ids },
    });
  }

  bulkTombstone(ids: string[]): Promise<{ tombstoned: number }> {
    return this.api.request('POST', '/events/bulk/tombstone', {
      schema: z.object({ tombstoned: z.number().int().nonnegative() }),
      body: { ids },
    });
  }
}
