import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type StatusKind = 'success' | 'warning' | 'danger' | 'muted' | 'info';

const EVENT_MAP: Record<string, StatusKind> = {
  queued: 'info',
  processing: 'info',
  ok: 'success',
  partial: 'warning',
  failed: 'danger',
  tombstoned: 'muted',
};

const DELIVERY_MAP: Record<string, StatusKind> = {
  pending: 'info',
  retrying: 'warning',
  ok: 'success',
  failed: 'danger',
  dead: 'muted',
};

@Component({
  selector: 'wgw-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider"
          [class.border-success]="kind() === 'success'"
          [class.text-success]="kind() === 'success'"
          [class.border-warning]="kind() === 'warning'"
          [class.text-warning]="kind() === 'warning'"
          [class.border-danger]="kind() === 'danger'"
          [class.text-danger]="kind() === 'danger'"
          [class.border-muted]="kind() === 'muted'"
          [class.text-muted]="kind() === 'muted'"
          [class.border-accent]="kind() === 'info'"
          [class.text-accent]="kind() === 'info'">
      <span class="h-1.5 w-1.5 rounded-full"
            [class.bg-success]="kind() === 'success'"
            [class.bg-warning]="kind() === 'warning'"
            [class.bg-danger]="kind() === 'danger'"
            [class.bg-muted]="kind() === 'muted'"
            [class.bg-accent]="kind() === 'info'"></span>
      {{ value() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly value = input.required<string>();
  readonly variant = input<'event' | 'delivery'>('event');

  protected readonly kind = computed<StatusKind>(() => {
    const map = this.variant() === 'event' ? EVENT_MAP : DELIVERY_MAP;
    return map[this.value()] ?? 'muted';
  });
}
