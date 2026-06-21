import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { StatsApi } from '../../core/api/stats.api';
import { SourcesApi } from '../../core/api/sources.api';
import { TargetsApi } from '../../core/api/targets.api';
import { SkeletonComponent } from '../../core/ui/skeleton.component';
import { EmptyStateComponent } from '../../core/ui/empty-state.component';

@Component({
  selector: 'wgw-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SkeletonComponent, EmptyStateComponent],
  template: `
    <section class="mx-auto max-w-6xl space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="font-mono text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p class="mt-1 text-sm text-muted">
            Activity in the last
            <select
              class="rounded border border-border bg-card px-2 py-0.5 font-mono text-xs text-foreground"
              [value]="hours()"
              (change)="hours.set(+($any($event.target).value))"
            >
              <option [value]="1">hour</option>
              <option [value]="6">6 hours</option>
              <option [value]="24">24 hours</option>
              <option [value]="168">7 days</option>
            </select>
          </p>
        </div>
        @if (stats.isFetching()) {
          <span class="font-mono text-xs text-muted">refreshing…</span>
        }
      </header>

      @if (stats.data(); as data) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article class="rounded-xl border border-border bg-card p-4">
            <p class="font-mono text-[11px] uppercase tracking-wider text-muted">events received</p>
            <p class="mt-2 font-mono text-3xl tabular-nums">{{ data.events.total | number }}</p>
            <p class="mt-1 text-xs text-muted">
              {{ data.events.perMinute.toFixed(1) }}/min · {{ data.windowHours }}h window
            </p>
          </article>
          <article class="rounded-xl border border-border bg-card p-4">
            <p class="font-mono text-[11px] uppercase tracking-wider text-muted">deliveries ok</p>
            <p class="mt-2 font-mono text-3xl tabular-nums text-success">
              {{ data.deliveries.ok | number }}
            </p>
            <p class="mt-1 text-xs text-muted">
              {{ successPercent(data.deliveries.ok, data.deliveries.total) }}% of
              {{ data.deliveries.total | number }}
            </p>
          </article>
          <article class="rounded-xl border border-border bg-card p-4">
            <p class="font-mono text-[11px] uppercase tracking-wider text-muted">retrying / failed</p>
            <p class="mt-2 font-mono text-3xl tabular-nums text-warning">
              {{ data.deliveries.failed | number }}
            </p>
            <p class="mt-1 text-xs text-muted">in retry schedule</p>
          </article>
          <article class="rounded-xl border border-border bg-card p-4">
            <p class="font-mono text-[11px] uppercase tracking-wider text-muted">dead-lettered</p>
            <p class="mt-2 font-mono text-3xl tabular-nums text-danger">
              {{ data.deliveries.dead | number }}
            </p>
            <p class="mt-1 text-xs text-muted">awaiting manual replay</p>
          </article>
        </div>

        <article class="rounded-xl border border-border bg-card p-4">
          <header class="mb-3 flex items-baseline justify-between">
            <h2 class="font-mono text-sm font-medium">latency</h2>
            <span class="font-mono text-[11px] text-muted">delivery duration (ms)</span>
          </header>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <p class="font-mono text-[11px] uppercase tracking-wider text-muted">average</p>
              <p class="mt-1 font-mono text-2xl tabular-nums">
                {{ data.deliveries.avgLatencyMs === null ? '—' : (data.deliveries.avgLatencyMs | number: '1.0-0') }}
              </p>
            </div>
            <div>
              <p class="font-mono text-[11px] uppercase tracking-wider text-muted">p95</p>
              <p class="mt-1 font-mono text-2xl tabular-nums">
                {{ data.deliveries.p95LatencyMs === null ? '—' : (data.deliveries.p95LatencyMs | number: '1.0-0') }}
              </p>
            </div>
          </div>
        </article>

        <div class="grid gap-4 lg:grid-cols-2">
          <article class="rounded-xl border border-border bg-card p-4">
            <header class="mb-3">
              <h2 class="font-mono text-sm font-medium">by source</h2>
            </header>
            @if (data.bySource.length === 0) {
              <p class="py-4 text-center text-sm text-muted">no events in window</p>
            } @else {
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-[11px] uppercase tracking-wider text-muted">
                    <th class="pb-2 font-mono">source</th>
                    <th class="pb-2 text-right font-mono tabular-nums">events</th>
                    <th class="pb-2 text-right font-mono tabular-nums">ok</th>
                    <th class="pb-2 text-right font-mono tabular-nums">failed</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of data.bySource; track row.sourceId) {
                    <tr class="border-t border-border/40">
                      <td class="py-2 font-mono text-xs">{{ slugFor(row.sourceId) }}</td>
                      <td class="py-2 text-right font-mono tabular-nums">
                        {{ row.events | number }}
                      </td>
                      <td class="py-2 text-right font-mono tabular-nums text-success">
                        {{ row.ok | number }}
                      </td>
                      <td class="py-2 text-right font-mono tabular-nums text-warning">
                        {{ row.failed | number }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </article>

          <article class="rounded-xl border border-border bg-card p-4">
            <header class="mb-3">
              <h2 class="font-mono text-sm font-medium">by target</h2>
            </header>
            @if (data.byTarget.length === 0) {
              <p class="py-4 text-center text-sm text-muted">no deliveries in window</p>
            } @else {
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-[11px] uppercase tracking-wider text-muted">
                    <th class="pb-2 font-mono">target</th>
                    <th class="pb-2 text-right font-mono tabular-nums">deliveries</th>
                    <th class="pb-2 text-right font-mono tabular-nums">ok</th>
                    <th class="pb-2 text-right font-mono tabular-nums">avg ms</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of data.byTarget; track row.targetId) {
                    <tr class="border-t border-border/40">
                      <td class="py-2 font-mono text-xs">{{ labelFor(row.targetId) }}</td>
                      <td class="py-2 text-right font-mono tabular-nums">
                        {{ row.deliveries | number }}
                      </td>
                      <td class="py-2 text-right font-mono tabular-nums text-success">
                        {{ row.ok | number }}
                      </td>
                      <td class="py-2 text-right font-mono tabular-nums">
                        {{
                          row.avgLatencyMs === null ? '—' : (row.avgLatencyMs | number: '1.0-0')
                        }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </article>
        </div>
      } @else if (stats.isError()) {
        <wgw-empty-state title="failed to load stats" [description]="errorMessage()" />
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (i of [0, 1, 2, 3]; track i) {
            <wgw-skeleton height="6rem" />
          }
        </div>
      }
    </section>
  `,
})
export class DashboardComponent {
  private readonly statsApi = inject(StatsApi);
  private readonly sourcesApi = inject(SourcesApi);
  private readonly targetsApi = inject(TargetsApi);
  protected readonly hours = signal<number>(24);

