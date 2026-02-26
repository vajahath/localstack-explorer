import { TestBed } from '@angular/core/testing';
import { NotificationsComponent } from './notifications';
import { NotificationService, Notification } from '../../services/notification.service';
import { signal } from '@angular/core';

describe('NotificationsComponent', () => {
    let mockNotificationService: {
        notifications: ReturnType<typeof signal<Notification[]>>;
        remove: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        mockNotificationService = {
            notifications: signal<Notification[]>([]),
            remove: vi.fn(),
        };

        await TestBed.configureTestingModule({
            imports: [NotificationsComponent],
            providers: [{ provide: NotificationService, useValue: mockNotificationService }],
        }).compileComponents();
    });

    it('should create the component', () => {
        const fixture = TestBed.createComponent(NotificationsComponent);
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render no notifications when list is empty', () => {
        const fixture = TestBed.createComponent(NotificationsComponent);
        fixture.detectChanges();
        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelectorAll('[role="alert"]').length).toBe(0);
    });

    it('should render a notification when list has one item', () => {
        const fixture = TestBed.createComponent(NotificationsComponent);
        mockNotificationService.notifications.set([
            { id: 1, type: 'success', message: 'All good!', title: 'Success' },
        ]);
        fixture.detectChanges();
        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelectorAll('[role="alert"]').length).toBe(1);
        expect(el.textContent).toContain('All good!');
        expect(el.textContent).toContain('Success');
    });

    it('should render all notifications in the list', () => {
        const fixture = TestBed.createComponent(NotificationsComponent);
        mockNotificationService.notifications.set([
            { id: 1, type: 'success', message: 'Saved!' },
            { id: 2, type: 'error', message: 'Failed!' },
            { id: 3, type: 'warning', message: 'Watch out!' },
        ]);
        fixture.detectChanges();
        const alerts = fixture.nativeElement.querySelectorAll('[role="alert"]');
        expect(alerts.length).toBe(3);
    });

    it('should call remove() when close button is clicked', () => {
        const fixture = TestBed.createComponent(NotificationsComponent);
        mockNotificationService.notifications.set([{ id: 42, type: 'info', message: 'Test' }]);
        fixture.detectChanges();

        const closeButton = fixture.nativeElement.querySelector('button');
        closeButton.click();

        expect(mockNotificationService.remove).toHaveBeenCalledWith(42);
    });

    // ── getClasses() ──────────────────────────────────────────────────────────
    describe('getClasses()', () => {
        it('should return success classes for "success" type', () => {
            const fixture = TestBed.createComponent(NotificationsComponent);
            const result = fixture.componentInstance.getClasses('success');
            expect(result).toContain('emerald');
        });

        it('should return error classes for "error" type', () => {
            const fixture = TestBed.createComponent(NotificationsComponent);
            const result = fixture.componentInstance.getClasses('error');
            expect(result).toContain('rose');
        });

        it('should return warning classes for "warning" type', () => {
            const fixture = TestBed.createComponent(NotificationsComponent);
            const result = fixture.componentInstance.getClasses('warning');
            expect(result).toContain('amber');
        });

        it('should return default (info) classes for unknown type', () => {
            const fixture = TestBed.createComponent(NotificationsComponent);
            const result = fixture.componentInstance.getClasses('info');
            expect(result).toContain('blue');
        });
    });

    // ── getIconClasses() ──────────────────────────────────────────────────────
    describe('getIconClasses()', () => {
        it('should return emerald class for "success"', () => {
            const fixture = TestBed.createComponent(NotificationsComponent);
            expect(fixture.componentInstance.getIconClasses('success')).toContain('emerald');
        });

        it('should return rose class for "error"', () => {
            const fixture = TestBed.createComponent(NotificationsComponent);
            expect(fixture.componentInstance.getIconClasses('error')).toContain('rose');
        });

        it('should return amber class for "warning"', () => {
            const fixture = TestBed.createComponent(NotificationsComponent);
            expect(fixture.componentInstance.getIconClasses('warning')).toContain('amber');
        });

        it('should return blue class for "info"', () => {
            const fixture = TestBed.createComponent(NotificationsComponent);
            expect(fixture.componentInstance.getIconClasses('info')).toContain('blue');
        });
    });
});
