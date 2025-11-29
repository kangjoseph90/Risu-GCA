import OpenButton from './OpenButton.svelte';
import { Popup } from './popup';
export class UI {
    private readonly OPEN_BUTTON_ID = 'risu-gca-openbutton';
    private readonly TARGET_SELECTOR = 'div.rs-setting-cont-3';

    private openButtonComponent: OpenButton | null = null;
    private popupContainer: HTMLDivElement | null = null;
    private popupComponent: Popup | null = null;
    private observer: MutationObserver | null = null;


    constructor() {
        this.initialize();
        this.addPopup();
    }

    addPopup() {
        this.popupContainer = document.createElement('div');
        this.popupContainer.id = 'risu-gca-container';
        document.body.appendChild(this.popupContainer);
        this.popupComponent = new Popup({
            target: this.popupContainer,
        });
    }

    removePopup() {
        if (this.popupComponent) {
            this.popupComponent.$destroy();
            this.popupComponent = null;
        }
        if (this.popupContainer) {
            this.popupContainer.remove();
            this.popupContainer = null;
        }
    }

    initialize() {
        this.dispose();
        this.setupObserver();
        
        // 이미 존재하는 요소 처리
        const existingContainer = document.querySelector(this.TARGET_SELECTOR);
        if (existingContainer) {
            this.tryAddOpenButton(existingContainer);
        }
    }

    private setupObserver() {
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    const element = node as Element;
                    
                    // setting-bg가 추가되면 그 안에서 타겟 검색
                    if (element.classList.contains('setting-bg')) {
                        const target = element.querySelector(this.TARGET_SELECTOR);
                        if (target) {
                            this.tryAddOpenButton(target);
                        }
                    }
                }
            }
        });

        // main의 직접 자식만 observe (subtree: false)
        const observeTarget = document.querySelector('main') || document.getElementById('app');
        if (observeTarget) {
            this.observer.observe(observeTarget, {
                childList: true,
                subtree: false
            });
        }
    }

    private tryAddOpenButton(buttonContainer: Element) {
        const openButton = document.getElementById(this.OPEN_BUTTON_ID);
        if (!openButton) {
            this.addOpenButton(buttonContainer);
        }
    }

    dispose() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    addOpenButton(buttonContainer: Element) {
        this.openButtonComponent = new OpenButton({
            target: buttonContainer,
            props: {
                id: this.OPEN_BUTTON_ID,
            }
        })
    }

    removeOpenButton() {
        if (this.openButtonComponent) {
            this.openButtonComponent.$destroy();
            this.openButtonComponent = null;
        }
        const openButton = document.getElementById(this.OPEN_BUTTON_ID);
        if (openButton) {
            openButton.remove();
        }
    }

    destroy() {
        this.dispose();
        this.removeOpenButton();
        this.removePopup();
    }
}
