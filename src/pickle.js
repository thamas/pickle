import PickleUtils from './modules/utils.js';
import PickleDOM from './modules/dom.js';
import PickleNavigation from './modules/navigation.js';
import PickleOptions from './modules/options.js';
import PickleEvents from './modules/events.js';

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
        ariaLabel: 'Select an option',
        removeTag: 'Remove {text}'
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
        this.init(elementOrID, options);
    }

    /**
     * Initializes the Pickle instance with the provided configuration.
     *
     * @param {HTMLElement|string} elementOrID - The select element or its ID to initialize Pickle with.
     * @param {Object} [options={}] - Configuration options.
     * @throws {Error} Throws an error if the provided select element is invalid.
     */
    init(elementOrID, options = {}) {
        const {
            onChange = null,
            defaultValue = null,
            theme = 'default',
            width = '100%',
            height = null,
            disabled = false,
            required = false,
            searchable = false,
            fuzzySearch = false,
            multiple = false,
            debug = false,
            l10n = null
        } = options;

        // Prevent re-init
        if (Pickle.instances.has(this)) return;

        // Resolve element or throw
        this.utils = new PickleUtils(this);
        this.debug = Boolean(debug);
        this.originalSelect = this.utils.getElement(elementOrID);
        if (!this.originalSelect) {
            const error = new Error('Invalid select element provided', { cause: new Error(`Element ${elementOrID} not found`) });
            if (this.debug) this.utils.log('error', error.message);
            throw error;
        }

        try {
            // Base props
            this.id = this.originalSelect.id || this.utils.generateID();
            this.l10n = { ...Pickle.defaultStrings, ...l10n };
            this.isOpen = false;
            this.selectedOption = null;
            this.selectedOptions = new Set();
            this.focusedOption = null;
            this.focusedIndex = -1;
            this.searchInput = null;
            this.options = [];
            this.optionsList = null;

            // Config
            this.isMultiple = this.originalSelect.multiple || Boolean(multiple);
            this.originalSelect.multiple = this.isMultiple;

            this.onChange = this.utils.getOnChange(onChange);
            this.defaultValue = this.utils.getDefaultValue(defaultValue);
            this.theme = theme;
            this.width = width;
            this.height = height;
            this.disabled = Boolean(disabled);
            this.required = Boolean(required);
            this.searchable = Boolean(searchable);
            this.fuzzySearch = Boolean(fuzzySearch);

            // Assign Modules
            this.domManager = new PickleDOM(this);
            this.keyboardNavigation = new PickleNavigation(this);
            this.eventSystem = new PickleEvents(this);
            this.optionManager = new PickleOptions(this);

            // Build UI
            this.optionManager.cacheOptions();
            this.domManager.createCustomSelect();
            this.optionManager.buildOptions();
            this.eventSystem.attachEventListeners();

            // Apply dynamic states
            if (this.disabled) this.setDisabled(true);
            if (this.searchable) this.setSearchable(true);

            // Register instance
            Pickle.instances.add(this);
            this.utils.log('log', 'Pickle initialized successfully');
        } catch (error) {
            if (debug) this.utils.log('error', 'Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Opens the dropdown menu, sets its state to open, and updates relevant ARIA attributes.
     */
    open() {
        if (!this.wrapper || this.disabled) return;

        const event = this.eventSystem.emit('beforeOpen');
        if (!event || event.defaultPrevented) return;

        this.utils.closeOtherInstances();

        this.isOpen = true;
        this.dropdown.classList.add('pickle-select__dropdown--open');
        this.trigger.setAttribute('aria-expanded', 'true');

        this.domManager.clearFocusedOption();

        if (this.searchInput) {
            setTimeout(() => {
                if (this.searchInput) {
                    this.searchInput.focus();
                }
            }, 0);
        }

        this.domManager.focusSelectedOption();

        this.eventSystem.emit('open');
        this.utils.log('log', 'Dropdown opened');
    }

    /**
     * Closes the dropdown menu if it is currently open.
     */
    close() {
        if (!this.wrapper || !this.isOpen) return;

        const event = this.eventSystem.emit('beforeClose');
        if (!event || event.defaultPrevented) return;

        this.isOpen = false;
        this.dropdown.classList.remove('pickle-select__dropdown--open');
        this.trigger.setAttribute('aria-expanded', 'false');
        this.trigger.removeAttribute('aria-activedescendant');
        this.focusedIndex = -1;
        this.domManager.clearFocusedOption();

        if (this.searchInput) {
            this.searchInput.value = '';
            this.optionManager.handleSearch({ target: { value: '' } });
        }
        
        this.trigger.focus(); // Return focus to trigger on close
        this.eventSystem.emit('close');
        this.utils.log('log', 'Dropdown closed');
    }

    /**
     * Toggles the open/close state.
     */
    toggle() {
        this.isOpen ? this.close() : this.open();
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
     * Sets the selected option by its value. For multi-select, accepts an array of values.
     * @param {string|string[]} value - The value or values of the option(s) to select.
     */
    set(value) {
        this.clear(true); // Clear silently

        const valuesToSet = Array.isArray(value) ? value : [value];

        if (this.isMultiple) {
            valuesToSet.forEach(v => this.optionManager.toggleOptionSelection(v, null, true));
        } else {
            // For single-select, only the first value is used
            if (valuesToSet.length > 0) {
                this.optionManager.toggleOptionSelection(valuesToSet[0], null, true);
            }
        }

        // Fire a single change event after all changes are made
        this.optionManager.fireChangeEvent();
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
            this.optionManager.clearSelectedOption(); // Clear UI for single-select
        }

        this.domManager.refreshSelectedStateInUI(); // Update all rendered options
        this.domManager.updateValueDisplay(); // Update the trigger display

        if (!silent) {
            // Firing events for clear is a special case where text should be empty string
            const value = this.get();
            const text = this.isMultiple ? [] : '';
            if (this.onChange) {
                this.onChange(value, { originalEvent: null, text, element: this });
            }
            this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
            this.eventSystem.emit('change', { value, text });
            this.utils.log('log', 'Selection changed:', { value, text });

            if (this.liveRegion) {
                // Clear any existing live region timeouts to prevent conflicts
                this.clearLiveRegionTimeouts();
                
                // Capture the reference to prevent null access in setTimeout
                const liveRegionRef = this.liveRegion;
                const clearMessage = this.l10n.selectionCleared;
                
                liveRegionRef.textContent = '';
                this._liveRegionTimeout = setTimeout(() => {
                    // Check if the reference is still valid before using it
                    if (liveRegionRef && liveRegionRef.parentNode) {
                        liveRegionRef.textContent = clearMessage;
                    }
                }, 80);
            }
        }
    }

    /**
     * Clears all live region timeouts to prevent conflicts.
     */
    clearLiveRegionTimeouts() {
        if (this._liveRegionTimeout) {
            clearTimeout(this._liveRegionTimeout);
            this._liveRegionTimeout = null;
        }
        if (this._selectionTimeout) {
            clearTimeout(this._selectionTimeout);
            this._selectionTimeout = null;
        }
    }

    get sourceOptions() {
        return this.#sourceOptions;
    }

    get visibleOptions() {
        return this.#visibleOptions;
    }

    get currentSearchTerm() {
        return this.#currentSearchTerm;
    }

    get cnt() {
        return this.#cnt;
    }

    setSourceOptions(options) {
        this.#sourceOptions = options;
    }

    setVisibleOptions(options) {
        this.#visibleOptions = options;
    }

    setCurrentSearchTerm(term) {
        this.#currentSearchTerm = term;
    }

    /**
     * Increments the counter and returns the new value.
     * @returns {number} The new counter value.
     */
    incrementCounter() {
        return ++this.#cnt;
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
     * Loads more options if available (for lazy loading).
     * @returns {boolean} True if more options were loaded, false otherwise.
     */
    loadMoreOptions() {
        return this.optionManager.loadMoreOptions();
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
        
        // For single select, return empty string if no value is selected
        if (!this.originalSelect.value) {
            return '';
        }
        
        // If there's a selected option element, use its text
        if (this.selectedOption) {
            return this.selectedOption.textContent;
        }
        
        // Otherwise find the option data by value
        const optData = this.#sourceOptions.find(o => !o.isGroupLabel && o.value === this.originalSelect.value);
        return optData ? optData.text : '';
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

        this.optionManager.cacheOptions();
        this.domManager.refreshDropdownView();

        this.eventSystem.emit('optionAdded', { value, text, index, disabled });
        this.utils.log('log', 'Option added:', { value, text, index, disabled });
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
                    this.domManager.updateValueDisplay();
                } else {
                    this.clear();
                }
            }

            this.optionManager.cacheOptions();
            this.domManager.refreshDropdownView();
            this.eventSystem.emit('optionRemoved', { value });
            this.utils.log('log', 'Option removed:', value);
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

        this.optionManager.cacheOptions();
        this.domManager.refreshDropdownView();

        this.set(currentValues);
        this.eventSystem.emit('optionsUpdated', { options: optionsArray });
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
        this.domManager.updateValueDisplay();

        this.eventSystem.emit('disabledChanged', { disabled });
    }

    /**
     * Enables search functionality in the dropdown.
     * @param {boolean} searchable - Whether to enable search.
     */
    setSearchable(searchable = true) {
        this.searchable = searchable;

        if (searchable && !this.searchInput) {
            this.domManager.createSearchInput();
        } else if (!searchable && this.searchInput) {
            this.searchInput.remove();
            this.searchInput = null;
        }
    }
    
    /**
     * Sets the theme for this Pickle instance at runtime.
     * If the theme only changes CSS, this will swap theme classes on the wrapper
     * and call a light refresh of the dropdown view. If your theme changes markup
     * or templates at init-time, you may still need to destroy and reinitialize.
     *
     * @param {string} theme - The new theme name.
     */
    setTheme(theme) {
        const previous = this.theme;
        if (!theme || theme === previous) return;
        this.theme = theme;

        if (this.wrapper) {
            const prefix = 'pickle-select--';
            Array.from(this.wrapper.classList).forEach(c => {
                if (c.startsWith(prefix) && c !== 'pickle-select') {
                    this.wrapper.classList.remove(c);
                }
            });
            this.wrapper.classList.add(`${prefix}${theme}`);
            this.wrapper.setAttribute('data-pickle-theme', theme);
        }

        if (this.domManager && typeof this.domManager.refreshDropdownView === 'function') {
            try {
                this.domManager.refreshDropdownView();
            } catch (e) {
                this.utils.log('error', 'Theme refresh failed, destroy+reinit may be required', e);
            }
        }

        if (this.eventSystem) {
            this.eventSystem.emit('themeChanged', { theme, previous });
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

        // Clear any pending live region timeouts
        this.clearLiveRegionTimeouts();

        if (this.handleDocumentClick) {
            document.removeEventListener('click', this.handleDocumentClick);
            this.handleDocumentClick = null;
        }

        if (this.wrapper) {
            this.eventSystem.emit('destroyed');
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
}