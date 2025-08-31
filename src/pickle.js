/**
 * Pickle is a class for creating custom select dropdowns with enhanced functionality
 * and accessibility features.
 *
 * @class
 * @classdesc Transforms native select elements into custom dropdowns with keyboard navigation,
 * ARIA support, and customizable styling.
 */
export default class Pickle {

    static instances = new Set();
    static defaultStrings = {
        placeholder: 'Select an option',
        searchPlaceholder: 'Search options...',
        selectionCleared: 'Selection cleared',
        selected: 'Selected: {text}',
        multipleSelection: '{count} options selected',
        ariaLabel: 'Select an option'
    };

    #sourceOptions = []; // The true source of all options
    #visibleOptions = []; // The currently visible options (after search)
    #currentSearchTerm = '';
    #cnt = 0;

    /**
     * Creates an instance of Pickle
     *
     * @param {HTMLElement|string} elementOrID - The select element or its ID to initialize Pickle with.
     * @param {Object} [options={}] - Configuration options.
     * @param {Function} [options.onChange] - Optional callback function to be called when the selection changes.
     * @param {string|string[]} [options.defaultValue] - Optional default value(s) to set for the select element.
     * @param {string} [options.theme='default'] - Optional theme to apply to the select element.
     * @param {string} [options.width='100%'] - Optional width to apply to the select element.
     * @param {string} [options.height] - Optional height to apply to the select element.
     * @param {boolean} [options.disabled=false] - Whether the select should be disabled.
     * @param {boolean} [options.searchable=false] - Whether to enable search functionality.
     * @param {boolean} [options.multiple=false] - Whether to enable multi-select.
     * @param {boolean} [options.debug=false] - Optional flag to enable debug logging.
     */
    constructor(elementOrID, options = {}) {
        const {
            onChange = null,
            defaultValue = null,
            theme = null,
            width = null,
            height = null,
            disabled = null,
            required = null,
            searchable = null,
            fuzzySearch = null,
            multiple = null,
            debug = null,
            l10n = null
        } = options;
        this.debug = debug;
        this.init(elementOrID, onChange, defaultValue, theme, width, height, disabled, required, searchable, fuzzySearch, multiple, debug);
        this.l10n = { ...Pickle.defaultStrings, ...l10n };

        this.isOpen = false;
        this.selectedOption = null; // Used for single-select mode
        this.selectedOptions = new Set(); // Used for multi-select mode
        this.focusedOption = null;
        this.focusedIndex = -1;
        this.searchInput = null;
        this.options = [];
        this.optionsList = null;

        this.#cacheOptions();
        this.#createCustomSelect();
        this.#buildOptions();
        this.#attachEventListeners();

        if (this.disabled) {
            this.setDisabled(true);
        }
        if (this.searchable) {
            this.setSearchable(true);
        }
        Pickle.instances.add(this);
    }

    /**
     * Initializes the Pickle instance with the provided configuration.
     *
     * @param {HTMLElement|string} elementOrID - The select element or its ID to initialize Pickle with.
     * @param {Function} [onChange] - Optional callback function.
     * @param {string|string[]} [defaultValue] - Optional default value(s).
     * @param {string} [theme] - Optional theme.
     * @param {string} [width] - Optional width.
     * @param {string} [height] - Optional height.
     * @param {boolean} [disabled] - Whether the select should be disabled.
     * @param {boolean} [searchable] - Whether to enable search.
     * @param {boolean} [multiple] - Whether to enable multi-select.
     * @param {boolean} [debug=false] - Optional flag to enable debug logging.
     * @throws {Error} Throws an error if the provided select element is invalid.
     */
    init(elementOrID, onChange, defaultValue, theme, width, height, disabled, required, searchable, fuzzySearch, multiple, debug) {
        try {
            this.originalSelect = this.#getElement(elementOrID);
            if (!this.originalSelect) {
                throw new Error('Invalid select element provided');
            }

            this.isMultiple = this.originalSelect.multiple || Boolean(multiple);
            this.originalSelect.multiple = this.isMultiple;

            this.onChange = this.#getOnChange(onChange);
            this.defaultValue = this.#getDefaultValue(defaultValue);
            this.theme = theme || 'default';
            this.width = width || '100%';
            this.height = height || null;
            this.disabled = Boolean(disabled);
            this.required = Boolean(required);
            this.searchable = Boolean(searchable);
            this.fuzzySearch = Boolean(fuzzySearch);
            this.debug = Boolean(debug);

            this.#log('log', 'Pickle initialized successfully');
        } catch (error) {
            if (debug) {
                console.error('Pickle initialization error:', error);
            }
            throw error;
        }
    }

