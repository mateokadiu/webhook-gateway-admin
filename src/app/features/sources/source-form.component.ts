import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental';
import { SourcesApi } from '../../core/api/sources.api';
import { TargetsApi } from '../../core/api/targets.api';
import { SkeletonComponent } from '../../core/ui/skeleton.component';
import { SourceCreateSchema, type SourceCreate } from '../../core/models/schemas';

@Component({
  selector: 'wgw-source-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SkeletonComponent],
  template: `
    <section class="mx-auto max-w-3xl space-y-6">
      <header class="flex items-center justify-between">
        <a routerLink="/sources" class="font-mono text-xs text-muted hover:text-foreground"
          >← back to sources</a
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
        <wgw-skeleton height="20rem" />
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <h1 class="font-mono text-xl font-semibold tracking-tight">
            {{ isNew() ? 'New source' : 'Edit source' }}
          </h1>

          <label class="block space-y-1">
            <span class="font-mono text-[11px] uppercase tracking-wider text-muted">slug</span>
            <input
              type="text"
              formControlName="slug"
              class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
              placeholder="stripe-prod"
            />
            <span class="text-xs text-muted">lowercase, digits, hyphens (a-z, 0-9, -)</span>
          </label>

          <label class="block space-y-1">
            <span class="font-mono text-[11px] uppercase tracking-wider text-muted">label</span>
            <input
              type="text"
              formControlName="label"
              class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
              placeholder="Stripe (prod)"
            />
          </label>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block space-y-1">
              <span class="font-mono text-[11px] uppercase tracking-wider text-muted">plugin id</span>
              <select
                formControlName="pluginId"
                class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
              >
                <option value="stripe">stripe</option>
                <option value="github">github</option>
                <option value="shopify">shopify</option>
                <option value="generic-hmac">generic-hmac</option>
              </select>
            </label>
            <label class="block space-y-1">
              <span class="font-mono text-[11px] uppercase tracking-wider text-muted"
                >signature tolerance (sec)</span
              >
              <input
                type="number"
                formControlName="signatureToleranceSec"
                min="0"
                class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
              />
            </label>
          </div>

          <label class="block space-y-1">
            <span class="font-mono text-[11px] uppercase tracking-wider text-muted">signing secret</span>
            <input
              type="password"
              formControlName="signingSecret"
              class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
              placeholder="whsec_..."
            />
          </label>

          <div class="space-y-2">
            <span class="font-mono text-[11px] uppercase tracking-wider text-muted">targets</span>
            @if ((targets.data() ?? []).length === 0) {
              <p class="text-xs text-muted">no targets exist yet — create one first</p>
            } @else {
              <div class="grid gap-1">
                @for (t of targets.data() ?? []; track t.id) {
                  <label class="flex items-center gap-2 rounded border border-border bg-card/50 px-3 py-2">
                    <input
                      type="checkbox"
                      class="accent-accent"
                      [checked]="isTargetSelected(t.id)"
                      (change)="toggleTarget(t.id)"
                    />
                    <span class="font-mono text-sm">{{ t.label }}</span>
                    <span class="font-mono text-[11px] text-muted">{{ t.url }}</span>
                  </label>
                }
              </div>
            }
          </div>

          <div class="flex gap-4">
            <label class="flex items-center gap-2 font-mono text-xs">
              <input type="checkbox" class="accent-accent" formControlName="enabled" />
              enabled
            </label>
            <label class="flex items-center gap-2 font-mono text-xs">
              <input type="checkbox" class="accent-accent" formControlName="testMode" />
              test mode
            </label>
          </div>

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
              {{ mutation.isPending() ? 'saving…' : isNew() ? 'create source' : 'save changes' }}
            </button>
            <a
              routerLink="/sources"
              class="rounded-md border border-border px-4 py-2 font-mono text-xs hover:bg-card-hover"
              >cancel</a
            >
          </div>
        </form>
      }
    </section>
  `,
})
export class SourceFormComponent {
  readonly slug = input<string>('new');
  private readonly api = inject(SourcesApi);
  private readonly targetsApi = inject(TargetsApi);
  private readonly qc = injectQueryClient();
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly isNew = computed(() => this.slug() === 'new');

  protected readonly form = this.fb.group({
    slug: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^[a-z0-9-]+$/),
    ]),
    label: this.fb.nonNullable.control('', [Validators.required]),
    pluginId: this.fb.nonNullable.control('generic-hmac', [Validators.required]),
    signingSecret: this.fb.nonNullable.control('', [Validators.required]),
    signatureToleranceSec: this.fb.nonNullable.control(300),
    targetIds: this.fb.nonNullable.control<string[]>([]),
    enabled: this.fb.nonNullable.control(true),
    testMode: this.fb.nonNullable.control(false),
  });

  protected readonly existing = injectQuery(() => ({
    queryKey: ['sources', this.slug()],
    queryFn: ({ signal }) => this.api.get(this.slug(), signal),
    enabled: !this.isNew(),
  }));

  protected readonly targets = injectQuery(() => ({
    queryKey: ['targets'],
    queryFn: ({ signal }) => this.targetsApi.list(signal),
  }));

  protected readonly mutation = injectMutation(() => ({
    mutationFn: (body: SourceCreate) =>
      this.isNew() ? this.api.create(body) : this.api.update(this.slug(), body),
    onSuccess: (s) => {
      this.qc.invalidateQueries({ queryKey: ['sources'] });
      this.router.navigate(['/sources', s.slug]);
    },
  }));

  protected readonly loading = computed(
    () => !this.isNew() && (this.existing.isPending() || this.targets.isPending()),
  );

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
            slug: data.slug,
            label: data.label,
            pluginId: data.pluginId,
            signingSecret: data.signingSecret,
            signatureToleranceSec: data.signatureToleranceSec,
            targetIds: data.targetIds,
            enabled: data.enabled,
            testMode: data.testMode,
          });
        }
      }
    });
  }

  protected isTargetSelected(id: string): boolean {
    return (this.form.controls.targetIds.value ?? []).includes(id);
  }

  protected toggleTarget(id: string) {
    const current = this.form.controls.targetIds.value ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    this.form.controls.targetIds.setValue(next);
  }

  protected onSubmit() {
    const raw = this.form.getRawValue();
    const parsed = SourceCreateSchema.safeParse({
      ...raw,
      pluginConfig: {},
    });
    if (!parsed.success) {
      console.error('form invalid', parsed.error.format());
      return;
    }
    this.mutation.mutate(parsed.data);
  }

  protected onDelete() {
    if (!confirm(`Delete source "${this.slug()}"?`)) return;
    void this.api.remove(this.slug()).then(() => {
      this.qc.invalidateQueries({ queryKey: ['sources'] });
      this.router.navigate(['/sources']);
    });
  }
}
