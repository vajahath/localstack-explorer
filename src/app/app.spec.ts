import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Router, ActivatedRoute } from '@angular/router';
import { StateService } from './services/state.service';
import { S3Service } from './services/s3.service';
import { NotificationsComponent } from './components/notifications/notifications';
import { NotificationService } from './services/notification.service';
import { RouterOutlet } from '@angular/router';
import { signal, Component } from '@angular/core';

// Minimal stubs to avoid rendering real router and notification components
@Component({ selector: 'router-outlet', template: '', standalone: true })
class MockRouterOutlet { }

@Component({ selector: 'app-notifications', template: '', standalone: true })
class MockNotificationsComponent { }

describe('App', () => {
  let stateServiceSpy: {
    isConnected: ReturnType<typeof signal<boolean>>;
  };
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  let activatedRouteSpy: object;

  beforeEach(async () => {
    // Default: NOT connected, no endpoint in URL
    stateServiceSpy = {
      isConnected: signal(false),
    };
    routerSpy = { navigate: vi.fn() };
    activatedRouteSpy = { params: { subscribe: vi.fn() } };

    // Mock window.location — vitest/jsdom uses 'http://localhost/' by default
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost/' },
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: StateService, useValue: stateServiceSpy },
        { provide: S3Service, useValue: { endpoint: signal(null) } },
        {
          provide: NotificationService,
          useValue: { notifications: signal([]), remove: vi.fn() },
        },
      ],
    })
      .overrideComponent(App, {
        remove: { imports: [RouterOutlet, NotificationsComponent] },
        add: { imports: [MockRouterOutlet, MockNotificationsComponent] },
      })
      .compileComponents();
  });

  it('should create the app component', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('ngOnInit()', () => {
    it('should redirect to "/" when not connected and no endpoint in URL', () => {
      Object.defineProperty(window, 'location', { value: { href: 'http://localhost/' }, writable: true });
      const fixture = TestBed.createComponent(App);
      fixture.componentInstance.ngOnInit();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should NOT redirect when the URL contains an endpoint param', () => {
      Object.defineProperty(window, 'location', { value: { href: 'http://localhost/explorer;endpoint=aHR0cDovL2xvY2FsaG9zdDo0NTY2Lw==' }, writable: true });
      const fixture = TestBed.createComponent(App);
      fixture.componentInstance.ngOnInit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should NOT redirect when the user is already connected', () => {
      stateServiceSpy.isConnected.set(true);
      const fixture = TestBed.createComponent(App);
      fixture.componentInstance.ngOnInit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });
});
