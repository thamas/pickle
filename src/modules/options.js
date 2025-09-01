export default class PickleOptions {
    p = null;

    constructor(pickleInstance) {
        this.p = pickleInstance;
    }

    /**
     * Attaches the scroll listener for lazy loading. Called once at initialization.
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
     * Renders the next chunk of options from the visible options data array into the dropdown.
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
                this.p.options.push(groupEl); // keep index in sync
                continue;
            }

            const optionElement = this.p.domManager.createElement('div', 'pickle-select__option');
            optionElement.innerHTML = this.p.domManager.highlightMatches(optionData.text);
            optionElement.setAttribute('data-value', optionData.value);

            optionElement.setAttribute('role', 'option');
            optionElement.id = `${this.p.baseID}__option-${this.p.incrementCounter()}`;

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
     * Loads more options if available (for lazy loading).
     */
    loadMoreOptions() {
        if (this.p.options.length < this.p.visibleOptions.length) {
            this.renderChunk();
            return true;
        }
        return false;
    }

    /**
     * Reads options from the original select, including optgroups.
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
     * Handles search input and filters options.
     * @param {Event} e - The input event.
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
     * A simple fuzzy match check.
     * @param {string} searchTerm - The string to search for.
     * @param {string} target - The string to search within.
     * @returns {boolean} - True if it's a match.
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
     * Core logic for toggling/selecting an option.
     * @param {string} value The value of the option to affect.
     * @param {HTMLElement | null} optionElement The DOM element if available.
     * @param {boolean} [silent=false] If true, will not fire an event.
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
     * Selects an option by its value (for single-select mode).
     * @param {string} value - The value to match.
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
     * Clears the currently selected option in the UI (for single-select).
     */
    clearSelectedOption() {
        if (this.p.selectedOption) {
            this.p.selectedOption.classList.remove('pickle-select__option--selected');
            this.p.selectedOption.removeAttribute('aria-selected');
            this.p.selectedOption = null;
        }
        // Also clear any other selected options that might be lingering in the DOM but not set as `this.p.selectedOption`
        this.p.options.forEach(opt => {
            if(opt.classList.contains('pickle-select__option--selected')) {
                opt.classList.remove('pickle-select__option--selected');
                opt.removeAttribute('aria-selected');
            }
        });
    }

    /**
     * Centralized method to fire all change events.
     * @param {object} [optionData] - The data for the option that triggered the change.
     */
    fireChangeEvent(optionData = {}) {
        const value = this.p.get();
        let text = this.p.getText();

        if (!this.p.isMultiple && !value) {
            text = '';
        }
        
        // If no optionData.text is provided but we have a value, try to get it from source options
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
            // Clear any existing live region timeouts to prevent conflicts
            this.p.clearLiveRegionTimeouts();
            
            // Capture references to prevent null access in setTimeout
            const liveRegionRef = this.p.liveRegion;
            const selectedMessage = this.p.l10n.selected.replace('{text}', optionData.text);
            
            liveRegionRef.textContent = '';
            this.p._selectionTimeout = setTimeout(() => {
                // Check if the reference is still valid before using it
                if (liveRegionRef && liveRegionRef.parentNode) {
                    liveRegionRef.textContent = selectedMessage;
                }
            }, 16);
        }
        
        this.p.utils.log('log', 'Selection changed:', {value, text});
    }
}