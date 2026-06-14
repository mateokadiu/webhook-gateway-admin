import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'wgw-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="animate-pulse rounded-md bg-card-hover"
      [style.height]="height()"
      [style.width]="width()"
    ></div>
  `,
})
export class SkeletonComponent {
  readonly height = input<string>('1rem');
  readonly width = input<string>('100%');
}
