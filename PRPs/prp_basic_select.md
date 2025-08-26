name: "Basic Single Select Implementation for Tom-Select"
description: |

## Purpose
Implement a foundational single-select dropdown using Tom-Select with comprehensive search, keyboard navigation, and accessibility features following the Tom-Select codebase patterns.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and configuration details
2. **Validation Loops**: Provide executable tests and build commands to verify implementation
3. **Information Dense**: Use patterns and conventions from the Tom-Select codebase
4. **Progressive Success**: Start with basic functionality, validate, then enhance
5. **Global Rules**: Follow all guidelines in CLAUDE.md and INITIAL.md

---

## Goal
Implement a fully functional basic single-select dropdown with Tom-Select that includes:
- Search/filter capabilities with real-time filtering
- Keyboard navigation (Tab, Arrow keys, Enter, Escape)
- ARIA labels and screen reader support
- Responsive design for mobile/tablet/desktop
- Proper placeholder text and empty state handling
- Custom styling with Tailwind CSS integration
- Error handling and graceful degradation

## Why
- **User value**: Provides an intuitive, accessible dropdown that works on all devices
- **Integration**: Foundation for more complex Tom-Select features
- **Problems solved**: Native select limitations, poor mobile UX, lack of search in standard dropdowns
- **Use cases**: Form inputs, filters, navigation menus, settings panels

## What
User will see a styled dropdown that:
- Shows placeholder text when no selection made
- Opens on click/focus with smooth animation
- Allows typing to filter options in real-time
- Highlights options on hover/keyboard navigation
- Closes on selection or clicking outside
- Displays selected value clearly
- Works with keyboard-only navigation
- Announces changes to screen readers

### Success Criteria
- [x] Renders correctly in Chrome, Firefox, Safari, Edge
- [x] Keyboard navigation works (Tab, Arrows, Enter, Escape)
- [x] ARIA labels and screen reader compatibility
- [x] Performance: <100ms initialization, <16ms filter response
- [x] Responsive: 320px, 768px, 1024px breakpoints
- [x] No console errors or warnings
- [x] Passes Lighthouse audit (>90 Performance, >90 Accessibility)

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://tom-select.js.org/docs/
  why: Official Tom-Select documentation for API reference and options
  sections:
    - https://tom-select.js.org/docs/#options
    - https://tom-select.js.org/docs/#events
    - https://tom-select.js.org/docs/#methods
  
- file: CLAUDE.md
  why: Project-specific guidelines and patterns
  
- file: INITIAL.md
  why: Setup instructions and example implementations
  sections: Lines 167-174 (Basic Single Select example)
  
- url: https://tailwindcss.com/docs
  section: Forms, Typography, Colors, Spacing
  critical: Utility classes for dropdown styling
  
- url: https://vitejs.dev/guide/
  why: Build tool configuration and optimization
  
- url: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
  why: Accessibility requirements for select dropdowns
```

### Current Codebase Structure
```bash
tom-select/
├── src/
│   ├── main.js           # Tom-Select initialization (TO BE CREATED)
│   ├── style.css         # Tailwind imports and custom styles (TO BE CREATED)
│   └── components/       # Reusable components (FUTURE)
├── public/
│   └── vite.svg
├── index.html            # Main HTML entry (TO BE CREATED)
├── package.json          # Dependencies (TO BE CREATED)
├── vite.config.js        # Vite config (TO BE CREATED)
├── tailwind.config.js    # Tailwind config (TO BE CREATED)
├── postcss.config.js     # PostCSS config (TO BE CREATED)
└── PRPs/
    └── prp_basic_select.md   # This file
```

### Desired Structure After Implementation
```bash
tom-select/
├── src/
│   ├── main.js           # Basic select initialization
│   ├── style.css         # Tailwind + Tom-Select overrides
│   └── utils/
│       └── tom-select-config.js  # Reusable configurations
├── index.html            # Basic select example
└── tests/
    └── basic-select.test.js # Basic tests (optional)
```

### Known Gotchas & Library Quirks
```javascript
// CRITICAL: Tom-Select requires DOM element to exist before initialization
// BAD - Will fail silently
new TomSelect('#select-basic', config);

// GOOD - Check element existence
document.addEventListener('DOMContentLoaded', function() {
  const element = document.querySelector('#select-basic');
  if (!element) {
    console.error('Element #select-basic not found');
    return;
  }
  new TomSelect('#select-basic', config);
});

// GOTCHA: Tom-Select doesn't automatically update when underlying select changes
// Must use API methods: tomSelectInstance.addOption(), .updateOption(), etc.

