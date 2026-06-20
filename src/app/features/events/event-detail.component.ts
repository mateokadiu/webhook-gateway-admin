import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental';
import { EventsApi } from '../../core/api/events.api';
import { DeliveriesApi } from '../../core/api/deliveries.api';
import { TargetsApi } from '../../core/api/targets.api';
import { StatusBadgeComponent } from '../../core/ui/status-badge.component';
import { RelativeTimePipe } from '../../core/ui/relative-time.pipe';
import { SkeletonComponent } from '../../core/ui/skeleton.component';
import { EmptyStateComponent } from '../../core/ui/empty-state.component';

@Component({
  selector: 'wgw-event-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    StatusBadgeComponent,
    RelativeTimePipe,
    SkeletonComponent,
    EmptyStateComponent,
  ],
  template: `
    <section class="mx-auto max-w-5xl space-y-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <a routerLink="/events" class="font-mono text-xs text-muted hover:text-foreground"
          >← back to events</a
        >
        @if (event.data(); as ev) {
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-wider hover:bg-card-hover disabled:opacity-50"
              (click)="replay.mutate()"
              [disabled]="replay.isPending()"
            >
              {{ replay.isPending() ? 'queuing…' : 'replay event' }}
            </button>
          </div>
        }
      </header>

      @if (event.data(); as detail) {
        <article class="space-y-4 rounded-xl border border-border bg-card p-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h1 class="font-mono text-lg font-semibold tracking-tight">
              {{ detail.id }}
            </h1>
            <wgw-status-badge [value]="detail.status" variant="event" />
          </div>
          <dl class="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt class="font-mono text-[11px] uppercase tracking-wider text-muted">source</dt>
              <dd class="font-mono">{{ slugFor(detail.sourceId) }}</dd>
            </div>
            <div>
              <dt class="font-mono text-[11px] uppercase tracking-wider text-muted">topic</dt>
              <dd class="font-mono">{{ detail.topic ?? '—' }}</dd>
            </div>
            <div>
              <dt class="font-mono text-[11px] uppercase tracking-wider text-muted">dedup key</dt>
              <dd class="break-all font-mono">{{ detail.dedupKey }}</dd>
            </div>
            <div>
              <dt class="font-mono text-[11px] uppercase tracking-wider text-muted">body</dt>
              <dd class="font-mono">
                {{ detail.sizeBytes | number }} bytes · sha:{{ detail.bodyHash.slice(0, 12) }}
              </dd>
            </div>
            <div>
              <dt class="font-mono text-[11px] uppercase tracking-wider text-muted">received</dt>
              <dd class="font-mono">
                {{ detail.receivedAt | date: 'medium' }} ·
                {{ detail.receivedAt | relativeTime }}
              </dd>
            </div>
            <div>
              <dt class="font-mono text-[11px] uppercase tracking-wider text-muted">fan-out</dt>
              <dd class="font-mono">
                <span class="text-success">{{ detail.fanOutOk }}</span>
                /
                <span>{{ detail.fanOut }}</span>
                @if (detail.fanOutFailed > 0) {
                  <span class="text-danger"> ({{ detail.fanOutFailed }} failed)</span>
                }
              </dd>
            </div>
          </dl>
          @if (detail.headers && objectKeys(detail.headers).length) {
            <details class="rounded-lg border border-border/60 bg-background/40 p-3 text-xs">
              <summary
                class="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-muted"
              >
                request headers ({{ objectKeys(detail.headers).length }})
              </summary>
              <dl class="mt-2 space-y-1 font-mono">
                @for (key of objectKeys(detail.headers); track key) {
                  <div class="grid grid-cols-[10rem_1fr] gap-2">
                    <dt class="text-muted">{{ key }}</dt>
                    <dd class="break-all">{{ headerValue(detail.headers, key) }}</dd>
                  </div>
                }
              </dl>
            </details>
          }
          @if (detail.bodyPreview) {
            <details class="rounded-lg border border-border/60 bg-background/40 p-3 text-xs">
              <summary
                class="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-muted"
              >
                body preview
              </summary>
              <pre class="mt-2 max-h-96 overflow-auto whitespace-pre-wrap font-mono">{{ detail.bodyPreview }}</pre>
            </details>
          }
        </article>

        <article class="space-y-3">
          <header class="flex items-baseline justify-between">
            <h2 class="font-mono text-sm font-semibold">deliveries</h2>
            <span class="font-mono text-[11px] text-muted">{{ deliveries.data()?.length ?? 0 }}</span>
          </header>
          @if (deliveries.isPending()) {
            <wgw-skeleton height="6rem" />
          } @else if ((deliveries.data() ?? []).length === 0) {
            <p class="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
              no deliveries scheduled
            </p>
          } @else {
            <div class="space-y-2">
              @for (d of deliveries.data() ?? []; track d.id) {
                <article class="rounded-lg border border-border bg-card p-3 text-sm">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2 font-mono text-xs">
                      <span class="text-muted">target:</span>
                      <span>{{ targetLabelFor(d.targetId) }}</span>
                    </div>
                    <wgw-status-badge [value]="d.status" variant="delivery" />
                  </div>
                  <div class="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                    <div>
                      <span class="font-mono text-muted">attempt</span>
                      <span class="ml-2 font-mono tabular-nums">{{ d.attempt }}</span>
                    </div>
                    <div>
                      <span class="font-mono text-muted">last status</span>
                      <span class="ml-2 font-mono tabular-nums">{{ d.lastStatusCode ?? '—' }}</span>
                    </div>
                    <div>
                      <span class="font-mono text-muted">duration</span>
                      <span class="ml-2 font-mono tabular-nums">{{ d.totalDurationMs ?? 0 }}ms</span>
                    </div>
                    <div>
                      <span class="font-mono text-muted">last attempt</span>
                      <span class="ml-2 font-mono">{{ d.lastAttemptAt | relativeTime }}</span>
                    </div>
                    <div>
                      <span class="font-mono text-muted">next attempt</span>
                      <span class="ml-2 font-mono">{{ d.nextAttemptAt | relativeTime }}</span>
                    </div>
                  </div>
                  @if (d.lastResponseExcerpt) {
                    <details class="mt-2">
                      <summary
                        class="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-muted"
                      >
                        response excerpt
                      </summary>
                      <pre class="mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-xs">{{ d.lastResponseExcerpt }}</pre>
                    </details>
                  }
                </article>
              }
            </div>
          }
        </article>
      } @else if (event.isError()) {
        <wgw-empty-state title="failed to load event" [description]="errorMessage()" />
      } @else {
        <wgw-skeleton height="14rem" />
      }
    </section>
  `,
})
export class EventDetailComponent {
  readonly id = input.required<string>();
  private readonly api = inject(EventsApi);
  private readonly deliveriesApi = inject(DeliveriesApi);
  private readonly targetsApi = inject(TargetsApi);
  private readonly qc = injectQueryClient();
  protected readonly objectKeys = Object.keys;

  protected readonly event = injectQuery(() => ({
    queryKey: ['events', this.id()],
    queryFn: ({ signal }) => this.api.get(this.id(), signal),
    refetchInterval: 10_000,
  }));

  protected readonly deliveries = injectQuery(() => ({
    queryKey: ['deliveries', 'event', this.id()],
    queryFn: ({ signal }) => this.deliveriesApi.list({ eventId: this.id() }, signal),
    refetchInterval: 10_000,
  }));

  protected readonly targets = injectQuery(() => ({
    queryKey: ['targets'],
    queryFn: ({ signal }) => this.targetsApi.list(signal),
    staleTime: 60_000,
  }));

  protected readonly replay = injectMutation(() => ({
    mutationFn: () => this.api.replay(this.id()),
    onSuccess: () => {
      this.qc.invalidateQueries({ queryKey: ['events', this.id()] });
      this.qc.invalidateQueries({ queryKey: ['deliveries', 'event', this.id()] });
    },
  }));

  protected readonly errorMessage = computed(() => {
    const e = this.event.error();
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

  protected slugFor(id: string): string {
    return id.slice(0, 8);
  }

  protected headerValue(headers: Record<string, string>, key: string): string {
    return headers[key] ?? '';
  }
}
