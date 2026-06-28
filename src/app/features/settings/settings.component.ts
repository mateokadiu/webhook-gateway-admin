import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '../../core/api/client';

@Component({
  selector: 'wgw-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 class="font-mono text-2xl font-semibold tracking-tight">Settings</h1>
        <p class="mt-1 text-sm text-muted">Connection to the webhook-gateway backend.</p>
      </header>

      <form (ngSubmit)="save()" class="space-y-4">
        <label class="block space-y-1">
          <span class="font-mono text-[11px] uppercase tracking-wider text-muted">api base url</span>
          <input
            type="url"
            class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
            [ngModel]="baseInput()"
            (ngModelChange)="baseInput.set($event)"
            name="base"
            placeholder="http://localhost:3000/api"
          />
          <span class="font-mono text-[11px] text-muted">
            current: <code>{{ api.baseUrl() }}</code>
          </span>
        </label>

        <label class="block space-y-1">
          <span class="font-mono text-[11px] uppercase tracking-wider text-muted">bearer token</span>
          <input
            type="password"
            class="w-full rounded border border-border bg-card px-3 py-2 font-mono text-sm"
            [ngModel]="tokenInput()"
            (ngModelChange)="tokenInput.set($event)"
            name="token"
            placeholder="paste your admin token"
          />
          <span class="font-mono text-[11px] text-muted">
            stored in localStorage. {{ api.hasToken() ? 'currently set.' : 'no token set.' }}
          </span>
        </label>

        <div class="flex flex-wrap gap-2">
          <button
            type="submit"
            class="rounded-md border border-accent/40 bg-accent/10 px-4 py-2 font-mono text-xs text-accent hover:bg-accent/20"
          >
            save
          </button>
          <button
            type="button"
            class="rounded-md border border-border px-4 py-2 font-mono text-xs hover:bg-card-hover"
            (click)="clear()"
          >
            clear token
          </button>
          <button
            type="button"
            class="rounded-md border border-border px-4 py-2 font-mono text-xs hover:bg-card-hover"
            (click)="reset()"
          >
            reset base
          </button>
        </div>
      </form>

      <article class="rounded-xl border border-border bg-card p-4">
        <h2 class="mb-2 font-mono text-sm font-medium">about</h2>
        <p class="text-sm text-muted">
          Angular 19 admin UI for
          <a
            class="text-accent hover:underline"
            href="https://github.com/mateokadiu/webhook-gateway"
            target="_blank"
            rel="noopener"
            >webhook-gateway</a
          >. Built with zoneless change detection, standalone components, signals, TanStack Query
          for Angular, and Tailwind v4. MIT-licensed.
        </p>
      </article>
    </section>
  `,
})
export class SettingsComponent {
  protected readonly api = inject(ApiClient);
  protected readonly baseInput = signal<string>(this.api.baseUrl());
  protected readonly tokenInput = signal<string>(this.api.token() ?? '');

  protected save() {
    const base = this.baseInput().trim();
    this.api.setBaseOverride(base && base !== this.api.baseUrl() ? base : base || null);
    const token = this.tokenInput().trim();
    this.api.setToken(token || null);
  }

  protected clear() {
    this.api.setToken(null);
    this.tokenInput.set('');
  }

  protected reset() {
    this.api.setBaseOverride(null);
    this.baseInput.set(this.api.baseUrl());
  }
}
