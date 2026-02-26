import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
    let service: NotificationService;

    beforeEach(() => {
        vi.useFakeTimers();
        TestBed.configureTestingModule({});
        service = TestBed.inject(NotificationService);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should start with an empty notifications list', () => {
        expect(service.notifications()).toEqual([]);
    });

    describe('show()', () => {
        it('should add a notification with correct properties', () => {
            service.show('Test message', 'info', 'Test Title');
            const notifications = service.notifications();
            expect(notifications.length).toBe(1);
            expect(notifications[0].message).toBe('Test message');
            expect(notifications[0].type).toBe('info');
            expect(notifications[0].title).toBe('Test Title');
        });

        it('should assign unique numeric IDs to each notification', () => {
            service.show('First', 'info');
            service.show('Second', 'error');
            const notifications = service.notifications();
            expect(notifications[0].id).not.toEqual(notifications[1].id);
        });

        it('should auto-remove a notification after 5 seconds', () => {
            service.show('Auto remove me', 'info');
            expect(service.notifications().length).toBe(1);

            vi.advanceTimersByTime(5000);

            expect(service.notifications().length).toBe(0);
        });

        it('should NOT remove a notification before 5 seconds have elapsed', () => {
            service.show('Do not remove yet', 'info');
            expect(service.notifications().length).toBe(1);

            vi.advanceTimersByTime(4999);
            expect(service.notifications().length).toBe(1);

            vi.advanceTimersByTime(1); // Complete the 5 seconds
            expect(service.notifications().length).toBe(0);
        });

        it('should default to "info" type when no type is provided', () => {
            service.show('Default type test');
            expect(service.notifications()[0].type).toBe('info');
        });

        it('should handle multiple concurrent notifications', () => {
            service.show('First', 'success');
            service.show('Second', 'error');
            service.show('Third', 'warning');
            expect(service.notifications().length).toBe(3);

            vi.advanceTimersByTime(5000);
            expect(service.notifications().length).toBe(0);
        });
    });

    describe('success()', () => {
        it('should add a success notification', () => {
            service.success('Operation done');
            const n = service.notifications()[0];
            expect(n.type).toBe('success');
            expect(n.message).toBe('Operation done');
        });

        it('should use "Success" as default title', () => {
            service.success('Done!');
            expect(service.notifications()[0].title).toBe('Success');
        });

        it('should accept a custom title', () => {
            service.success('Done!', 'Custom Title');
            expect(service.notifications()[0].title).toBe('Custom Title');
        });
    });

    describe('error()', () => {
        it('should add an error notification', () => {
            service.error('Something went wrong');
            const n = service.notifications()[0];
            expect(n.type).toBe('error');
            expect(n.message).toBe('Something went wrong');
        });

        it('should use "Error" as default title', () => {
            service.error('Oops');
            expect(service.notifications()[0].title).toBe('Error');
        });
    });

    describe('info()', () => {
        it('should add an info notification', () => {
            service.info('Just FYI');
            const n = service.notifications()[0];
            expect(n.type).toBe('info');
            expect(n.message).toBe('Just FYI');
        });

        it('should use "Info" as default title', () => {
            service.info('FYI');
            expect(service.notifications()[0].title).toBe('Info');
        });
    });

    describe('warning()', () => {
        it('should add a warning notification', () => {
            service.warning('Be careful');
            const n = service.notifications()[0];
            expect(n.type).toBe('warning');
            expect(n.message).toBe('Be careful');
        });

        it('should use "Warning" as default title', () => {
            service.warning('Careful');
            expect(service.notifications()[0].title).toBe('Warning');
        });
    });

    describe('remove()', () => {
        it('should remove a notification by its ID', () => {
            service.success('Keep me');
            service.error('Remove me');
            const idToRemove = service.notifications()[1].id;

            service.remove(idToRemove);

            expect(service.notifications().length).toBe(1);
            expect(service.notifications()[0].message).toBe('Keep me');
        });

        it('should do nothing when removing a non-existent ID', () => {
            service.success('I exist');
            service.remove(9999);
            expect(service.notifications().length).toBe(1);
        });

        it('should remove all notifications when called for each', () => {
            service.success('One');
            service.error('Two');
            const ids = service.notifications().map((n) => n.id);
            ids.forEach((id) => service.remove(id));
            expect(service.notifications().length).toBe(0);
        });
    });
});
