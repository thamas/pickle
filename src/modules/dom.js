export default class PickleDOM {
    p = null;

    constructor(pickleInstance) {
        this.p = pickleInstance;
    }

    /**
     * Clears the currently focused option.
     */
    clearFocusedOption() {
        if (this.p.focusedOption) {
            this.p.focusedOption.classList.remove('pickle-select__option--focused');
            this.p.focusedOption = null;
        }
        this.p.trigger.removeAttribute('aria-activedescendant');
    }

    /**
     * Focuses the first selected option when opening the dropdown.
     */
    focusSelectedOption() {
        // Focus the first selected option when opening
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
     * Creates a new DOM element.
     * @param {string} tag - The HTML tag name.
     * @param {string} [className] - Optional CSS class name.
     * @returns {HTMLElement} The newly created element.
     */
    createElement(tag, className) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        return element;
    }

    /**
     * Gets the placeholder text.
     * @returns {string} The placeholder text.
     */
    getPlaceholderText() {
        return this.p.originalSelect.querySelector('option[value=""]')?.textContent || this.p.l10n.placeholder;
    }

    /**
     * Creates a custom select UI component to replace the original HTML select element.
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

        // Set initial selected values
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
     * Creates a new label element for the custom select component.
     */
    createLabel() {
        const existingLabel = document.querySelector(`label[for="${this.p.originalSelect.id}"]`);
        if (existingLabel) {
            // Don't remove existing label, just ensure it has an ID for accessibility
            if (!existingLabel.id) {
                existingLabel.id = `pickle-label-${this.p.originalSelect.id || this.p.utils.generateID()}`;
            }
            this.p.label = existingLabel;
        }
    }

    /**
     * Creates a search input for filtering options.
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
     * Updates the text/tags shown in the trigger element based on current selection.
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
                        const tag = this.createElement('span', 'pickle-select__tag');
                        
                        tag.textContent = optionData.text; 

                        const removeBtn = this.createElement('button', 'pickle-select__tag-remove');
                        removeBtn.type = 'button';
                        removeBtn.innerHTML = '&times;';

                        const sanitizer = document.createElement('div');
                        sanitizer.textContent = optionData.text;
                        removeBtn.setAttribute('aria-label', `Remove ${sanitizer.innerHTML}`);

                        removeBtn.addEventListener('click', e => {
                            e.stopPropagation();
                            this.p.optionManager.toggleOptionSelection(value);
                        });
                        tag.appendChild(removeBtn);
                        this.p.valueDisplay.appendChild(tag);
                    }
                });
            }
        } else { // Single select
            this.p.valueDisplay.textContent = this.p.getText() || this.getPlaceholderText();
        }
    }

    /**
     * Sets up ARIA labeling for the custom select component.
     */
    setupAriaLabeling() {
        this.p.dropdown.setAttribute('aria-multiselectable', String(this.p.isMultiple));
        
        if (this.p.label) {
            // We have a label (either existing or created)
            if (!this.p.label.id) {
                this.p.label.id = `pickle-label-${this.p.originalSelect.id || this.p.utils.generateID()}`;
            }
            this.p.trigger.setAttribute('aria-labelledby', this.p.label.id);
        } else {
            // No label exists, use aria-label
            this.p.trigger.setAttribute('aria-label', this.p.l10n.ariaLabel);
        }

        if (!this.p.dropdown.id) {
            this.p.dropdown.id = `pickle-dropdown-${this.p.utils.generateID()}`;
        }
        this.p.trigger.setAttribute('aria-controls', this.p.dropdown.id);
    }

    /**
     * Ensures all `aria-selected` and class names on rendered options match the current state.
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
     * Clears and re-renders the options list from the visible options data array.
     */
    refreshDropdownView() {
        this.p.optionsList.innerHTML = '';
        this.p.options = [];
        this.p.focusedIndex = -1;
        this.clearFocusedOption();
        this.p.optionManager.renderChunk();
    }

    /**
     * Takes a string and wraps matching substrings in <mark> tags.
     * @param {string} text - The option text to highlight.
     * @returns {string} - An HTML string with matches highlighted.
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