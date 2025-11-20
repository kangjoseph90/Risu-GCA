//@ts-ignore
import './style.css';
import OpenButton from './OpenButton.svelte';
import { RisuAPI } from './api';

/* Plugin Entry */

const container = document.createElement('div');
document.body.appendChild(container);

// Mount OpenButton component
new OpenButton({
    target: container,
});

// Cleanup OpenButton on unload
RisuAPI.onUnload(() => {
    if (container) {
        container.remove();
    }
})