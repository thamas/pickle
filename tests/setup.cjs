require('@testing-library/jest-dom');

global.Pickle = {
    vars: {
        pickle: null,
        container: document.createElement('div'),
        selectElement: document.createElement('select'),
        selectLabel: document.createElement('label'),
        selectOptions: [
            { value: '', label: 'Select an option' },
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2' },
            { value: 'option3', label: 'Option 3', disabled: true },
            { value: 'option4', label: 'Option 4' },
            {
                label: 'Optgroup',
                options: [
                    { value: 'option5', label: 'Option 5' },
                    { value: 'option6', label: 'Option 6' },
                    { value: 'option7', label: 'Option 7' },
                    { value: 'option8', label: 'Option 8' }
                ]
            },
            { value: 'option9', label: 'Option 9' },
            { value: 'option10', label: 'Option 10' }
        ],
        inputElement: document.createElement('input'),
        inputLabel: document.createElement('label'),
    },
    get timer() {
        return performance.now();
    },
    helpers: {
        createElement: (tagName, attributes = {}, textContent = '') => {
            const element = document.createElement(tagName);
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'textContent') {
                    element.textContent = value;
                } else {
                    element.setAttribute(key, value);
                }
            });
            if (textContent) {
                element.textContent = textContent;
            }
            return element;
        },
        
        createSelectElement: (options = global.Pickle.vars.selectOptions) => {
            const select = document.createElement('select');
            options.forEach(option => {
                if (option.options) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = option.label;
                    if (option.disabled) optgroup.disabled = true;
                    
                    option.options.forEach(subOption => {
                        const opt = document.createElement('option');
                        opt.value = subOption.value;
                        opt.textContent = subOption.label;
                        if (subOption.disabled) opt.disabled = true;
                        if (subOption.selected) opt.selected = true;
                        optgroup.appendChild(opt);
                    });
                    select.appendChild(optgroup);
                } else {
                    const opt = document.createElement('option');
                    opt.value = option.value;
                    opt.textContent = option.label;
                    if (option.disabled) opt.disabled = true;
                    if (option.selected) opt.selected = true;
                    select.appendChild(opt);
                }
            });
            return select;
        },

        waitForAsync: async (ms = 100) => {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        cleanupPickleInstances: async () => {
            if (typeof Pickle !== 'undefined' && Pickle.instances) {
                await new Promise(resolve => setTimeout(resolve, 100));
                Pickle.instances.forEach(instance => {
                    if (instance && typeof instance.destroy === 'function') {
                        try {
                            instance.destroy();
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                    }
                });
                Pickle.instances.clear();
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    }
}

Element.prototype.scrollIntoView = jest.fn();

if (typeof global.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}

const mockedConsole = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};

beforeAll(() => {
    global.console = mockedConsole;
});

beforeEach(async () => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    
    global.Pickle.vars.container = document.createElement('div');
    document.body.appendChild(global.Pickle.vars.container);
    
    await global.Pickle.helpers.cleanupPickleInstances();
});

afterEach(async () => {
    await global.Pickle.helpers.cleanupPickleInstances();
    document.body.innerHTML = '';
});