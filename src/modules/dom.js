export default class PickleDOM {
    p = null;

    constructor(pickleInstance) {
        this.p = pickleInstance;
    }

    /**
     * Clears the currently focused option in the select component.
     * Removes the focused CSS class from the option and resets the reference.
     * Also removes the 'aria-activedescendant' attribute from the trigger element for accessibility.
     */
    clearFocusedOption() {
        if (this.p.focusedOption) {
            this.p.focusedOption.classList.remove('pickle-select__option--focused');
            this.p.focusedOption = null;
        }
        this.p.trigger.removeAttribute('aria-activedescendant');
    }

    /**
     * Focuses the currently selected option in the DOM.
     * - If multiple selection is enabled, focuses the first selected value.
     * - If the selected value exists in the DOM, updates the focused index and option,
     *   adds the focused class, sets ARIA attributes, and scrolls the option into view.
     * - If the selected value is not found, logs a warning (if debug is enabled).
     * - If no value is selected, focuses the first option.
     */
    focusSelectedOption() {

        const firstSelectedValue = this.p.isMultiple ?
            (this.p.get()[0] || null) :
            this.p.get();
        if (firstSelectedValue) {
            const selectedInDom = this.p.options.find(opt => opt.getAttribute('data-value') === firstSelectedValue);
            if (selectedInDom) {
                this.p.focusedIndex = this.p.options.indexOf(selectedInDom);
                this.p.focusedOption = selectedInDom;
                this.p.focusedOption.classList.add('pickle-select__option--focused');
                this.p.trigger.setAttribute('aria-activedescendant', this.p.focusedOption.id);
                this.p.keyboardNavigation.scrollOptionIntoView(this.p.focusedOption);
            } else {
                if (this.p.debug) {
                    this.p.utils.log('warn', 'Selected value not found in DOM --> failed to focus', firstSelectedValue);
                }
            }
        } else {
            this.p.keyboardNavigation.focusFirstOption();
        }
    }

    /**
     * Creates a new DOM element with the specified tag and optional class name.
     *
     * @param {string} tag - The type of the element to create (e.g., 'div', 'span').
     * @param {string} [className] - Optional class name to assign to the element.
     * @returns {HTMLElement} The newly created DOM element.
     */
    createElement(tag, className) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        return element;
    }

    /**
     * Retrieves the placeholder text for the select element.
     * If an option with value="" exists, its text content is returned.
     * Otherwise, returns the localized placeholder text.
     *
     * @returns {string} The placeholder text for the select element.
     */
    getPlaceholderText() {
        return this.p.originalSelect.querySelector('option[value=""]')?.textContent || this.p.l10n.placeholder;
    }

    /**
     * Creates a custom-styled select dropdown, replacing the original HTML select element.
     * Handles accessibility attributes, theming, sizing, and value display.
     * Initializes DOM structure, ARIA labeling, and sets the initial value based on configuration.
     *
     * @function
     * @memberof PickleDOM
     * @returns {void}
     */
    createCustomSelect() {
        this.p.originalSelect.style.display = 'none';

        this.p.wrapper = this.createElement('div', 'pickle-select');
        this.p.wrapper.classList.add(`pickle-select--${this.p.theme}`);

        if (this.p.width) {
            this.p.wrapper.style.width = this.p.width;
        }

        this.createLabel();

        this.p.trigger = this.createElement('div', 'pickle-select__trigger');
        this.p.trigger.classList.add(`pickle-select__trigger--${this.p.theme}`);
        this.p.trigger.setAttribute('tabindex', '0');
        this.p.trigger.setAttribute('role', 'combobox');
        this.p.trigger.setAttribute('aria-expanded', 'false');
        this.p.trigger.setAttribute('aria-haspopup', 'listbox');
        this.p.trigger.style.touchAction = 'manipulation';
        this.p.trigger.style.userSelect = 'none';

        if (this.p.height) {
            this.p.trigger.style.height = this.p.height;
        }
        this.p.valueDisplay = this.createElement('span', `pickle-select__value${this.p.isMultiple ? '--multiple' : ''}`);

        this.p.arrow = this.createElement('span', 'pickle-select__arrow');
        this.p.arrow.setAttribute('aria-hidden', 'true');
        this.p.arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>`;

        this.p.dropdown = this.createElement('div', 'pickle-select__dropdown');
        this.p.dropdown.classList.add(`pickle-select__dropdown--${this.p.theme}`);
        this.p.dropdown.setAttribute('role', 'listbox');

        this.p.optionsList = this.createElement('div', 'pickle-select__options-list');
        this.p.dropdown.appendChild(this.p.optionsList);

        this.p.liveRegion = this.createElement('div', 'pickle-select__sr-only');
        this.p.liveRegion.setAttribute('aria-live', 'polite');
        this.p.liveRegion.setAttribute('aria-atomic', 'true');
        this.p.liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';

        this.setupAriaLabeling();

        this.p.trigger.appendChild(this.p.valueDisplay);
        this.p.trigger.appendChild(this.p.arrow);
        this.p.wrapper.appendChild(this.p.trigger);
        this.p.wrapper.appendChild(this.p.dropdown);
        this.p.wrapper.appendChild(this.p.liveRegion);

        this.p.originalSelect.parentNode.insertBefore(this.p.wrapper, this.p.originalSelect.nextSibling);

        if (this.p.defaultValue) {
             this.p.set(this.p.defaultValue);
        } else if (this.p.isMultiple) {
            Array.from(this.p.originalSelect.selectedOptions).forEach(opt => this.p.selectedOptions.add(opt.value));
            this.updateValueDisplay();
         } else if (this.p.originalSelect.value) {
            this.p.optionManager.selectOptionByValue(this.p.originalSelect.value);
        } else {
            this.updateValueDisplay();
        }
    }

    /**
     * Finds an existing label element associated with the original select element.
     * If found, assigns it an ID if it doesn't already have one, and stores the label reference.
     *
     * @returns {void}
     */
    createLabel() {
        const existingLabel = document.querySelector(`label[for="${this.p.originalSelect.id}"]`);
        if (existingLabel) {

            if (!existingLabel.id) {
                existingLabel.id = `pickle-label-${this.p.originalSelect.id || this.p.utils.generateID()}`;
            }
            this.p.label = existingLabel;
        }
    }

    /**
     * Creates and configures the search input element for the dropdown.
     * - Sets input type and placeholder.
     * - Adds event listeners for search, keyboard navigation, and closing.
     * - Prepends the search input to the dropdown element.
     *
     * @returns {void}
     */
    createSearchInput() {
        this.p.searchInput = this.createElement('input', 'pickle-select__search');
        this.p.searchInput.type = 'text';
        this.p.searchInput.placeholder = this.p.l10n.searchPlaceholder;
        this.p.searchInput.addEventListener('input', (e) => this.p.optionManager.handleSearch(e));
        this.p.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.p.trigger.focus();
                this.p.keyboardNavigation.handleKeydown(e);
            } else if (e.key === 'Escape') {
                this.p.close();
                this.p.trigger.focus();
            }
        });

        this.p.dropdown.prepend(this.p.searchInput);
    }

    /**
     * Updates the display element to show the currently selected value(s).
     * - For multiple selections:
     *   - Shows placeholder if no values are selected.
     *   - Shows a summary text if 4 or more values are selected.
     *   - Otherwise, displays each selected value as a tag with a remove button.
     * - For single selection:
     *   - Shows the selected value or the placeholder text.
     *
     * @returns {void}
     */
    updateValueDisplay() {
        this.p.valueDisplay.innerHTML = '';
        const selectedValues = this.p.get();

        if (this.p.isMultiple) {
            if (selectedValues.length === 0) {
                this.p.valueDisplay.textContent = this.getPlaceholderText();
            } else if (selectedValues.length >= 4) {
                this.p.valueDisplay.textContent = this.p.l10n.multipleSelection.replace('{count}', selectedValues.length);
            } else {
                selectedValues.forEach(value => {
                    const optionData = this.p.sourceOptions.find(opt => !opt.isGroupLabel && opt.value === value);
                    if (optionData) {
                        const tag = this.createElement('button', 'pickle-select__tag');
                        tag.type = 'button';

                        const sanitizer = document.createElement('div');
                        sanitizer.textContent = optionData.text;

                        tag.textContent = optionData.text;
                        tag.setAttribute('aria-label', `Remove ${sanitizer.innerHTML}`);

                        const removeBtn = this.createElement('span', 'pickle-select__tag-remove');
                        removeBtn.innerHTML = '&times;';

                        tag.addEventListener('click', e => {
                            e.stopPropagation();
                            this.p.optionManager.toggleOptionSelection(value);
                        });
                        tag.appendChild(removeBtn);
                        this.p.valueDisplay.appendChild(tag);
                    }
                });
            }
        } else { 
            this.p.valueDisplay.textContent = this.p.getText() || this.getPlaceholderText();
        }
    }

    /**
     * Sets up ARIA labeling for the dropdown component to improve accessibility.
     * - Assigns 'aria-multiselectable' to the dropdown based on whether multiple selection is enabled.
     * - If a label element exists, ensures it has an ID and sets 'aria-labelledby' on the trigger.
     * - If no label is present, sets 'aria-label' on the trigger using a localized string.
     * - Ensures the dropdown has a unique ID and sets 'aria-controls' on the trigger.
     */
    setupAriaLabeling() {
        this.p.dropdown.setAttribute('aria-multiselectable', String(this.p.isMultiple));

        if (this.p.label) {

            if (!this.p.label.id) {
                this.p.label.id = `pickle-label-${this.p.originalSelect.id || this.p.utils.generateID()}`;
            }
            this.p.trigger.setAttribute('aria-labelledby', this.p.label.id);
        } else {

            this.p.trigger.setAttribute('aria-label', this.p.l10n.ariaLabel);
        }

        if (!this.p.dropdown.id) {
            this.p.dropdown.id = `pickle-dropdown-${this.p.utils.generateID()}`;
        }
        this.p.trigger.setAttribute('aria-controls', this.p.dropdown.id);
    }

    /**
     * Updates the UI to reflect the selected state of each option element.
     * Iterates through all option elements, checks if each is selected,
     * and toggles the corresponding CSS class and ARIA attribute.
     *
     * @returns {void}
     */
    refreshSelectedStateInUI() {
        this.p.options.forEach(optionEl => {
            if (optionEl.getAttribute('role') !== 'option') return;

            const value = optionEl.getAttribute('data-value');
            const isSelected = this.p.isMultiple ? this.p.selectedOptions.has(value) : this.p.originalSelect.value === value;

            optionEl.classList.toggle('pickle-select__option--selected', isSelected);
            optionEl.setAttribute('aria-selected', String(isSelected));
        });
    }

    /**
     * Refreshes the dropdown view by clearing the current options,
     * resetting the focused index, and rendering a new chunk of options.
     * This method also clears any focused option state.
     */
    refreshDropdownView() {
        this.p.optionsList.innerHTML = '';
        this.p.options = [];
        this.p.focusedIndex = -1;
        this.clearFocusedOption();
        this.p.optionManager.renderChunk();
    }

    /**
     * Highlights occurrences of the current search term within the given text.
     * If fuzzy search is enabled, highlights each matching character in order.
     * Otherwise, highlights exact matches of the search term.
     * The input text is sanitized to prevent XSS.
     *
     * @param {string} text - The text in which to highlight matches.
     * @returns {string} The HTML string with matched characters or terms wrapped in <mark> tags.
     */
    highlightMatches(text) {
        const sanitizer = document.createElement('div');
        sanitizer.textContent = text;
        const safeText = sanitizer.innerHTML;
        const searchTerm = this.p.currentSearchTerm;
        if (!searchTerm) {
            return safeText;
        }
        if (this.p.fuzzySearch) {
            let highlighted = '';
            let searchIndex = 0;
            let textIndex = 0;
            const lowerSearch = searchTerm.toLowerCase();

            while (textIndex < safeText.length) {
                if (searchIndex < lowerSearch.length && safeText[textIndex].toLowerCase() === lowerSearch[searchIndex]) {
                    highlighted += `<mark>${safeText[textIndex]}</mark>`;
                    searchIndex++;
                } else {
                    highlighted += safeText[textIndex];
                }
                textIndex++;
            }
            return highlighted;
        } 
        const regex = new RegExp(`(${this.p.utils.escapeRegExp(searchTerm)})`, 'gi');
        return safeText.replace(regex, '<mark>$1</mark>');
    }
}