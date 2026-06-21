import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental';
import { TargetsApi } from '../../core/api/targets.api';
import { SkeletonComponent } from '../../core/ui/skeleton.component';
import { TargetCreateSchema, type TargetCreate } from '../../core/models/schemas';

@Component({
  selector: 'wgw-target-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SkeletonComponent],
  template: `
    <section class="mx-auto max-w-3xl space-y-6">
      <header class="flex items-center justify-between">
        <a routerLink="/targets" class="font-mono text-xs text-muted hover:text-foreground"
          >← back to targets</a
        >
        @if (!isNew()) {
          <button
            type="button"
            class="rounded border border-danger/40 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-danger hover:bg-danger/10"
            (click)="onDelete()"
          >
            delete
          </button>
        }
      </header>

      @if (loading()) {
        <wgw-skeleton height="18rem" />
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <h1 class="font-mono text-xl font-semibold tracking-tight">
            {{ isNew() ? 'New target' : 'Edit target' }}
          </h1>

          <label class="block space-y-1">
            <span class="font-mono text-[11px] uppercase tracking-wider text-muted">label</span>
            <input
              type="text"
              formControlName="label"
              class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
              placeholder="downstream prod"
            />
          </label>

          <label class="block space-y-1">
            <span class="font-mono text-[11px] uppercase tracking-wider text-muted">url</span>
            <input
              type="url"
              formControlName="url"
              class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
              placeholder="https://api.example.com/hooks"
            />
          </label>

          <label class="block space-y-1">
            <span class="font-mono text-[11px] uppercase tracking-wider text-muted">signing secret</span>
            <input
              type="password"
              formControlName="signingSecret"
              class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
              placeholder="whsec_... (optional)"
            />
          </label>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block space-y-1">
              <span class="font-mono text-[11px] uppercase tracking-wider text-muted">timeout (ms)</span>
              <input
                type="number"
                formControlName="timeoutMs"
                min="100"
                max="60000"
                class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
              />
            </label>
            <label class="block space-y-1">
              <span class="font-mono text-[11px] uppercase tracking-wider text-muted">max attempts</span>
              <input
                type="number"
                formControlName="maxAttempts"
                min="1"
                max="20"
                class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
              />
            </label>
          </div>

          <label class="block space-y-1">
            <span class="font-mono text-[11px] uppercase tracking-wider text-muted"
              >backoff schedule (comma-separated seconds)</span
            >
            <input
              type="text"
              formControlName="backoffScheduleRaw"
              class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
              placeholder="30,120,600,3600,21600,86400"
            />
            <span class="font-mono text-[11px] text-muted">
              defaults: 30s · 2m · 10m · 1h · 6h · 24h
            </span>
          </label>

          <label class="flex items-center gap-2 font-mono text-xs">
            <input type="checkbox" class="accent-accent" formControlName="enabled" />
            enabled
          </label>

          @if (mutation.isError()) {
            <p class="rounded border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
              {{ mutationError() }}
            </p>
          }

          <div class="flex gap-2">
            <button
              type="submit"
              class="rounded-md border border-accent/40 bg-accent/10 px-4 py-2 font-mono text-xs text-accent hover:bg-accent/20 disabled:opacity-50"
              [disabled]="form.invalid || mutation.isPending()"
            >
              {{ mutation.isPending() ? 'saving…' : isNew() ? 'create target' : 'save changes' }}
            </button>
            <a
              routerLink="/targets"
              class="rounded-md border border-border px-4 py-2 font-mono text-xs hover:bg-card-hover"
              >cancel</a
            >
          </div>
        </form>
      }
    </section>
  `,
})
export class TargetFormComponent {
  readonly id = input<string>('new');
  private readonly api = inject(TargetsApi);
  private readonly qc = injectQueryClient();
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly isNew = computed(() => this.id() === 'new');

  protected readonly form = this.fb.group({
    label: this.fb.nonNullable.control('', [Validators.required]),
    url: this.fb.nonNullable.control('', [Validators.required]),
    signingSecret: this.fb.control<string | null>(null),
    timeoutMs: this.fb.nonNullable.control(10_000),
    maxAttempts: this.fb.nonNullable.control(6),
    backoffScheduleRaw: this.fb.nonNullable.control('30,120,600,3600,21600,86400'),
    enabled: this.fb.nonNullable.control(true),
  });

  protected readonly existing = injectQuery(() => ({
    queryKey: ['targets', this.id()],
    queryFn: ({ signal }) => this.api.get(this.id(), signal),
    enabled: !this.isNew(),
  }));

  protected readonly mutation = injectMutation(() => ({
    mutationFn: (body: TargetCreate) =>
      this.isNew() ? this.api.create(body) : this.api.update(this.id(), body),
    onSuccess: (t) => {
      this.qc.invalidateQueries({ queryKey: ['targets'] });
      this.router.navigate(['/targets', t.id]);
    },
  }));

  protected readonly loading = computed(() => !this.isNew() && this.existing.isPending());

  protected readonly mutationError = computed(() => {
    const e = this.mutation.error();
    return e instanceof Error ? e.message : 'unknown error';
  });

  constructor() {
    this.existing.data; // touch
    queueMicrotask(() => {
      if (!this.isNew()) {
        const data = this.existing.data();
        if (data) {
          this.form.patchValue({
            label: data.label,
            url: data.url,
            signingSecret: data.signingSecret,
            timeoutMs: data.timeoutMs,
            maxAttempts: data.maxAttempts,
            backoffScheduleRaw: data.backoffSchedule.join(','),
            enabled: data.enabled,
          });
        }
      }
    });
  }

  protected onSubmit() {
    const raw = this.form.getRawValue();
    const schedule = raw.backoffScheduleRaw
      .split(',')
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n > 0);
    const parsed = TargetCreateSchema.safeParse({
      label: raw.label,
      url: raw.url,
      signingSecret: raw.signingSecret || null,
      headers: {},
      timeoutMs: raw.timeoutMs,
      maxAttempts: raw.maxAttempts,
      backoffSchedule: schedule.length ? schedule : [30, 120, 600, 3600, 21600, 86400],
      enabled: raw.enabled,
    });
    if (!parsed.success) {
      console.error('form invalid', parsed.error.format());
      return;
    }
    this.mutation.mutate(parsed.data);
  }

  protected onDelete() {
    if (!confirm(`Delete target "${this.id()}"?`)) return;
    void this.api.remove(this.id()).then(() => {
      this.qc.invalidateQueries({ queryKey: ['targets'] });
      this.router.navigate(['/targets']);
    });
  }
}