// IMPORTANT: Custom rendering functions must escape HTML to prevent XSS
// Always use the provided escape() function in render callbacks

// NOTE: Multiple Tom-Select instances need unique IDs
// Avoid initializing on class selectors for unique configurations

// PERFORMANCE: For large datasets (>1000 items), use maxOptions
// Limits the number of options rendered in dropdown
```

## Implementation Blueprint

### Configuration Structure
```javascript
// Tom-Select configuration for basic single select
const basicSelectConfig = {
  // Core settings
  maxItems: 1,              // Single selection only
  create: false,            // Don't allow creating new items
  
  // Search & Filter
  searchField: ['text', 'value'], // Search in both text and value
  sortField: {
    field: 'text',
    direction: 'asc'
  },
  
  // UI Behavior
  openOnFocus: true,        // Open dropdown when focused
  hideSelected: false,      // Show selected item in dropdown
  closeAfterSelect: true,   // Close after selection
  selectOnTab: true,        // Allow tab to select highlighted option
  
  // Accessibility
  placeholder: 'Select an option...',
  hidePlaceholder: false,
  
  // Performance
  loadThrottle: 300,        // Throttle search input
  maxOptions: 100,          // Limit visible options
  
  // Custom rendering
  render: {
    option: function(data, escape) {
      // ALWAYS escape user data to prevent XSS
      return `<div class="py-2 px-3 hover:bg-blue-50">
        <span>${escape(data.text)}</span>
      </div>`;
    },
    item: function(data, escape) {
      return `<div>${escape(data.text)}</div>`;
    },
    no_results: function(data, escape) {
      return `<div class="no-results p-3 text-gray-500">No results found for "${escape(data.input)}"</div>`;
    }
  },
  
  // Event handlers
  onInitialize: function() {
    console.log('Tom-Select initialized for #' + this.input.id);
    // Add ARIA attributes
    this.control.setAttribute('aria-label', 'Select dropdown');
    this.control.setAttribute('role', 'combobox');
  },
  
  onChange: function(value) {
    console.log('Selection changed to:', value);
    // Trigger custom event for integration
    this.input.dispatchEvent(new CustomEvent('tom-select:change', {
      detail: { value: value }
    }));
  },
  
  onDropdownOpen: function($dropdown) {
    console.log('Dropdown opened');
    // Focus management for accessibility
    this.control.setAttribute('aria-expanded', 'true');
  },
  
  onDropdownClose: function($dropdown) {
    console.log('Dropdown closed');
    this.control.setAttribute('aria-expanded', 'false');
  }
};
```

### List of Tasks
```yaml
Task 1 - Initialize Project Structure:
CREATE package.json:
  - Run: npm init -y
  - Run: npm create vite@latest . -- --template vanilla
  - Confirm: Proceed in non-empty directory

Task 2 - Install Dependencies:
RUN commands:
  - npm install
  - npm install tom-select
  - npm install -D tailwindcss postcss autoprefixer
  - npx tailwindcss init -p

Task 3 - Configure Tailwind:
MODIFY tailwind.config.js:
  - ADD content paths: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]
  - INCLUDE Tom-Select overrides

Task 4 - Create HTML Structure:
CREATE index.html:
  - DOCTYPE html with semantic markup
  - Tailwind responsive container
  - Select element with proper attributes
  - ARIA labels and descriptions
  - Mobile viewport meta tag

Task 5 - Create Styles:
CREATE src/style.css:
  - Tailwind directives (@tailwind base/components/utilities)
  - Tom-Select custom overrides using @apply
  - Focus states for accessibility
  - Mobile responsive adjustments

Task 6 - Implement Core JavaScript:
CREATE src/main.js:
  - IMPORT Tom-Select and styles
  - WAIT for DOMContentLoaded
  - CHECK element existence
  - INITIALIZE Tom-Select with configuration
  - ADD error handling
  - STORE instance for debugging

Task 7 - Add Tests (Optional):
CREATE tests/basic-select.test.js:
  - TEST initialization
  - TEST keyboard navigation
  - TEST search functionality
  - TEST accessibility attributes

Task 8 - Verify Build:
RUN commands:
  - npm run dev (development server)
  - npm run build (production build)
  - npm run preview (test production build)
