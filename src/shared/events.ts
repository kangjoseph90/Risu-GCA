type EventListener = (...args: any[]) => void;

class EventEmitter {
    private events: Map<string, EventListener[]> = new Map();

    on(event: string, listener: EventListener): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(listener);
    }

    off(event: string, listener: EventListener): void {
        if (!this.events.has(event)) return;
        const listeners = this.events.get(event)!;
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    emit(event: string, ...args: any[]): void {
        if (!this.events.has(event)) return;
        const listeners = this.events.get(event)!;
        for (const listener of listeners) {
            listener(...args);
        }
    }

    once(event: string, listener: EventListener): void {
        const onceWrapper = (...args: any[]) => {
            listener(...args);
            this.off(event, onceWrapper);
        };
        this.on(event, onceWrapper);
    }
}

export const eventEmitter = new EventEmitter();

// Event types
export enum AppEvent {
    USER_LOGOUT = 'user:logout',
    BACKUP_RESTORE = 'backup:restore',
}
