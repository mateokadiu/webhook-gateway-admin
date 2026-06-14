import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'wgw-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center"
    >
      <p class="font-mono text-xs uppercase tracking-wider text-muted">{{ title() }}</p>
      @if (description(); as desc) {
        <p class="max-w-md text-sm text-muted">{{ desc }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string | undefined>(undefined);
}
