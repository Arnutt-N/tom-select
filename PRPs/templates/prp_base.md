name: "Base PRP Template for Tom-Select Features"
description: |

## Purpose
Template optimized for implementing Tom-Select features with comprehensive context, validation capabilities, and iterative refinement to achieve working implementations.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and configuration details
2. **Validation Loops**: Provide executable tests and build commands to verify implementation
3. **Information Dense**: Use patterns and conventions from the Tom-Select codebase
4. **Progressive Success**: Start with basic functionality, validate, then enhance
5. **Global Rules**: Follow all guidelines in CLAUDE.md and INITIAL.md

---

## Goal
[Describe the specific Tom-Select feature to be implemented - be explicit about functionality and UI/UX expectations]

## Why
- [User value and improved experience]
- [Integration with existing Tom-Select features]
- [Problems this solves and use cases]

## What
[User-visible behavior, interactions, and technical requirements]

### Success Criteria
- [ ] [Feature renders correctly in all browsers]
- [ ] [Keyboard navigation works properly]
- [ ] [Accessibility standards met (ARIA labels, screen reader support)]
- [ ] [Performance targets achieved (load time, memory usage)]
- [ ] [Responsive design works on mobile/tablet/desktop]

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://tom-select.js.org/docs/
  why: Official Tom-Select documentation for API reference and options
  
- file: CLAUDE.md
  why: Project-specific guidelines and patterns
  
- file: INITIAL.md
  why: Setup instructions and example implementations
  
- url: https://tailwindcss.com/docs
  section: Utility classes for styling
  critical: Component styling and responsive design
  
- url: https://vitejs.dev/guide/
  why: Build tool configuration and optimization
  
- docfile: PRPs/ai_docs/[specific-doc].md
  why: Additional context documents if available
```

### Current Codebase Structure
```bash
tom-select/
├── src/
│   ├── main.js           # Tom-Select initialization
│   ├── style.css         # Tailwind imports and custom styles
│   └── components/       # Reusable components (if any)
├── public/
│   └── vite.svg
├── index.html            # Main HTML entry
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── PRPs/
    └── templates/
        └── prp_base.md   # This template
```

### Desired Structure After Implementation
```bash
tom-select/
├── src/
│   ├── main.js           # Updated with new feature
│   ├── style.css         # Additional styles if needed
│   ├── components/
│   │   └── [new-component].js  # New component if modular
│   └── utils/
│       └── [helpers].js  # Utility functions if needed
├── index.html            # Updated with new examples
└── tests/
    └── [feature].test.js # Test file for new feature
```

### Known Gotchas & Library Quirks
```javascript
// CRITICAL: Tom-Select requires DOM element to exist before initialization
// Example: Use DOMContentLoaded or check element existence

// GOTCHA: Tom-Select doesn't automatically update when underlying select changes
// Must use API methods: tomSelectInstance.addOption(), .updateOption(), etc.

// IMPORTANT: Custom rendering functions must escape HTML to prevent XSS
// Use the provided escape() function in render callbacks

// NOTE: Multiple Tom-Select instances need unique IDs
// Avoid initializing on class selectors for unique configurations

// PERFORMANCE: For large datasets (>1000 items), implement virtual scrolling
// Use maxOptions to limit rendered items
```

## Implementation Blueprint

### Configuration Structure
```javascript
// Tom-Select configuration pattern
const config = {
  // Core settings
  maxItems: null,           // null for unlimited multi-select
  create: false,            // Allow creating new items
  
  // Plugins (order matters for some)
  plugins: ['remove_button', 'clear_button'],
  
  // Custom rendering
  render: {
    option: function(data, escape) {
      // ALWAYS escape user data
      return `<div>${escape(data.text)}</div>`;
    },
    item: function(data, escape) {
      return `<div>${escape(data.text)}</div>`;
    }
  },
  
  // Event handlers
  onItemAdd: function(value, $item) {
    // Handle item addition
  },
  
  // Remote data loading
  load: function(query, callback) {
    // Async data fetching pattern
  }
};
```

### List of Tasks
```yaml
Task 1 - Setup HTML Structure:
MODIFY index.html:
  - FIND pattern: "<!-- [Existing section] -->"
  - ADD new section with proper Tailwind classes
  - INCLUDE accessibility attributes (aria-label, role)

Task 2 - Implement Core JavaScript:
MODIFY src/main.js:
  - IMPORT required Tom-Select plugins
  - CREATE initialization function
  - PATTERN: Follow existing initialization patterns
  - ADD event listeners and handlers

Task 3 - Add Custom Styles:
MODIFY src/style.css:
  - ADD component-specific styles using Tailwind @apply
  - OVERRIDE Tom-Select defaults as needed
  - MAINTAIN responsive design patterns

