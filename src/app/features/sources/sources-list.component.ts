import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { SourcesApi } from '../../core/api/sources.api';
import { RelativeTimePipe } from '../../core/ui/relative-time.pipe';
import { SkeletonComponent } from '../../core/ui/skeleton.component';
import { EmptyStateComponent } from '../../core/ui/empty-state.component';

@Component({
  selector: 'wgw-sources-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RelativeTimePipe, SkeletonComponent, EmptyStateComponent],
  template: `
    <section class="mx-auto max-w-6xl space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="font-mono text-2xl font-semibold tracking-tight">Sources</h1>
          <p class="mt-1 text-sm text-muted">
            Inbound webhook ingest endpoints — one per provider/integration.
          </p>
        </div>
        <a
          routerLink="/sources/new"
          class="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs text-accent hover:bg-accent/20"
        >
          + new source
        </a>
      </header>

      @if (sources.isPending()) {
        <div class="space-y-2">
          @for (i of [0, 1, 2, 3]; track i) {
            <wgw-skeleton height="3.5rem" />
          }
        </div>
      } @else if (sources.isError()) {
        <wgw-empty-state title="failed to load sources" [description]="errorMessage()" />
      } @else if ((sources.data() ?? []).length === 0) {
        <wgw-empty-state
          title="no sources configured"
          description="Create one to start ingesting webhooks."
        >
          <a
            routerLink="/sources/new"
            class="mt-2 inline-flex rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs text-accent hover:bg-accent/20"
            >+ new source</a
          >
        </wgw-empty-state>
      } @else {
        <ul class="grid gap-3">
          @for (s of sources.data() ?? []; track s.id) {
            <li>
              <a
                [routerLink]="['/sources', s.slug]"
                class="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-card-hover"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-sm font-semibold">{{ s.slug }}</span>
                      <span class="font-mono text-[11px] text-muted">{{ s.label }}</span>
                    </div>
                    <div class="mt-1 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
                      <span>plugin: {{ s.pluginId }}</span>
                      <span>targets: {{ s.targetIds.length }}</span>
                      <span>tolerance: {{ s.signatureToleranceSec }}s</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    @if (s.testMode) {
                      <span
                        class="rounded-full border border-warning/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warning"
                        >test</span
                      >
                    }
                    @if (s.enabled) {
                      <span
                        class="rounded-full border border-success/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-success"
                        >enabled</span
                      >
                    } @else {
                      <span
                        class="rounded-full border border-muted/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted"
                        >disabled</span
                      >
                    }
                    <span class="font-mono text-[11px] text-muted">
                      updated {{ s.updatedAt | relativeTime }}
                    </span>
                  </div>
                </div>
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class SourcesListComponent {
  private readonly api = inject(SourcesApi);

  protected readonly sources = injectQuery(() => ({
    queryKey: ['sources'],
    queryFn: ({ signal }) => this.api.list(signal),
    refetchInterval: 30_000,
  }));

  protected readonly errorMessage = computed(() => {
    const e = this.sources.error();
    return e instanceof Error ? e.message : 'unknown error';
  });
}