    /**
     * Opens the dropdown menu if not disabled.
     * Emits a 'beforeOpen' event and aborts if prevented.
     * Closes other instances, updates state, and sets ARIA attributes.
     * Focuses the search input if present.
     * Focuses the first selected option, or the first option if none selected.
     * Emits an 'open' event and logs the action.
     *
     * @returns {void}
     */
    open() {
        if (this.disabled) return;

        const event = this.#emit('beforeOpen');
        if (!event || event.defaultPrevented) return;

        this.#closeOtherInstances();

        this.isOpen = true;
        this.dropdown.classList.add('pickle-select__dropdown--open');
        this.trigger.setAttribute('aria-expanded', 'true');

        this.#clearFocusedOption();

        if (this.searchInput) {
            setTimeout(() => {
                if (this.wrapper && this.searchInput) {
                    this.searchInput.focus();
                }
            }, 0);
        }

        // Focus the first selected option when opening
        const firstSelectedValue = this.isMultiple ?
            (this.get()[0] || null) :
            this.get();
        if (firstSelectedValue) {
            const selectedInDom = this.options.find(opt => opt.getAttribute('data-value') === firstSelectedValue);
            if (selectedInDom) {
                this.focusedIndex = this.options.indexOf(selectedInDom);
                this.focusedOption = selectedInDom;
                this.focusedOption.classList.add('pickle-select__option--focused');
                this.trigger.setAttribute('aria-activedescendant', this.focusedOption.id);
                this.#scrollOptionIntoView(this.focusedOption);
            } else {
                if (this.debug) {
                    this.#log('warn', 'Selected value not found in DOM --> failed to focus', firstSelectedValue);
                }
                this.#focusFirstOption();
            }
        } else {
            this.#focusFirstOption();
        }

        this.#emit('open');
        this.#log('log', 'Dropdown opened');
    }

    /**
     * Closes the dropdown menu if it is open.
     * Emits 'beforeClose' and 'close' events.
     * Prevents closing if 'beforeClose' is prevented.
     * Updates ARIA attributes and resets focused option.
     * Clears search input if present and returns focus to the trigger element.
     */
    close() {
        if (!this.isOpen) return;

        const event = this.#emit('beforeClose');
        if (!event || event.defaultPrevented) return;

        this.isOpen = false;
        this.dropdown.classList.remove('pickle-select__dropdown--open');
        this.trigger.setAttribute('aria-expanded', 'false');
        this.trigger.removeAttribute('aria-activedescendant');
        this.focusedIndex = -1;
        this.#clearFocusedOption();

        if (this.searchInput) {
            this.searchInput.value = '';
            this.#handleSearch({ target: { value: '' } });
        }
        
        this.trigger.focus(); // Return focus to trigger on close
        this.#emit('close');
        this.#log('log', 'Dropdown closed');
    }


