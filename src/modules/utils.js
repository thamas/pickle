export default class PickleUtils {
    p = null;

    constructor(pickleInstance) {
        this.p = pickleInstance;
    }

    /**
     * Generates a unique ID string for an instance.
     * The ID is composed of a prefix, the current number of instances, and a random hexadecimal string.
     *
     * @returns {string} A unique identifier in the format 'pckl-{instanceCount}-{randomHex}'.
     */
    generateID() {
        return `pckl-${this.p.constructor.instances.size + 1}-${Math.random().toString(16).slice(2, 8)}`;
    }

    /**
     * Retrieves an HTMLSelectElement by its ID or returns the element if it is already an HTMLSelectElement.
     *
     * @param {string|HTMLElement} elementOrID - The ID of the element (optionally prefixed with '#') or the element itself.
     * @returns {HTMLSelectElement|null} The HTMLSelectElement if found, otherwise null.
     */
    getElement(elementOrID) {
        if (typeof elementOrID === 'string') {
            if (elementOrID.startsWith('#')) {
                elementOrID = elementOrID.slice(1);
            }
            const el = document.getElementById(elementOrID);
            return el instanceof HTMLSelectElement ? el : null;
        }
        return elementOrID instanceof HTMLSelectElement ? elementOrID : null;
    }

    /**
     * Escapes special characters in a string to be used in a regular expression.
     *
     * @param {string} string - The string to escape.
     * @returns {string} The escaped string safe for use in a regular expression.
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Logs messages to the console with a styled "[Pickle]" prefix, depending on the specified log level.
     * Only logs if debug mode is enabled (`this.p.debug`).
     *
     * @param {'log'|'info'|'warn'|'error'} [level='log'] - The log level to use for the message.
     * @param {...any} args - The arguments to log.
     */
    log(level = 'log', ...args) {
        if (this.p.debug) {
            const styles = 'color: #33a383; font-weight: bold;';
            switch (level) {
                case 'info':
                    console.info('%c[Pickle]', styles, ...args);
                    return;
                case 'warn':
                    console.warn('%c[Pickle]', styles, ...args);
                    return;
                case 'error':
                    console.error('%c[Pickle]', styles, ...args);
                    return;
                default:
                    console.log('%c[Pickle]', styles, ...args);
                    return;
            }
        }
    }

    /**
     * Closes all other open instances except the current one.
     * Iterates through all instances and calls the `close` method on those that are open and not the current instance.
     */
    closeOtherInstances() {
        this.p.constructor.instances.forEach(instance => {
            if (instance !== this.p && instance.isOpen) {
                instance.close();
            }
        });
    }

    /**
     * Validates that the provided `onChange` argument is a function.
     * Logs an error and throws if `onChange` is not a function.
     *
     * @param {Function} onChange - The callback function to be invoked on change.
     * @returns {Function} The validated `onChange` function.
     * @throws {Error} If `onChange` is provided and is not a function.
     */
    getOnChange(onChange) {
        if (onChange && typeof onChange !== 'function') {
            if (this.p.debug) this.p.utils.log('error', 'onChange must be a function');
            throw new Error('onChange must be a function', { cause: new Error('Invalid onChange callback') });
        }
        return onChange;
    }

    /**
     * Returns the validated default value based on the provided input.
     *
     * @param {string|string[]|null} defaultValue - The default value to validate. Can be a string, an array of strings, or null.
     * @returns {string|string[]|null} The validated default value, or null if input is null.
     * @throws {Error} Throws if defaultValue is not a string or an array of strings.
     */
    getDefaultValue(defaultValue) {
        if (defaultValue === null) return null;
        if (typeof defaultValue === 'string') return defaultValue;
        if (this.p.isMultiple) {
            if (Array.isArray(defaultValue)) {
                if (defaultValue.every(v => typeof v === 'string')) {
                    return defaultValue;
                }
                return [];
            }
        }
        if (this.p.debug) this.p.utils.log('error', 'defaultValue must be a string or an array of strings');
        throw new Error('defaultValue must be a string or an array of strings', { cause: new Error('Invalid defaultValue') });
    }
}