## Status

[![Tests](https://github.com/gh-o-st/pickle/actions/workflows/test.yml/badge.svg)](https://github.com/gh-o-st/pickle/actions)
[![Coverage](https://codecov.io/gh/gh-o-st/pickle/branch/stable/graph/badge.svg)](https://codecov.io/gh/gh-o-st/pickle)
[![npm version](https://badge.fury.io/js/pickle-select.svg)](https://badge.fury.io/js/pickle-select)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/pickle-select)](https://bundlephobia.com/package/pickle-select)

# Pickle 🥒

A lightweight, dependency-free, and fully accessible custom select component with a funny name.

## Why Pickle?

Native `<select>` elements are about as customizable as a brick wall and twice as frustrating. After years of wrestling with select styling and accessibility, I built Pickle to be the select component I always wanted to use.

## ✨ Features

- **🪶 Featherlight**: Zero dependencies, minimal footprint (~26KB minified, ~6KB gzipped)
- **♿ Accessible by default**: Full WAI-ARIA support, keyboard navigation, screen reader friendly
- **🤖 Future-proof**: Rich programmatic API built for today's humans and tomorrow's cyborgs
- **🎨 Highly themeable**: CSS custom properties with 6 included themes
- **🔍 Smart search**: Built-in filtering with fuzzy search support
- **📱 Touch-friendly**: Optimized for mobile and touch devices
- **⚡ Performance-focused**: Virtual scrolling handles thousands of options smoothly
- **🛡️ Secure**: Built-in XSS protection and input sanitization
- **🌐 Multi-select**: Single and multiple selection modes
- **🔧 Rich API**: Comprehensive methods for dynamic manipulation

## ♿ Accessibility

Pickle is built with accessibility as a first-class citizen:

- **Keyboard Navigation**: Full arrow key, Enter, Escape, Home/End support
- **Screen Reader Support**: Proper ARIA labels, roles, and live regions
- **Focus Management**: Logical focus flow and visual indicators
- **High Contrast**: Works with Windows High Contrast mode
- **Touch Support**: Optimized for touch devices and screen readers

### WCAG Compliance

- **WCAG 2.1 AA compliant** out of the box
- Proper color contrast ratios
- Keyboard-only operation support
- Screen reader announcements for state changes

## 🚀 Quick Start

### Installation

```bash
npm install pickle-select
```

Or use a CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pickle-select@1.0.0/dist/pickle.min.css">
<script src="https://cdn.jsdelivr.net/npm/pickle-select@1.0.0/dist/pickle.min.js" type="module"></script>
```

#### Available from CDN:
- https://cdn.jsdelivr.net/npm/pickle-select@1.0.0/dist/pickle.min.js
- https://cdn.jsdelivr.net/npm/pickle-select@1.0.0/dist/pickle.min.css
- https://cdn.jsdelivr.net/npm/pickle-select@1.0.0/dist/theme/material/material.min.css
- https://cdn.jsdelivr.net/npm/pickle-select@1.0.0/dist/theme/brutalist/brutalist.min.css
- https://cdn.jsdelivr.net/npm/pickle-select@1.0.0/dist/theme/minimalist/mnml.min.css
- https://cdn.jsdelivr.net/npm/pickle-select@1.0.0/dist/theme/neumorphic/neumorphic.min.css
- https://cdn.jsdelivr.net/npm/pickle-select@1.0.0/dist/theme/skeuomorphic/skeuomorphic.min.css
- https://cdn.jsdelivr.net/npm/pickle-select@1.0.0/dist/theme/glassmorphic/glassmorphic.min.css


### Basic Usage

```html
<select id="my-select">
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
  <option value="cherry">Cherry</option>
</select>
```

```javascript
import Pickle from 'pickle-select';

const picker = new Pickle('#my-select', {
  searchable: true,
  theme: 'default'
});
```

That's it! Your select is now a beautiful, accessible Pickle component.

## 🎛️ Configuration Options

```javascript
new Pickle('#my-select', {
  // Appearance
  theme: 'default',           // Theme name
  width: '100%',              // Component width
  height: null,               // Component height
  
  // Behavior
  searchable: false,          // Enable search filtering
  fuzzySearch: false,         // Enable fuzzy search
  multiple: false,            // Multi-select mode
  disabled: false,            // Disabled state
  
  // Data
  defaultValue: null,         // Initial value(s)
  
  // Callbacks
  onChange: null,             // Selection change callback
  
  // Localization
  l10n: {
    placeholder: 'Select an option',
    searchPlaceholder: 'Search options...',
    // ... more strings
  },
  
  // Development
  debug: false               // Enable debug logging
});
```

## 🎨 Themes

Pickle comes with several professionally designed themes you can apply with the `theme` option:

- `default` - Clean and modern
- `material` - Material Design inspired
- `brutalist` - Bold and striking
- `minimalist` - Ultra-clean design
- `neumorphic` - Soft, 3D appearance
- `glassmorphic` - Frosted glass effect
- `skeuomorphic` - Real-world textures

To use a built-in theme, link its stylesheet from the CDN (or your local `dist/theme/` folder) and specify its name in the options. This adds the necessary class to the component wrapper.

**Link the theme CSS in your HTML `<head>`:**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pickle-select@1.0.0/dist/theme/material/material.min.css">
```
```js
new Pickle('#my-select', { theme: 'material' });
```

### Custom Themes

Create your own theme using CSS custom properties:

```css
/* In your own stylesheet */
.pickle-select--my-theme {
  --pickle-border-radius: 12px;
  --pickle-font-size: 16px;
  --pickle-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --pickle-text-color: white;
  
  /* Override the arrow color for the new background */
  --pickle-arrow-color: white; 
}
```
```js
// The theme name 'my-theme' matches the CSS class '.pickle-select--my-theme'
new Pickle('#styled-select', { theme: 'my-theme' });
```

## 📚 API Reference

### Constructor

```javascript
new Pickle(elementOrID, options)
```

- `elementOrID`: HTMLSelectElement or string ID
- `options`: Configuration object (optional)

### Methods

#### Selection Methods

```javascript
// Get current value(s)
picker.get()                    // Returns string or array

// Set value(s)
picker.set('value')             // Single select
picker.set(['val1', 'val2'])    // Multi-select

// Clear selection
picker.clear()                  // Clear all selections

// Get selected option elements
picker.getOption()              // Returns HTMLElement or array

// Get selected text
picker.getText()                // Returns string or array
```

#### Option Management

```javascript
// Add option
picker.addOption('value', 'text', index, disabled)

// Remove option
picker.removeOption('value')

// Update all options
picker.updateOptions([
  { value: 'val1', text: 'Text 1', disabled: false },
  { value: 'val2', text: 'Text 2', disabled: true }
])

// Get all options
picker.getOptions()             // Returns array of option objects
```

#### State Management

```javascript
// Control dropdown
picker.open()                   // Open dropdown
picker.close()                  // Close dropdown
picker.toggle()                 // Toggle open/closed

// Check state
picker.isElementOpen()          // Returns boolean
picker.isDisabled()             // Returns boolean

// Control features
picker.setDisabled(true)        // Enable/disable
picker.setSearchable(true)      // Enable/disable search
picker.setRequired(true)        // Set required state
```

#### Validation

```javascript
// Validation
picker.getValidationState()     // Returns validation object
picker.setCustomValidity('message')  // Set custom validation
```

#### Lifecycle

```javascript
// Cleanup
picker.destroy()                // Remove component and cleanup
```

### Events

Pickle emits custom events you can listen for:

```javascript
picker.wrapper.addEventListener('pickle:change', (e) => {
  console.log('Value changed:', e.detail.value);
});

picker.wrapper.addEventListener('pickle:open', (e) => {
  console.log('Dropdown opened');
});

picker.wrapper.addEventListener('pickle:search', (e) => {
  console.log('Search term:', e.detail.term);
});
```

Available events:
- `pickle:change` - Selection changed
- `pickle:open` / `pickle:close` - Dropdown state
- `pickle:search` - Search performed
- `pickle:optionAdded` / `pickle:optionRemoved` - Options modified
- `pickle:destroyed` - Component destroyed

## 🎯 Advanced Examples

### Multi-select with Search

```javascript
const picker = new Pickle('#multi-select', {
  multiple: true,
  searchable: true,
  fuzzySearch: true,
  onChange: (values, { text }) => {
    console.log('Selected:', values, text);
  }
});
```

### Dynamic Options

```javascript
const picker = new Pickle('#dynamic-select');

// Add options dynamically
fetch('/api/options')
  .then(res => res.json())
  .then(options => {
    picker.updateOptions(options);
  });

// Listen for changes
picker.wrapper.addEventListener('pickle:change', (e) => {
  // Update related dropdowns, etc.
});
```

## 🏗️ Building and Development

```bash
# Clone the repository
git clone https://github.com/gh-o-st/pickle.git
cd pickle

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🤝 Contributing

I'd love your help making Pickle better! Please follow these guidelines:

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pickle.git
   cd pickle
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

### Making Changes

5. **Make your changes** with these guidelines:
   - Follow existing code style and patterns
   - Add tests for new functionality
   - Update documentation if needed
   - **Do not include the dist/ directory in your pull request.** I manually build and commit the production files when a new version is released.

6. **Test your changes**:
   ```bash
   npm test                    # Run all tests
   npm run test:watch          # Run tests in watch mode
   npm run test:coverage       # Check coverage
   ```

7. **Ensure quality**:
   - All tests must pass
   - Maintain or improve test coverage
   - No console errors or warnings

### Submitting

8. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add fuzzy search support"
   git commit -m "fix: handle empty option values"
   git commit -m "docs: update API examples"
   ```

9. **Push and create a Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```

### 💡 Before You Start

- Check existing [issues](https://github.com/gh-o-st/pickle/issues) and [PRs](https://github.com/gh-o-st/pickle/pulls)
- For major changes, please open an issue first to discuss
- Questions? Feel free to ask in an issue!


## 📄 License

Pickle is released under the [Mozilla Public License 2.0](LICENSE).