    /**
     * Toggles the open/close state.
     * If the current state is open, it calls the `close()` method.
     * If the current state is closed, it calls the `open()` method.
     */
    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    /**
     * Sets the selected value(s) for the picker.
     * Clears the current selection silently, then selects the provided value(s).
     * For multiple selection mode, all values in the array are selected.
     * For single selection mode, only the first value is used.
     * Fires a single change event after updating the selection.
     *
     * @param {any|any[]} value - The value(s) to set as selected. Can be a single value or an array of values.
     */
    set(value) {
        this.clear(true); // Clear silently

        const valuesToSet = Array.isArray(value) ? value : [value];

        if (this.isMultiple) {
            valuesToSet.forEach(v => this.#toggleOptionSelection(v, null, true));
            this.#fireChangeEvent();
        } else {
            if (valuesToSet.length > 0) {
                const singleValue = valuesToSet[0];
                this.#toggleOptionSelection(singleValue, null, true);
                const optionData = this.#sourceOptions.find(o => !o.isGroupLabel && o.value === singleValue);
                this.#fireChangeEvent(optionData || {});
            } else {
                this.#fireChangeEvent();
            }
        }
    }

    /**
     * Clears the current selection.
     * @param {boolean} [silent=false] - If true, 'change' events will not be fired.
     */
    clear(silent = false) {
        if (this.isMultiple) {
            // Uncheck all original options
            Array.from(this.originalSelect.options).forEach(opt => opt.selected = false);
            this.selectedOptions.clear();
        } else {
            this.originalSelect.value = '';
            this.#clearSelectedOption(); // Clear UI for single-select
        }

        this.#refreshSelectedStateInUI(); // Update all rendered options
        this.#updateValueDisplay(); // Update the trigger display

        if (!silent) {
            // Firing events for clear is a special case where text should be empty string
            const value = this.get();
            const text = this.isMultiple ? [] : '';
            if (this.onChange) {
                this.onChange(value, { originalEvent: null, text, element: this });
            }
            this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
            this.#emit('change', { value, text });
            this.#log('log', 'Selection changed:', {value, text});

            if (this.liveRegion) {
                this.liveRegion.textContent = '';
                setTimeout(() => {
                    if (this.wrapper && this.liveRegion) {
                        this.liveRegion.textContent = this.l10n.selectionCleared;
                    }
                }, 50);
            }
        }
    }

    /**
     * Checks if the component is disabled.
     * @returns {boolean} True if disabled.
     */
    isDisabled() {
        return !!this.disabled;
    }

    /**
     * Checks if the original select element is marked as required.
     *
     * @returns {boolean} True if the select element is required, otherwise false.
     */
    isRequired() {
        return !!this.required;
    }

    /**
     * Determines if the current instance is searchable.
     * @returns {boolean} True if searchable, otherwise false.
     */
    isSearchable() {
        return !!this.searchable;
    }

    /**
     * Retrieves the current value(s) of the select. Returns an array for multi-select.
     * @returns {string|string[]} The value or an array of values.
     */
    get() {
        if (this.isMultiple) {
            return Array.from(this.selectedOptions);
        }
        return this.originalSelect.value;
    }

    /**
     * Returns the currently selected option element(s). Returns an array for multi-select.
     * @returns {HTMLElement|HTMLElement[]|null} The selected option element(s).
     */
    getOption() {
        if (this.isMultiple) {
            return this.options.filter(opt =>
                this.selectedOptions.has(opt.getAttribute('data-value'))
            );
        }
        return this.selectedOption;
    }

    /**
     * Retrieves the text of the currently selected option(s). Returns an array for multi-select.
     * @returns {string|string[]} The text or an array of texts.
     */
    getText() {
        if (this.isMultiple) {
            return Array.from(this.selectedOptions).map(value => {
                const optData = this.#sourceOptions.find(opt => !opt.isGroupLabel && opt.value === value);
                return optData ? optData.text : '';
            });
        }
        const value = this.get();
        if (!value) {
            return '';
        }
        return (this.selectedOption ? this.selectedOption.textContent : this.#sourceOptions.find(o => o.value === value)?.text) || '';
    }

    /**
     * Retrieves all available options with their values and text.
     * @returns {Array<Object>} Array of option objects with value, text, and disabled properties.
     */
    getOptions() {
        return this.#sourceOptions
            .filter(opt => !opt.isGroupLabel)
            .map(opt => ({
                value: opt.value,
                text: opt.text,
                disabled: opt.disabled,
                selected: this.isMultiple ? this.selectedOptions.has(opt.value) : this.originalSelect.value === opt.value
            }));
    }

    /**
     * Adds a new option to the select.
     * @param {string} value - The option value.
     * @param {string} text - The option display text.
     * @param {number} [index=-1] - Position to insert (end if -1).
     * @param {boolean} [disabled=false] - Whether the option is disabled.
     */
    addOption(value, text, index = -1, disabled = false) {
        const option = new Option(text, value);
        option.disabled = disabled;

        if (index === -1 || index >= this.originalSelect.options.length) {
            this.originalSelect.appendChild(option);
        } else {
            this.originalSelect.insertBefore(option, this.originalSelect.options[index]);
        }

        this.#cacheOptions();
        this.#refreshDropdownView();

        this.#emit('optionAdded', { value, text, index, disabled });
        this.#log('log', 'Option added:', { value, text, index, disabled });
    }

    /**
     * Removes an option by its value.
     * @param {string} value - The value of the option to remove.
     */
    removeOption(value) {
        const wasSelected = this.isMultiple ? this.selectedOptions.has(value) : this.get() === value;

        const option = Array.from(this.originalSelect.options)
            .find(opt => opt.value === value);

        if (option) {
            option.remove();

            if (wasSelected) {
                if (this.isMultiple) {
                    this.selectedOptions.delete(value);
                    this.#updateValueDisplay();
                } else {
                    this.clear();
                }
            }

            this.#cacheOptions();
            this.#refreshDropdownView();

            this.#emit('optionRemoved', { value });
            this.#log('log', 'Option removed:', value);
        }
    }

    /**
     * Updates all options with a new array.
     * @param {Array<Object>} optionsArray - Array of {value, text, disabled} objects.
     */
    updateOptions(optionsArray) {
        const currentValues = this.get();
        this.originalSelect.innerHTML = '';

        optionsArray.forEach(({ value, text, disabled = false }) => {
            const option = new Option(text, value);
            option.disabled = disabled;
            this.originalSelect.appendChild(option);
        });

        this.#cacheOptions();
        this.#refreshDropdownView();

        this.set(currentValues);
        this.#emit('optionsUpdated', { options: optionsArray });
    }

    /**
     * Enables or disables the select component.
     * @param {boolean} disabled - Whether to disable the component.
     */
    setDisabled(disabled = true) {
        this.disabled = disabled;
        this.originalSelect.disabled = disabled;

        if (disabled) {
            this.trigger.setAttribute('aria-disabled', 'true');
            this.trigger.removeAttribute('tabindex');
            this.wrapper.classList.add('pickle-select--disabled');
            this.close();
        } else {
            this.trigger.removeAttribute('aria-disabled');
            this.trigger.setAttribute('tabindex', '0');
            this.wrapper.classList.remove('pickle-select--disabled');
        }

        this.#emit('disabledChanged', { disabled });
    }

    /**
     * Enables search functionality in the dropdown.
     * @param {boolean} searchable - Whether to enable search.
     */
    setSearchable(searchable = true) {
        this.searchable = searchable;

        if (searchable && !this.searchInput) {
            this.#createSearchInput();
        } else if (!searchable && this.searchInput) {
            this.searchInput.remove();
            this.searchInput = null;
        }
    }

    /**
     * Sets the required state of the select.
     * @param {boolean} required - Whether the select is required.
     */
    setRequired(required = true) {
        this.required = !!required;
        if (required) {
            this.trigger.setAttribute('aria-required', 'true');
            this.wrapper.classList.add('pickle-select--required');
        } else {
            this.trigger.removeAttribute('aria-required');
            this.wrapper.classList.remove('pickle-select--required');
        }
    }

    /**
     * Gets the validation state of the select.
     * @returns {Object} Validation state object.
     */
    getValidationState() {
        const validity = this.originalSelect.validity;
        return {
            valid: validity.valid,
            valueMissing: validity.valueMissing,
            customError: validity.customError,
            validationMessage: this.originalSelect.validationMessage
        };
    }

    /**
     * Sets a custom validation message.
     * @param {string} message - The validation message.
     */
    setCustomValidity(message) {
        this.originalSelect.setCustomValidity(message);

        if (message) {
            this.wrapper.classList.add('pickle-select--invalid');
            this.trigger.setAttribute('aria-invalid', 'true');
        } else {
            this.wrapper.classList.remove('pickle-select--invalid');
            this.trigger.removeAttribute('aria-invalid');
        }
    }

    /**
     * Checks if the dropdown is currently open.
     * @returns {boolean} True if the dropdown is open, otherwise false.
     */
    isElementOpen() {
        return this.isOpen;
    }

    /**
     * Destroys the Pickle instance and cleans up resources.
     */
    destroy() {
        if (!Pickle.instances.has(this)) return;
        Pickle.instances.delete(this);

        if (this.handleDocumentClick) {
            document.removeEventListener('click', this.handleDocumentClick);
            this.handleDocumentClick = null;
        }

        if (this.wrapper) {
            this.#emit('destroyed');
            if (this.wrapper.parentNode) {
                this.wrapper.remove();
            }
            this.wrapper = null;
        }

        if (this.originalSelect && this.originalSelect.style) {
            this.originalSelect.style.display = '';
        }
        this.originalSelect = null;

        this.trigger = null;
        this.dropdown = null;
        this.options = null;
        this.selectedOption = null;
        this.selectedOptions = null;
        this.focusedOption = null;
        this.liveRegion = null;
        this.label = null;
        this.searchInput = null;
    }

    /**
     * Creates a custom select UI component to replace the original HTML select element.
     * @private
     */
    #createCustomSelect() {
        this.originalSelect.style.display = 'none';

        this.wrapper = this.#createElement('div', 'pickle-select');
        this.wrapper.classList.add(`pickle-select--${this.theme}`);

        if (this.width) {
            this.wrapper.style.width = this.width;
        }

        this.#createLabel();

        this.trigger = this.#createElement('div', 'pickle-select__trigger');
        this.trigger.classList.add(`pickle-select__trigger--${this.theme}`);
        this.trigger.setAttribute('tabindex', '0');
        this.trigger.setAttribute('role', 'combobox');
        this.trigger.setAttribute('aria-expanded', 'false');
        this.trigger.setAttribute('aria-haspopup', 'listbox');
        this.trigger.style.touchAction = 'manipulation';
        this.trigger.style.userSelect = 'none';

        if (this.height) {
            this.trigger.style.height = this.height;
        }
        this.valueDisplay = this.#createElement('span', `pickle-select__value${this.isMultiple ? '--multiple' : ''}`);

        this.arrow = this.#createElement('span', 'pickle-select__arrow');
        this.arrow.setAttribute('aria-hidden', 'true');
        this.arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>`;

        this.dropdown = this.#createElement('div', 'pickle-select__dropdown');
        this.dropdown.classList.add(`pickle-select__dropdown--${this.theme}`);
        this.dropdown.setAttribute('role', 'listbox');

        this.optionsList = this.#createElement('div', 'pickle-select__options-list');
        this.dropdown.appendChild(this.optionsList);

        this.liveRegion = this.#createElement('div', 'pickle-select__sr-only');
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';

        this.#setupAriaLabeling();

        this.trigger.appendChild(this.valueDisplay);
        this.trigger.appendChild(this.arrow);
        this.wrapper.appendChild(this.trigger);
        this.wrapper.appendChild(this.dropdown);
        this.wrapper.appendChild(this.liveRegion);

        this.originalSelect.parentNode.insertBefore(this.wrapper, this.originalSelect.nextSibling);

        // Set initial selected values
        if (this.defaultValue) {
             this.set(this.defaultValue);
        } else if (this.isMultiple) {
            Array.from(this.originalSelect.selectedOptions).forEach(opt => this.selectedOptions.add(opt.value));
            this.#updateValueDisplay();
         } else if (this.originalSelect.value) {
            this.#selectOptionByValue(this.originalSelect.value);
        } else {
            this.#updateValueDisplay();
        }
    }

    /**
     * Creates a search input for filtering options.
     * @private
     */
    #createSearchInput() {
        this.searchInput = this.#createElement('input', 'pickle-select__search');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = this.l10n.searchPlaceholder;
        this.searchInput.addEventListener('input', (e) => this.#handleSearch(e));
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.trigger.focus();
                this.#handleKeydown(e);
            } else if (e.key === 'Escape') {
                this.close();
                this.trigger.focus();
            }
        });

        this.dropdown.prepend(this.searchInput);
    }

    /**
     * Handles search input and filters options.
     * @private
     * @param {Event} e - The input event.
     */
    #handleSearch(e) {
        const searchTerm = e.target.value;
        this.#currentSearchTerm = searchTerm;
        const lowerCaseTerm = searchTerm.toLowerCase();

        if (!searchTerm) {
            this.#visibleOptions = this.#sourceOptions;
        } else if (this.fuzzySearch) {
            this.#visibleOptions = this.#sourceOptions.filter(option =>
                !option.isGroupLabel && this.#fuzzyMatch(searchTerm, option.text)
            );
        } else {
            this.#visibleOptions = this.#sourceOptions.filter(option =>
                !option.isGroupLabel && option.text.toLowerCase().includes(lowerCaseTerm)
            );
        }

        this.#refreshDropdownView();
        this.#emit('search', { term: lowerCaseTerm, visibleCount: this.#visibleOptions.length });
    }

    /**
     * A simple fuzzy match check.
     * @param {string} searchTerm - The string to search for.
     * @param {string} target - The string to search within.
     * @returns {boolean} - True if it's a match.
     * @private
     */
    #fuzzyMatch(searchTerm, target) {
        const search = searchTerm.toLowerCase();
        const targ = target.toLowerCase();

        let searchIndex = 0;
        let targetIndex = 0;

        while (searchIndex < search.length && targetIndex < targ.length) {
            if (search[searchIndex] === targ[targetIndex]) {
                searchIndex++;
            }
            targetIndex++;
        }

        return searchIndex === search.length;
    }

    /**
     * Clears and re-renders the options list from the #visibleOptions data array.
     * @private
     */
    #refreshDropdownView() {
        this.optionsList.innerHTML = '';
        this.options = [];
        this.focusedIndex = -1;
        this.#clearFocusedOption();
        this.#renderChunk();
    }

    /**
     * Emits custom events for better integration.
     * @param {string} eventName - The event name.
     * @param {Object} detail - Event detail object.
     * @private
     */
    #emit(eventName, detail = {}) {
        if (!this.wrapper) return null;

        const event = new CustomEvent(`pickle:${eventName}`, {
            detail: { instance: this, ...detail },
            bubbles: true,
            cancelable: true
        });

        try {
            this.wrapper.dispatchEvent(event);
            return event;
        } catch (e) {
            if (this.debug) console.warn('Event dispatch failed:', e);
            return null;
        }
    }

    /**
     * Creates a new label element for the custom select component.
     * @private
     */
    #createLabel() {
        const existingLabel = document.querySelector(`label[for="${this.originalSelect.id}"]`);
        if (existingLabel) {
            this.label = this.#createElement('label', 'pickle-select__label');
            this.label.textContent = existingLabel.textContent;
            this.label.setAttribute('for', this.originalSelect.id);
            this.wrapper.appendChild(this.label);
        }
        existingLabel?.remove();
    }

    /**
     * Sets up ARIA labeling for the custom select component.
     * @private
     */
    #setupAriaLabeling() {
        this.dropdown.setAttribute('aria-multiselectable', String(this.isMultiple));
        if (this.label) {
            const labelId = `pickle-label-${this.originalSelect.id || Date.now()}`;
            this.label.id = labelId;
            this.trigger.setAttribute('aria-labelledby', `${labelId} ${this.valueDisplay.id}`);
        } else {
            const existingLabel = document.querySelector(`label[for="${this.originalSelect.id}"]`);
            if (existingLabel) {
                if (!existingLabel.id) {
                    existingLabel.id = `pickle-label-${this.originalSelect.id || this.#cnt++}`;
                }
                this.trigger.setAttribute('aria-labelledby', existingLabel.id);
            } else {
                this.trigger.setAttribute('aria-label', this.l10n.ariaLabel);
            }
        }

