export default class PickleEvents {
    p = null;

    constructor(pickleInstance) {
        this.p = pickleInstance;
    }

    /**
     * Emits custom events for better integration.
     * @param {string} eventName - The event name.
     * @param {Object} detail - Event detail object.
     */
    emit(eventName, detail = {}) {
        if (!this.p.wrapper) return null;

        const event = new CustomEvent(`pickle:${eventName}`, {
            detail: { instance: this.p, ...detail },
            bubbles: true,
            cancelable: true
        });

        try {
            this.p.wrapper.dispatchEvent(event);
            return event;
        } catch (e) {
            if (this.p.debug) console.warn('Event dispatch failed:', e);
            return null;
        }
    }

    /**
     * Attaches all necessary event listeners.
     */
    attachEventListeners() {
        this.p.trigger.addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.p.disabled) {
                this.p.toggle();
            }
        });

        this.p.trigger.addEventListener('keydown', (e) => {
            if (!this.p.disabled) {
                this.p.keyboardNavigation.handleKeydown(e);
            }
        });

        this.p.dropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.pickle-select__option');
            if (option && !option.classList.contains('pickle-select__option--disabled')) {
                this.p.optionManager.toggleOptionSelection(option.getAttribute('data-value'), option);
            }
        });

        this.p.handleDocumentClick = (e) => {
            if (this.p.wrapper && this.p.wrapper.contains && !this.p.wrapper.contains(e.target)) {
                this.p.close();
            }
        };
        document.addEventListener('click', this.p.handleDocumentClick);

        this.p.dropdown.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        });
    }
}