import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router, ActivatedRoute } from '@angular/router';
import { StateService } from './services/state.service';
import { S3Service } from './services/s3.service';
import { NotificationsComponent } from './components/notifications/notifications';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationsComponent],
  template: `
    <router-outlet></router-outlet>
    <app-notifications></app-notifications>
  `,
})
export class App implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private stateService = inject(StateService);
  private s3Service = inject(S3Service);

  ngOnInit() {
    // If not connected and no endpoint in URL, force them to the setup wizard
    const hasEndpointInUrl = window.location.href.includes('endpoint=');
    if (!this.stateService.isConnected() && !hasEndpointInUrl) {
      this.router.navigate(['/']);
    }
  }
}