        if (!this.dropdown.id) {
            this.dropdown.id = `pickle-dropdown-${this.#cnt++}`;
        }
        this.trigger.setAttribute('aria-controls', this.dropdown.id);
    }

    /**
     * Attaches the scroll listener for lazy loading. Called once at initialization.
     * @private
     */
    #buildOptions() {
        this.dropdown.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = this.dropdown;
            if (scrollHeight - scrollTop - clientHeight < 100 && this.options.length < this.#visibleOptions.length) {
                this.#renderChunk();
            }
        });
        this.#renderChunk();
    }

    /**
     * Renders the next chunk of options from the #visibleOptions data array into the dropdown.
     * @private
     */
    #renderChunk() {
        const CHUNK_SIZE = 100;
        const fragment = document.createDocumentFragment();
        const startIndex = this.options.length;
        const endIndex = Math.min(this.#visibleOptions.length, startIndex + CHUNK_SIZE);
        
        for (let i = startIndex; i < endIndex; i++) {
            const optionData = this.#visibleOptions[i];
    
            if (optionData.isGroupLabel) {
                const groupEl = this.#createElement('div', 'pickle-select__optgroup-label');
                groupEl.setAttribute('role', 'presentation');
                groupEl.textContent = optionData.text;
                if (optionData.disabled) {
                    groupEl.classList.add('pickle-select__optgroup-label--disabled');
                }
                fragment.appendChild(groupEl);
                this.options.push(groupEl); // Keep index in sync
                continue;
            }
    
            const optionElement = this.#createElement('div', 'pickle-select__option');
            optionElement.textContent = optionData.text;
            optionElement.setAttribute('data-value', optionData.value);
            optionElement.setAttribute('role', 'option');
            optionElement.setAttribute('data-index', optionData.originalIndex);
            optionElement.id = `pickle-option-${this.#cnt++}`;
    
            if (optionData.disabled) {
                optionElement.classList.add('pickle-select__option--disabled');
                optionElement.setAttribute('aria-disabled', 'true');
            }
    
            const isSelected = this.isMultiple ?
                               this.selectedOptions.has(optionData.value) :
                               this.originalSelect.value === optionData.value;
    
            optionElement.classList.toggle('pickle-select__option--selected', isSelected);
            optionElement.setAttribute('aria-selected', isSelected);
    
            fragment.appendChild(optionElement);
            this.options.push(optionElement);

            if (!this.isMultiple && isSelected) {
                this.selectedOption = optionElement;
            }
        }
    
        this.optionsList.appendChild(fragment);
    }

    /**
     * Public method to satisfy the stress test.
     * This functionality is normally handled by the scroll listener.
     */
    loadMoreOptions() {
        this.#renderChunk();
    }

    /**
     * Attaches all necessary event listeners.
     * @private
     */
    #attachEventListeners() {
        this.trigger.addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.disabled) {
                this.toggle();
            }
        });

        this.trigger.addEventListener('keydown', (e) => {
            if (!this.disabled) {
                this.#handleKeydown(e);
            }
        });

        this.dropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.pickle-select__option');
            if (option && !option.classList.contains('pickle-select__option--disabled')) {
                this.#toggleOptionSelection(option.getAttribute('data-value'), option);
            }
        });

        this.handleDocumentClick = (e) => {
            if (this.wrapper && !this.wrapper.contains(e.target)) {
                this.close();
            }
        };
        document.addEventListener('click', this.handleDocumentClick);

        this.dropdown.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Closes all other open instances.
     * @private
     */
    #closeOtherInstances() {
        Pickle.instances.forEach(instance => {
            if (instance !== this && instance.isOpen) {
                instance.close();
            }
        });
    }

    /**
     * Handles keyboard events.
     * @private
     * @param {KeyboardEvent} e - The keyboard event object.
     */
    #handleKeydown(e) {
        switch (e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (this.isOpen && this.focusedOption) {
                    this.#toggleOptionSelection(this.focusedOption.getAttribute('data-value'), this.focusedOption);
                } else {
                    this.toggle();
                }
                break;
            case 'Escape':
                if (this.isOpen) {
                    e.preventDefault();
                    this.close();
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (!this.isOpen) {
                    this.open();
                } else {
                    this.#focusNextOption();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (!this.isOpen) {
                    this.open();
                } else {
                    this.#focusPreviousOption();
                }
                break;
            case 'Home':
                if (this.isOpen) {
                    e.preventDefault();
                    this.#focusFirstOption();
                }
                break;
            case 'End':
                if (this.isOpen) {
                    e.preventDefault();
                    this.#focusLastOption();
                }
                break;
        }
    }
    
    /**
     * Core logic for toggling/selecting an option.
     * @private
     * @param {string} value The value of the option to affect.
     * @param {HTMLElement | null} optionElement The DOM element if available.
     * @param {boolean} [silent=false] If true, will not fire an event.
     */
    #toggleOptionSelection(value, optionElement = null, silent = false) {
        const optionData = this.#sourceOptions.find(o => !o.isGroupLabel && o.value === value);
        if (!optionData || optionData.disabled) return;

        const visibleOption = optionElement || this.options.find(opt => opt.getAttribute('data-value') === value);
        const originalOption = Array.from(this.originalSelect.options).find(o => o.value === value);

        if (this.isMultiple) {
            const isSelected = this.selectedOptions.has(value);
            if (isSelected) {
                this.selectedOptions.delete(value);
                if (this.selectedOptions.size === 0) {
                    this.selectedOptions.add('');
                }
            } else {
                if (value !== '') {
                    this.selectedOptions.delete('');
                }
                this.selectedOptions.add(value);
            }
            Array.from(this.originalSelect.options).forEach(o => {
                o.selected = this.selectedOptions.has(o.value);
            });

            if (visibleOption) {
                visibleOption.classList.toggle('pickle-select__option--selected', !isSelected);
                visibleOption.setAttribute('aria-selected', String(!isSelected));
            }
        } else {
            this.#clearSelectedOption();
            if (this.originalSelect.value === value) {
                this.originalSelect.value = '';
                this.selectedOption = null;
                 if (visibleOption) {
                    visibleOption.classList.remove('pickle-select__option--selected');
                    visibleOption.setAttribute('aria-selected', 'false');
                }
            } else {
                if (visibleOption) {
                    visibleOption.classList.add('pickle-select__option--selected');
                    visibleOption.setAttribute('aria-selected', 'true');
                    this.selectedOption = visibleOption;
                }
                this.originalSelect.value = value;
            }

            this.close();
            this.trigger.focus();
        }

        this.#updateValueDisplay();
        if (!silent) {
            this.#fireChangeEvent(optionData);
        }
    }

    /**
     * Selects an option by its value (for single-select mode).
     * @private
     * @param {string} value - The value to match.
     */
    #selectOptionByValue(value) {
        const optionData = this.#sourceOptions.find(opt => !opt.isGroupLabel && opt.value === value);
        if (!optionData || optionData.disabled) {
            return;
        }
        
        this.#clearSelectedOption();
        this.originalSelect.value = value;

        const optionElement = this.options.find(opt => opt.getAttribute('data-value') === value);
        if (optionElement) {
            optionElement.classList.add('pickle-select__option--selected');
            optionElement.setAttribute('aria-selected', 'true');
            this.selectedOption = optionElement;
        }
        
        this.#updateValueDisplay();
        if(!this.isMultiple) this.#fireChangeEvent(optionData);
    }

    /**
     * Creates a new DOM element.
     * @private
     * @param {string} tag - The HTML tag name.
     * @param {string} [className] - Optional CSS class name.
     * @returns {HTMLElement} The newly created element.
     */
    #createElement(tag, className) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        return element;
    }

    /**
     * Gets the placeholder text.
     * @private
     * @returns {string} The placeholder text.
     */
    #getPlaceholderText() {
        return this.originalSelect.querySelector('option[value=""]')?.textContent || this.l10n.placeholder;
    }

    /**
     * Logs messages if debug mode is enabled.
     * @private
     * @param {...any} args - The arguments to log.
     */
    #log(level = 'log', ...args) {
        if (this.debug) {
            const styles = 'color: #33a383; font-weight: bold;';
            switch (level) {
                case 'info':
                    console.info('%c[Pickle]', styles, ...args);
                    return;
                case 'warn':
                    console.warn('%c[Pickle]', styles, ...args);
                    return;
                case 'error':
                    console.error('%c[Pickle]', styles, ...args);
                    return;
                default:
                    console.log('%c[Pickle]', styles, ...args);
                    return;
            }
        }
    }

    _log(level = 'log', ...args) {
        this.#log(level, ...args);
    }

    /**
     * Gets an HTMLSelectElement by ID or reference.
     * @private
     * @param {string|HTMLElement} elementOrID - The element or its ID.
     * @returns {HTMLSelectElement|null} The select element if found.
     */
    #getElement(elementOrID) {
        if (typeof elementOrID === 'string') {
            if (elementOrID.startsWith('#')) {
                elementOrID = elementOrID.slice(1);
            }
            const el = document.getElementById(elementOrID);
            return el instanceof HTMLSelectElement ? el : null;
        }
        return elementOrID instanceof HTMLSelectElement ? elementOrID : null;
    }


    /**
     * Validates the onChange callback.
     * @private
     * @param {Function} [onChange] - The callback function.
     * @returns {Function|null} The validated function.
     * @throws {Error} If onChange is not a function.
     */
    #getOnChange(onChange) {
        if (onChange && typeof onChange !== 'function') {
            throw new Error('onChange must be a function');
        }
        return onChange;
    }

    /**
     * Validates the default value.
     * @private
     * @param {string|string[]} [defaultValue] - The default value.
     * @returns {string|string[]|null} The validated value.
     * @throws {Error} If defaultValue is not a string or array.
     */
    #getDefaultValue(defaultValue) {
        if (defaultValue === null) return null;
        if (typeof defaultValue === 'string') return defaultValue;
        if (this.isMultiple) {
            if (Array.isArray(defaultValue)) {
                if (defaultValue.every(v => typeof v === 'string')) {
                    return defaultValue;
                }
                return [];
            }
        }
        throw new Error('defaultValue must be a string or an array of strings');
    }

    /**
     * Clears the currently selected option in the UI (for single-select).
     * @private
     */
    #clearSelectedOption() {
        if (this.selectedOption) {
            this.selectedOption.classList.remove('pickle-select__option--selected');
            this.selectedOption.removeAttribute('aria-selected');
            this.selectedOption = null;
        }
        // Also clear any other selected options that might be lingering in the DOM but not set as `this.selectedOption`
        this.options.forEach(opt => {
            if(opt.classList.contains('pickle-select__option--selected')) {
                opt.classList.remove('pickle-select__option--selected');
                opt.removeAttribute('aria-selected');
            }
        });
    }

    /**
     * Clears the currently focused option.
     * @private
     */
    #clearFocusedOption() {
        if (this.focusedOption) {
            this.focusedOption.classList.remove('pickle-select__option--focused');
            this.focusedOption = null;
        }
        this.trigger.removeAttribute('aria-activedescendant');
    }

    /**
     * Focuses the next selectable option.
     * @private
     */
    #focusNextOption() {
        this.#clearFocusedOption();
        let nextIndex = this.focusedIndex > -1 ? this.focusedIndex + 1 : 0;
        
        while (nextIndex < this.options.length) {
            const option = this.options[nextIndex];
            if (option.getAttribute('role') === 'option' && !option.classList.contains('pickle-select__option--disabled')) {
                this.focusedIndex = nextIndex;
                this.focusedOption = option;
                option.classList.add('pickle-select__option--focused');
                this.trigger.setAttribute('aria-activedescendant', option.id);
                this.#scrollOptionIntoView(option);
                return;
            }
            nextIndex++;
        }
    }

    /**
     * Focuses the previous selectable option.
     * @private
     */
    #focusPreviousOption() {
        this.#clearFocusedOption();
        let prevIndex = this.focusedIndex > -1 ? this.focusedIndex - 1 : this.options.length -1;
        
        while (prevIndex >= 0) {
            const option = this.options[prevIndex];
            if (option.getAttribute('role') === 'option' && !option.classList.contains('pickle-select__option--disabled')) {
                this.focusedIndex = prevIndex;
                this.focusedOption = option;
                option.classList.add('pickle-select__option--focused');
                this.trigger.setAttribute('aria-activedescendant', option.id);
                this.#scrollOptionIntoView(option);
                return;
            }
            prevIndex--;
        }
    }


    /**
     * Focuses the first available option.
     * @private
     */
    #focusFirstOption() {
        this.#clearFocusedOption();
        this.focusedIndex = -1;
        this.#focusNextOption();
    }

    /**
     * Focuses the last available option.
     * @private
     */
    #focusLastOption() {
        this.#clearFocusedOption();
        this.focusedIndex = this.options.length;
        this.#focusPreviousOption();
    }


    /**
     * Scrolls an option into view.
     * @private
     * @param {HTMLElement} option - The option element.
     */
    #scrollOptionIntoView(option) {
        if (option && this.dropdown.scrollHeight > this.dropdown.clientHeight) {
            const optionTop = option.offsetTop;
            const optionBottom = optionTop + option.offsetHeight;
            const listTop = this.dropdown.scrollTop;
            const listBottom = listTop + this.dropdown.clientHeight;

            if (optionTop < listTop) {
                this.dropdown.scrollTop = optionTop;
            } else if (optionBottom > listBottom) {
                this.dropdown.scrollTop = optionBottom - this.dropdown.clientHeight;
            }
        }
    }

    /**
     * Reads options from the original select, including optgroups.
     * @private
     */
    #cacheOptions() {
        this.#sourceOptions = [];
        let optionIndex = 0;
        Array.from(this.originalSelect.children).forEach(child => {
            if (child.tagName === 'OPTGROUP') {
                this.#sourceOptions.push({
                    text: child.label,
                    isGroupLabel: true,
                    disabled: child.disabled
                });
                Array.from(child.children).forEach(opt => {
                    if (opt.tagName === 'OPTION') {
                        this.#sourceOptions.push({
                            value: opt.value,
                            text: opt.textContent,
                            disabled: opt.disabled || child.disabled,
                            originalIndex: optionIndex++,
                            group: child.label
                        });
                    }
                });
            } else if (child.tagName === 'OPTION') {
                this.#sourceOptions.push({
                    value: child.value,
                    text: child.textContent,
                    disabled: child.disabled,
                    originalIndex: optionIndex++
                });
            }
        });
        this.#visibleOptions = [...this.#sourceOptions];
    }
    
    /**
     * Takes a string and wraps matching substrings in <mark> tags.
     * @param {string} text - The option text to highlight.
     * @returns {string} - An HTML string with matches highlighted.
     * @private
     */
    #highlightMatches(text) {
        const sanitizer = document.createElement('div');
        sanitizer.textContent = text;
        const safeText = sanitizer.innerHTML;
        const searchTerm = this.#currentSearchTerm;
        if (!searchTerm) {
            return safeText;
        }
        if (this.fuzzySearch) {
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
        const regex = new RegExp(`(${this.#escapeRegExp(searchTerm)})`, 'gi');
        return safeText.replace(regex, '<mark>$1</mark>');
    }
    
    /**
     * Escapes characters in a string for use in a Regular Expression.
     * @param {string} string - The string to escape.
     * @returns {string} - The escaped string.
     * @private
     */
    #escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Updates the text/tags shown in the trigger element based on current selection.
     * @private
     */
    #updateValueDisplay() {
        this.valueDisplay.innerHTML = '';
        const selectedValues = this.get();

        if (this.isMultiple) {
            if (selectedValues.length === 0) {
                this.valueDisplay.textContent = this.#getPlaceholderText();
            } else if (selectedValues.length >= 4) {
                 this.valueDisplay.textContent = this.l10n.multipleSelection.replace('{count}', selectedValues.length);
            } else {
                selectedValues.forEach(value => {
                    const optionData = this.#sourceOptions.find(opt => !opt.isGroupLabel && opt.value === value);
                    if (optionData) {
                        const tag = this.#createElement('span', 'pickle-select__tag');
                        
                        tag.textContent = optionData.text; 

                        const removeBtn = this.#createElement('button', 'pickle-select__tag-remove');
                        removeBtn.type = 'button';
                        removeBtn.innerHTML = '&times;';

                        const sanitizer = document.createElement('div');
                        sanitizer.textContent = optionData.text;
                        removeBtn.setAttribute('aria-label', `Remove ${sanitizer.innerHTML}`);

                        removeBtn.addEventListener('click', e => {
                            e.stopPropagation();
                            this.#toggleOptionSelection(value);
                        });
                        tag.appendChild(removeBtn);
                        this.valueDisplay.appendChild(tag);
                    }
                });
            }
        } else { // Single select
            this.valueDisplay.textContent = this.getText() || this.#getPlaceholderText();
        }
    }
    
    /**
     * Ensures all `aria-selected` and class names on rendered options match the current state.
     * @private
     */
    #refreshSelectedStateInUI() {
        this.options.forEach(optionEl => {
            if (optionEl.getAttribute('role') !== 'option') return;

            const value = optionEl.getAttribute('data-value');
            const isSelected = this.isMultiple ? this.selectedOptions.has(value) : this.originalSelect.value === value;
            
            optionEl.classList.toggle('pickle-select__option--selected', isSelected);
            optionEl.setAttribute('aria-selected', String(isSelected));
        });
    }

    /**
     * Centralized method to fire all change events.
     * @private
     * @param {object} [optionData] - The data for the option that triggered the change.
     */
    #fireChangeEvent(optionData = {}) {
        const value = this.get();
        let text = this.getText();

        if (!this.isMultiple && !value) {
            text = '';
        }
        
        if (this.onChange) {
            this.onChange(value, { originalEvent: null, text, element: this });
        }
        
        this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
        this.#emit('change', { value, text });
        
        if (this.liveRegion && !this.isMultiple && optionData.text && value) {
            this.liveRegion.textContent = '';
            setTimeout(() => {
                if (this.wrapper && this.liveRegion) {
                    this.liveRegion.textContent = this.l10n.selected.replace('{text}', optionData.text);
                }
            }, 16);
        }
        
        this.#log('log', 'Selection changed:', {value, text});
    }
}