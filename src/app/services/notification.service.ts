import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
    id: number;
    type: NotificationType;
    message: string;
    title?: string;
    position?: 'right' | 'left';
}

@Injectable({
    providedIn: 'root',
})
export class NotificationService {
    private nextId = 0;
    readonly notifications = signal<Notification[]>([]);

    show(message: string, type: NotificationType = 'info', title?: string, position: 'right' | 'left' = 'right') {
        const id = this.nextId++;
        const notification: Notification = { id, type, message, title, position };

        this.notifications.update((items) => [...items, notification]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.remove(id);
        }, 5000);
    }

    success(message: string, title: string = 'Success') {
        this.show(message, 'success', title);
    }

    error(message: string, title: string = 'Error') {
        this.show(message, 'error', title);
    }

    info(message: string, title: string = 'Info') {
        this.show(message, 'info', title);
    }

    warning(message: string, title: string = 'Warning') {
        this.show(message, 'warning', title);
    }

    remove(id: number) {
        this.notifications.update((items) => items.filter((n) => n.id !== id));
    }
}
