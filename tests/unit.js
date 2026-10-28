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
            let pickle;
            const invalidElement = document.createElement('div'); // Not a select
            expect(() => {
                pickle = new Pickle(invalidElement, { debug: true });
            }).toThrow('Invalid select element provided');
            expect(console.error).toHaveBeenCalledWith(
                '%c[Pickle]',
                expect.any(String),
                'Invalid select element provided'
            );
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

        it('should handle array with non-string values in multi-select by returning empty array', () => {
            selectElement.multiple = true;
            // This should trigger the return []; on line 100
            pickle = new Pickle(selectElement, { defaultValue: ['option1', 123, 'option2'] });
            expect(pickle.defaultValue).toEqual([]);
        });

        it('should log error and throw for invalid defaultValue when debug enabled', () => {
            // Mock console methods to capture debug logs
            const originalError = console.error;
            const mockError = jest.fn();
            console.error = mockError;
            
            try {
                // This should trigger line 103 (debug log) and line 104 (throw error)
                expect(() => new Pickle(selectElement, { defaultValue: 123, debug: true }))
                    .toThrow('defaultValue must be a string or an array of strings');
                    
                // Check that debug logging was called
                expect(mockError).toHaveBeenCalledWith(
                    '%c[Pickle]',
                    'color: #33a383; font-weight: bold;',
                    'defaultValue must be a string or an array of strings'
                );
            } finally {
                // Restore original console method
                console.error = originalError;
            }
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
                const pickle = new Pickle(select, { debug: true });

                pickle.updateOptions([
                    { value: 'option1', text: 'Option 1' }
                ]);

                // Mock get to return a value not present in options
                const originalGet = pickle.get;
                pickle.get = jest.fn().mockReturnValue('nonexistent-value');

                // Spy before open
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
                pickle = new Pickle(selectElement)
                
                pickle.liveRegion = document.createElement('div');
                pickle.liveRegion.setAttribute('aria-live', 'polite');
                document.body.appendChild(pickle.liveRegion);
                
                pickle.set('1');
                if (!pickle.l10n) {
                    pickle.l10n = { selectionCleared: 'Selection cleared' };
                }
                pickle.clear();
                pickle.clear();
                console.log('liveRegion after clear:', pickle.liveRegion);
                await new Promise(resolve => setTimeout(resolve, 60));
                console.log('liveRegion after timeout:', pickle.liveRegion);
                expect(pickle.liveRegion.textContent).toBe('');
                
                await new Promise(resolve => setTimeout(resolve, 60));
                
                expect(pickle.liveRegion.textContent).toBe('Selection cleared');
            });

            it('should trigger the custom onChange handler with correct arguments when clearing', () => {
                const changeSpy = jest.fn();
                pickle.set('option1');
                
                changeSpy.mockClear();

                pickle.onChange = changeSpy;
                pickle.clear();
                
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
            expect(() => pickle.utils.log('info', 'test message')).not.toThrow();
        });

        it('should handle event dispatch failure gracefully', () => {
            pickle = new Pickle(selectElement);
            pickle.wrapper = null;
            expect(() => pickle.open()).not.toThrow();
        });

        it('should call toggle when not disabled on click', () => {
            const pickle = new Pickle(selectElement, { disabled: false });
            const toggleSpy = jest.spyOn(pickle, 'toggle');
            pickle.eventSystem.attachEventListeners();

            // Debugging output
            expect(pickle.trigger).toBeTruthy();
            expect(typeof pickle.trigger.addEventListener).toBe('function');

            pickle.trigger.click();
            expect(toggleSpy).toHaveBeenCalled();
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

        it('should clear lingering selected options from DOM during clearSelectedOption', () => {
            pickle = new Pickle(selectElement);
            pickle.open();
            
            // Manually add selected class to options to simulate lingering state
            const options = pickle.options;
            options[0].classList.add('pickle-select__option--selected');
            options[0].setAttribute('aria-selected', 'true');
            options[1].classList.add('pickle-select__option--selected'); 
            options[1].setAttribute('aria-selected', 'true');
            
            // Ensure selectedOption is null so we test the cleanup loop
            pickle.selectedOption = null;
            
            // Call clearSelectedOption to trigger cleanup
            pickle.optionManager.clearSelectedOption();
            
            // Verify all options are cleared
            options.forEach(option => {
                expect(option.classList.contains('pickle-select__option--selected')).toBe(false);
                expect(option.getAttribute('aria-selected')).toBeFalsy();
            });
        });

        it('should handle selectOptionByValue with DOM element creation', () => {
            pickle = new Pickle(selectElement);
            pickle.open();
            
            // Call selectOptionByValue directly to cover the lines that set option element classes
            pickle.optionManager.selectOptionByValue('option1');
            
            // Verify the option element was selected properly
            const selectedOption = pickle.options.find(opt => opt.getAttribute('data-value') === 'option1');
            expect(selectedOption).toBeTruthy();
            expect(selectedOption.classList.contains('pickle-select__option--selected')).toBe(true);
            expect(selectedOption.getAttribute('aria-selected')).toBe('true');
            expect(pickle.selectedOption).toBe(selectedOption);
        });

        it('should handle selectOptionByValue with invalid/disabled option', () => {
            pickle = new Pickle(selectElement);
            
            // Try to select a non-existent option
            const originalSelection = pickle.get();
            pickle.optionManager.selectOptionByValue('non-existent-option');
            
            // Verify nothing changed (early return was triggered)
            expect(pickle.get()).toBe(originalSelection);
            
            // Add a disabled option to test the disabled check
            pickle.addOption('disabled-option', 'Disabled Option', true, true); // disabled
            pickle.optionManager.selectOptionByValue('disabled-option');
            
            // Verify the disabled option wasn't selected
            expect(pickle.get()).toBe(originalSelection);
        });

        it('should handle event dispatch failures gracefully', () => {
            pickle = new Pickle(selectElement);
            
            // Mock console.warn to track calls
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            // Create a pickle instance with debug enabled
            pickle.debug = true;
            
            // Mock dispatchEvent to throw an error
            const originalDispatchEvent = pickle.wrapper.dispatchEvent;
            pickle.wrapper.dispatchEvent = jest.fn(() => {
                throw new Error('Dispatch failed');
            });
            
            // Try to emit an event - should handle the error gracefully
            const result = pickle.eventSystem.emit('test-event');
            
            // Verify error was handled
            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Event dispatch failed:', expect.any(Error));
            
            // Restore original methods
            pickle.wrapper.dispatchEvent = originalDispatchEvent;
            consoleSpy.mockRestore();
        });

        it('should handle emit() when wrapper is null', () => {
            pickle = new Pickle(selectElement);
            
            // Set wrapper to null to simulate the null return case
            pickle.wrapper = null;
            
            // Try to emit an event - should return null gracefully
            const result = pickle.eventSystem.emit('test-event', { some: 'data' });
            
            // Verify null is returned when wrapper is null
            expect(result).toBeNull();
        });

        it('should handle option click events properly', () => {
            pickle = new Pickle(selectElement);
            pickle.open();
            
            // Get a non-placeholder option element (skip the first one which is likely placeholder)
            const optionElement = pickle.options.find(opt => 
                opt.getAttribute('data-value') && opt.getAttribute('data-value') !== ''
            );
            expect(optionElement).toBeTruthy();
            const expectedValue = optionElement.getAttribute('data-value');
            
            // Mock the toggleOptionSelection method to track calls
            const toggleSpy = jest.spyOn(pickle.optionManager, 'toggleOptionSelection');
            
            // Simulate clicking an option
            optionElement.click();
            
            // Verify toggleOptionSelection was called with correct parameters
            expect(toggleSpy).toHaveBeenCalledWith(expectedValue, optionElement);
            
            toggleSpy.mockRestore();
        });

        it('should handle disabled option clicks', () => {
            pickle = new Pickle(selectElement);
            pickle.open();
            
            // Add a disabled option
            pickle.addOption('disabled-test', 'Disabled Test', true, true);
            
            // Find the disabled option element
            const disabledOption = pickle.options.find(opt => 
                opt.getAttribute('data-value') === 'disabled-test'
            );
            expect(disabledOption).toBeTruthy();
            expect(disabledOption.classList.contains('pickle-select__option--disabled')).toBe(true);
            
            // Mock toggleOptionSelection to ensure it's not called
            const toggleSpy = jest.spyOn(pickle.optionManager, 'toggleOptionSelection');
            
            // Click the disabled option
            disabledOption.click();
            
            // Verify toggleOptionSelection was NOT called for disabled option
            expect(toggleSpy).not.toHaveBeenCalledWith('disabled-test', disabledOption);
            
            toggleSpy.mockRestore();
        });

        it('should handle document clicks outside wrapper', () => {
            pickle = new Pickle(selectElement);
            pickle.open();
            
            expect(pickle.isElementOpen()).toBe(true);
            
            // Create an element outside the wrapper
            const outsideElement = document.createElement('div');
            document.body.appendChild(outsideElement);
            
            // Simulate clicking outside
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                target: outsideElement
            });
            
            // Manually trigger the document click handler
            pickle.handleDocumentClick(clickEvent);
            
            // Verify dropdown closed
            expect(pickle.isElementOpen()).toBe(false);
            
            // Cleanup
            document.body.removeChild(outsideElement);
        });

        it('should handle touchmove events on dropdown', () => {
            pickle = new Pickle(selectElement);
            pickle.open();
            
            // Create a touchmove event
            const touchEvent = new TouchEvent('touchmove', {
                bubbles: true,
                cancelable: true
            });
            
            // Mock stopPropagation to verify it's called
            const stopPropagationSpy = jest.spyOn(touchEvent, 'stopPropagation');
            
            // Dispatch touchmove on dropdown
            pickle.dropdown.dispatchEvent(touchEvent);
            
            // Verify stopPropagation was called
            expect(stopPropagationSpy).toHaveBeenCalled();
        });

        it('should handle navigation with all options disabled', () => {
            // Create a select with all disabled options
            const disabledSelect = document.createElement('select');
            disabledSelect.innerHTML = `
                <option value="" disabled>Select an option</option>
                <option value="option1" disabled>Option 1</option>
                <option value="option2" disabled>Option 2</option>
            `;
            document.body.appendChild(disabledSelect);
            
            pickle = new Pickle(disabledSelect);
            pickle.open();
            
            // Try to focus previous option when all options are disabled
            // This should trigger the while loop in focusPreviousOption and hit line 98 (prevIndex--)
            pickle.keyboardNavigation.focusPreviousOption();
            
            // Should not have any focused option since all are disabled
            expect(pickle.focusedIndex).toBe(-1);
            expect(pickle.focusedOption).toBeNull();
            
            document.body.removeChild(disabledSelect);
        });

        it('should scroll option into view when dropdown height is limited', () => {
            // Create a select with many options to force scrolling
            const scrollSelect = document.createElement('select');
            let optionsHTML = '<option value="">Select an option</option>';
            for (let i = 1; i <= 20; i++) {
                optionsHTML += `<option value="option${i}">Option ${i}</option>`;
            }
            scrollSelect.innerHTML = optionsHTML;
            document.body.appendChild(scrollSelect);
            
            pickle = new Pickle(scrollSelect);
            pickle.open();
            
            // Mock the dropdown dimensions to simulate scrolling scenario
            Object.defineProperty(pickle.dropdown, 'scrollHeight', { value: 500, configurable: true });
            Object.defineProperty(pickle.dropdown, 'clientHeight', { value: 200, configurable: true });
            Object.defineProperty(pickle.dropdown, 'scrollTop', { value: 0, writable: true });
            
            // Mock an option that's below the visible area
            const lastOption = pickle.options[pickle.options.length - 1];
            if (lastOption) {
                Object.defineProperty(lastOption, 'offsetTop', { value: 400, configurable: true });
                Object.defineProperty(lastOption, 'offsetHeight', { value: 30, configurable: true });
                
                // This should trigger scrolling logic in scrollOptionIntoView
                pickle.keyboardNavigation.scrollOptionIntoView(lastOption);
                
                // Should have scrolled to make option visible
                expect(pickle.dropdown.scrollTop).toBeGreaterThan(0);
            }
            
            document.body.removeChild(scrollSelect);
        });

        it('should scroll option into view when option is above visible area', () => {
            // Create a select with many options
            const scrollSelect = document.createElement('select');
            let optionsHTML = '<option value="">Select an option</option>';
            for (let i = 1; i <= 20; i++) {
                optionsHTML += `<option value="option${i}">Option ${i}</option>`;
            }
            scrollSelect.innerHTML = optionsHTML;
            document.body.appendChild(scrollSelect);
            
            pickle = new Pickle(scrollSelect);
            pickle.open();
            
            // Mock the dropdown dimensions and scroll position
            Object.defineProperty(pickle.dropdown, 'scrollHeight', { value: 500, configurable: true });
            Object.defineProperty(pickle.dropdown, 'clientHeight', { value: 200, configurable: true });
            Object.defineProperty(pickle.dropdown, 'scrollTop', { value: 100, writable: true });
            
            // Mock an option that's above the visible area
            const firstOption = pickle.options[1]; // Skip the placeholder
            if (firstOption) {
                Object.defineProperty(firstOption, 'offsetTop', { value: 50, configurable: true });
                Object.defineProperty(firstOption, 'offsetHeight', { value: 30, configurable: true });
                
                // This should trigger scrolling to show option at top
                pickle.keyboardNavigation.scrollOptionIntoView(firstOption);
                
                // Should have scrolled to show the option
                expect(pickle.dropdown.scrollTop).toBe(50);
            }
            
            document.body.removeChild(scrollSelect);
        });

        it('should trigger scroll listener for lazy loading', () => {
            // Create select with many options to test lazy loading scroll
            const scrollSelect = document.createElement('select');
            let optionsHTML = '<option value="">Select an option</option>';
            for (let i = 1; i <= 100; i++) {
                optionsHTML += `<option value="option${i}">Option ${i}</option>`;
            }
            scrollSelect.innerHTML = optionsHTML;
            document.body.appendChild(scrollSelect);
            
            pickle = new Pickle(scrollSelect);
            pickle.open();
            
            // Mock dropdown dimensions to trigger lazy loading
            Object.defineProperty(pickle.dropdown, 'scrollHeight', { value: 1000, configurable: true });
            Object.defineProperty(pickle.dropdown, 'clientHeight', { value: 300, configurable: true });
            Object.defineProperty(pickle.dropdown, 'scrollTop', { value: 650, configurable: true }); // Near bottom
            
            // Spy on renderChunk to verify it gets called
            const renderChunkSpy = jest.spyOn(pickle.optionManager, 'renderChunk');
            
            // Manually trigger scroll event (lines 13-18)
            const scrollEvent = new Event('scroll');
            pickle.dropdown.dispatchEvent(scrollEvent);
            
            // Should have called renderChunk due to being near bottom
            expect(renderChunkSpy).toHaveBeenCalled();
            
            renderChunkSpy.mockRestore();
            document.body.removeChild(scrollSelect);
        });

        it('should handle disabled optgroup labels', () => {
            // Create select with disabled optgroup
            const optgroupSelect = document.createElement('select');
            optgroupSelect.innerHTML = `
                <option value="">Select an option</option>
                <optgroup label="Disabled Group" disabled>
                    <option value="disabled1">Disabled Option 1</option>
                    <option value="disabled2">Disabled Option 2</option>
                </optgroup>
                <optgroup label="Enabled Group">
                    <option value="enabled1">Enabled Option 1</option>
                </optgroup>
            `;
            document.body.appendChild(optgroupSelect);
            
            pickle = new Pickle(optgroupSelect);
            pickle.open();
            
            // Find the disabled optgroup label in the rendered options
            const disabledGroup = pickle.dropdown.querySelector('.pickle-select__optgroup-label--disabled');
            expect(disabledGroup).toBeTruthy();
            expect(disabledGroup.textContent).toBe('Disabled Group');
            
            document.body.removeChild(optgroupSelect);
        });

        it('should return false when no more options to load', () => {
            // Create select with limited options
            const limitedSelect = document.createElement('select');
            limitedSelect.innerHTML = `
                <option value="">Select an option</option>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
            `;
            document.body.appendChild(limitedSelect);
            
            pickle = new Pickle(limitedSelect);
            pickle.open();
            
            // All options should already be loaded, so loadMoreOptions should return false (line 88)
            const result = pickle.optionManager.loadMoreOptions();
            expect(result).toBe(false);
            
            document.body.removeChild(limitedSelect);
        });

        it('should handle multi-select empty selection state', () => {
            // Create multi-select
            const multiSelect = document.createElement('select');
            multiSelect.multiple = true;
            multiSelect.innerHTML = `
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
            `;
            document.body.appendChild(multiSelect);
            
            pickle = new Pickle(multiSelect);
            
            // Select multiple options first
            pickle.set(['option1', 'option2']);
            expect(pickle.get()).toEqual(['option1', 'option2']);
            
            // Now deselect all options one by one
            pickle.optionManager.toggleOptionSelection('option1');
            pickle.optionManager.toggleOptionSelection('option2');

            expect(pickle.get()).toEqual([]);
            expect(pickle.valueDisplay.textContent).toBe(pickle.domManager.getPlaceholderText());
            
            document.body.removeChild(multiSelect);
        });
    });
});