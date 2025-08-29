require('@testing-library/jest-dom');

global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 0);
};

global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
};

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

beforeEach(() => {
   jest.clearAllMocks(); 
});