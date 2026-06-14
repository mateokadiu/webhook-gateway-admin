import { Injectable, inject } from '@angular/core';
import { ApiClient } from './client';
import { StatsOverviewSchema, type StatsOverview } from '../models/schemas';

@Injectable({ providedIn: 'root' })
export class StatsApi {
  private readonly api = inject(ApiClient);

  overview(hours = 24, signal?: AbortSignal): Promise<StatsOverview> {
    return this.api.request('GET', '/stats', {
      schema: StatsOverviewSchema,
      query: { hours },
      signal,
    });
  }
}