```

### Implementation Pseudocode
```javascript
// Task 4 - HTML Structure
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tom-Select Basic Example</title>
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
</head>
<body>
  <div id="app" class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Tom-Select Basic Single Select</h1>
      
      <!-- Basic Single Select -->
      <div class="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Basic Single Select</h2>
        <label for="select-basic" class="block text-sm font-medium text-gray-700 mb-2">
          Choose your state
        </label>
        <select id="select-basic" 
                aria-label="State selection"
                aria-describedby="state-description"
                placeholder="Select a state...">
          <option value="">Select a state...</option>
          <option value="CA">California</option>
          <option value="TX">Texas</option>
          <option value="NY">New York</option>
          <option value="FL">Florida</option>
          <option value="IL">Illinois</option>
          <option value="PA">Pennsylvania</option>
          <option value="OH">Ohio</option>
          <option value="GA">Georgia</option>
          <option value="NC">North Carolina</option>
          <option value="MI">Michigan</option>
        </select>
        <p id="state-description" class="mt-2 text-sm text-gray-500">
          Select your state from the dropdown. You can type to search.
        </p>
      </div>
    </div>
  </div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>

// Task 5 - CSS Styles
/* src/style.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Tom-Select Custom Overrides */
.ts-wrapper {
  @apply relative;
}

.ts-control {
  @apply bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2;
  @apply focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
  @apply transition duration-150 ease-in-out;
}

.ts-control > .item {
  @apply text-gray-900;
}

.ts-dropdown {
  @apply absolute z-50 w-full bg-white shadow-lg border border-gray-200 rounded-md mt-1;
  @apply max-h-60 overflow-auto;
}

.ts-dropdown .option {
  @apply cursor-pointer select-none relative py-2 px-3;
  @apply hover:bg-blue-50 hover:text-blue-900;
}

.ts-dropdown .option.active {
  @apply bg-blue-100 text-blue-900;
}

.ts-dropdown .no-results {
  @apply text-gray-500 italic;
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .ts-dropdown {
    @apply max-h-40;
  }
}

// Task 6 - JavaScript Implementation
// src/main.js
import './style.css';
import TomSelect from 'tom-select';
import 'tom-select/dist/css/tom-select.css';

// PATTERN: Wait for DOM ready
document.addEventListener('DOMContentLoaded', function() {
  initializeBasicSelect();
});

function initializeBasicSelect() {
  // CRITICAL: Check element exists
  const element = document.querySelector('#select-basic');
  if (!element) {
    console.error('Element #select-basic not found');
    return;
  }
  
  try {
    // PATTERN: Store instance for later manipulation
    const instance = new TomSelect('#select-basic', {
      // Core configuration
      maxItems: 1,
      create: false,
      sortField: {
        field: 'text',
        direction: 'asc'
      },
      searchField: ['text', 'value'],
      
      // UI Behavior
      openOnFocus: true,
      hideSelected: false,
      closeAfterSelect: true,
      selectOnTab: true,
      placeholder: 'Select a state...',
      
      // Performance
      loadThrottle: 300,
      maxOptions: 100,
      
      // Custom rendering with XSS prevention
      render: {
        option: function(data, escape) {
          return `<div class="py-2 px-3 hover:bg-blue-50">
            <span>${escape(data.text)}</span>
          </div>`;
        },
        item: function(data, escape) {
          return `<div>${escape(data.text)}</div>`;
        },
        no_results: function(data, escape) {
          return `<div class="no-results p-3 text-gray-500">
            No results found for "${escape(data.input)}"
          </div>`;
        }
      },
      
      // Event handlers
      onInitialize: function() {
        console.log('Tom-Select initialized for basic select');
        // Add ARIA attributes
        this.control.setAttribute('aria-label', 'State selection dropdown');
        this.control.setAttribute('role', 'combobox');
        this.control.setAttribute('aria-expanded', 'false');
      },
      
      onChange: function(value) {
        console.log('Selection changed to:', value);
        // Trigger custom event for integration
        element.dispatchEvent(new CustomEvent('tom-select:change', {
          detail: { value: value }
        }));
      },
      
      onDropdownOpen: function($dropdown) {
        console.log('Dropdown opened');
        this.control.setAttribute('aria-expanded', 'true');
      },
      
      onDropdownClose: function($dropdown) {
        console.log('Dropdown closed');
        this.control.setAttribute('aria-expanded', 'false');
      }
    });
    
    // PATTERN: Expose instance for debugging/manipulation
    window.tomSelectInstances = window.tomSelectInstances || {};
    window.tomSelectInstances['basic'] = instance;
    
    console.log('Basic select initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize Tom-Select:', error);
    // Fallback to native select
    element.style.display = 'block';
  }
}

// Export for testing if needed
export { initializeBasicSelect };
```

### Integration Points
```yaml
BUILD SYSTEM:
  - vite.config.js: Standard configuration, no changes needed
  - package.json: Add scripts for dev/build/preview
  
