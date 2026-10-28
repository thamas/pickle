export default class PickleEvents {
    p = null;

    constructor(pickleInstance) {
        this.p = pickleInstance;
    }

    /**
     * Emits a custom event from the wrapper element with the given event name and detail.
     *
     * @param {string} eventName - The name of the event to emit (without the 'pickle:' prefix).
     * @param {Object} [detail={}] - Additional data to include in the event's detail.
     * @returns {CustomEvent|null} The dispatched CustomEvent object, or null if dispatch failed or wrapper is missing.
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
     * Attaches all necessary event listeners to the Pickle select component elements.
     * Handles click and keyboard events for the trigger, option selection in the dropdown,
     * document click for closing the dropdown, and touchmove event propagation.
     *
     * @returns {void}
     */
    attachEventListeners() {
        this.p.trigger.addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.p.disabled) {
                this.p.toggle();
            }
        });

        this.p.trigger.addEventListener('keydown', (e) => {
            // Tags are native buttons; let Enter/Space fire their click.
            if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.pickle-select__tag')) return;
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