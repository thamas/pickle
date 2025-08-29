export default {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.cjs'],
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    moduleNameMapper: {
        '\\.(css|less)$': 'identity-obj-proxy'
    },
    transform: {
        '^.+\\.js$': 'babel-jest'
    }
};