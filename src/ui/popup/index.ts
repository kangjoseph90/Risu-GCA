import { popupStore } from './store';

export { default as Popup } from './Popup.svelte';

// Convenience functions for easy imports
export const alert = (message: string) => popupStore.alert(message);
export const confirm = (message: string) => popupStore.confirm(message);
export const prompt = (message: string, defaultValue?: string) => popupStore.prompt(message, defaultValue || '');