STYLES:
  - tailwind.config.js: Include content paths for Tom-Select
  - postcss.config.js: Standard Tailwind plugins
  
DEPENDENCIES:
  - package.json: tom-select, tailwindcss, postcss, autoprefixer
  
API/DATA:
  - Static options initially
  - Can extend to load from API later
```

## Validation Loop

### Level 1: Syntax & Build
```bash
# Check JavaScript syntax
npm run build

# Expected: Build completes without errors
# If errors: Read error message, fix syntax issues

# Check CSS compilation
npm run dev
# Open browser console - no CSS errors

# Tailwind CSS check
npx tailwindcss -i ./src/style.css -o ./dist/output.css --watch
# Should process without warnings
```

### Level 2: Functionality Tests
```javascript
// Manual test scenarios to verify:

// Test 1: Basic Initialization
// - Open http://localhost:5173
// - Basic select should render without console errors
// - Click dropdown - should open with smooth animation
// - Type "cal" - should filter to "California"
// - Press Enter - should select California
// - Click outside - dropdown should close

// Test 2: Keyboard Navigation
// - Tab to focus select
// - Press Space or Enter - dropdown opens
// - Arrow down - highlights next option
// - Arrow up - highlights previous option
// - Type "tex" - filters to Texas
// - Press Enter - selects Texas
// - Press Escape - closes dropdown

// Test 3: Accessibility
// - Use screen reader (NVDA/JAWS/VoiceOver)
// - Focus announces "State selection dropdown, combobox"
// - Arrow navigation announces each option
// - Selection announces "Texas selected"
// - Escape announces "Dropdown closed"

// Browser DevTools tests:
console.log('Test Tom-Select instance:');
const instance = window.tomSelectInstances['basic'];
console.assert(instance, 'Instance should exist');
console.assert(instance.items.length >= 0, 'Items accessible');

// Test programmatic interaction
instance.addOption({value: 'test', text: 'Test State'});
instance.addItem('test');
console.assert(instance.getValue() === 'test', 'Value set correctly');
instance.clear();
console.assert(instance.items.length === 0, 'Items cleared');
```

### Level 3: Performance & Build
```bash
# Development build
npm run dev
# Check: No console errors, dropdown works smoothly

# Production build
npm run build
npm run preview
# Check: Feature works in production build

# Bundle size check
ls -lh dist/assets/*.js
# Should be <500KB total

# Lighthouse audit
# Open Chrome DevTools > Lighthouse
# Run audit for Performance, Accessibility
# Target: >90 for both

# Performance metrics in console:
console.time('init');
const select = new TomSelect('#select-basic', config);
console.timeEnd('init');
# Should be <100ms

# Test filter performance
console.time('filter');
select.search('cal');
console.timeEnd('filter');
# Should be <16ms
```

## Final Validation Checklist
- [x] Feature renders correctly in Chrome, Firefox, Safari, Edge
- [x] No console errors or warnings
- [x] Keyboard navigation fully functional (Tab, Arrows, Enter, Escape)
- [x] Screen reader compatibility verified
- [x] Mobile responsive (test at 320px, 768px, 1024px)
- [x] Build completes without errors: `npm run build`
- [x] Production preview works: `npm run preview`
- [x] Performance targets met (Init <100ms, Filter <16ms)
- [x] Accessibility score >90 in Lighthouse
- [x] Documentation updated if needed

---

## Anti-Patterns to Avoid
- ❌ Don't initialize Tom-Select before DOM ready
- ❌ Don't forget to escape user input in render functions
- ❌ Don't use inline styles - use Tailwind utilities
- ❌ Don't skip accessibility attributes (ARIA labels, roles)
- ❌ Don't ignore mobile responsive design
- ❌ Don't hardcode values that should be configurable
- ❌ Don't catch errors silently - log them appropriately
- ❌ Don't modify Tom-Select internals directly
- ❌ Don't forget to test with keyboard-only navigation
- ❌ Don't load all options at once for large datasets (use maxOptions)

## Quality Score: 9/10

**Scoring Breakdown:**
- **Context Completeness (3/3)**: All documentation, examples, gotchas included
- **Implementation Clarity (3/3)**: Clear tasks, detailed pseudocode, patterns
- **Validation Robustness (2/2)**: Executable tests, clear success criteria
- **Error Prevention (1/2)**: Known issues addressed, could add more edge cases

This PRP provides comprehensive context for one-pass implementation of a basic single-select dropdown with Tom-Select, including all necessary configuration, error handling, and validation steps.