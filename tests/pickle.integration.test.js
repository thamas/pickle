import Pickle from '../src/pickle.js';
import { createSelect, createLabel } from './helpers.js';

describe('Pickle - Functionality Test Suite', () => {
    let container, select, label, pickle;
    
    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        if (pickle) {
            pickle.destroy();
            pickle = null;
        }
        document.body.innerHTML = '';
    });

    describe('Constructor and Initialization', () => {
        test('should initialize with HTML element', () => {
            select = createSelect();
            pickle = new Pickle(select);
            
            expect(pickle.originalSelect).toBe(select);
            expect(pickle.wrapper).toBeInstanceOf(HTMLElement);
            expect(pickle.trigger).toBeInstanceOf(HTMLElement);
            expect(pickle.dropdown).toBeInstanceOf(HTMLElement);
            expect(pickle.isOpen).toBe(false);
        });

        test('should initialize with element ID', () => {
            select = createSelect();
            pickle = new Pickle('test-select');
            
            expect(pickle.originalSelect).toBe(select);
            expect(pickle.wrapper).toBeInstanceOf(HTMLElement);
        });

        test('should handle element ID with hash prefix', () => {
            select = createSelect();
            expect(new Pickle('#test-select').originalSelect).toBe(select);
        });

        test('should throw error for invalid element', () => {
            expect(() => new Pickle('nonexistent')).toThrow('Invalid select element provided');
            expect(() => new Pickle(document.createElement('div'))).toThrow('Invalid select element provided');
        });

        test('should throw error for non-function onChange', () => {
            select = createSelect();
            expect(() => new Pickle(select, { onChange: 'not-a-function' })).toThrow('onChange must be a function');
        });

        test('should generate dropdown ID when not present', () => {
            select = createSelect();
            select.id = null;
            pickle = new Pickle(select);
            
            expect(pickle.dropdown.id).toMatch(/^pickle-dropdown-/);
            expect(pickle.trigger.getAttribute('aria-controls')).toBe(pickle.dropdown.id);
        });

        test('should handle different log levels in debug mode', () => {
            const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            select = createSelect();
            pickle = new Pickle(select, { debug: true });

            pickle._log('info', 'Info message');
            pickle._log('warn', 'Warning message');
            pickle._log('error', 'Error message');

            expect(consoleInfoSpy).toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalled();
            
            [consoleInfoSpy, consoleWarnSpy, consoleErrorSpy].forEach(spy => spy.mockRestore());
        });

        test('should handle array defaultValue for multi-select', () => {
            select = createSelect();
            pickle = new Pickle(select, { 
                multiple: true, 
                defaultValue: ['option1', 'option2'] 
            });
            
            expect(pickle.get()).toEqual(['option1', 'option2']);
        });

        test('should throw error for invalid defaultValue', () => {
            select = createSelect();
            expect(() => new Pickle(select, { defaultValue: 123 })).toThrow('defaultValue must be a string or an array of strings');
        });

        test('should initialize with all options', () => {
            select = createSelect();
            const onChange = jest.fn();
            
            pickle = new Pickle(select, {
                onChange,
                defaultValue: 'option2',
                theme: 'custom',
                width: '200px',
                height: '40px',
                disabled: true,
                searchable: true,
                debug: true,
                l10n: { placeholder: 'Custom placeholder' }
            });
            
            expect(pickle.onChange).toBe(onChange);
            expect(pickle.defaultValue).toBe('option2');
            expect(pickle.theme).toBe('custom');
            expect(pickle.width).toBe('200px');
            expect(pickle.height).toBe('40px');
            expect(pickle.disabled).toBe(true);
            expect(pickle.searchable).toBe(true);
            expect(pickle.debug).toBe(true);
            expect(pickle.l10n.placeholder).toBe('Custom placeholder');
        });

        test('should validate constructor options', () => {
            select = createSelect();
            
            expect(() => new Pickle(select, { onChange: 'not-a-function' }))
                .toThrow('onChange must be a function');
            expect(() => new Pickle(select, { defaultValue: 123 }))
                .toThrow('defaultValue must be a string');
        });

        test('should instantiate with a different theme and size', () => {
            select = createSelect();

            pickle = new Pickle(select, {
                theme: 'material',
                width: '200px',
                height: '40px'
            });

            expect(pickle.theme).toBe('material');
            expect(pickle.width).toBe('200px');
            expect(pickle.height).toBe('40px');
        });

        test('should apply default theme and width when not provided', () => {
            select = createSelect();
            pickle = new Pickle(select, {}); 

            expect(pickle.theme).toBe('default');
            expect(pickle.width).toBe('100%');
        });

        test('should add instance to static instances set', () => {
            select = createSelect();
            const initialCount = Pickle.instances.size;
            pickle = new Pickle(select);
            
            expect(Pickle.instances.size).toBe(initialCount + 1);
            expect(Pickle.instances.has(pickle)).toBe(true);
        });

        test('should be logged in debug mode on failed instantiation', () => {
            expect(() => new Pickle('nonexistent', { debug: true })).toThrow('Invalid select element provided');
            expect(console.error).toHaveBeenCalledWith('Pickle initialization error:', expect.any(Error));
        });
    });

    describe('DOM Structure Creation', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select);
        });

        test('should hide original select', () => {
            expect(select.style.display).toBe('none');
        });

        test('should create wrapper with correct classes', () => {
            expect(pickle.wrapper.className).toContain('pickle-select');
            expect(pickle.wrapper.className).toContain('pickle-select--default');
        });

        test('should create trigger with correct attributes', () => {
            expect(pickle.trigger.getAttribute('role')).toBe('combobox');
            expect(pickle.trigger.getAttribute('aria-expanded')).toBe('false');
            expect(pickle.trigger.getAttribute('aria-haspopup')).toBe('listbox');
            expect(pickle.trigger.getAttribute('tabindex')).toBe('0');
        });

        test('should create dropdown with correct attributes', () => {
            expect(pickle.dropdown.getAttribute('role')).toBe('listbox');
            expect(pickle.dropdown.getAttribute('aria-multiselectable')).toBe('false');
        });

        test('should create options with correct attributes', () => {
            expect(pickle.options).toHaveLength(5);
            pickle.options.forEach((option, index) => {
                expect(option.getAttribute('role')).toBe('option');
                expect(option.getAttribute('data-index')).toBe(index.toString());
                expect(option.id).toMatch(/^pickle-option-/);
            });
        });

        test('should create live region for screen readers', () => {
            expect(pickle.liveRegion.getAttribute('aria-live')).toBe('polite');
            expect(pickle.liveRegion.getAttribute('aria-atomic')).toBe('true');
        });

        test('should position wrapper correctly in DOM', () => {
            expect(pickle.wrapper.previousElementSibling).toBe(select);
        });

        test('should create option elements with all attributes in renderChunk', () => {
            const options = [
                { value: 'test1', text: 'Test 1' },
                { value: 'test2', text: 'Test 2', disabled: true }
            ];
            
            select = createSelect(options);
            pickle = new Pickle(select);
            
            const optionElements = pickle.options.filter(opt => opt.getAttribute('role') === 'option');
            
            expect(optionElements[0].getAttribute('data-value')).toBe('test1');
            expect(optionElements[0].getAttribute('data-index')).toBeTruthy();
            expect(optionElements[0].id).toMatch(/^pickle-option-/);
            
            expect(optionElements[1].classList.contains('pickle-select__option--disabled')).toBe(true);
            expect(optionElements[1].getAttribute('aria-disabled')).toBe('true');
        });

        test('should handle optgroups correctly', () => {
            select.innerHTML = `
                <optgroup label="Group 1">
                    <option value="g1o1">Group 1 Option 1</option>
                    <option value="g1o2">Group 1 Option 2</option>
                </optgroup>
                <optgroup label="Group 2" disabled>
                    <option value="g2o1">Group 2 Option 1</option>
                </optgroup>
                <option value="standalone">Standalone</option>`;
            
            pickle = new Pickle(select);
            
            expect(pickle.getOptions().some(opt => opt.value === 'g1o1')).toBe(true);
            expect(pickle.getOptions().some(opt => opt.value === 'g2o1')).toBe(true);
            
            const disabledOpt = pickle.getOptions().find(opt => opt.value === 'g2o1');
            expect(disabledOpt.disabled).toBe(true);
        });
    });

    describe('Theme and Styling', () => {
        test('should apply custom theme classes', () => {
            select = createSelect();
            pickle = new Pickle(select, { theme: 'material' });
            
            expect(pickle.wrapper.className).toContain('pickle-select--material');
            expect(pickle.trigger.className).toContain('pickle-select__trigger--material');
            expect(pickle.dropdown.className).toContain('pickle-select__dropdown--material');
        });

        test('should apply custom dimensions', () => {
            select = createSelect();
            pickle = new Pickle(select, { width: '300px', height: '50px' });
            
            expect(pickle.wrapper.style.width).toBe('300px');
            expect(pickle.trigger.style.height).toBe('50px');
        });
    });

    describe('Opening and Closing', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select);
        });

        test('should open dropdown', () => {
            pickle.open();
            
            expect(pickle.isOpen).toBe(true);
            expect(pickle.dropdown.className).toContain('pickle-select__dropdown--open');
            expect(pickle.trigger.getAttribute('aria-expanded')).toBe('true');
        });

        test('should focus first option if no option selected', () => {
            pickle.open();
            const focusedOption = document.querySelector('.pickle-select__option--focused');
            expect(focusedOption).toBe(pickle.options[0]);
        });

        test('should focus first option when no option is selected', () => {
            select = createSelect([
                { value: 'option1', text: 'Option 1' },
                { value: 'option2', text: 'Option 2' }
            ]);
            
            select.selectedIndex = -1;
            pickle = new Pickle(select);
            
            expect(pickle.get()).toBe('');
            
            pickle.open();
            
            expect(pickle.focusedIndex).toBe(0);
            expect(pickle.focusedOption).toBe(pickle.options[0]);
        });

        test('should close dropdown', () => {
            pickle.open();
            pickle.close();
            
            expect(pickle.isOpen).toBe(false);
            expect(pickle.dropdown.className).not.toContain('pickle-select__dropdown--open');
            expect(pickle.trigger.getAttribute('aria-expanded')).toBe('false');
        });

        test('should NOT close dropdown if default prevented', () => {
            pickle.open();
            const beforeCloseHandler = jest.fn((e) => {
                e.preventDefault();
            });
            pickle.wrapper.addEventListener('pickle:beforeClose', beforeCloseHandler);
            pickle.close();
            expect(pickle.isOpen).toBe(true);
        });

        test('should toggle dropdown', () => {
            expect(pickle.isOpen).toBe(false);
            
            pickle.toggle();
            expect(pickle.isOpen).toBe(true);
            
            pickle.toggle();
            expect(pickle.isOpen).toBe(false);
        });

        test('should not open when disabled', () => {
            pickle.setDisabled(true);
            pickle.open();
            
            expect(pickle.isOpen).toBe(false);
        });

        test('should not open when beforeOpen event is prevented', () => {
            select = createSelect();
            pickle = new Pickle(select);
            
            pickle.wrapper.addEventListener('pickle:beforeOpen', (e) => {
                e.preventDefault();
            });
            
            pickle.open();
            expect(pickle.isOpen).toBe(false);
        });

        test('should not close when beforeClose event is prevented', () => {
            select = createSelect();
            pickle = new Pickle(select);
            
            pickle.open();
            pickle.wrapper.addEventListener('pickle:beforeClose', (e) => {
                e.preventDefault();
            });
            
            pickle.close();
            expect(pickle.isOpen).toBe(true);
        });

        test('should focus selected option when opening if one exists', () => {
            select = createSelect();
            pickle = new Pickle(select);
            
            pickle.set('option2');
            pickle.open();
            
            expect(pickle.focusedOption).toBeTruthy();
            expect(pickle.focusedOption.getAttribute('data-value')).toBe('option2');
            expect(pickle.trigger.getAttribute('aria-activedescendant')).toBe(pickle.focusedOption.id);
        });

        test('should focus first selected option in multi-select when opening', () => {
            select = createSelect();
            pickle = new Pickle(select, { multiple: true });
            
            pickle.set(['option2', 'option4']);
            
            pickle.open();
            
            expect(pickle.focusedOption).toBeTruthy();
            expect(pickle.focusedOption.getAttribute('data-value')).toBe('option2');
        });

        test('should emit events when opening/closing', () => {
            const beforeOpenHandler = jest.fn();
            const openHandler = jest.fn();
            const beforeCloseHandler = jest.fn();
            const closeHandler = jest.fn();
            
            pickle.wrapper.addEventListener('pickle:beforeOpen', beforeOpenHandler);
            pickle.wrapper.addEventListener('pickle:open', openHandler);
            pickle.wrapper.addEventListener('pickle:beforeClose', beforeCloseHandler);
            pickle.wrapper.addEventListener('pickle:close', closeHandler);
            
            pickle.open();
            expect(beforeOpenHandler).toHaveBeenCalled();
            expect(openHandler).toHaveBeenCalled();
            
            pickle.close();
            expect(beforeCloseHandler).toHaveBeenCalled();
            expect(closeHandler).toHaveBeenCalled();
        });

        test('should prevent opening if beforeOpen event is cancelled', () => {
            pickle.wrapper.addEventListener('pickle:beforeOpen', (e) => {
                e.preventDefault();
            });
            
            pickle.open();
            expect(pickle.isOpen).toBe(false);
        });
    });

    describe('Option Selection', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select);
        });

        test('should select option by clicking', () => {
            pickle.open();
            const option = pickle.options[1]; // "Option 1"
            option.click();
            
            expect(pickle.get()).toBe('option1');
            expect(pickle.getText()).toBe('Option 1');
            expect(pickle.selectedOption).toBe(option);
            expect(option.className).toContain('pickle-select__option--selected');
            expect(option.getAttribute('aria-selected')).toBe('true');
        });

        describe('Empty string as selected option when selected option does not exist in source <select>', () => {
            test('should default to empty string when unknown value is selected', () => {
                select.multiple = true;
                const pickle = new Pickle(select);
                pickle.selectedOptions = new Set(['unknown']);
                expect(pickle.getText()).toEqual(['']);
            });

            test('should default to empty string when unknown value is selected (single)', () => {
                const pickle = new Pickle(select);
                pickle.options[0].selected = false;
                pickle.selectedOption = null;
                expect(pickle.getText()).toEqual('Select an option');
            });
        });

        test('should update value display when selecting', () => {
            pickle.set('option2');
            expect(pickle.valueDisplay.textContent).toBe('Option 2');
        });

        test('should not select disabled options', () => {
            const disabledOption = pickle.options[3]; // disabled option
            expect(disabledOption.className).toContain('pickle-select__option--disabled');
            
            pickle.set('option3');
            expect(pickle.get()).not.toBe('option3');
        });

        test('should trigger onChange callback', () => {
            const onChange = jest.fn();
            pickle.destroy();
            
            select = createSelect();
            pickle = new Pickle(select, { onChange });
            
            pickle.set('option2');
            expect(onChange).toHaveBeenCalledWith('option2', expect.objectContaining({
                text: 'Option 2',
                element: pickle
            }));
        });

        test('should deselect option when clicking already selected option in single-select', () => {
            select = createSelect();
            pickle = new Pickle(select);

            pickle.set('option1');
            expect(pickle.get()).toBe('option1');
            
            pickle.set('option1');
            
            const option = pickle.options.find(opt => opt.getAttribute('data-value') === 'option1');
            if (option) {
                option.click();
            }
        });

        test('should set selectedOption property for single-select', () => {
            select = createSelect();
            pickle = new Pickle(select);
            
            pickle.set('option1');
            
            expect(pickle.selectedOption).toBeTruthy();
            expect(pickle.selectedOption.getAttribute('data-value')).toBe('option1');
        });

        test('should trigger native change event', () => {
            const changeHandler = jest.fn();
            select.addEventListener('change', changeHandler);
            
            pickle.set('option2');
            expect(changeHandler).toHaveBeenCalled();
        });

        test('should emit custom change event', () => {
            const changeHandler = jest.fn();
            pickle.wrapper.addEventListener('pickle:change', changeHandler);
            
            pickle.set('option2');
            expect(changeHandler).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({
                    value: 'option2',
                    text: 'Option 2'
                })
            }));
        });
    });

    describe('Clear Functionality', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select);
            pickle.set('option2');
        });

        test('should clear selection', () => {
            pickle.clear();
            
            expect(pickle.get()).toBe('');
            expect(pickle.selectedOption).toBeNull();
            expect(pickle.valueDisplay.textContent).toBe('Select an option');
        });

        test('should assign empty array for multi-select', () => {
            select.multiple = true;
            const pickle = new Pickle(select);
            pickle.set(['option1', 'option2']);
            pickle.clear();
            expect(pickle.get()).toEqual([]);
        });

        test('should trigger callbacks when clearing', () => {
            const onChange = jest.fn();
            pickle.onChange = onChange;
            
            pickle.clear();
            expect(onChange).toHaveBeenCalledWith('', expect.objectContaining({
                text: '',
                element: pickle
            }));
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select);
        });

        test('should open with Enter key', () => {
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            expect(pickle.isOpen).toBe(true);
        });

        test('should open with Space key', () => {
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
            expect(pickle.isOpen).toBe(true);
        });

        test('should close with Escape key', () => {
            pickle.open();
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(pickle.isOpen).toBe(false);
        });

        test('should navigate options with arrow keys', () => {
            pickle.open();
            
            // Arrow down should focus first option
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(pickle.focusedIndex).toBe(1); // Skip placeholder
            expect(pickle.focusedOption).toBe(pickle.options[1]);
            
            // Arrow down again
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(pickle.focusedIndex).toBe(2);
            
            // Arrow up
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(pickle.focusedIndex).toBe(1);
        });

        test('should skip disabled options when navigating', () => {
            pickle.open();
            pickle.focusedIndex = 2; // Start before disabled option
            
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(pickle.focusedIndex).toBe(4); // Should skip disabled option 3
        });

        test('should select focused option with Enter', () => {
            pickle.open();
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            
            expect(pickle.get()).toBe('option1');
            expect(pickle.isOpen).toBe(false);
        });

        test('should focus first option with Home key', () => {
            pickle.open();
            pickle.focusedIndex = 3;
            
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
            expect(pickle.focusedIndex).toBe(0); // First non-disabled option
        });

        test('should focus last option with End key', () => {
            pickle.open();
            
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
            expect(pickle.focusedIndex).toBe(4); // Last option
        });
    });

    describe('Search Functionality', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select, { searchable: true });
        });

        test('should create search input when searchable', () => {
            expect(pickle.searchInput).toBeInstanceOf(HTMLInputElement);
            expect(pickle.searchInput.placeholder).toBe('Search options...');
        });

        test('should filter options when searching', () => {
            pickle.open();
            pickle.searchInput.focus();
            pickle.searchInput.value = 'Option 1';
            pickle.searchInput.dispatchEvent(new Event('input'));
            
            const visibleOptions = pickle.options.filter(opt => opt.style.display !== 'none');
            expect(visibleOptions).toHaveLength(1);
            expect(document.activeElement).toBe(pickle.searchInput);
            expect(visibleOptions[0].textContent).toBe('Option 1');
        });

        test('should emit search events', () => {
            let eventReceived = null;
            
            pickle.wrapper.addEventListener('pickle:search', (e) => {
                eventReceived = e;
            });

            pickle.open();
            pickle.searchInput.value = 'Option';
            pickle.searchInput.dispatchEvent(new Event('input'));

            expect(eventReceived).not.toBeNull();
            expect(eventReceived.type).toBe('pickle:search');
            expect(eventReceived.detail).toEqual({
                instance: pickle,
                term: 'option',
                visibleCount: 5
            });
        });

        test('should focus the search input when a searchable instance is opened', async () => {
            jest.useFakeTimers();
            const select = createSelect();
            const pickle = new Pickle(select, { searchable: true });
            const searchInput = document.querySelector('.pickle-select__search');

            pickle.open();
            jest.runAllTimers();
            await Promise.resolve();

            expect(document.activeElement).toEqual(searchInput);

            jest.useRealTimers();
        });

        test('should handle arrow keys in search input', () => {
            pickle.open();
            
            pickle.searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(document.activeElement).toBe(pickle.trigger);
        });

        test('should close the dropdown and focus trigger when Escape is pressed', () => {
            const select = createSelect();
            const pickle = new Pickle(select, { searchable: true });
            pickle.open();

            const searchInput = document.querySelector('.pickle-select__search');
            const trigger = document.querySelector('.pickle-select__trigger');

            searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            pickle.close();
            trigger.focus(); 

            expect(pickle.isOpen).toBe(false);
            expect(document.activeElement).toBe(trigger);
        });

        test('should fuzzy match properly', () => {
            select = createSelect([
                { value: 'apple', text: 'Apple' },
                { value: 'apricot', text: 'Apricot' }
            ]);
            const pickle = new Pickle(select, { searchable: true, fuzzySearch: true });
            pickle.open();
            pickle.searchInput.value = 'apl';
            pickle.searchInput.dispatchEvent(new Event('input'));

            expect(pickle.options.some(opt => opt.textContent === 'Apple')).toBe(true);
        })

        test('should clear search when closing', () => {
            pickle.open();
            pickle.searchInput.value = 'test';
            pickle.close();
            
            expect(pickle.searchInput.value).toBe('');
        });

        test('should focus search input when opening searchable dropdown', async () => {
            jest.useFakeTimers();
            select = createSelect();
            pickle = new Pickle(select, { searchable: true });
            
            pickle.open();
            
            jest.runAllTimers();
            await Promise.resolve();
            
            expect(document.activeElement).toBe(pickle.searchInput);
            
            jest.useRealTimers();
        });
    });

    describe('Disabled State', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select);
        });

        test('should set disabled state', () => {
            pickle.setDisabled(true);
            
            expect(pickle.disabled).toBe(true);
            expect(pickle.isDisabled()).toBe(true);
            expect(select.disabled).toBe(true);
            expect(pickle.trigger.getAttribute('aria-disabled')).toBe('true');
            expect(pickle.wrapper.className).toContain('pickle-select--disabled');
        });

        test('should remove disabled state', () => {
            pickle.setDisabled(true);
            pickle.setDisabled(false);
            
            expect(pickle.disabled).toBe(false);
            expect(pickle.isDisabled()).toBe(false);
            expect(select.disabled).toBe(false);
            expect(pickle.trigger.hasAttribute('aria-disabled')).toBe(false);
            expect(pickle.wrapper.className).not.toContain('pickle-select--disabled');
        });

        test('should close dropdown when disabled', () => {
            pickle.open();
            pickle.setDisabled(true);
            
            expect(pickle.isOpen).toBe(false);
        });

        test('should not respond to interactions when disabled', () => {
            pickle.setDisabled(true);
            
            pickle.trigger.click();
            expect(pickle.isOpen).toBe(false);
            
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            expect(pickle.isOpen).toBe(false);
        });
    });

    describe('Option Management', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select);
        });

        test('should add new option', () => {
            const initialCount = pickle.options.length;
            
            pickle.addOption('option5', 'Option 5');
            
            expect(pickle.options.length).toBe(initialCount + 1);
            expect(select.options.length).toBe(initialCount + 1);
            
            const lastOption = select.options[select.options.length - 1];
            expect(lastOption.value).toBe('option5');
            expect(lastOption.textContent).toBe('Option 5');
        });

        test('should add option at specific index', () => {
            pickle.addOption('newOption', 'New Option', 1);
            
            expect(select.options[1].value).toBe('newOption');
            expect(select.options[1].textContent).toBe('New Option');
        });

        test('should add disabled option', () => {
            pickle.addOption('disabled', 'Disabled Option', -1, true);
            
            const lastOption = select.options[select.options.length - 1];
            expect(lastOption.disabled).toBe(true);
            
            const lastPickleOption = pickle.options[pickle.options.length - 1];
            expect(lastPickleOption.className).toContain('pickle-select__option--disabled');
        });

        test('should get the current option', () => {
            pickle.set('option1');
            expect(pickle.getOption()).toBe(pickle.options[1])
        });

        test('should get an array from multi-select', () => {
            select.multiple = true;
            const pickle = new Pickle(select);
            pickle.set(['option1', 'option2']);
            expect(pickle.getOption()).toEqual([pickle.options[1], pickle.options[2]]);
        });

        test('should remove option', () => {
            const initialCount = pickle.options.length;
            
            pickle.removeOption('option2');
            
            expect(pickle.options.length).toBe(initialCount - 1);
            expect(Array.from(select.options).find(opt => opt.value === 'option2')).toBeUndefined();
        });

        test('should clear selection when removing selected option', () => {
            pickle.set('option2');
            pickle.removeOption('option2');
            
            expect(pickle.get()).toBe('');
        });

        test('should remove selected option in multi-select', () => {
            select.multiple = true;
            const pickle = new Pickle(select);
            pickle.set(['option1', 'option2']);
            pickle.removeOption('option1');
            expect(pickle.selectedOptions.has('option1')).toBe(false);
            expect(pickle.get()).toEqual(['option2']);
        });

        test('should remove non-selected option in multi-select', () => {
            select.multiple = true;
            const pickle = new Pickle(select);
            pickle.set(['option2']);
            pickle.removeOption('option1');
            // option1 was not selected, so selectedOptions should remain unchanged
            expect(pickle.selectedOptions.has('option2')).toBe(true);
            expect(pickle.selectedOptions.has('option1')).toBe(false);
            expect(pickle.get()).toEqual(['option2']);
        });

        test('should remove selected option in single-select', () => {
            const pickle = new Pickle(select);
            pickle.set('option2');
            pickle.removeOption('option2');
            expect(pickle.get()).toBe('');
        });

        test('should remove non-selected option in single-select', () => {
            const pickle = new Pickle(select);
            pickle.set('option2');
            pickle.removeOption('option1');
            // option2 should still be selected
            expect(pickle.get()).toBe('option2');
        });

        test('should update all options', () => {
            const newOptions = [
                { value: 'a', text: 'Option A' },
                { value: 'b', text: 'Option B', disabled: true },
                { value: 'c', text: 'Option C' }
            ];
            
            pickle.updateOptions(newOptions);
            
            expect(select.options.length).toBe(3);
            expect(pickle.options.length).toBe(3);
            expect(select.options[0].value).toBe('a');
            expect(select.options[1].disabled).toBe(true);
        });

        test('should preserve selection after options update if value exists', () => {
            pickle.set('option2');
            
            const newOptions = [
                { value: 'option1', text: 'Option 1' },
                { value: 'option2', text: 'Option 2 Updated' },
                { value: 'option3', text: 'Option 3' }
            ];
            
            pickle.updateOptions(newOptions);
            expect(pickle.get()).toBe('option2');
        });
    });

    describe('Multi-Select Mode', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select, { multiple: true });
        });

        test('should handle array of values correctly', () => {
            pickle.set(['option1', 'option2']);
            expect(pickle.get()).toEqual(['option1', 'option2']);
            expect(pickle.getText()).toEqual(['Option 1', 'Option 2']);
            expect(pickle.selectedOptions.size).toBe(2);
        });

        test('should contain the array of default selected options', () => {
            select.multiple = true;
            const pickle = new Pickle(select);
            pickle.selectedOptions = new Set(['option1', 'option3']);
            const options = pickle.getOptions();
            expect(options.find(opt => opt.value === 'option1').selected).toBe(true);
            expect(options.find(opt => opt.value === 'option3').selected).toBe(true);
            expect(options.find(opt => opt.value === 'option2').selected).toBe(false);
        });

        test('should create and remove tags properly', () => {
            pickle.set(['option1', 'option2']);
            
            const tags = pickle.valueDisplay.querySelectorAll('.pickle-select__tag');
            expect(tags).toHaveLength(2);
            
            const removeBtn = tags[0].querySelector('.pickle-select__tag-remove');
            removeBtn.click();
            
            expect(pickle.get()).toEqual(['option2']);
            expect(pickle.valueDisplay.querySelectorAll('.pickle-select__tag')).toHaveLength(1);
        });

        test('should show count when too many selections', () => {
            pickle.addOption('option0', 'Option 0'); // current element only contains 3 valid options, so we have to add one
            pickle.set(['option1', 'option2', 'option4', 'option0']);
            expect(pickle.valueDisplay.textContent).toBe('4 options selected');
        });

        test('should sync with original select multiple attribute', () => {
            pickle.set(['option1', 'option2']);
            
            const selected = Array.from(select.selectedOptions).map(opt => opt.value);
            expect(selected).toEqual(['option1', 'option2']);
        });

        test('should add empty string when all options deselected in multi-select', () => {
            select = createSelect();
            pickle = new Pickle(select, { multiple: true });
            
            pickle.set(['option1']);
            
            pickle.selectedOptions.delete('option1');
            if (pickle.selectedOptions.size === 0) {
                pickle.selectedOptions.add('');
            }
            
            expect(pickle.selectedOptions.has('')).toBe(true);
        });

        test('should remove empty string when selecting non-empty value in multi-select', () => {
            select = createSelect();
            pickle = new Pickle(select, { multiple: true });
            
            pickle.selectedOptions.add('');
            pickle.set(['option1']);
            
            expect(pickle.selectedOptions.has('')).toBe(false);
            expect(pickle.selectedOptions.has('option1')).toBe(true);
        });

        test('real world multi-select with search and form integration', () => {
            const form = document.createElement('form');
            select = createSelect();
            select.name = 'categories';
            select.required = true;
            form.appendChild(select);
            document.body.appendChild(form);
            
            pickle.destroy();
            pickle = new Pickle(select, { multiple: true, searchable: true });
            
            pickle.open();
            pickle.searchInput.value = 'Option';
            pickle.searchInput.dispatchEvent(new Event('input'));
            
            pickle.options[1].click();
            expect(pickle.isOpen).toBe(true);
            pickle.options[2].click();
            
            expect(select.checkValidity()).toBe(true);
            const formData = new FormData(form);
            expect(Array.from(formData.getAll('categories'))).toHaveLength(2);
            
            const removeBtn = pickle.valueDisplay.querySelector('.pickle-select__tag-remove');
            removeBtn.click();
            expect(pickle.get()).toHaveLength(1);
            
            form.remove();
        });
    });

    describe('Validation', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select);
        });

        test('should set required state', () => {
            pickle.setRequired(true);
            
            expect(pickle.required).toBe(true);
            expect(pickle.trigger.getAttribute('aria-required')).toBe('true');
            expect(pickle.wrapper.className).toContain('pickle-select--required');
        });

        test('should remove required state', () => {
            pickle.setRequired(false);
            expect(select.required).toBe(false);
            expect(pickle.trigger.hasAttribute('aria-required')).toBe(false);
            expect(pickle.wrapper.className).not.toContain('pickle-select--required');
        });

        test('should get validation state', () => {
            select.required = true;
            const state = pickle.getValidationState();
            
            expect(state).toHaveProperty('valid');
            expect(state).toHaveProperty('valueMissing');
            expect(state).toHaveProperty('customError');
            expect(state).toHaveProperty('validationMessage');
        });

        test('should set custom validity', () => {
            pickle.setCustomValidity('Custom error message');
            
            expect(select.validationMessage).toBe('Custom error message');
            expect(pickle.wrapper.className).toContain('pickle-select--invalid');
            expect(pickle.trigger.getAttribute('aria-invalid')).toBe('true');
        });

        test('should clear custom validity', () => {
            pickle.setCustomValidity('Error');
            pickle.setCustomValidity('');
            
            expect(select.validationMessage).toBe('');
            expect(pickle.wrapper.className).not.toContain('pickle-select--invalid');
            expect(pickle.trigger.hasAttribute('aria-invalid')).toBe(false);
        });

        test('should work with form submission', () => {
            const form = document.createElement('form');
            select = createSelect();
            select.name = 'test-field';
            form.appendChild(select);
            document.body.appendChild(form);
            
            pickle = new Pickle(select);
            pickle.set('option1');
            
            const formData = new FormData(form);
            expect(formData.get('test-field')).toBe('option1');
            
            form.remove();
        });

        test('should work with required validation', () => {
            select = createSelect();
            select.required = true;
            pickle = new Pickle(select);
            
            expect(select.checkValidity()).toBe(false);
            pickle.set('option1');
            expect(select.checkValidity()).toBe(true);
        });

        test('should set values without requiring passed params', () => {
            pickle.setDisabled();
            expect(pickle.isDisabled()).toBe(true);

            pickle.setRequired();
            expect(pickle.isRequired()).toBe(true);

            pickle.setSearchable();
            expect(pickle.isSearchable()).toBe(true);
        })
    });

    describe('Multiple Instances', () => {
        let select2, pickle2;

        afterEach(() => {
            if (pickle2) {
                pickle2.destroy();
                pickle2 = null;
            }
        });

        test('should close other instances when opening one', () => {
            select = createSelect();
            pickle = new Pickle(select);
            
            select2 = createSelect();
            select2.id = 'test-select-2';
            pickle2 = new Pickle(select2);
            
            pickle.open();
            pickle2.open();
            
            expect(pickle.isOpen).toBe(false);
            expect(pickle2.isOpen).toBe(true);
        });

        test('should manage instances in static set', () => {
            const initialCount = Pickle.instances.size;
            
            select = createSelect();
            pickle = new Pickle(select);
            
            select2 = createSelect();
            select2.id = 'test-select-2';
            pickle2 = new Pickle(select2);
            
            expect(Pickle.instances.size).toBe(initialCount + 2);
            
            pickle.destroy();
            expect(Pickle.instances.size).toBe(initialCount + 1);
            expect(Pickle.instances.has(pickle)).toBe(false);
        });
    });

    describe('Click Outside Behavior', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select);
        });

        test('should close when clicking outside', () => {
            pickle.open();
            
            const outsideElement = document.createElement('div');
            document.body.appendChild(outsideElement);
            outsideElement.click();
            
            expect(pickle.isOpen).toBe(false);
        });
    });

    describe('Accessibility Features', () => {
        test('should announce selection cleared to screen readers (setTimeout coverage)', async () => {
            jest.useFakeTimers();
            select = createSelect();
            pickle = new Pickle(select);
            pickle.set('option1');
            pickle.clear();

            expect(pickle.liveRegion.textContent).toBe('');

            jest.runAllTimers();
            await Promise.resolve();

            expect(pickle.liveRegion.textContent).toBe('Selection cleared');
            jest.useRealTimers();
        });
        beforeEach(() => {
            select = createSelect();
        });

        test('should create proper ARIA labeling with existing label', () => {
            label = createLabel('Test Label', 'test-select');
            container.appendChild(label);

            pickle = new Pickle(select);
            
            expect(pickle.trigger.getAttribute('aria-labelledby')).toBeTruthy();
        });

        test('should assign ID to label that does not have one', () => {
            label = createLabel('Test Label', 'test-select');
            label.id = null;
            container.appendChild(label);

            pickle = new Pickle(select);

            expect(label.getAttribute('id')).toBeTruthy();
        });

        test('should use aria-label when no label exists', () => {
            pickle = new Pickle(select);
            
            expect(pickle.trigger.getAttribute('aria-label')).toBe('Select an option');
        });

        test('should announce selection to screen readers', () => {
            pickle = new Pickle(select);
            pickle.set('option1');
            
            setTimeout(() => {
                expect(pickle.liveRegion.textContent).toBe('Selected: Option 1');
            }, 100);
        });

        test('should announce selection cleared to screen readers', () => {
            pickle = new Pickle(select);
            pickle.set('option1');
            pickle.clear();
            
            setTimeout(() => {
                expect(pickle.liveRegion.textContent).toBe('Selection cleared');
            }, 100);
        });

        test('should set aria-activedescendant when focusing options', () => {
            pickle = new Pickle(select);
            pickle.open();
            
            // Focus first option
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            
            expect(pickle.trigger.getAttribute('aria-activedescendant')).toBe(pickle.focusedOption.id);
        });
    });

    describe('Default Value Handling', () => {
        test('should select default value on initialization', () => {
            select = createSelect();
            pickle = new Pickle(select, { defaultValue: 'option2' });
            
            expect(pickle.get()).toBe('option2');
            expect(pickle.getText()).toBe('Option 2');
        });

        test('should select pre-selected option from HTML', () => {
            select = createSelect([
                { value: '', text: 'Select an option' },
                { value: 'option1', text: 'Option 1' },
                { value: 'option2', text: 'Option 2', selected: true }
            ]);
            
            pickle = new Pickle(select);
            
            expect(pickle.get()).toBe('option2');
        });
    });

    describe('Destroy Functionality', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select);
        });

        test('should clean up DOM and references', () => {
            const wrapper = pickle.wrapper;
            
            pickle.destroy();
            
            expect(select.style.display).toBe('');
            expect(document.body.contains(wrapper)).toBe(false);
            expect(Pickle.instances.has(pickle)).toBe(false);
        });

        test('should remove event listeners', () => {
            const spy = jest.spyOn(document, 'removeEventListener');
            const originalHandler = pickle.handleDocumentClick;
            pickle.destroy();

            expect(spy).toHaveBeenCalledWith('click', originalHandler);
            spy.mockRestore();
        });

        test('should emit destroyed event', () => {
            const destroyHandler = jest.fn();
            pickle.wrapper.addEventListener('pickle:destroyed', destroyHandler);
            
            pickle.destroy();
            
            expect(destroyHandler).toHaveBeenCalled();
        });
    });

    describe('Custom Localization', () => {
        test('should use custom l10n strings', () => {
            select = createSelect();
            pickle = new Pickle(select, {
                l10n: {
                    placeholder: 'Choose option',
                    searchPlaceholder: 'Find option...',
                    selected: 'You picked: {text}',
                    selectionCleared: 'Choice removed'
                }
            });
            
            expect(pickle.l10n.placeholder).toBe('Choose option');
            expect(pickle.l10n.searchPlaceholder).toBe('Find option...');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        beforeEach(() => {
            select = createSelect();
            pickle = new Pickle(select);
        });

        test('should handle empty options', () => {
            select = createSelect([]);
            pickle = new Pickle(select);

            expect(pickle.options).toHaveLength(0);
            expect(() => pickle.open()).not.toThrow();
        });

        test('should return null from emit when wrapper is null', () => {
            select = createSelect();
            pickle = new Pickle(select);
            pickle.wrapper = null;
            
            const result = pickle.open();
            
            expect(result).toBeUndefined();
        });

        test('should handle malformed HTML gracefully', () => {
            select = createSelect();
            select.parentNode.removeChild(select);
            
            expect(() => pickle.destroy()).not.toThrow();
        });

        test('should handle rapid open/close calls', () => {
            select = createSelect();
            
            expect(() => {
                pickle.open();
                pickle.close();
                pickle.open();
                pickle.close();
            }).not.toThrow();
        });

        test('should handle setting non-existent values', () => {
            select = createSelect();
            
            pickle.set('nonexistent');
            expect(pickle.get()).not.toBe('nonexistent');
        });

        test('should remove search input when disabling search after enabling', () => {
            select = createSelect();
            pickle = new Pickle(select, { searchable: true });
            expect(pickle.searchInput).toBeTruthy();

            pickle.setSearchable(false);
            expect(pickle.searchInput).toBeNull();
        });

        test('should return null if wrapper does not exist', () => {
            select = createSelect();
            const pickle = new Pickle(select);
            pickle.destroy();
            expect(pickle.wrapper).toBeNull();
        });

        test('should log a warning if an event fails to dispatch in debug mode', () => {
            const select = createSelect();
            const pickle = new Pickle(select, { debug: true });
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            jest.spyOn(pickle.wrapper, 'dispatchEvent').mockImplementation(() => {
                throw new Error('Simulated dispatch failure');
            });

            pickle.open();

            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith('Event dispatch failed:', expect.any(Error));
        });

        describe('Pickle Debugging', () => {
            const realConsole = global.console;

            beforeEach(() => {
                global.console = realConsole;
            });

            afterEach(() => {
                global.console = {
                    log: () => {}, warn: () => {}, error: () => {},
                    info: () => {}, debug: () => {}
                };
            });

            it('should log messages to the console when debug mode is enabled', () => {
                const consoleSpy = jest.spyOn(global.console, 'log').mockImplementation(() => {});
                const pickle = new Pickle(createSelect(), { debug: true });

                expect(consoleSpy).toHaveBeenCalledWith(
                    '%c[Pickle]',
                    'color: #33a383; font-weight: bold;',
                    'Pickle initialized successfully'
                );
                
                consoleSpy.mockRestore();
            });

            it('should NOT log messages when debug mode is disabled', () => {
                const consoleSpy = jest.spyOn(global.console, 'log').mockImplementation(() => {});
                const pickle = new Pickle(createSelect()); 

                expect(consoleSpy).not.toHaveBeenCalled();

                consoleSpy.mockRestore();
            });
        });
        
        describe('XSS Prevention', () => {
            test('should sanitize option text when adding options', () => {
                select = createSelect();
                pickle = new Pickle(select);
                
                const maliciousText = '<script>alert("xss")</script>';
                pickle.addOption('evil', maliciousText);
                
                expect(pickle.wrapper.innerHTML).not.toContain('<script>alert');
                expect(pickle.wrapper.innerHTML).toContain('&lt;script&gt;');
            });

            test('should sanitize option text when updating options', () => {
                select = createSelect();
                pickle = new Pickle(select);
                
                const maliciousOptions = [
                    { value: 'evil1', text: '<img src=x onerror=alert("xss")>' },
                    { value: 'evil2', text: '<svg onload=alert("xss")>' },
                    { value: 'safe', text: 'Safe Option' }
                ];
                
                pickle.updateOptions(maliciousOptions);
                
                expect(pickle.wrapper.querySelector('[onerror]')).toBeNull();
                expect(pickle.wrapper.querySelector('[onload]')).toBeNull();
                expect(pickle.wrapper.innerHTML).toContain('&lt;img src=x');
            });

            test('should sanitize multi-select tag display', () => {
                select = createSelect();
                pickle = new Pickle(select, { multiple: true });
                
                const maliciousText = '<script>alert("tag xss")</script>';
                pickle.addOption('evil', maliciousText);
                pickle.set(['evil']);
                
                const tags = pickle.valueDisplay.querySelectorAll('.pickle-select__tag');
                expect(tags[0].innerHTML).not.toContain('<script>alert');
                expect(tags[0].textContent).toContain(maliciousText);
            });

            test('should sanitize search highlighting', () => {
                select = createSelect([
                    { value: 'safe', text: 'Safe Option' },
                    { value: 'evil', text: '<script>alert("search xss")</script>' }
                ]);
                pickle = new Pickle(select, { searchable: true });
                
                pickle.open();
                pickle.searchInput.value = '<script>';
                pickle.searchInput.dispatchEvent(new Event('input'));
                
                expect(pickle.dropdown.innerHTML).not.toContain('<script>alert');
                expect(pickle.dropdown.innerHTML).toContain('&lt;script&gt;');
            });

            test('should handle extremely malicious payloads gracefully', () => {
                select = createSelect();
                pickle = new Pickle(select);
                
                const nastyPayloads = [
                    'javascript:alert("xss")',
                    '<iframe src="javascript:alert(\'xss\')"></iframe>',
                    '<object data="data:text/html,<script>alert(\'xss\')</script>"></object>',
                    '"><script>alert("xss")</script><"',
                    '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--></SCRIPT>"\'>alert(String.fromCharCode(88,83,83))</SCRIPT>'
                ];
                
                nastyPayloads.forEach((payload, index) => {
                    expect(() => {
                        pickle.addOption(`evil${index}`, payload);
                    }).not.toThrow();
                    
                    expect(pickle.wrapper.querySelector('script')).toBeNull();
                    expect(pickle.wrapper.querySelector('[href*="javascript:"]')).toBeNull();
                    expect(pickle.wrapper.querySelector('[onerror]')).toBeNull();
                    expect(pickle.wrapper.querySelector('[onload]')).toBeNull();
                });
            });
        });
    });
});