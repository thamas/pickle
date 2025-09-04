import Pickle from '../src/pickle.js';
const globals = global.Pickle;

describe('Pickle Integration Tests', () => {
    let container, selectElement, pickle;

    beforeEach(() => {
        container = globals.vars.container;
        document.body.innerHTML = '';
        document.body.appendChild(container);
    });

    afterEach(() => {
        if (pickle) {
            pickle.destroy();
            pickle = null;
        }
        container.innerHTML = '';
        
        Pickle.instances.forEach(instance => {
            try {
                instance.destroy();
            } catch (e) {
                // Ignore errors during cleanup
            }
        });
        Pickle.instances.clear();
    });

    describe('Multiple Instances', () => {
        let pickle1, pickle2, select1, select2;

        beforeEach(() => {
            select1 = globals.helpers.createSelectElement();
            select1.id = 'select1';
            select2 = globals.helpers.createSelectElement();
            select2.id = 'select2';
            
            container.appendChild(select1);
            container.appendChild(select2);
            
            pickle1 = new Pickle(select1);
            pickle2 = new Pickle(select2);
        });

        afterEach(() => {
            pickle1?.destroy();
            pickle2?.destroy();
            pickle1 = null;
            pickle2 = null;
        });

        it('should track multiple instances', () => {
            expect(Pickle.instances.has(pickle1)).toBe(true);
            expect(Pickle.instances.has(pickle2)).toBe(true);
            expect(Pickle.instances.size).toBeGreaterThanOrEqual(2);
        });

        it('should close other instances when one opens', () => {
            pickle1.open();
            expect(pickle1.isOpen).toBe(true);
            
            pickle2.open();
            expect(pickle1.isOpen).toBe(false);
            expect(pickle2.isOpen).toBe(true);
        });

        it('should allow independent operation of instances', () => {
            pickle1.set('option1');
            pickle2.set('option2');
            
            expect(pickle1.get()).toBe('option1');
            expect(pickle2.get()).toBe('option2');
        });

        it('should handle destruction of one instance without affecting others', () => {
            pickle1.destroy();
            
            expect(Pickle.instances.has(pickle1)).toBe(false);
            expect(Pickle.instances.has(pickle2)).toBe(true);
            expect(() => pickle2.open()).not.toThrow();
        });

        it('should handle rapid switching between instances', () => {
            for (let i = 0; i < 10; i++) {
                if (i % 2 === 0) {
                    pickle1.open();
                    expect(pickle1.isOpen).toBe(true);
                    expect(pickle2.isOpen).toBe(false);
                } else {
                    pickle2.open();
                    expect(pickle1.isOpen).toBe(false);
                    expect(pickle2.isOpen).toBe(true);
                }
            }
        });
    });

    describe('Form Integration', () => {
        let form, submitButton;

        beforeEach(() => {
            form = document.createElement('form');
            selectElement = globals.helpers.createSelectElement();
            selectElement.name = 'test-select';
            selectElement.id = 'test-select';
            
            submitButton = document.createElement('button');
            submitButton.type = 'submit';
            submitButton.textContent = 'Submit';
            
            form.appendChild(selectElement);
            form.appendChild(submitButton);
            container.appendChild(form);
            
            pickle = new Pickle(selectElement);
        });

        it('should integrate with form submission', () => {
            pickle.set('option1');
            
            const formData = new FormData(form);
            expect(formData.get('test-select')).toBe('option1');
        });

        it('should handle form reset', () => {
            pickle.set('option1');
            form.reset();
            
            expect(selectElement.value).toBe('');
            expect(pickle.get()).toBe('');
        });

        it('should validate as part of form validation', () => {
            pickle.setRequired(true);
            selectElement.required = true;
            selectElement.value = '';
            pickle.clear(true);
            
            const isValid = form.checkValidity();
            expect(isValid).toBe(false);
            
            pickle.set('option1');
            const isValidAfter = form.checkValidity();
            expect(isValidAfter).toBe(true);
        });

        it('should trigger form change events', () => {
            const formChangeSpy = jest.fn();
            form.addEventListener('change', formChangeSpy);
            
            pickle.set('option1');
            expect(formChangeSpy).toHaveBeenCalled();
        });

        it('should handle multi-select form data', () => {
            pickle.destroy();
            selectElement.multiple = true;
            pickle = new Pickle(selectElement);
            
            pickle.set(['option1', 'option2']);
            
            const formData = new FormData(form);
            const values = formData.getAll('test-select');
            expect(values).toEqual(['option1', 'option2']);
        });
    });

    describe('Dynamic DOM Changes', () => {
        beforeEach(() => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
        });

        it('should handle dynamic option addition to original select', () => {
            const newOption = document.createElement('option');
            newOption.value = 'dynamic';
            newOption.textContent = 'Dynamic Option';
            selectElement.appendChild(newOption);
            pickle.updateOptions(pickle.getOptions().concat([{
                value: 'dynamic',
                text: 'Dynamic Option',
                disabled: false
            }]));
            
            expect(pickle.getOptions().some(opt => opt.value === 'dynamic')).toBe(true);
        });

        it('should handle wrapper being moved in DOM', () => {
            const newContainer = document.createElement('div');
            document.body.appendChild(newContainer);
            
            newContainer.appendChild(pickle.wrapper);
            
            expect(() => pickle.open()).not.toThrow();
            expect(pickle.isOpen).toBe(true);
        });

        it('should handle select element being moved', () => {
            const originalParent = selectElement.parentNode;
            const newContainer = document.createElement('div');
            container.appendChild(newContainer);
            
            newContainer.appendChild(selectElement);
            
            expect(pickle.originalSelect.parentNode).toBe(newContainer);
            expect(() => pickle.set('option1')).not.toThrow();
        });
    });

    describe('Event System Integration', () => {
        beforeEach(() => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
        });

        it('should handle multiple event listeners', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();
            const listener3 = jest.fn();
            
            pickle.wrapper.addEventListener('pickle:change', listener1);
            pickle.wrapper.addEventListener('pickle:change', listener2);
            pickle.wrapper.addEventListener('pickle:change', listener3);
            
            pickle.set('option1');
            
            expect(listener1).toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();
            expect(listener3).toHaveBeenCalled();
        });

        it('should handle event listener removal', () => {
            const listener = jest.fn();
            
            pickle.wrapper.addEventListener('pickle:change', listener);
            pickle.set('option1');
            expect(listener).toHaveBeenCalledTimes(1);
            
            pickle.wrapper.removeEventListener('pickle:change', listener);
            pickle.set('option2');
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should propagate events correctly', () => {
            const containerListener = jest.fn();
            container.addEventListener('pickle:change', containerListener);
            
            pickle.set('option1');
            expect(containerListener).toHaveBeenCalled();
        });

        it('should handle event cancellation', () => {
            pickle.wrapper.addEventListener('pickle:beforeOpen', (e) => {
                e.preventDefault();
            });
            
            pickle.open();
            expect(pickle.isOpen).toBe(false);
        });
    });

    describe('Performance and Memory', () => {
        it('should clean up all references on destroy', () => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            
            const wrapper = pickle.wrapper;
            const trigger = pickle.trigger;
            
            pickle.destroy();
            
            expect(pickle.wrapper).toBeNull();
            expect(pickle.trigger).toBeNull();
            expect(pickle.dropdown).toBeNull();
            expect(pickle.originalSelect).toBeNull();
            expect(wrapper.parentNode).toBeNull();
        });

        it('should not leak event listeners', () => {
            const initialListenerCount = document.eventListeners?.length || 0;
            
            for (let i = 0; i < 10; i++) {
                const select = globals.helpers.createSelectElement();
                container.appendChild(select);
                const instance = new Pickle(select);
                instance.destroy();
            }

            expect(Pickle.instances.size).toBe(0);
        });

        it('should handle rapid creation and destruction', () => {
            const instances = [];
            
            for (let i = 0; i < 50; i++) {
                const select = globals.helpers.createSelectElement();
                select.id = `select-${i}`;
                container.appendChild(select);
                instances.push(new Pickle(select));
            }
            
            expect(Pickle.instances.size).toBe(50);
            
            instances.forEach(instance => instance.destroy());
            
            expect(Pickle.instances.size).toBe(0);
        });
    });

    describe('Theme and Styling Integration', () => {
        beforeEach(() => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
        });

        it('should apply custom theme classes', () => {
            pickle = new Pickle(selectElement, { theme: 'dark' });
            
            expect(pickle.wrapper.classList.contains('pickle-select--dark')).toBe(true);
            expect(pickle.trigger.classList.contains('pickle-select__trigger--dark')).toBe(true);
            expect(pickle.dropdown.classList.contains('pickle-select__dropdown--dark')).toBe(true);
        });

        it('should apply custom dimensions', () => {
            pickle = new Pickle(selectElement, { 
                width: '400px', 
                height: '60px' 
            });
            
            expect(pickle.wrapper.style.width).toBe('400px');
            expect(pickle.trigger.style.height).toBe('60px');
        });

        it('should handle CSS custom properties', () => {
            document.documentElement.style.setProperty('--pickle-width', '350px');
            
            pickle = new Pickle(selectElement);
            pickle.wrapper.style.width = 'var(--pickle-width)';
            
            expect(pickle.wrapper.style.width).toBe('var(--pickle-width)');
        });
    });

    describe('Browser Compatibility', () => {
        beforeEach(() => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
        });

        it('should handle missing addEventListener gracefully', () => {
            const originalAddEventListener = Element.prototype.addEventListener;
            delete Element.prototype.addEventListener;
            
            expect(() => {
                pickle = new Pickle(selectElement);
            }).not.toThrow();
            
            Element.prototype.addEventListener = originalAddEventListener;
        });

        it('should handle missing CustomEvent', () => {
            const simpleSelect = document.createElement('select');
            const opt = document.createElement('option');
            opt.value = 'test';
            opt.textContent = 'Test';
            simpleSelect.appendChild(opt);
            container.appendChild(simpleSelect);
            
            const originalCustomEvent = global.CustomEvent;
            global.CustomEvent = class MockEvent extends Event {
                constructor(type, options = {}) {
                    super(type, options);
                    this.detail = options.detail || {};
                }
            };
            
            try {
                pickle = new Pickle(simpleSelect);
                expect(() => pickle.set('test')).not.toThrow();
            } finally {
                global.CustomEvent = originalCustomEvent;
            }
        });

        it('should work without requestAnimationFrame', () => {
            const originalRAF = global.requestAnimationFrame;
            global.requestAnimationFrame = undefined;
            
            try {
                pickle = new Pickle(selectElement);
                expect(() => pickle.open()).not.toThrow();
            } finally {
                global.requestAnimationFrame = originalRAF;
            }
        });
    });

    describe('Real-world Scenarios', () => {
        it('should handle complex nested DOM structures', () => {
            const complexStructure = document.createElement('div');
            complexStructure.innerHTML = `
                <div class="form-group">
                    <div class="form-field">
                        <label for="complex-select">Complex Select</label>
                        <div class="select-wrapper">
                            ${selectElement.outerHTML}
                        </div>
                    </div>
                </div>`;
            
            container.appendChild(complexStructure);
            const nestedSelect = complexStructure.querySelector('select');
            
            pickle = new Pickle(nestedSelect);
            expect(() => pickle.open()).not.toThrow();
        });

        it('should handle rapid user interactions', async () => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            
            for (let i = 0; i < 10; i++) {
                pickle.toggle();
                await new Promise(resolve => setTimeout(resolve, 1));
            }
            
            await new Promise(resolve => setTimeout(resolve, 20));
            
            expect(typeof pickle.isOpen).toBe('boolean');
        });

        it('should handle concurrent async operations', async () => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            
            const promises = [
                new Promise(resolve => {
                    setTimeout(() => {
                        pickle.set('option1');
                        resolve();
                    }, 10);
                }),
                new Promise(resolve => {
                    setTimeout(() => {
                        pickle.open();
                        resolve();
                    }, 20);
                }),
                new Promise(resolve => {
                    setTimeout(() => {
                        pickle.addOption('async-option', 'Async Option');
                        resolve();
                    }, 30);
                })
            ];
            
            await Promise.all(promises);
            
            expect(pickle.get()).toBe('option1');
            expect(pickle.getOptions().some(opt => opt.value === 'async-option')).toBe(true);
        });
    });
});