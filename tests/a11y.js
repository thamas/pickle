import Pickle from '../src/pickle.js';
const globals = global.Pickle;

describe('Pickle Accessibility Tests', () => {
    let container, selectElement, pickle;

    beforeEach(() => {
        container = globals.vars.container;
        selectElement = globals.helpers.createSelectElement();
        selectElement.id = 'test-select';
        container.appendChild(selectElement);
    });

    afterEach(() => {
        if (pickle) {
            pickle.destroy();
            pickle = null;
        }
        container.innerHTML = '';
    });

    describe('ARIA Attributes', () => {
        beforeEach(() => {
            pickle = new Pickle(selectElement);
        });

        it('should set correct role attributes', () => {
            expect(pickle.trigger.getAttribute('role')).toBe('combobox');
            expect(pickle.dropdown.getAttribute('role')).toBe('listbox');
        });

        it('should set aria-expanded correctly', () => {
            expect(pickle.trigger.getAttribute('aria-expanded')).toBe('false');
            
            pickle.open();
            expect(pickle.trigger.getAttribute('aria-expanded')).toBe('true');
            
            pickle.close();
            expect(pickle.trigger.getAttribute('aria-expanded')).toBe('false');
        });

        it('should set aria-haspopup attribute', () => {
            expect(pickle.trigger.getAttribute('aria-haspopup')).toBe('listbox');
        });

        it('should set aria-multiselectable for multi-select', () => {
            pickle.destroy();
            selectElement.multiple = true;
            pickle = new Pickle(selectElement);
            
            expect(pickle.dropdown.getAttribute('aria-multiselectable')).toBe('true');
        });

        it('should set aria-multiselectable false for single-select', () => {
            expect(pickle.dropdown.getAttribute('aria-multiselectable')).toBe('false');
        });

        it('should set aria-controls attribute', () => {
            expect(pickle.trigger.getAttribute('aria-controls')).toBe(pickle.dropdown.id);
        });

        it('should set aria-labelledby when label exists', () => {
            const label = document.createElement('label');
            label.setAttribute('for', selectElement.id);
            label.textContent = 'Test Label';
            container.insertBefore(label, selectElement);
            
            pickle.destroy();
            pickle = new Pickle(selectElement);
            
            expect(pickle.trigger.hasAttribute('aria-labelledby')).toBe(true);
        });

        it('assigns an id to an existing label without one and sets aria-labelledby', () => {
            const label = document.createElement('label');
            expect(label.id).toBe('');

            label.setAttribute('for', selectElement.id);
            container.appendChild(label); // Add label to DOM so querySelector can find it

            const pickle = new Pickle(selectElement);

            expect(label.id).toMatch(/^pickle-label-/);
            expect(pickle.trigger.getAttribute('aria-labelledby')).toBe(label.id);
        });

        it('should set aria-label when no label exists', () => {
            expect(pickle.trigger.getAttribute('aria-label')).toBe(pickle.l10n.ariaLabel);
        });

        it('should set aria-selected on options', () => {
            pickle.open();
            pickle.set('option1');
            
            const selectedOption = pickle.options.find(opt => 
                opt.getAttribute('data-value') === 'option1'
            );
            expect(selectedOption.getAttribute('aria-selected')).toBe('true');
        });

        it('should set aria-disabled on disabled options', () => {
            pickle.open();
            
            const disabledOption = pickle.options.find(opt => 
                opt.classList.contains('pickle-select__option--disabled')
            );
            expect(disabledOption.getAttribute('aria-disabled')).toBe('true');
        });

        it('should update aria-activedescendant when focusing options', () => {
            pickle.open();
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            
            expect(pickle.trigger.hasAttribute('aria-activedescendant')).toBe(true);
            expect(pickle.trigger.getAttribute('aria-activedescendant')).toBe(pickle.focusedOption.id);
        });

        it('should set aria-required when required', () => {
            pickle.setRequired(true);
            expect(pickle.trigger.getAttribute('aria-required')).toBe('true');
        });

        it('should set aria-invalid when validation fails', () => {
            pickle.setCustomValidity('Error message');
            expect(pickle.trigger.getAttribute('aria-invalid')).toBe('true');
        });

        it('should set aria-disabled when disabled', () => {
            pickle.setDisabled(true);
            expect(pickle.trigger.getAttribute('aria-disabled')).toBe('true');
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(() => {
            pickle = new Pickle(selectElement);
        });

        it('should open dropdown with Enter key', () => {
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            expect(pickle.isOpen).toBe(true);
        });

        it('should open dropdown with Space key', () => {
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
            expect(pickle.isOpen).toBe(true);
        });

        it('should open dropdown with ArrowDown key', () => {
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(pickle.isOpen).toBe(true);
        });

        it('should open dropdown with ArrowUp key', () => {
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(pickle.isOpen).toBe(true);
        });

        it('should close dropdown with Escape key', () => {
            pickle.open();
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(pickle.isOpen).toBe(false);
        });

        it('should navigate options with ArrowDown', () => {
            pickle.open();
            
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            const firstFocused = pickle.focusedOption;
            
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            const secondFocused = pickle.focusedOption;
            
            expect(firstFocused).not.toBe(secondFocused);
            expect(pickle.focusedIndex).toBeGreaterThan(0);
        });

        it('should navigate options with ArrowUp', () => {
            pickle.open();
            
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            
            const currentIndex = pickle.focusedIndex;
            
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            
            expect(pickle.focusedIndex).toBe(currentIndex - 1);
        });

        it('should jump to first option with Home key', () => {
            pickle.open();
            
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
            
            expect(pickle.focusedIndex).toBe(0);
        });

        it('should jump to last option with End key', () => {
            pickle.open();
            
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
            
            expect(pickle.focusedIndex).toBe(pickle.options.length - 1);
        });

        it('should select option with Enter when focused', () => {
            pickle.open();
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            
            const focusedValue = pickle.focusedOption.getAttribute('data-value');
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            
            expect(pickle.get()).toBe(focusedValue);
        });

        it('should select option with Space when focused', () => {
            pickle.open();
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            
            const focusedValue = pickle.focusedOption.getAttribute('data-value');
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
            
            expect(pickle.get()).toBe(focusedValue);
        });

        it('should skip disabled options when navigating', () => {
            pickle.open();
            
            let attempts = 0;
            while (attempts < 20 && (!pickle.focusedOption || !pickle.focusedOption.classList.contains('pickle-select__option--disabled'))) {
                pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
                attempts++;
            }
            
            if (pickle.focusedOption && pickle.focusedOption.classList.contains('pickle-select__option--disabled')) {
                const disabledIndex = pickle.focusedIndex;
                pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
                expect(pickle.focusedIndex).not.toBe(disabledIndex);
            }
        });

        it('should handle keyboard navigation in search input', async () => {
            pickle.setSearchable(true);
            
            const searchFocusSpy = jest.spyOn(pickle.searchInput, 'focus');
            const triggerFocusSpy = jest.spyOn(pickle.trigger, 'focus');
            
            pickle.open();
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(searchFocusSpy).toHaveBeenCalled();
            
            pickle.searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(triggerFocusSpy).toHaveBeenCalled();
        });

        it('should close search with Escape key', () => {
            pickle.setSearchable(true);
            pickle.trigger.focus = jest.fn();
            pickle.open();
            pickle.searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            expect(pickle.isOpen).toBe(false);
            expect(pickle.trigger.focus).toHaveBeenCalled();
        });

    });

    describe('Focus Management', () => {
        beforeEach(() => {
            pickle = new Pickle(selectElement);
        });

        it('should return focus to trigger when closing', () => {
            const focusSpy = jest.spyOn(pickle.trigger, 'focus');
            
            pickle.open();
            pickle.close();
            expect(focusSpy).toHaveBeenCalled();
        });

        it('should focus selected option when opening', () => {
            pickle.set('option1');
            pickle.open();
            
            expect(pickle.focusedOption.getAttribute('data-value')).toBe('option1');
        });

        it('should focus first option when no selection exists', () => {
            pickle.open();
            
            expect(pickle.focusedOption).toBeTruthy();
            expect(pickle.focusedIndex).toBe(0);
        });

        it('should maintain tabindex on trigger', () => {
            expect(pickle.trigger.getAttribute('tabindex')).toBe('0');
            
            pickle.setDisabled(true);
            expect(pickle.trigger.hasAttribute('tabindex')).toBe(false);
            
            pickle.setDisabled(false);
            expect(pickle.trigger.getAttribute('tabindex')).toBe('0');
        });

        it('should scroll focused option into view', () => {
            pickle.open();
            
            pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            
            expect(pickle.focusedOption).toBeTruthy();
        });

    });

    describe('Screen Reader Support', () => {
        beforeEach(() => {
            pickle = new Pickle(selectElement);
        });

        it('should have live region for announcements', () => {
            expect(pickle.liveRegion).toBeTruthy();
            expect(pickle.liveRegion.getAttribute('aria-live')).toBe('polite');
            expect(pickle.liveRegion.getAttribute('aria-atomic')).toBe('true');
        });

        it('should announce selection changes', async () => {
            pickle.set('option1');
            
            await new Promise(resolve => setTimeout(resolve, 30));
            
            expect(pickle.liveRegion.textContent).toContain('Option 1');
        });

        it('should announce when selection is cleared', async () => {
            pickle.set('option1');
            pickle.clear();
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(pickle.liveRegion.textContent).toBe(pickle.l10n.selectionCleared);
        });

        it('should have screen reader only styles on live region', () => {
            const styles = pickle.liveRegion.style;
            expect(styles.position).toBe('absolute');
            expect(styles.left).toBe('-10000px');
            expect(styles.width).toBe('1px');
            expect(styles.height).toBe('1px');
            expect(styles.overflow).toBe('hidden');
        });

        it('should use semantic HTML structure', () => {
            pickle.open();
            
            const regularOptions = pickle.options.filter(opt => 
                opt.getAttribute('role') === 'option'
            );
            expect(regularOptions.length).toBeGreaterThan(0);
            
            const groupLabels = pickle.options.filter(opt => 
                opt.getAttribute('role') === 'presentation'
            );
            expect(groupLabels.length).toBeGreaterThan(0);
        });
    });

    describe('Custom Localization', () => {
        it('should use custom l10n strings', () => {
            const customL10n = {
                placeholder: 'Kies een optie',
                searchPlaceholder: 'Zoek opties...',
                selectionCleared: 'Selectie gewist',
                selected: 'Geselecteerd: {text}',
                multipleSelection: '{count} opties geselecteerd',
                ariaLabel: 'Kies een optie'
            };
            
            pickle = new Pickle(selectElement, { l10n: customL10n });
            
            expect(pickle.l10n.placeholder).toBe('Kies een optie');
            expect(pickle.trigger.getAttribute('aria-label')).toBe('Kies een optie');
        });

        it('should merge custom l10n with defaults', () => {
            const partialL10n = {
                placeholder: 'Custom placeholder'
            };
            
            pickle = new Pickle(selectElement, { l10n: partialL10n });
            
            expect(pickle.l10n.placeholder).toBe('Custom placeholder');
            expect(pickle.l10n.searchPlaceholder).toBe(Pickle.defaultStrings.searchPlaceholder);
        });
    });

    describe('Removable Tags', () => {
        const getTags = () => Array.from(pickle.valueDisplay.querySelectorAll('.pickle-select__tag'));
        const pressKey = (el, key) => {
            const keydown = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
            el.dispatchEvent(keydown);
            // jsdom does not activate buttons on Enter/Space, so fire the click a browser would.
            if (!keydown.defaultPrevented) el.click();
            return keydown;
        };

        beforeEach(() => {
            selectElement.multiple = true;
        });

        it('should render each tag as a button named after its option', () => {
            pickle = new Pickle(selectElement);
            pickle.set(['option1', 'option2']);

            const tags = getTags();
            expect(tags).toHaveLength(2);
            tags.forEach(tag => expect(tag.tagName).toBe('BUTTON'));
            expect(tags[0]).toHaveAccessibleName('Remove Option 1');
            expect(tags[1]).toHaveAccessibleName('Remove Option 2');
        });

        it('should use the removeTag l10n string', () => {
            pickle = new Pickle(selectElement, { l10n: { removeTag: '{text} entfernen' } });
            pickle.set(['option1']);

            expect(getTags()[0]).toHaveAccessibleName('Option 1 entfernen');
        });

        it('should not escape special characters in the accessible name', () => {
            selectElement.options[1].textContent = 'A & B';
            pickle = new Pickle(selectElement);
            pickle.set(['option1']);

            expect(getTags()[0]).toHaveAccessibleName('Remove A & B');
        });

        it('should remove the option when its tag is clicked', () => {
            pickle = new Pickle(selectElement);
            pickle.set(['option1', 'option2']);

            getTags()[0].click();

            expect(pickle.get()).toEqual(['option2']);
            expect(pickle.isOpen).toBe(false);
        });

        it.each([['Enter'], [' ']])('should remove a focused tag with %p without toggling the dropdown', (key) => {
            pickle = new Pickle(selectElement);
            pickle.set(['option1', 'option2']);

            const tag = getTags()[0];
            tag.focus();
            const keydown = pressKey(tag, key);

            expect(keydown.defaultPrevented).toBe(false);
            expect(pickle.isOpen).toBe(false);
            expect(pickle.get()).toEqual(['option2']);
        });

        it('should move focus to the next tag, then the previous tag, then the trigger', () => {
            // Without an empty option, so removing the last tag leaves no placeholder tag.
            selectElement.querySelector('option[value=""]').remove();
            pickle = new Pickle(selectElement);
            pickle.set(['option1', 'option2', 'option4']);

            getTags()[1].focus();
            pressKey(document.activeElement, 'Enter');
            expect(document.activeElement).toHaveAccessibleName('Remove Option 4');

            pressKey(document.activeElement, 'Enter');
            expect(document.activeElement).toHaveAccessibleName('Remove Option 1');

            pressKey(document.activeElement, 'Enter');
            expect(document.activeElement).toBe(pickle.trigger);
            expect(getTags()).toHaveLength(0);
        });

        it('should close an open list with Escape on a focused tag', () => {
            pickle = new Pickle(selectElement);
            pickle.set(['option1']);
            pickle.open();

            const tag = getTags()[0];
            tag.focus();
            tag.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

            expect(pickle.isOpen).toBe(false);
            expect(pickle.get()).toEqual(['option1']);
        });

        it('should not remove tags while the select is disabled', () => {
            pickle = new Pickle(selectElement);
            pickle.set(['option1', 'option2']);

            pickle.setDisabled(true);
            getTags().forEach(tag => expect(tag).toBeDisabled());
            getTags()[0].click();
            expect(pickle.get()).toEqual(['option1', 'option2']);

            pickle.setDisabled(false);
            getTags().forEach(tag => expect(tag).toBeEnabled());
            getTags()[0].click();
            expect(pickle.get()).toEqual(['option2']);
        });

        it('should not render tags for a single select', () => {
            selectElement.multiple = false;
            pickle = new Pickle(selectElement);
            pickle.set('option1');

            expect(getTags()).toHaveLength(0);
        });
    });

    describe('Touch and Mobile Support', () => {
        beforeEach(() => {
            pickle = new Pickle(selectElement);
        });

        it('should set touch-action on trigger', () => {
            expect(pickle.trigger.style.touchAction).toBe('manipulation');
        });

        it('should set user-select none on trigger', () => {
            expect(pickle.trigger.style.userSelect).toBe('none');
        });

        it('should prevent touchmove bubbling on dropdown', () => {
            const touchMoveEvent = new Event('touchmove');
            touchMoveEvent.stopPropagation = jest.fn();
            
            pickle.dropdown.dispatchEvent(touchMoveEvent);
            expect(touchMoveEvent.stopPropagation).toHaveBeenCalled();
        });
    });
});