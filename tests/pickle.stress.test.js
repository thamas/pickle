import Pickle from '../src/pickle.js';
import { createSelect } from './helpers.js';

describe('Pickle - Stress Tests & Edge Cases That Actually Matter', () => {
    let container, select, pickle;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        if (pickle) pickle.destroy();
        document.body.removeChild(container);
    });

    describe('Performance & Memory Stress Tests', () => {
        test('should handle 10,000 options in batches without exploding', (done) => {
            const options = Array.from({ length: 10000 }, (_, i) => ({
                value: `option${i}`,
                text: `Option ${i} - ${Math.random().toString(36)}`
            }));

            select = createSelect(options);
            pickle = new Pickle(select);

            // Initial batch
            expect(pickle.options.length).toBeLessThanOrEqual(100);

            let batchStart = 100;
            const batchSize = 100;
            let totalBatches = Math.ceil(options.length / batchSize);
            let batchTimes = [];

            function loadNextBatch(batchNum) {
                const start = performance.now();
                pickle.loadMoreOptions(batchStart, batchSize);
                const end = performance.now();
                batchTimes.push(end - start);

                batchStart += batchSize;
                if (batchStart < options.length) {
                    // Next batch
                    setTimeout(() => loadNextBatch(batchNum + 1), 0);
                } else {
                    // All batches loaded
                    expect(pickle.options.length).toBe(10000);
                    batchTimes.forEach(time => expect(time).toBeLessThan(200));
                    done();
                }
            }

            loadNextBatch(1);
        }, 10000);

        test('should handle rapid create/destroy cycles without memory leaks', () => {
            const initialInstances = Pickle.instances.size;
            
            for (let i = 0; i < 100; i++) {
                const tempSelect = createSelect();
                const tempPickle = new Pickle(tempSelect);
                tempPickle.destroy();
                tempSelect.remove();
            }
            
            expect(Pickle.instances.size).toBe(initialInstances);
            expect(document.querySelectorAll('.pickle-wrapper').length).toBe(0);
        });

        test('should handle simultaneous event spam without breaking', (done) => {
            select = createSelect();
            pickle = new Pickle(select);
            
            let eventCount = 0;
            const totalEvents = 250;
            
            for (let i = 0; i < totalEvents; i++) {
                setTimeout(() => {
                    try {
                        let method;

                        method = Math.random() < 0.5 ? 'toggle' : 'unimportant';

                        switch (method) {
                            case 'toggle':
                                pickle.toggle(); // open|close
                                pickle.toggle(); // close|open
                                pickle.close(); // explicitly close
                            break;
                            default:
                                pickle.open();
                                pickle.close();
                            break;
                        }

                        eventCount++;
                        if (eventCount === totalEvents) {
                            expect(pickle.isElementOpen()).toBe(false);
                            expect(() => pickle.destroy()).not.toThrow();
                            done();
                        }
                    } catch (error) {
                        done(error);
                    }
                }, Math.random() * 10);
            }
        }, 10000);
    });

    describe('Real World DOM Manipulation', () => {
        test('should survive parent element being moved around DOM', () => {
            select = createSelect();
            pickle = new Pickle(select);
            
            const newParent = document.createElement('div');
            document.body.appendChild(newParent);
            
            newParent.appendChild(pickle.wrapper);
            
            expect(() => {
                pickle.open();
                pickle.set('option1');
                pickle.close();
            }).not.toThrow();
            
            expect(pickle.get()).toBe('option1');
        });

        test('should handle CSS being changed mid-operation', () => {
            select = createSelect();
            pickle = new Pickle(select);
            
            pickle.open();
            
            // Mess with CSS mid-operation
            pickle.wrapper.style.display = 'none';
            pickle.dropdown.style.position = 'static';
            pickle.dropdown.style.height = '0px';
            
            expect(() => {
                pickle.set('option2');
                pickle.close();
            }).not.toThrow();
        });
    });

    describe('Edge Case Data Handling', () => {
        test('should handle extremely long option text without breaking layout', () => {
            const longText = 'a'.repeat(10000);
            const options = [
                { value: 'short', text: 'Short' },
                { value: 'long', text: longText },
                { value: 'emoji', text: '🎉'.repeat(1000) }
            ];
            
            select = createSelect(options);
            pickle = new Pickle(select);
            
            expect(() => {
                pickle.open();
                pickle.set('long');
            }).not.toThrow();
            
            expect(pickle.get()).toBe('long');
        });

            test('should handle super long option value (1k chars)', () => {
                const longOption = 'A'.repeat(1000);
                const options = [
                    { value: 'long', text: longOption },
                    { value: 'short', text: 'Short' }
                ];
                select = createSelect(options);
                pickle = new Pickle(select);
                expect(() => {
                    pickle.open();
                    pickle.set('long');
                }).not.toThrow();
                expect(pickle.get()).toBe('long');
                expect(pickle.wrapper.innerHTML).toContain(longOption);
            });

        test('should handle special characters and HTML entities', () => {
            const options = [
                { value: 'html', text: '<script>alert("xss")</script>' },
                { value: 'entities', text: '&lt;&gt;&amp;&quot;&#39;' },
                { value: 'unicode', text: '🦄💖🌈🎭🎪🎨🎯🎲' },
                { value: 'rtl', text: 'العربية עברית' }
            ];
            
            select = createSelect(options);
            pickle = new Pickle(select);
            
            options.forEach((opt) => {
                expect(() => {
                    pickle.set(opt.value);
                }).not.toThrow();
            });
        });

        test('should handle dynamic option changes while open', () => {
            select = createSelect();
            pickle = new Pickle(select);
            
            pickle.open();
            
            expect(() => {
                pickle.addOption('dynamic', 'Dynamic Option');
                pickle.removeOption('option1');
            }).not.toThrow();
        });
    });

    describe('Accessibility Under Stress', () => {
        test('should maintain ARIA relationships under rapid state changes', () => {
            select = createSelect();
            pickle = new Pickle(select);
            
            for (let i = 0; i < 50; i++) {
                pickle.open();
                pickle.close();
            }
            
            expect(pickle.trigger.getAttribute('aria-expanded')).toBe('false');
            expect(pickle.trigger.getAttribute('aria-haspopup')).toBe('listbox');
            expect(pickle.dropdown.getAttribute('role')).toBe('listbox');
        });

            test('should end closed after hundreds of open/close/toggle cycles', () => {
                select = createSelect();
                pickle = new Pickle(select);
                for (let i = 0; i < 300; i++) {
                    pickle.open();
                    pickle.close();
                    pickle.toggle();
                    pickle.close();
                }
                expect(pickle.isElementOpen()).toBe(false);
            });

        test('should handle rapid selections without crashing', (done) => {
            select = createSelect();
            pickle = new Pickle(select, { searchable: true });
            
            // Rapid selections
            setTimeout(() => pickle.set('option1'), 10);
            setTimeout(() => pickle.set('option2'), 20);
            setTimeout(() => pickle.set('option4'), 30); // Skip disabled option3
            
            setTimeout(() => {
                expect(pickle.get()).toBe('option4');
                done();
            }, 100);
        }, 1000);
    });
});