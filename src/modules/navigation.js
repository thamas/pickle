export default class PickleNavigation {
    p = null;

    constructor(pickleInstance) {
        this.p = pickleInstance;
    }

    /**
     * Handles keyboard navigation and selection for the component.
     * Supports Enter, Space, Escape, ArrowDown, ArrowUp, Home, and End keys.
     * - Enter/Space: Toggles selection or opens the dropdown.
     * - Escape: Closes the dropdown if open.
     * - ArrowDown/ArrowUp: Opens dropdown or moves focus between options.
     * - Home/End: Focuses the first or last option if dropdown is open.
     *
     * @param {KeyboardEvent} e - The keyboard event triggered by user interaction.
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
                } else if (this.p.openedWithoutFocus && this.p.focusedIndex === -1) {
                    this.p.domManager.focusSelectedOption();
                } else {
                    this.focusNextOption();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (!this.p.isOpen) {
                    this.p.open();
                } else if (this.p.openedWithoutFocus && this.p.focusedIndex === -1) {
                    this.p.domManager.focusSelectedOption();
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
     * Moves focus to the next selectable option in the options list.
     * Skips disabled options and updates the focused index, focused option,
     * applies the focused CSS class, updates ARIA attributes, and scrolls the option into view.
     *
     * @returns {void}
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
     * Moves focus to the previous selectable option in the options list.
     * Skips disabled options and updates the focused index, focused option,
     * and relevant ARIA attributes. Scrolls the newly focused option into view.
     *
     * @returns {void}
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
     * Focuses the first available option in the navigation module.
     * Clears any currently focused option, resets the focused index,
     * and moves focus to the next available option.
     */
    focusFirstOption() {
        this.p.domManager.clearFocusedOption();
        this.p.focusedIndex = -1;
        this.focusNextOption();
    }

    /**
     * Focuses the last option in the options list.
     * Clears any currently focused option, sets the focused index to the last option,
     * and then focuses the previous option to ensure correct focus behavior.
     */
    focusLastOption() {
        this.p.domManager.clearFocusedOption();
        this.p.focusedIndex = this.p.options.length;
        this.focusPreviousOption();
    }

    /**
     * Scrolls the specified option element into view within the dropdown list.
     * Ensures that the option is visible by adjusting the dropdown's scroll position
     * if the option is above or below the currently visible area.
     *
     * @param {HTMLElement} option - The option element to scroll into view.
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