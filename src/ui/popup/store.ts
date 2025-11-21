import { writable } from 'svelte/store';

export type PopupType = 'alert' | 'confirm' | 'prompt';

export interface PopupConfig {
    type: PopupType;
    message: string;
    defaultValue?: string; // For prompt
    onConfirm?: (value?: string) => void;
    onCancel?: () => void;
}

function createPopupStore() {
    const { subscribe, set, update } = writable<PopupConfig | null>(null);

    return {
        subscribe,
        alert: (message: string): Promise<void> => {
            return new Promise((resolve) => {
                set({
                    type: 'alert',
                    message,
                    onConfirm: () => {
                        set(null);
                        resolve();
                    }
                });
            });
        },
        confirm: (message: string): Promise<boolean> => {
            return new Promise((resolve) => {
                set({
                    type: 'confirm',
                    message,
                    onConfirm: () => {
                        set(null);
                        resolve(true);
                    },
                    onCancel: () => {
                        set(null);
                        resolve(false);
                    }
                });
            });
        },
        prompt: (message: string, defaultValue: string = ''): Promise<string | null> => {
            return new Promise((resolve) => {
                set({
                    type: 'prompt',
                    message,
                    defaultValue,
                    onConfirm: (value) => {
                        set(null);
                        resolve(value || null);
                    },
                    onCancel: () => {
                        set(null);
                        resolve(null);
                    }
                });
            });
        },
        close: () => set(null)
    };
}

export const popupStore = createPopupStore();
