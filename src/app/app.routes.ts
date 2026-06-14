import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        title: 'Dashboard · webhook-gateway',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'events',
        title: 'Events · webhook-gateway',
        loadComponent: () =>
          import('./features/events/events-list.component').then((m) => m.EventsListComponent),
      },
      {
        path: 'events/:id',
        title: 'Event · webhook-gateway',
        loadComponent: () =>
          import('./features/events/event-detail.component').then((m) => m.EventDetailComponent),
      },
      {
        path: 'deliveries',
        title: 'Deliveries · webhook-gateway',
        loadComponent: () =>
          import('./features/deliveries/deliveries-list.component').then(
            (m) => m.DeliveriesListComponent,
          ),
      },
      {
        path: 'sources',
        title: 'Sources · webhook-gateway',
        loadComponent: () =>
          import('./features/sources/sources-list.component').then((m) => m.SourcesListComponent),
      },
      {
        path: 'sources/:slug',
        title: 'Source · webhook-gateway',
        loadComponent: () =>
          import('./features/sources/source-form.component').then((m) => m.SourceFormComponent),
      },
      {
        path: 'targets',
        title: 'Targets · webhook-gateway',
        loadComponent: () =>
          import('./features/targets/targets-list.component').then((m) => m.TargetsListComponent),
      },
      {
        path: 'targets/:id',
        title: 'Target · webhook-gateway',
        loadComponent: () =>
          import('./features/targets/target-form.component').then((m) => m.TargetFormComponent),
      },
      {
        path: 'settings',
        title: 'Settings · webhook-gateway',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
