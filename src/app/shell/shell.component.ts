import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiClient } from '../core/api/client';

interface NavItem {
  label: string;
  path: string;
  icon: string; // emoji or unicode
}

const NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: '▣' },
  { label: 'Events', path: '/events', icon: '◫' },
  { label: 'Deliveries', path: '/deliveries', icon: '↳' },
  { label: 'Sources', path: '/sources', icon: '◐' },
  { label: 'Targets', path: '/targets', icon: '◑' },
  { label: 'Settings', path: '/settings', icon: '⚙' },
];

@Component({
  selector: 'wgw-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside class="border-b border-border bg-card lg:border-b-0 lg:border-r">
        <div class="flex items-center gap-2 px-5 py-4">
          <span class="font-mono text-sm font-semibold tracking-tight">
            wgw<span class="text-accent">.</span>
          </span>
          <span class="font-mono text-[10px] uppercase tracking-widest text-muted">admin</span>
        </div>
        <nav class="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0.5 lg:px-2 lg:pb-2">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              [routerLinkActiveOptions]="{ exact: item.path === '/' }"
              routerLinkActive="bg-card-hover text-foreground"
              class="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 font-mono text-xs text-muted transition-colors hover:bg-card-hover hover:text-foreground"
            >
              <span aria-hidden="true" class="w-4 text-center text-accent">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
        <div class="hidden border-t border-border px-4 py-3 text-[11px] text-muted lg:block">
          @if (api.hasToken()) {
            <span class="inline-flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-success"></span>
              authenticated
            </span>
          } @else {
            <span class="inline-flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-warning"></span>
              no token —
              <a routerLink="/settings" class="text-accent hover:underline">set one</a>
            </span>
          }
          <div class="mt-1 truncate font-mono">{{ baseUrl() }}</div>
        </div>
      </aside>
      <main class="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ShellComponent {
  protected readonly api = inject(ApiClient);
  protected readonly nav = NAV;
  protected readonly baseUrl = computed(() => this.api.baseUrl());
}