  protected readonly stats = injectQuery(() => ({
    queryKey: ['stats', 'overview', this.hours()],
    queryFn: ({ signal }) => this.statsApi.overview(this.hours(), signal),
    refetchInterval: 30_000,
  }));

  protected readonly sources = injectQuery(() => ({
    queryKey: ['sources'],
    queryFn: ({ signal }) => this.sourcesApi.list(signal),
    staleTime: 60_000,
  }));

  protected readonly targets = injectQuery(() => ({
    queryKey: ['targets'],
    queryFn: ({ signal }) => this.targetsApi.list(signal),
    staleTime: 60_000,
  }));

  protected readonly errorMessage = computed(() => {
    const e = this.stats.error();
    return e instanceof Error ? e.message : 'unknown error';
  });

  private readonly sourceSlugById = computed(() => {
    const map = new Map<string, string>();
    for (const s of this.sources.data() ?? []) map.set(s.id, s.slug);
    return map;
  });

  private readonly targetLabelById = computed(() => {
    const map = new Map<string, string>();
    for (const t of this.targets.data() ?? []) map.set(t.id, t.label);
    return map;
  });

  protected slugFor(id: string): string {
    return this.sourceSlugById().get(id) ?? id.slice(0, 8);
  }

  protected labelFor(id: string): string {
    return this.targetLabelById().get(id) ?? id.slice(0, 8);
  }

  protected successPercent(ok: number, total: number): string {
    if (!total) return '0.0';
    return ((ok / total) * 100).toFixed(1);
  }
}
