import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental';
import { DeliveriesApi } from '../../core/api/deliveries.api';
import { TargetsApi } from '../../core/api/targets.api';
import { StatusBadgeComponent } from '../../core/ui/status-badge.component';
import { RelativeTimePipe } from '../../core/ui/relative-time.pipe';
import { SkeletonComponent } from '../../core/ui/skeleton.component';
import { EmptyStateComponent } from '../../core/ui/empty-state.component';
import type { DeliveryStatus } from '../../core/models/schemas';

const DELIVERY_STATUSES: DeliveryStatus[] = ['pending', 'retrying', 'ok', 'failed', 'dead'];

@Component({
  selector: 'wgw-deliveries-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StatusBadgeComponent,
    RelativeTimePipe,
    SkeletonComponent,
    EmptyStateComponent,
  ],
  template: `
    <section class="mx-auto max-w-7xl space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="font-mono text-2xl font-semibold tracking-tight">Deliveries</h1>
          <p class="mt-1 text-sm text-muted">{{ deliveries.data()?.length ?? 0 }} loaded</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <select
            class="rounded border border-border bg-card px-2 py-1.5 font-mono text-xs"
            [ngModel]="status()"
            (ngModelChange)="status.set($event)"
          >
            <option [ngValue]="undefined">any status</option>
            @for (s of statuses; track s) {
              <option [ngValue]="s">{{ s }}</option>
            }
          </select>
          <select
            class="rounded border border-border bg-card px-2 py-1.5 font-mono text-xs"
            [ngModel]="targetId()"
            (ngModelChange)="targetId.set($event)"
          >
            <option [ngValue]="undefined">any target</option>
            @for (t of targets.data() ?? []; track t.id) {
              <option [ngValue]="t.id">{{ t.label }}</option>
            }
          </select>
        </div>
      </header>

      @if (deliveries.isPending()) {
        <div class="space-y-2">
          @for (i of [0, 1, 2, 3, 4, 5]; track i) {
            <wgw-skeleton height="2.5rem" />
          }
        </div>
      } @else if (deliveries.isError()) {
        <wgw-empty-state title="failed to load deliveries" [description]="errorMessage()" />
      } @else if ((deliveries.data() ?? []).length === 0) {
        <wgw-empty-state title="no deliveries match" description="Try clearing filters." />
      } @else {
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <table class="w-full text-sm">
            <thead
              class="bg-card-hover/40 text-left text-[11px] uppercase tracking-wider text-muted"
            >
              <tr>
                <th class="px-3 py-2 font-mono">id</th>
                <th class="px-3 py-2 font-mono">event</th>
                <th class="px-3 py-2 font-mono">target</th>
                <th class="px-3 py-2 font-mono">status</th>
                <th class="px-3 py-2 font-mono">attempt</th>
                <th class="px-3 py-2 font-mono">last code</th>
                <th class="px-3 py-2 font-mono">next attempt</th>
                <th class="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              @for (d of deliveries.data() ?? []; track d.id) {
                <tr class="border-t border-border/40 hover:bg-card-hover/40">
                  <td class="px-3 py-2 font-mono text-xs">{{ d.id.slice(0, 8) }}</td>
                  <td class="px-3 py-2 font-mono text-xs">
                    <a [routerLink]="['/events', d.eventId]" class="hover:text-accent">{{
                      d.eventId.slice(0, 8)
                    }}</a>
                  </td>
                  <td class="px-3 py-2 font-mono text-xs">{{ targetLabelFor(d.targetId) }}</td>
                  <td class="px-3 py-2">
                    <wgw-status-badge [value]="d.status" variant="delivery" />
                  </td>
                  <td class="px-3 py-2 font-mono text-xs tabular-nums">{{ d.attempt }}</td>
                  <td class="px-3 py-2 font-mono text-xs tabular-nums">
                    {{ d.lastStatusCode ?? '—' }}
                  </td>
                  <td class="px-3 py-2 font-mono text-xs text-muted">
                    {{ d.nextAttemptAt | relativeTime }}
                  </td>
                  <td class="px-3 py-2 text-right">
                    @if (d.status === 'failed' || d.status === 'dead' || d.status === 'retrying') {
                      <button
                        type="button"
                        class="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider hover:bg-card-hover"
                        (click)="retry.mutate(d.id)"
                      >
                        retry
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class DeliveriesListComponent {
  private readonly api = inject(DeliveriesApi);
  private readonly targetsApi = inject(TargetsApi);
  private readonly qc = injectQueryClient();
  protected readonly statuses = DELIVERY_STATUSES;

  protected readonly status = signal<DeliveryStatus | undefined>(undefined);
  protected readonly targetId = signal<string | undefined>(undefined);

  protected readonly targets = injectQuery(() => ({
    queryKey: ['targets'],
    queryFn: ({ signal }) => this.targetsApi.list(signal),
    staleTime: 60_000,
  }));

  protected readonly deliveries = injectQuery(() => ({
    queryKey: ['deliveries', this.status(), this.targetId()],
    queryFn: ({ signal }) =>
      this.api.list({ status: this.status(), targetId: this.targetId(), limit: 200 }, signal),
    refetchInterval: 15_000,
  }));

  protected readonly retry = injectMutation(() => ({
    mutationFn: (id: string) => this.api.retry(id),
    onSuccess: () => this.qc.invalidateQueries({ queryKey: ['deliveries'] }),
  }));

  protected readonly errorMessage = computed(() => {
    const e = this.deliveries.error();
    return e instanceof Error ? e.message : 'unknown error';
  });

  private readonly targetById = computed(() => {
    const map = new Map<string, string>();
    for (const t of this.targets.data() ?? []) map.set(t.id, t.label);
    return map;
  });

  protected targetLabelFor(id: string): string {
    return this.targetById().get(id) ?? id.slice(0, 8);
  }
}
