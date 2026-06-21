import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { TargetsApi } from '../../core/api/targets.api';
import { RelativeTimePipe } from '../../core/ui/relative-time.pipe';
import { SkeletonComponent } from '../../core/ui/skeleton.component';
import { EmptyStateComponent } from '../../core/ui/empty-state.component';

@Component({
  selector: 'wgw-targets-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RelativeTimePipe, SkeletonComponent, EmptyStateComponent],
  template: `
    <section class="mx-auto max-w-6xl space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="font-mono text-2xl font-semibold tracking-tight">Targets</h1>
          <p class="mt-1 text-sm text-muted">
            Downstream HTTP receivers — fan-out destinations for ingested events.
          </p>
        </div>
        <a
          routerLink="/targets/new"
          class="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs text-accent hover:bg-accent/20"
        >
          + new target
        </a>
      </header>

      @if (targets.isPending()) {
        <div class="space-y-2">
          @for (i of [0, 1, 2, 3]; track i) {
            <wgw-skeleton height="3.5rem" />
          }
        </div>
      } @else if (targets.isError()) {
        <wgw-empty-state title="failed to load targets" [description]="errorMessage()" />
      } @else if ((targets.data() ?? []).length === 0) {
        <wgw-empty-state
          title="no targets configured"
          description="Create one to start fanning out webhooks."
        >
          <a
            routerLink="/targets/new"
            class="mt-2 inline-flex rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs text-accent hover:bg-accent/20"
            >+ new target</a
          >
        </wgw-empty-state>
      } @else {
        <ul class="grid gap-3">
          @for (t of targets.data() ?? []; track t.id) {
            <li>
              <a
                [routerLink]="['/targets', t.id]"
                class="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-card-hover"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div class="font-mono text-sm font-semibold">{{ t.label }}</div>
                    <div class="mt-1 break-all font-mono text-xs text-muted">{{ t.url }}</div>
                    <div class="mt-1 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
                      <span>timeout: {{ t.timeoutMs }}ms</span>
                      <span>max attempts: {{ t.maxAttempts }}</span>
                      <span>schedule: {{ t.backoffSchedule.length }} steps</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    @if (t.enabled) {
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
                      updated {{ t.updatedAt | relativeTime }}
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
export class TargetsListComponent {
  private readonly api = inject(TargetsApi);

  protected readonly targets = injectQuery(() => ({
    queryKey: ['targets'],
    queryFn: ({ signal }) => this.api.list(signal),
    refetchInterval: 30_000,
  }));

  protected readonly errorMessage = computed(() => {
    const e = this.targets.error();
    return e instanceof Error ? e.message : 'unknown error';
  });
}
