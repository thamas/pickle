import Pickle from '../src/pickle.js';
const globals = global.Pickle;

describe('Pickle Stress Tests', () => {
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
                // Ignore cleanup errors
            }
        });
        Pickle.instances.clear();
    });

    describe('Large Dataset Performance', () => {
        const createLargeSelectElement = (optionCount = 1000) => {
            const select = document.createElement('select');
            select.id = 'large-select';
            
            for (let i = 0; i < optionCount; i++) {
                const option = document.createElement('option');
                option.value = `option-${i}`;
                option.textContent = `Option ${i} - Some longer text to simulate real data`;
                select.appendChild(option);
            }
            
            return select;
        };

        it('should handle 1000 options efficiently', () => {
            selectElement = createLargeSelectElement(1000);
            container.appendChild(selectElement);
            
            const startTime = performance.now();
            pickle = new Pickle(selectElement);
            const initTime = performance.now() - startTime;
            
            expect(initTime).toBeLessThan(1000);
            expect(pickle.getOptions().length).toBe(1000);
        });

        it('should render options in chunks for performance', () => {
            selectElement = createLargeSelectElement(500);
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            
            pickle.open();
            
            expect(pickle.options.length).toBeLessThan(500);
            expect(pickle.options.length).toBeGreaterThan(0);
        });

        it('should load more options when scrolling', () => {
            selectElement = createLargeSelectElement(500);
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            
            pickle.open();
            const initialCount = pickle.options.length;
            
            pickle.loadMoreOptions();
            
            expect(pickle.options.length).toBeGreaterThan(initialCount);
        });

        it('should handle search on large datasets', () => {
            selectElement = createLargeSelectElement(1000);
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement, { searchable: true });
            
            pickle.open();
            
            const startTime = performance.now();
            pickle.searchInput.value = 'Option 50';
            pickle.searchInput.dispatchEvent(new Event('input'));
            const searchTime = performance.now() - startTime;
            
            expect(searchTime).toBeLessThan(100);
            expect(pickle.options.length).toBeLessThan(20);
        });

        it('should handle fuzzy search on large datasets', () => {
            selectElement = createLargeSelectElement(1000);
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement, { 
                searchable: true, 
                fuzzySearch: true 
            });
            
            pickle.open();
            
            const startTime = performance.now();
            pickle.searchInput.value = 'Opt50';
            pickle.searchInput.dispatchEvent(new Event('input'));
            const searchTime = performance.now() - startTime;
            
            expect(searchTime).toBeLessThan(200);
        });
    });

    describe('High-Frequency Interactions', () => {
        beforeEach(() => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
        });

        it('should handle rapid open/close cycles', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 100; i++) {
                pickle.open();
                pickle.close();
            }
            
            const totalTime = performance.now() - startTime;
            expect(totalTime).toBeLessThan(1000);
            expect(pickle.isOpen).toBe(false);
        });

        it('should handle rapid value changes', () => {
            const values = ['option1', 'option2', 'option9', 'option10'];
            
            const startTime = performance.now();
            
            for (let i = 0; i < 200; i++) {
                const value = values[i % values.length];
                pickle.set(value);
            }
            
            const totalTime = performance.now() - startTime;
            expect(totalTime).toBeLessThan(500);

            const expectedLastValue = values[(200 - 1) % values.length];
            expect(pickle.get()).toBe(expectedLastValue);
        });

        it('should handle rapid keyboard navigation', () => {
            pickle.open();
            
            const startTime = performance.now();
            
            for (let i = 0; i < 50; i++) {
                pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { 
                    key: 'ArrowDown' 
                }));
            }
            
            const totalTime = performance.now() - startTime;
            expect(totalTime).toBeLessThan(500);
            expect(pickle.focusedIndex).toBeGreaterThanOrEqual(0);
        });

        it('should handle rapid search input', () => {
            pickle.setSearchable(true);
            pickle.open();
            
            const searchTerms = ['opt', 'option', 'option 1', 'op', ''];
            
            const startTime = performance.now();
            
            for (let i = 0; i < 100; i++) {
                const term = searchTerms[i % searchTerms.length];
                pickle.searchInput.value = term;
                pickle.searchInput.dispatchEvent(new Event('input'));
            }
            
            const totalTime = performance.now() - startTime;
            expect(totalTime).toBeLessThan(1000);
        });
    });

    describe('Memory Management', () => {
        it('should not leak memory with multiple create/destroy cycles', () => {
            const initialInstanceCount = Pickle.instances.size;
            
            for (let i = 0; i < 100; i++) {
                const select = globals.helpers.createSelectElement();
                select.id = `stress-select-${i}`;
                container.appendChild(select);
                
                const instance = new Pickle(select);
                instance.destroy();
                
                container.removeChild(select);
            }
            
            expect(Pickle.instances.size).toBe(initialInstanceCount);
        });

        it('should handle many concurrent instances', () => {
            const instances = [];
            const selects = [];
            
            for (let i = 0; i < 50; i++) {
                const select = globals.helpers.createSelectElement();
                select.id = `concurrent-select-${i}`;
                container.appendChild(select);
                selects.push(select);
                
                const instance = new Pickle(select);
                instances.push(instance);
            }
            
            expect(Pickle.instances.size).toBe(50);
            
            instances.forEach((instance, index) => {
                instance.set('option1');
                expect(instance.get()).toBe('option1');
            });
            
            instances.forEach(instance => instance.destroy());
            expect(Pickle.instances.size).toBe(0);
        });

        it('should handle large DOM mutations without memory leaks', () => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            
            for (let i = 0; i < 200; i++) {
                pickle.addOption(`stress-${i}`, `Stress Option ${i}`);
            }
            
            for (let i = 0; i < 100; i++) {
                pickle.removeOption(`stress-${i}`);
            }
            
            expect(() => pickle.open()).not.toThrow();
            expect(pickle.getOptions().length).toBeGreaterThan(100);
        });
    });

    describe('Edge Case Stress Testing', () => {
        it('should handle rapid theme changes', () => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            
            const themes = ['default', 'dark', 'light', 'custom'];
            
            for (let i = 0; i < 20; i++) {
                if (pickle) pickle.destroy();
                
                const theme = themes[i % themes.length];
                pickle = new Pickle(selectElement, { theme });
                
                expect(pickle.wrapper.classList.contains(`pickle-select--${theme}`)).toBe(true);
            }
        });

        it('should handle stress testing with disabled states', () => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            
            for (let i = 0; i < 50; i++) {
                pickle.setDisabled(i % 2 === 0);
                pickle.open();
                pickle.set('option1');
                
                if (i % 2 === 0) {
                    expect(pickle.isOpen).toBe(false);
                } else {
                    expect(pickle.get()).toBe('option1');
                    pickle.close();
                }
            }
        });

        it('should handle extreme value changes in multi-select', () => {
            selectElement = globals.helpers.createSelectElement();
            selectElement.multiple = true;
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            
            const allValues = ['option1', 'option2', 'option4', 'option9', 'option10'];
            
            for (let i = 0; i < 50; i++) {
                pickle.set(allValues);
                expect(pickle.get()).toEqual(allValues);
                
                pickle.clear();
                expect(pickle.get()).toEqual([]);
                
                pickle.set(['option1']);
                expect(pickle.get()).toEqual(['option1']);
            }
        });

        it('should handle rapid event listener additions and removals', () => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            const listeners = [];
            for (let i = 0; i < 50; i++) {
                const listener = jest.fn();
                listeners.push(listener);
                pickle.wrapper.addEventListener('pickle:change', listener);
            }
            pickle.set('option1');
            listeners.forEach(listener => {
                expect(listener).toHaveBeenCalled();
            });
            listeners.forEach(listener => {
                pickle.wrapper.removeEventListener('pickle:change', listener);
            });
            listeners.forEach(listener => listener.mockClear());
            pickle.set('option2');
            listeners.forEach(listener => {
                expect(listener).not.toHaveBeenCalled();
            });
        });
    });

    describe('Browser Stress Conditions', () => {
        it('should handle operations during low memory conditions', () => {
            const memoryHogs = [];
            for (let i = 0; i < 10; i++) {
                memoryHogs.push(new Array(100000).fill('memory-hog'));
            }
            
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            
            expect(() => {
                pickle = new Pickle(selectElement);
                pickle.open();
                pickle.set('option1');
                pickle.close();
            }).not.toThrow();
            memoryHogs.length = 0;
        });

        it('should handle operations with high CPU load simulation', async () => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            
            const loadPromise = new Promise(resolve => {
                const start = Date.now();
                while (Date.now() - start < 100) {
                    Math.random() * Math.random();
                }
                resolve();
            });
            
            const operationPromise = new Promise(resolve => {
                setTimeout(() => {
                    pickle.open();
                    pickle.set('option1');
                    pickle.close();
                    resolve();
                }, 50);
            });
            
            await Promise.all([loadPromise, operationPromise]);
            
            expect(pickle.get()).toBe('option1');
        });

        it('should handle DOM mutations during operation', () => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            
            pickle.open();
            
            for (let i = 0; i < 20; i++) {
                const div = document.createElement('div');
                div.textContent = `Mutation ${i}`;
                container.appendChild(div);
                
                if (i % 5 === 0) {
                    pickle.trigger.dispatchEvent(new KeyboardEvent('keydown', { 
                        key: 'ArrowDown' 
                    }));
                }
                container.removeChild(div);
            }
            
            expect(pickle.isOpen).toBe(true);
            expect(() => pickle.set('option1')).not.toThrow();
        });
    });

    describe('Concurrency Stress Tests', () => {
        it('should handle multiple async operations safely', async () => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            
            const promises = [];
            
            for (let i = 0; i < 20; i++) {
                promises.push(
                    new Promise(resolve => {
                        setTimeout(() => {
                            const operations = [
                                () => pickle.open(),
                                () => pickle.close(),
                                () => pickle.set(`option${(i % 4) + 1}`),
                                () => pickle.toggle(),
                                () => pickle.addOption(`async-${i}`, `Async ${i}`)
                            ];
                            
                            const operation = operations[i % operations.length];
                            operation();
                            resolve();
                        }, Math.random() * 100);
                    })
                );
            }
            
            await Promise.all(promises);
            
            expect(typeof pickle.isOpen).toBe('boolean');
            expect(typeof pickle.get()).toBeDefined();
        });

        it('should handle race conditions in event firing', async () => {
            selectElement = globals.helpers.createSelectElement();
            container.appendChild(selectElement);
            pickle = new Pickle(selectElement);
            
            const eventCounts = {
                change: 0,
                open: 0,
                close: 0
            };
            
            pickle.wrapper.addEventListener('pickle:change', () => eventCounts.change++);
            pickle.wrapper.addEventListener('pickle:open', () => eventCounts.open++);
            pickle.wrapper.addEventListener('pickle:close', () => eventCounts.close++);
            
            const operations = [];
            for (let i = 0; i < 50; i++) {
                operations.push(
                    new Promise(resolve => {
                        setTimeout(() => {
                            if (i % 3 === 0) pickle.open();
                            else if (i % 3 === 1) pickle.close();
                            else pickle.set(`option${(i % 4) + 1}`);
                            resolve();
                        }, Math.random() * 50);
                    })
                );
            }
            
            await Promise.all(operations);
            
            expect(eventCounts.change).toBeGreaterThan(0);
            expect(eventCounts.open + eventCounts.close).toBeGreaterThan(0);
        });
    });
});