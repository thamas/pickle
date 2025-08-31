import Pickle from '../src/pickle.js';
const globals = global.Pickle;

describe('Pickle Unit Tests', () => {
    let container, selectElement, pickle;

    beforeEach(() => {
        container = globals.vars.container;
        selectElement = globals.helpers.createSelectElement();
        container.appendChild(selectElement);
    });

    afterEach(() => {
        if (pickle) {
            pickle.destroy();
            pickle = null;
        }
        container.innerHTML = '';
    });

    describe('Constructor and Initialization', () => {
        it('should initialize with element reference', () => {
            pickle = new Pickle(selectElement);
            expect(pickle.originalSelect).toBe(selectElement);
            expect(pickle.wrapper).toBeTruthy();
        });

        it('should initialize with element ID string', () => {
            selectElement.id = 'test-select';
            pickle = new Pickle('test-select');
            expect(pickle.originalSelect).toBe(selectElement);
        });

        it('should initialize with element ID with hash', () => {
            selectElement.id = 'test-select';
            pickle = new Pickle('#test-select');
            expect(pickle.originalSelect).toBe(selectElement);
        });

        it('should throw error for invalid element', () => {
            expect(() => new Pickle('non-existent')).toThrow('Invalid select element provided');
        });

        it('should throw error and log to console if debug is enabled', () => {
            const invalidElement = document.createElement('div'); // Not a select
            expect(() => {
                new Pickle(invalidElement, { debug: true });
            }).toThrow('Invalid select element provided');
            expect(console.error).toHaveBeenCalledWith('Pickle initialization error:', expect.any(Error));
        });

        it('should throw error for non-select element', () => {
            const div = document.createElement('div');
            expect(() => new Pickle(div)).toThrow('Invalid select element provided');
        });

        it('should initialize with all options', () => {
            const onChange = jest.fn();
            pickle = new Pickle(selectElement, {
                onChange,
                defaultValue: 'option1',
                theme: 'custom',
                width: '300px',
                height: '50px',
                disabled: true,
                required: true,
                searchable: true,
                fuzzySearch: true,
                multiple: true,
                debug: true,
                l10n: { placeholder: 'Custom placeholder' }
            });

            expect(pickle.onChange).toBe(onChange);
            expect(pickle.defaultValue).toBe('option1');
            expect(pickle.theme).toBe('custom');
            expect(pickle.width).toBe('300px');
            expect(pickle.height).toBe('50px');
            expect(pickle.disabled).toBe(true);
            expect(pickle.required).toBe(true);
            expect(pickle.searchable).toBe(true);
            expect(pickle.fuzzySearch).toBe(true);
            expect(pickle.isMultiple).toBe(true);
            expect(pickle.debug).toBe(true);
            expect(pickle.l10n.placeholder).toBe('Custom placeholder');
        });

        it('should handle multi-select mode correctly', () => {
            selectElement.multiple = true;
            pickle = new Pickle(selectElement);
            expect(pickle.isMultiple).toBe(true);
        });

        it('should throw error for invalid onChange', () => {
            expect(() => new Pickle(selectElement, { onChange: 'not-a-function' }))
                .toThrow('onChange must be a function');
        });

        it('should throw error for invalid defaultValue', () => {
            expect(() => new Pickle(selectElement, { defaultValue: 123 }))
                .toThrow('defaultValue must be a string or an array of strings');
        });

        it('should handle array defaultValue for multi-select', () => {
            selectElement.multiple = true;
            pickle = new Pickle(selectElement, { defaultValue: ['option1', 'option2'] });
            expect(pickle.defaultValue).toEqual(['option1', 'option2']);
        });
    });

    describe('Core Functionality', () => {
        beforeEach(() => {
            pickle = new Pickle(selectElement);
        });

        describe('open() method', () => {
            it('should open dropdown', () => {
                pickle.open();
                expect(pickle.isOpen).toBe(true);
                expect(pickle.dropdown.classList.contains('pickle-select__dropdown--open')).toBe(true);
                expect(pickle.trigger.getAttribute('aria-expanded')).toBe('true');
            });

            it('should not open if disabled', () => {
                pickle.setDisabled(true);
                pickle.open();
                expect(pickle.isOpen).toBe(false);
            });

            it('should close other instances when opening', () => {
                const anotherSelect = globals.helpers.createSelectElement();
                container.appendChild(anotherSelect);
                const anotherPickle = new Pickle(anotherSelect);
                
                anotherPickle.open();
                expect(anotherPickle.isOpen).toBe(true);
                
                pickle.open();
                expect(pickle.isOpen).toBe(true);
                expect(anotherPickle.isOpen).toBe(false);

                anotherPickle.destroy();
            });

            it('should focus search input when searchable', async () => {
                pickle.setSearchable(true);
                
                const focusSpy = jest.spyOn(pickle.searchInput, 'focus');
                
                pickle.open();
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                expect(focusSpy).toHaveBeenCalled();
            });

            it('should warn if selected value not in DOM (if debug is enabled)', () => {
                const select = document.createElement('select');
                document.body.appendChild(select);
                const pickle = new Pickle(select, {debug:true});
                
                // Add options initially
                pickle.updateOptions([
                    { value: 'option1', text: 'Option 1' }
                ]);
                
                // Mock the get method to return a value even when options are removed
                const originalGet = pickle.get;
                pickle.get = jest.fn().mockReturnValue('nonexistent-value');
                
                // Remove all options so find() will return undefined
                pickle.updateOptions([]);
                
                const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
                pickle.open();

                expect(warnSpy).toHaveBeenCalledWith(
                    '%c[Pickle]', 
                    'color: #33a383; font-weight: bold;', 
                    'Selected value not found in DOM --> failed to focus', 
                    'nonexistent-value'
                );

                // Restore
                pickle.get = originalGet;
                warnSpy.mockRestore();
            });

            it('should emit beforeOpen and open events', () => {
                const beforeOpenSpy = jest.fn();
                const openSpy = jest.fn();
                
                pickle.wrapper.addEventListener('pickle:beforeOpen', beforeOpenSpy);
                pickle.wrapper.addEventListener('pickle:open', openSpy);
                
                pickle.open();
                
                expect(beforeOpenSpy).toHaveBeenCalled();
                expect(openSpy).toHaveBeenCalled();
            });

            it('should not open if beforeOpen is prevented', () => {
                pickle.wrapper.addEventListener('pickle:beforeOpen', (e) => {
                    e.preventDefault();
                });
                
                pickle.open();
                expect(pickle.isOpen).toBe(false);
            });
        });

        describe('close() method', () => {
            beforeEach(() => {
                pickle.open();
            });

            it('should close dropdown', () => {
                pickle.close();
                expect(pickle.isOpen).toBe(false);
                expect(pickle.dropdown.classList.contains('pickle-select__dropdown--open')).toBe(false);
                expect(pickle.trigger.getAttribute('aria-expanded')).toBe('false');
            });

            it('should clear search input when closing', () => {
                pickle.setSearchable(true);
                pickle.searchInput.value = 'test';
                pickle.close();
                expect(pickle.searchInput.value).toBe('');
            });

            it('should emit beforeClose and close events', () => {
                const beforeCloseSpy = jest.fn();
                const closeSpy = jest.fn();
                
                pickle.wrapper.addEventListener('pickle:beforeClose', beforeCloseSpy);
                pickle.wrapper.addEventListener('pickle:close', closeSpy);
                
                pickle.close();
                
                expect(beforeCloseSpy).toHaveBeenCalled();
                expect(closeSpy).toHaveBeenCalled();
            });

            it('should not close if beforeClose is prevented', () => {
                pickle.wrapper.addEventListener('pickle:beforeClose', (e) => {
                    e.preventDefault();
                });
                
                pickle.close();
                expect(pickle.isOpen).toBe(true);
            });
        });

        describe('toggle() method', () => {
            it('should open when closed', () => {
                expect(pickle.isOpen).toBe(false);
                pickle.toggle();
                expect(pickle.isOpen).toBe(true);
            });

            it('should close when open', () => {
                pickle.open();
                expect(pickle.isOpen).toBe(true);
                pickle.toggle();
                expect(pickle.isOpen).toBe(false);
            });
        });

        describe('set() and get() methods', () => {
            it('should set single value', () => {
                pickle.set('option1');
                expect(pickle.get()).toBe('option1');
                expect(pickle.originalSelect.value).toBe('option1');
            });

            it('should fire change event when setting value', () => {
                const changeSpy = jest.fn();
                pickle.wrapper.addEventListener('pickle:change', changeSpy);

                pickle.set('option1');
                expect(changeSpy).toHaveBeenCalled();
            });

            it('should fire change event even when no value being set', () => {
                const changeSpy = jest.fn();
                pickle.wrapper.addEventListener('pickle:change', changeSpy);
                pickle.set([]);
                expect(changeSpy).toHaveBeenCalled();
            });

            it('should set multiple values in multi-select mode', () => {
                pickle.destroy();
                selectElement.multiple = true;
                pickle = new Pickle(selectElement);
                
                pickle.set(['option1', 'option2']);
                expect(pickle.get()).toEqual(['option1', 'option2']);
            });

            it('should only use first value in single-select mode', () => {
                pickle.set(['option1', 'option2']);
                expect(pickle.get()).toBe('option1');
            });

            it('should handle empty array', () => {
                pickle.destroy();
                selectElement.multiple = true;
                pickle = new Pickle(selectElement);
                
                pickle.set([]);
                expect(pickle.get()).toEqual([]);
            });
        });

        describe('clear() method', () => {
            beforeEach(() => {
                pickle.set('option1');
            });

            it('should clear selection', () => {
                pickle.clear();
                expect(pickle.get()).toBe('');
            });

            it('should clear selection silently', () => {
                const changeSpy = jest.fn();
                pickle.wrapper.addEventListener('pickle:change', changeSpy);
                
                pickle.clear(true);
                expect(changeSpy).not.toHaveBeenCalled();
            });

            it('should fire change event by default', () => {
                const changeSpy = jest.fn();
                pickle.wrapper.addEventListener('pickle:change', changeSpy);
                
                pickle.clear();
                expect(changeSpy).toHaveBeenCalled();
            });

            it('should update live region when clearing selection', async () => {
                const select = document.createElement('select');
                select.innerHTML = '<option value="1">Option 1</option><option value="2">Option 2</option>';
                document.body.appendChild(select);
                
                const pickle = new Pickle(select, {
                    // Add any options that enable live region (check your constructor)
                    // This might be something like: accessibility: true, announceChanges: true, etc.
                });
                
                if (!pickle.liveRegion) {
                    pickle.liveRegion = document.createElement('div');
                    pickle.liveRegion.setAttribute('aria-live', 'polite');
                    document.body.appendChild(pickle.liveRegion);
                }
                
                pickle.set('1');
                
                if (!pickle.l10n) {
                    pickle.l10n = { selectionCleared: 'Selection cleared' };
                }
                
                pickle.clear();
                
                expect(pickle.liveRegion.textContent).toBe('');
                
                await new Promise(resolve => setTimeout(resolve, 60));
                
                expect(pickle.liveRegion.textContent).toBe('Selection cleared');
            });

            it('should trigger the custom onChange handler with correct arguments when clearing', () => {
                const changeSpy = jest.fn();
                
                // Set up Pickle with initial selection
                pickle.set('option1');
                
                // Clear any previous calls from the set() above
                changeSpy.mockClear();
                
                // Set the custom onChange handler
                pickle.onChange = changeSpy;
                
                // Clear the selection - this should trigger onChange
                pickle.clear();
                
                // The clear() should call onChange with empty value and text
                expect(changeSpy).toHaveBeenCalledWith('', { 
                    originalEvent: null, 
                    text: '', 
                    element: pickle 
                });
            });

            it('should clear multi-select', () => {
                pickle.destroy();
                selectElement.multiple = true;
                pickle = new Pickle(selectElement);
                
                pickle.set(['option1', 'option2']);
                pickle.clear();
                expect(pickle.get()).toEqual([]);
            });
        });

        describe('getText() method', () => {
            it('should return selected text for single-select', () => {
                pickle.set('option1');
                expect(pickle.getText()).toBe('Option 1');
            });

            it('should return array of texts for multi-select', () => {
                pickle.destroy();
                selectElement.multiple = true;
                pickle = new Pickle(selectElement);
                
                pickle.set(['option1', 'option2']);
                expect(pickle.getText()).toEqual(['Option 1', 'Option 2']);
            });

            it('should return empty string when nothing selected', () => {
                pickle.destroy();
                
                const freshSelect = document.createElement('select');
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = 'Choose...';
                freshSelect.appendChild(emptyOption);
                
                const regularOption = document.createElement('option');
                regularOption.value = 'test';
                regularOption.textContent = 'Test';
                freshSelect.appendChild(regularOption);
                
                container.appendChild(freshSelect);
                pickle = new Pickle(freshSelect);
                
                expect(pickle.getText()).toBe('');
            });
        });

        describe('getOption() method', () => {
            beforeEach(() => {
                pickle.open();
            });

            it('should return selected option element for single-select', () => {
                pickle.set('option1');
                const option = pickle.getOption();
                expect(option.getAttribute('data-value')).toBe('option1');
            });

            it('should return array of option elements for multi-select', () => {
                pickle.destroy();
                selectElement.multiple = true;
                pickle = new Pickle(selectElement);
                pickle.open();
                
                pickle.set(['option1', 'option2']);
                const options = pickle.getOption();
                expect(Array.isArray(options)).toBe(true);
                expect(options).toHaveLength(2);
            });
        });

        describe('getOptions() method', () => {
            it('should return all options with metadata', () => {
                const options = pickle.getOptions();
                expect(Array.isArray(options)).toBe(true);
                expect(options.length).toBeGreaterThan(0);
                expect(options[0]).toHaveProperty('value');
                expect(options[0]).toHaveProperty('text');
                expect(options[0]).toHaveProperty('disabled');
                expect(options[0]).toHaveProperty('selected');
            });
        });

        describe('isElementOpen() method', () => {
            it('should return true if the dropdown is open', () => {
                pickle.open();
                expect(pickle.isElementOpen()).toBe(true);
            });

            it('should return false if the dropdown is closed', () => {
                pickle.open();
                pickle.close();
                expect(pickle.isElementOpen()).toBe(false);
            });
        });

    });

    describe('Option Management', () => {
        beforeEach(() => {
            pickle = new Pickle(selectElement);
        });

        describe('addOption() method', () => {
            it('should add option at end by default', () => {
                const initialCount = pickle.originalSelect.options.length;
                pickle.addOption('new-option', 'New Option');
                
                expect(pickle.originalSelect.options.length).toBe(initialCount + 1);
                const lastOption = pickle.originalSelect.options[pickle.originalSelect.options.length - 1];
                expect(lastOption.value).toBe('new-option');
                expect(lastOption.textContent).toBe('New Option');
            });

            it('should add option at specific index', () => {
                pickle.addOption('new-option', 'New Option', 1);
                expect(pickle.originalSelect.options[1].value).toBe('new-option');
            });

            it('should add disabled option', () => {
                pickle.addOption('disabled-option', 'Disabled Option', -1, true);
                const addedOption = Array.from(pickle.originalSelect.options)
                    .find(opt => opt.value === 'disabled-option');
                expect(addedOption.disabled).toBe(true);
            });

            it('should emit optionAdded event', () => {
                const spy = jest.fn();
                pickle.wrapper.addEventListener('pickle:optionAdded', spy);
                
                pickle.addOption('new-option', 'New Option');
                expect(spy).toHaveBeenCalled();
            });
        });

        describe('removeOption() method', () => {
            it('should remove option by value', () => {
                const initialCount = pickle.originalSelect.options.length;
                pickle.removeOption('option1');
                
                expect(pickle.originalSelect.options.length).toBe(initialCount - 1);
                const foundOption = Array.from(pickle.originalSelect.options)
                    .find(opt => opt.value === 'option1');
                expect(foundOption).toBeUndefined();
            });

            it('should clear selection when removing selected option', () => {
                pickle.set('option1');
                pickle.removeOption('option1');
                expect(pickle.get()).toBe('');
            });

            it('should clear selection when removing selected option from multi-select', () => {
                let select = document.createElement('select');
                select.multiple = true;
                document.body.appendChild(select);
                pickle = new Pickle(select);
                pickle.set('option1');
                pickle.removeOption('option1');
                expect(pickle.get()).toEqual([]);
            });

            it('should emit optionRemoved event', () => {
                const spy = jest.fn();
                pickle.wrapper.addEventListener('pickle:optionRemoved', spy);
                
                pickle.removeOption('option1');
                expect(spy).toHaveBeenCalled();
            });
        });

        describe('updateOptions() method', () => {
            it('should replace all options', () => {
                const newOptions = [
                    { value: 'a', text: 'Option A' },
                    { value: 'b', text: 'Option B' }
                ];
                
                pickle.updateOptions(newOptions);
                
                expect(pickle.originalSelect.options.length).toBe(2);
                expect(pickle.originalSelect.options[0].value).toBe('a');
                expect(pickle.originalSelect.options[1].value).toBe('b');
            });

            it('should preserve selection after update', () => {
                pickle.set('option1');
                
                const newOptions = [
                    { value: 'option1', text: 'Updated Option 1' },
                    { value: 'option2', text: 'Option 2' }
                ];
                
                pickle.updateOptions(newOptions);
                expect(pickle.get()).toBe('option1');
            });

            it('should emit optionsUpdated event', () => {
                const spy = jest.fn();
                pickle.wrapper.addEventListener('pickle:optionsUpdated', spy);
                
                pickle.updateOptions([{ value: 'a', text: 'A' }]);
                expect(spy).toHaveBeenCalled();
            });
        });
    });

    describe('State Management', () => {
        beforeEach(() => {
            pickle = new Pickle(selectElement);
        });

        describe('setDisabled() method', () => {
            it('should disable the component', () => {
                pickle.setDisabled(true);
                expect(pickle.isDisabled()).toBe(true);
                expect(pickle.originalSelect.disabled).toBe(true);
                expect(pickle.trigger.getAttribute('aria-disabled')).toBe('true');
                expect(pickle.wrapper.classList.contains('pickle-select--disabled')).toBe(true);
            });

            it('should enable the component', () => {
                pickle.setDisabled(true);
                pickle.setDisabled(false);
                expect(pickle.isDisabled()).toBe(false);
                expect(pickle.originalSelect.disabled).toBe(false);
                expect(pickle.trigger.hasAttribute('aria-disabled')).toBe(false);
                expect(pickle.wrapper.classList.contains('pickle-select--disabled')).toBe(false);
            });

            it('should close dropdown when disabled', () => {
                pickle.open();
                pickle.setDisabled(true);
                expect(pickle.isOpen).toBe(false);
            });
        });

        describe('setRequired() method', () => {
            it('should set required state', () => {
                pickle.setRequired(true);
                expect(pickle.isRequired()).toBe(true);
                expect(pickle.trigger.getAttribute('aria-required')).toBe('true');
                expect(pickle.wrapper.classList.contains('pickle-select--required')).toBe(true);
            });

            it('should unset required state', () => {
                pickle.setRequired(true);
                pickle.setRequired(false);
                expect(pickle.isRequired()).toBe(false);
                expect(pickle.trigger.hasAttribute('aria-required')).toBe(false);
                expect(pickle.wrapper.classList.contains('pickle-select--required')).toBe(false);
            });
        });

        describe('setSearchable() method', () => {
            it('should enable search', () => {
                pickle.setSearchable(true);
                expect(pickle.isSearchable()).toBe(true);
                expect(pickle.searchInput).toBeTruthy();
            });

            it('should disable search', () => {
                pickle.setSearchable(true);
                pickle.setSearchable(false);
                expect(pickle.isSearchable()).toBe(false);
                expect(pickle.searchInput).toBeNull();
            });
        });
    });

    describe('Validation', () => {
        beforeEach(() => {
            pickle = new Pickle(selectElement);
        });

        describe('getValidationState() method', () => {
            it('should return validation state', () => {
                const state = pickle.getValidationState();
                expect(state).toHaveProperty('valid');
                expect(state).toHaveProperty('valueMissing');
                expect(state).toHaveProperty('customError');
                expect(state).toHaveProperty('validationMessage');
            });
        });

        describe('setCustomValidity() method', () => {
            it('should set custom validation message', () => {
                pickle.setCustomValidity('Custom error');
                expect(pickle.originalSelect.validationMessage).toBe('Custom error');
                expect(pickle.wrapper.classList.contains('pickle-select--invalid')).toBe(true);
                expect(pickle.trigger.getAttribute('aria-invalid')).toBe('true');
            });

            it('should clear custom validation message', () => {
                pickle.setCustomValidity('Custom error');
                pickle.setCustomValidity('');
                expect(pickle.wrapper.classList.contains('pickle-select--invalid')).toBe(false);
                expect(pickle.trigger.hasAttribute('aria-invalid')).toBe(false);
            });
        });
    });

    describe('Search Functionality', () => {
        beforeEach(() => {
            pickle = new Pickle(selectElement, { searchable: true });
        });

        it('should filter options with regular search', () => {
            pickle.open();
            const initialOptionsCount = pickle.options.length;
            
            pickle.searchInput.value = 'Option 1';
            pickle.searchInput.dispatchEvent(new Event('input'));
            
            expect(pickle.options.length).toBeLessThan(initialOptionsCount);
        });

        it('should filter options with fuzzy search', () => {
            pickle.destroy();
            pickle = new Pickle(selectElement, { searchable: true, fuzzySearch: true });
            pickle.open();
            
            pickle.searchInput.value = 'Opt1';
            pickle.searchInput.dispatchEvent(new Event('input'));
            
            expect(pickle.options.length).toBeGreaterThan(0);
        });

        it('should show all options when search is cleared', () => {
            pickle.open();
            const initialOptionsCount = pickle.options.length;
            
            pickle.searchInput.value = 'Option 1';
            pickle.searchInput.dispatchEvent(new Event('input'));
            
            pickle.searchInput.value = '';
            pickle.searchInput.dispatchEvent(new Event('input'));
            
            expect(pickle.options.length).toBe(initialOptionsCount);
        });

        it('should emit search event', () => {
            const spy = jest.fn();
            pickle.wrapper.addEventListener('pickle:search', spy);
            
            pickle.open();
            pickle.searchInput.value = 'test';
            pickle.searchInput.dispatchEvent(new Event('input'));
            
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Destroy and Cleanup', () => {
        beforeEach(() => {
            pickle = new Pickle(selectElement);
        });

        it('should destroy instance and clean up', () => {
            const wrapper = pickle.wrapper;
            pickle.destroy();
            
            expect(Pickle.instances.has(pickle)).toBe(false);
            expect(wrapper.parentNode).toBeNull();
            expect(selectElement.style.display).toBe('');
        });

        it('should remove event listeners on destroy', () => {
            const handleDocumentClick = pickle.handleDocumentClick;
            pickle.destroy();
            
            expect(() => document.dispatchEvent(new Event('click'))).not.toThrow();
        });

        it('should emit destroyed event', () => {
            const spy = jest.fn();
            pickle.wrapper.addEventListener('pickle:destroyed', spy);
            
            pickle.destroy();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing original select on destroy', () => {
            pickle = new Pickle(selectElement);
            pickle.originalSelect = null;
            expect(() => pickle.destroy()).not.toThrow();
        });

        it('should handle debug mode logging', () => {
            pickle = new Pickle(selectElement, { debug: true });
            expect(() => pickle._log('info', 'test message')).not.toThrow();
        });

        it('should handle event dispatch failure gracefully', () => {
            pickle = new Pickle(selectElement);
            pickle.wrapper = null;
            expect(() => pickle.open()).not.toThrow();
        });

        it('handles dispatch failure gracefully', () => {
            const pickle = new Pickle(selectElement);
            pickle.wrapper = { dispatchEvent: () => { throw new Error('Boom'); } };
            pickle.debug = true;

            const result = pickle.open();
            expect(result).toBeUndefined();
        });

        it('should handle label creation with existing label', () => {
            const label = document.createElement('label');
            label.setAttribute('for', selectElement.id);
            label.textContent = 'Test Label';
            container.appendChild(label);
            
            pickle = new Pickle(selectElement);
            expect(pickle.label).toBeTruthy();
            expect(pickle.label.textContent).toBe('Test Label');
        });
    });
});