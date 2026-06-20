import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental';
import { EventsApi } from '../../core/api/events.api';
import { SourcesApi } from '../../core/api/sources.api';
import { StatusBadgeComponent } from '../../core/ui/status-badge.component';
import { RelativeTimePipe } from '../../core/ui/relative-time.pipe';
import { SkeletonComponent } from '../../core/ui/skeleton.component';
import { EmptyStateComponent } from '../../core/ui/empty-state.component';
import type { EventStatus } from '../../core/models/schemas';

const EVENT_STATUSES: EventStatus[] = [
  'queued',
  'processing',
  'ok',
  'partial',
  'failed',
  'tombstoned',
];

@Component({
  selector: 'wgw-events-list',
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
          <h1 class="font-mono text-2xl font-semibold tracking-tight">Events</h1>
          <p class="mt-1 text-sm text-muted">{{ events.data()?.length ?? 0 }} loaded</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <input
            type="search"
            class="rounded border border-border bg-card px-3 py-1.5 font-mono text-xs placeholder:text-muted"
            placeholder="search dedup key / body…"
            [ngModel]="q()"
            (ngModelChange)="q.set($event)"
          />
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
            [ngModel]="sourceId()"
            (ngModelChange)="sourceId.set($event)"
          >
            <option [ngValue]="undefined">any source</option>
            @for (s of sources.data() ?? []; track s.id) {
              <option [ngValue]="s.id">{{ s.slug }}</option>
            }
          </select>
        </div>
      </header>

      @if (selected().size > 0) {
        <div
          class="flex flex-wrap items-center gap-3 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2"
        >
          <span class="font-mono text-xs text-accent">{{ selected().size }} selected</span>
          <button
            type="button"
            class="rounded border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-wider hover:bg-card-hover"
            (click)="replay.mutate(Array.from(selected()))"
            [disabled]="replay.isPending()"
          >
            replay
          </button>
          <button
            type="button"
            class="rounded border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-wider hover:bg-card-hover"
            (click)="tombstone.mutate(Array.from(selected()))"
            [disabled]="tombstone.isPending()"
          >
            tombstone
          </button>
          <button
            type="button"
            class="ml-auto text-xs text-muted hover:text-foreground"
            (click)="clearSelection()"
          >
            clear
          </button>
        </div>
      }

      @if (events.isPending()) {
        <div class="space-y-2">
          @for (i of [0, 1, 2, 3, 4, 5, 6]; track i) {
            <wgw-skeleton height="2.5rem" />
          }
        </div>
      } @else if (events.isError()) {
        <wgw-empty-state title="failed to load events" [description]="errorMessage()" />
      } @else if ((events.data() ?? []).length === 0) {
        <wgw-empty-state
          title="no events match"
          description="Try clearing filters or sending a webhook into one of the configured sources."
        />
      } @else {
        <div
          class="overflow-hidden rounded-xl border border-border bg-card"
          role="region"
          aria-label="Events"
        >
          <table class="w-full text-sm">
            <thead class="bg-card-hover/40 text-left text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th class="w-8 pl-3"></th>
                <th class="px-3 py-2 font-mono">id</th>
                <th class="px-3 py-2 font-mono">source</th>
                <th class="px-3 py-2 font-mono">topic</th>
                <th class="px-3 py-2 font-mono">status</th>
                <th class="px-3 py-2 font-mono">fan-out</th>
                <th class="px-3 py-2 text-right font-mono">received</th>
              </tr>
            </thead>
            <tbody>
              @for (e of events.data() ?? []; track e.id) {
                <tr
                  class="border-t border-border/40 transition-colors hover:bg-card-hover/40"
                  [class.bg-card-hover]="selected().has(e.id)"
                >
                  <td class="pl-3">
                    <input
                      type="checkbox"
                      class="accent-accent"
                      [checked]="selected().has(e.id)"
                      (change)="toggle(e.id)"
                      [attr.aria-label]="'select ' + e.id"
                    />
                  </td>
                  <td class="px-3 py-2 font-mono text-xs">
                    <a
                      [routerLink]="['/events', e.id]"
                      class="text-foreground hover:text-accent"
                      >{{ e.id.slice(0, 8) }}</a
                    >
                  </td>
                  <td class="px-3 py-2 font-mono text-xs">
                    {{ slugFor(e.sourceId) }}
                  </td>
                  <td class="px-3 py-2 font-mono text-xs text-muted">{{ e.topic ?? '—' }}</td>
                  <td class="px-3 py-2">
                    <wgw-status-badge [value]="e.status" variant="event" />
                  </td>
                  <td class="px-3 py-2 font-mono text-xs">
                    <span class="text-success">{{ e.fanOutOk }}</span>
                    /
                    <span>{{ e.fanOut }}</span>
                    @if (e.fanOutFailed > 0) {
                      <span class="text-danger"> ({{ e.fanOutFailed }} fail)</span>
                    }
                  </td>
                  <td class="px-3 py-2 text-right font-mono text-xs text-muted">
                    {{ e.receivedAt | relativeTime }}
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
export class EventsListComponent {
  private readonly api = inject(EventsApi);
  private readonly sourcesApi = inject(SourcesApi);
  private readonly qc = injectQueryClient();
  protected readonly Array = Array;
  protected readonly statuses = EVENT_STATUSES;

  protected readonly q = signal<string>('');
  protected readonly status = signal<EventStatus | undefined>(undefined);
  protected readonly sourceId = signal<string | undefined>(undefined);
  protected readonly selected = signal<Set<string>>(new Set());

  protected readonly sources = injectQuery(() => ({
    queryKey: ['sources'],
    queryFn: ({ signal }) => this.sourcesApi.list(signal),
    staleTime: 60_000,
  }));

  protected readonly events = injectQuery(() => ({
    queryKey: ['events', this.q(), this.status(), this.sourceId()],
    queryFn: ({ signal }) =>
      this.api.list(
        {
          q: this.q() || undefined,
          status: this.status(),
          sourceId: this.sourceId(),
          limit: 200,
        },
        signal,
      ),
    refetchInterval: 15_000,
  }));

  protected readonly replay = injectMutation(() => ({
    mutationFn: (ids: string[]) => this.api.bulkReplay(ids),
    onSuccess: () => {
      this.clearSelection();
      this.qc.invalidateQueries({ queryKey: ['events'] });
    },
  }));

  protected readonly tombstone = injectMutation(() => ({
    mutationFn: (ids: string[]) => this.api.bulkTombstone(ids),
    onSuccess: () => {
      this.clearSelection();
      this.qc.invalidateQueries({ queryKey: ['events'] });
    },
  }));

  protected readonly errorMessage = computed(() => {
    const e = this.events.error();
    return e instanceof Error ? e.message : 'unknown error';
  });

  private readonly sourceSlugBySourceId = computed(() => {
    const map = new Map<string, string>();
    for (const s of this.sources.data() ?? []) map.set(s.id, s.slug);
    return map;
  });

  protected slugFor(id: string): string {
    return this.sourceSlugBySourceId().get(id) ?? id.slice(0, 8);
  }

  protected toggle(id: string) {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected clearSelection() {
    this.selected.set(new Set());
  }
}