Task 4 - Create Reusable Component (if applicable):
CREATE src/components/[feature].js:
  - EXPORT class or function
  - INCLUDE default configuration
  - PROVIDE customization options

Task 5 - Add Tests:
CREATE tests/[feature].test.js:
  - TEST initialization
  - TEST user interactions
  - TEST edge cases
  - TEST accessibility
```

### Implementation Pseudocode
```javascript
// Task 1 - HTML Structure
<div class="mb-8 bg-white p-6 rounded-lg shadow">
  <h2 class="text-xl font-semibold mb-4">[Feature Name]</h2>
  <label for="feature-select" class="sr-only">Select [items]</label>
  <select id="feature-select" 
          aria-label="[Description]"
          [multiple]
          placeholder="[Placeholder text]">
    <!-- Options -->
  </select>
</div>

// Task 2 - JavaScript Implementation
// PATTERN: Wait for DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // CRITICAL: Check element exists
  const element = document.querySelector('#feature-select');
  if (!element) return;
  
  // PATTERN: Store instance for later manipulation
  const instance = new TomSelect('#feature-select', {
    // Configuration from blueprint
    
    // GOTCHA: Bind 'this' context in callbacks
    onItemAdd: function(value, $item) {
      console.log('Added:', value);
      // PATTERN: Trigger custom events for integration
      element.dispatchEvent(new CustomEvent('tom-select:added', {
        detail: { value, item: $item }
      }));
    },
    
    // PERFORMANCE: Debounce search for remote data
    loadThrottle: 300,
    
    // ACCESSIBILITY: Ensure keyboard navigation
    selectOnTab: true
  });
  
  // PATTERN: Expose instance for debugging/manipulation
  window.tomSelectInstances = window.tomSelectInstances || {};
  window.tomSelectInstances['feature'] = instance;
});
```

### Integration Points
```yaml
BUILD SYSTEM:
  - vite.config.js: No changes needed (auto-detects new files)
  - package.json: Add test script if adding tests
  
STYLES:
  - tailwind.config.js: Add custom colors/utilities if needed
  - postcss.config.js: No changes needed
  
DEPENDENCIES:
  - package.json: Add new Tom-Select plugins if required
  - Example: npm install tom-select-plugin-name
  
API/DATA:
  - Create mock API endpoint if demonstrating remote data
  - Add to public/ folder for local development
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
// - Feature should render without console errors
// - Click dropdown - should open
// - Type to search - should filter

// Test 2: Keyboard Navigation
// - Tab to focus select
// - Arrow keys navigate options
// - Enter selects option
// - Escape closes dropdown

// Test 3: Accessibility
// - Use screen reader (NVDA/JAWS)
// - All options should be announced
// - Selection changes announced
// - Labels read correctly

// Browser DevTools tests:
console.log('Test Tom-Select instance:');
const instance = window.tomSelectInstances['feature'];
console.assert(instance, 'Instance should exist');
console.assert(instance.items.length >= 0, 'Items accessible');

// Test programmatic interaction
instance.addOption({value: 'test', text: 'Test Option'});
instance.addItem('test');
console.assert(instance.items.includes('test'), 'Item added');
instance.clear();
console.assert(instance.items.length === 0, 'Items cleared');
```

### Level 3: Performance & Build
```bash
# Development build
npm run dev
# Check: No console errors, feature works

# Production build
npm run build
npm run preview
# Check: Feature works in production build

# Bundle size check
ls -lh dist/assets/*.js
# Should be reasonable size (<500KB total)

# Lighthouse audit
# Open Chrome DevTools > Lighthouse
# Run audit for Performance, Accessibility
# Target: >90 for both
```

## Final Validation Checklist
- [ ] Feature renders correctly in Chrome, Firefox, Safari, Edge
- [ ] No console errors or warnings
- [ ] Keyboard navigation fully functional
- [ ] Screen reader compatibility verified
- [ ] Mobile responsive (test at 320px, 768px, 1024px)
- [ ] Build completes without errors: `npm run build`
- [ ] Production preview works: `npm run preview`
- [ ] Performance targets met (First Contentful Paint <2s)
- [ ] Accessibility score >90 in Lighthouse
- [ ] Documentation updated in INITIAL.md if needed

---

## Anti-Patterns to Avoid
- ❌ Don't initialize Tom-Select before DOM ready
- ❌ Don't forget to escape user input in render functions
- ❌ Don't use inline styles - use Tailwind utilities
- ❌ Don't skip accessibility attributes
- ❌ Don't ignore mobile responsive design
- ❌ Don't hardcode values that should be configurable
- ❌ Don't catch errors silently - log them appropriately
- ❌ Don't modify Tom-Select internals directly
- ❌ Don't forget to test with keyboard-only navigation
- ❌ Don't load all options at once for large datasets