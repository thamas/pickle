export default class PickleUtils {
    p = null;

    constructor(pickleInstance) {
        this.p = pickleInstance;
    }

    generateID() {
        return `pckl-${this.p.constructor.instances.size + 1}-${Math.random().toString(16).slice(2, 8)}`;
    }

    /**
     * Gets an HTMLSelectElement by ID or reference.
     * @param {string|HTMLElement} elementOrID - The element or its ID.
     * @returns {HTMLSelectElement|null} The select element if found.
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
     * Escapes characters in a string for use in a Regular Expression.
     * @param {string} string - The string to escape.
     * @returns {string} - The escaped string.
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Logs messages if debug mode is enabled.
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
     * Closes all other open instances.
     */
    closeOtherInstances() {
        this.p.constructor.instances.forEach(instance => {
            if (instance !== this.p && instance.isOpen) {
                instance.close();
            }
        });
    }

    /**
     * Validates the onChange callback.
     * @param {Function} [onChange] - The callback function.
     * @returns {Function|null} The validated function.
     * @throws {Error} If onChange is not a function.
     */
    getOnChange(onChange) {
        if (onChange && typeof onChange !== 'function') {
            if (this.p.debug) this.p.utils.log('error', 'onChange must be a function');
            throw new Error('onChange must be a function', { cause: new Error('Invalid onChange callback') });
        }
        return onChange;
    }

    /**
     * Validates the default value.
     * @param {string|string[]} [defaultValue] - The default value.
     * @returns {string|string[]|null} The validated value.
     * @throws {Error} If defaultValue is not a string or array.
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