export default class PickleOptions {
    p = null;

    constructor(pickleInstance) {
        this.p = pickleInstance;
    }

    /**
     * Initializes the dropdown options and sets up infinite scroll rendering.
     * Attaches a scroll event listener to the dropdown element to detect when the user
     * scrolls near the bottom, triggering the rendering of additional options if available.
     * Also renders the initial chunk of options.
     *
     * @function
     */
    buildOptions() {
        this.p.dropdown.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = this.p.dropdown;
            if (
                scrollHeight - scrollTop - clientHeight < 100 &&
                this.p.options.length < this.p.visibleOptions.length
            ) {
                this.renderChunk();
            }
        });
        this.renderChunk();
    }

    /**
     * Renders a chunk of option elements (up to CHUNK_SIZE) into the options list.
     * Handles both group labels and individual options, applying appropriate classes,
     * ARIA attributes, and selection states. Appends the created elements to a document fragment
     * for efficient DOM updates, then adds them to the options list container.
     *
     * @returns {void}
     */
    renderChunk() {
        const CHUNK_SIZE = 100;
        const fragment = document.createDocumentFragment();
        const startIndex = this.p.options.length;
        const endIndex = Math.min(this.p.visibleOptions.length, startIndex + CHUNK_SIZE);

        for (let i = startIndex; i < endIndex; i++) {
            const optionData = this.p.visibleOptions[i];

            if (optionData.isGroupLabel) {
                const groupEl = this.p.domManager.createElement('div', 'pickle-select__optgroup-label');
                groupEl.setAttribute('role', 'presentation');
                groupEl.textContent = optionData.text;
                if (optionData.disabled) {
                    groupEl.classList.add('pickle-select__optgroup-label--disabled');
                }
                fragment.appendChild(groupEl);
                this.p.options.push(groupEl); 
                continue;
            }

            const optionElement = this.p.domManager.createElement('div', 'pickle-select__option');
            optionElement.innerHTML = this.p.domManager.highlightMatches(optionData.text);
            optionElement.setAttribute('data-value', optionData.value);

            optionElement.setAttribute('role', 'option');
            optionElement.id = `${this.p.id}__option-${this.p.incrementCounter()}`;

            if (optionData.disabled) {
                optionElement.classList.add('pickle-select__option--disabled');
                optionElement.setAttribute('aria-disabled', 'true');
            }

            if (this.p.isMultiple) {
                if (this.p.selectedOptions.has(optionData.value)) {
                    optionElement.classList.add('pickle-select__option--selected');
                    optionElement.setAttribute('aria-selected', 'true');
                }
            } else {
                if (this.p.originalSelect.value === optionData.value) {
                    optionElement.classList.add('pickle-select__option--selected');
                    optionElement.setAttribute('aria-selected', 'true');
                    this.p.selectedOption = optionElement;
                }
            }

            fragment.appendChild(optionElement);
            this.p.options.push(optionElement);
        }

        this.p.optionsList.appendChild(fragment);
    }

    /**
     * Loads and renders more options if there are hidden options available.
     *
     * @returns {boolean} Returns true if more options were rendered, false otherwise.
     */
    loadMoreOptions() {
        if (this.p.options.length < this.p.visibleOptions.length) {
            this.renderChunk();
            return true;
        }
        return false;
    }

    /**
     * Caches the options from the original <select> element, including <optgroup> and <option> elements.
     * Constructs a structured array of option objects, preserving group labels, disabled states, and original indices.
     * Sets both the source and visible options for further processing.
     *
     * @returns {void}
     */
    cacheOptions() {
        const sourceOptions = [];
        let optionIndex = 0;
        Array.from(this.p.originalSelect.children).forEach(child => {
            if (child.tagName === 'OPTGROUP') {
                sourceOptions.push({
                    text: child.label,
                    isGroupLabel: true,
                    disabled: child.disabled
                });
                Array.from(child.children).forEach(opt => {
                    if (opt.tagName === 'OPTION') {
                        sourceOptions.push({
                            value: opt.value,
                            text: opt.textContent,
                            disabled: opt.disabled || child.disabled,
                            originalIndex: optionIndex++,
                            group: child.label
                        });
                    }
                });
            } else if (child.tagName === 'OPTION') {
                sourceOptions.push({
                    value: child.value,
                    text: child.textContent,
                    disabled: child.disabled,
                    originalIndex: optionIndex++
                });
            }
        });
        this.p.setSourceOptions(sourceOptions);
        this.p.setVisibleOptions([...sourceOptions]);
    }

    /**
     * Handles the search input event for filtering options in the dropdown.
     * Updates the current search term, filters visible options based on the search term
     * (using fuzzy search if enabled), and refreshes the dropdown view.
     * Emits a 'search' event with the search term and the count of visible options.
     *
     * @param {Event} e - The input event triggered by the search field.
     */
    handleSearch(e) {
        const searchTerm = e.target.value;
        this.p.setCurrentSearchTerm(searchTerm);
        const lowerCaseTerm = searchTerm.toLowerCase();

        if (!searchTerm) {
            this.p.setVisibleOptions(this.p.sourceOptions);
        } else if (this.p.fuzzySearch) {
            this.p.setVisibleOptions(this.p.sourceOptions.filter(option =>
                !option.isGroupLabel && this.fuzzyMatch(searchTerm, option.text)
            ));
        } else {
            this.p.setVisibleOptions(this.p.sourceOptions.filter(option =>
                !option.isGroupLabel && option.text.toLowerCase().includes(lowerCaseTerm)
            ));
        }

        this.p.domManager.refreshDropdownView();
        this.p.eventSystem.emit('search', { term: lowerCaseTerm, visibleCount: this.p.visibleOptions.length });
    }

    /**
     * Determines if all characters of the search term appear in order within the target string,
     * allowing for non-contiguous matches (fuzzy matching).
     *
     * @param {string} searchTerm - The term to search for within the target string.
     * @param {string} target - The string to be searched.
     * @returns {boolean} True if the search term matches the target string fuzzily, false otherwise.
     *
     * TODO: Improve fuzzyMatch algorithm; current implementation is very simplistic.
     */
    fuzzyMatch(searchTerm, target) {
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
     * Toggles the selection state of an option by its value.
     * Handles both single and multiple selection modes, updates the UI and the underlying select element,
     * and optionally fires a change event.
     *
     * @param {string} value - The value of the option to toggle.
     * @param {HTMLElement|null} [optionElement=null] - The DOM element representing the option (optional).
     * @param {boolean} [silent=false] - If true, suppresses firing the change event.
     */
    toggleOptionSelection(value, optionElement = null, silent = false) {
        const optionData = this.p.sourceOptions.find(o => !o.isGroupLabel && o.value === value);
        if (!optionData || optionData.disabled) return;

        const visibleOption = optionElement || this.p.options.find(opt => opt.getAttribute('data-value') === value);
        const originalOption = Array.from(this.p.originalSelect.options).find(o => o.value === value);

        if (this.p.isMultiple) {
            const isSelected = this.p.selectedOptions.has(value);
            if (isSelected) {
                this.p.selectedOptions.delete(value);
                if (this.p.selectedOptions.size === 0) {
                    this.p.selectedOptions.add('');
                }
            } else {
                if (value !== '') {
                    this.p.selectedOptions.delete('');
                }
                this.p.selectedOptions.add(value);
            }
            Array.from(this.p.originalSelect.options).forEach(o => {
                o.selected = this.p.selectedOptions.has(o.value);
            });

            if (visibleOption) {
                visibleOption.classList.toggle('pickle-select__option--selected', !isSelected);
                visibleOption.setAttribute('aria-selected', String(!isSelected));
            }
        } else {
            this.clearSelectedOption();
            if (this.p.originalSelect.value === value) {
                this.p.originalSelect.value = '';
                this.p.selectedOption = null;
                 if (visibleOption) {
                    visibleOption.classList.remove('pickle-select__option--selected');
                    visibleOption.setAttribute('aria-selected', 'false');
                }
            } else {
                if (visibleOption) {
                    visibleOption.classList.add('pickle-select__option--selected');
                    visibleOption.setAttribute('aria-selected', 'true');
                    this.p.selectedOption = visibleOption;
                }
                this.p.originalSelect.value = value;
            }

            this.p.close();
            this.p.trigger.focus();
        }

        this.p.domManager.updateValueDisplay();
        if (!silent) {
            this.fireChangeEvent(optionData);
        }
    }

    /**
     * Selects an option by its value, updates the UI and fires change event if applicable.
     * Finds the option data and element, marks it as selected, updates the display,
     * and triggers a change event for single-select mode.
     *
     * @param {string} value - The value of the option to select.
     * @returns {void}
     */
    selectOptionByValue(value) {
        const optionData = this.p.sourceOptions.find(opt => !opt.isGroupLabel && opt.value === value);
        if (!optionData || optionData.disabled) {
            return;
        }

        this.clearSelectedOption();
        this.p.originalSelect.value = value;

        const optionElement = this.p.options.find(opt => opt.getAttribute('data-value') === value);
        if (optionElement) {
            optionElement.classList.add('pickle-select__option--selected');
            optionElement.setAttribute('aria-selected', 'true');
            this.p.selectedOption = optionElement;
        }

        this.p.domManager.updateValueDisplay();
        if(!this.p.isMultiple) this.fireChangeEvent(optionData);
    }

    /**
     * Clears the currently selected option in the select component.
     * Removes the selected styling and ARIA attributes from the previously selected option,
     * and ensures no option remains marked as selected.
     */
    clearSelectedOption() {
        if (this.p.selectedOption) {
            this.p.selectedOption.classList.remove('pickle-select__option--selected');
            this.p.selectedOption.removeAttribute('aria-selected');
            this.p.selectedOption = null;
        }

        this.p.options.forEach(opt => {
            if(opt.classList.contains('pickle-select__option--selected')) {
                opt.classList.remove('pickle-select__option--selected');
                opt.removeAttribute('aria-selected');
            }
        });
    }

    /**
     * Fires a change event when the selection changes.
     * Updates the text and value based on the current selection,
     * emits custom events, updates the live region for accessibility,
     * and logs the selection change.
     *
     * @param {Object} [optionData={}] - Optional data about the selected option.
     * @param {string} [optionData.text] - The display text of the selected option.
     * @param {*} [optionData.value] - The value of the selected option.
     */
    fireChangeEvent(optionData = {}) {
        const value = this.p.get();
        let text = this.p.getText();

        if (!this.p.isMultiple && !value) {
            text = '';
        }

        if (!optionData.text && value && !this.p.isMultiple) {
            const foundOption = this.p.sourceOptions.find(opt => !opt.isGroupLabel && opt.value === value);
            if (foundOption) {
                optionData = foundOption;
            }
        }

        if (this.p.onChange) {
            this.p.onChange(value, { originalEvent: null, text, element: this.p });
        }

        this.p.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
        this.p.eventSystem.emit('change', { value, text });

        if (this.p.liveRegion && !this.p.isMultiple && optionData.text) {

            this.p.clearLiveRegionTimeouts();

            const liveRegionRef = this.p.liveRegion;
            const selectedMessage = this.p.l10n.selected.replace('{text}', optionData.text);

            liveRegionRef.textContent = '';
            this.p._selectionTimeout = setTimeout(() => {

                if (liveRegionRef && liveRegionRef.parentNode) {
                    liveRegionRef.textContent = selectedMessage;
                }
            }, 16);
        }

        this.p.utils.log('log', 'Selection changed:', {value, text});
    }
}