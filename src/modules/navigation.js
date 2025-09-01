export default class PickleNavigation {
    p = null;

    constructor(pickleInstance) {
        this.p = pickleInstance;
    }

    /**
     * Handles keyboard events.
     * @param {KeyboardEvent} e - The keyboard event object.
     */
    handleKeydown(e) {
        switch (e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (this.p.isOpen && this.p.focusedOption) {
                    this.p.optionManager.toggleOptionSelection(this.p.focusedOption.getAttribute('data-value'), this.p.focusedOption);
                } else {
                    this.p.toggle();
                }
                break;
            case 'Escape':
                if (this.p.isOpen) {
                    e.preventDefault();
                    this.p.close();
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (!this.p.isOpen) {
                    this.p.open();
                } else {
                    this.focusNextOption();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (!this.p.isOpen) {
                    this.p.open();
                } else {
                    this.focusPreviousOption();
                }
                break;
            case 'Home':
                if (this.p.isOpen) {
                    e.preventDefault();
                    this.focusFirstOption();
                }
                break;
            case 'End':
                if (this.p.isOpen) {
                    e.preventDefault();
                    this.focusLastOption();
                }
                break;
        }
    }

    /**
     * Focuses the next selectable option.
     */
    focusNextOption() {
        this.p.domManager.clearFocusedOption();
        let nextIndex = this.p.focusedIndex > -1 ? this.p.focusedIndex + 1 : 0;

        while (nextIndex < this.p.options.length) {
            const option = this.p.options[nextIndex];
            if (option.getAttribute('role') === 'option' && !option.classList.contains('pickle-select__option--disabled')) {
                this.p.focusedIndex = nextIndex;
                this.p.focusedOption = option;
                option.classList.add('pickle-select__option--focused');
                this.p.trigger.setAttribute('aria-activedescendant', option.id);
                this.scrollOptionIntoView(option);
                return;
            }
            nextIndex++;
        }
    }

    /**
     * Focuses the previous selectable option.
     */
    focusPreviousOption() {
        this.p.domManager.clearFocusedOption();
        let prevIndex = this.p.focusedIndex > -1 ? this.p.focusedIndex - 1 : this.p.options.length -1;
        
        while (prevIndex >= 0) {
            const option = this.p.options[prevIndex];
            if (option.getAttribute('role') === 'option' && !option.classList.contains('pickle-select__option--disabled')) {
                this.p.focusedIndex = prevIndex;
                this.p.focusedOption = option;
                option.classList.add('pickle-select__option--focused');
                this.p.trigger.setAttribute('aria-activedescendant', option.id);
                this.scrollOptionIntoView(option);
                return;
            }
            prevIndex--;
        }
    }

    /**
     * Focuses the first available option.
     */
    focusFirstOption() {
        this.p.domManager.clearFocusedOption();
        this.p.focusedIndex = -1;
        this.focusNextOption();
    }

    /**
     * Focuses the last available option.
     */
    focusLastOption() {
        this.p.domManager.clearFocusedOption();
        this.p.focusedIndex = this.p.options.length;
        this.focusPreviousOption();
    }

    /**
     * Scrolls an option into view.
     * @param {HTMLElement} option - The option element.
     */
    scrollOptionIntoView(option) {
        if (option && this.p.dropdown.scrollHeight > this.p.dropdown.clientHeight) {
            const optionTop = option.offsetTop;
            const optionBottom = optionTop + option.offsetHeight;
            const listTop = this.p.dropdown.scrollTop;
            const listBottom = listTop + this.p.dropdown.clientHeight;

            if (optionTop < listTop) {
                this.p.dropdown.scrollTop = optionTop;
            } else if (optionBottom > listBottom) {
                this.p.dropdown.scrollTop = optionBottom - this.p.dropdown.clientHeight;
            }
        }
    }
}