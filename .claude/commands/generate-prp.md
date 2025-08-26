# Create PRP

## Feature file: $ARGUMENTS

Generate a comprehensive PRP (Problem Resolution Plan) for Tom-Select feature implementation with thorough research. Ensure sufficient context is provided to enable self-validation and iterative refinement. Read the feature file first to understand requirements, review examples, and identify implementation considerations.

The AI agent receives only the context you provide in the PRP plus its training data. Assume the AI agent has codebase access and current knowledge cutoff. Include all research findings and reference URLs for documentation since the agent has WebSearch capabilities.

## Research Process

### 1. **Codebase Analysis**
   - Search for similar Tom-Select implementations in src/main.js
   - Identify Tailwind CSS patterns in src/style.css and index.html
   - Review existing Tom-Select configurations and event handlers
   - Check Vite configuration for build requirements
   - Examine test patterns if tests exist

### 2. **External Research**
   - Tom-Select documentation (https://tom-select.js.org/docs/)
   - Tailwind CSS utilities (https://tailwindcss.com/docs)
   - Vite optimization guides (https://vitejs.dev/guide/)
   - GitHub examples of Tom-Select implementations
   - Accessibility best practices (WCAG guidelines)
   - Performance optimization techniques

### 3. **User Clarification** (if needed)
   - Specific UI/UX requirements?
   - Browser compatibility requirements?
   - Performance targets (load time, memory usage)?
   - Accessibility requirements (ARIA, keyboard nav)?
   - Mobile responsive breakpoints?

## PRP Generation

Using PRPs/templates/prp_base.md as template:

### Critical Context to Include
- **Tom-Select Documentation**: 
  - Configuration options with specific URLs
  - Plugin documentation and usage
  - Event handling and callbacks
  - Render functions and templates

- **Code Examples**: 
  - Existing Tom-Select instances from src/main.js
  - Tailwind styling patterns from src/style.css
  - HTML structure from index.html
  - Component patterns if any exist

- **Frontend Gotchas**:
  - DOM ready requirements for initialization
  - XSS prevention in render functions
  - Browser compatibility issues
  - Mobile touch event handling
  - Accessibility requirements

- **Development Patterns**:
  - Vite module imports
  - Tailwind utility classes
  - Responsive design approach
  - Event delegation patterns
  - Error boundary implementation

### Implementation Blueprint
- Start with HTML structure using semantic markup
- Show Tom-Select configuration with comments
- Include Tailwind styling approach
- Reference existing patterns from codebase
- Document browser testing strategy
- List tasks in implementation order

### Validation Gates (Must be Executable)
```bash
# Frontend Build & Lint
npm run build
npm run dev

# If ESLint configured
npm run lint

# If tests exist
npm run test

# Manual testing checklist
# 1. Open http://localhost:5173
# 2. Test feature in Chrome, Firefox, Safari, Edge
# 3. Test keyboard navigation (Tab, Arrow keys, Enter, Escape)
# 4. Test screen reader compatibility
# 5. Test mobile responsive (320px, 768px, 1024px)

# Performance check
# Chrome DevTools > Lighthouse audit
# Target: Performance >90, Accessibility >90

# Bundle size check
ls -lh dist/assets/*.js
# Should be <500KB total
```

### Browser Compatibility Testing
```javascript
// Console tests for feature validation
const instance = window.tomSelectInstances['feature-name'];
console.assert(instance, 'Instance exists');
console.assert(instance.isOpen !== undefined, 'API methods available');
console.assert(instance.items, 'Items accessible');

// Test programmatic interaction
instance.addOption({value: 'test', text: 'Test'});
instance.addItem('test');
console.assert(instance.getValue() === 'test', 'Value set correctly');
```

## PRP Structure Requirements

### Essential Sections
1. **Goal**: Clear feature description with expected UI/UX
2. **Success Criteria**: Measurable outcomes including:
   - Browser compatibility
   - Performance metrics
   - Accessibility standards
   - Responsive design breakpoints

3. **Implementation Tasks**:
   - HTML structure with Tailwind classes
   - JavaScript initialization and configuration
   - Custom styling if needed
   - Event handling and integration
   - Testing and validation

4. **Validation Loop**:
   - Build verification
   - Browser testing
   - Accessibility audit
   - Performance metrics
   - Mobile responsive check

### Code Quality Patterns
```javascript
// Always use this pattern for Tom-Select initialization
document.addEventListener('DOMContentLoaded', function() {
  const element = document.querySelector('#selector');
  if (!element) {
    console.warn('Element not found: #selector');
    return;
  }
  
  try {
    const instance = new TomSelect('#selector', {
      // Configuration
    });
    
    // Store for debugging
    window.tomSelectInstances = window.tomSelectInstances || {};
    window.tomSelectInstances['feature'] = instance;
  } catch (error) {
    console.error('Tom-Select initialization failed:', error);
  }
});
```

## Output
Save as: `PRPs/{feature-name}.md`

## Quality Checklist
- [ ] All Tom-Select configuration options documented
- [ ] Tailwind CSS classes specified for styling
- [ ] Browser compatibility requirements listed
- [ ] Accessibility requirements included
- [ ] Performance targets defined
- [ ] Validation commands are executable
- [ ] References existing codebase patterns
- [ ] Clear implementation path with ordered tasks
- [ ] Error handling documented
- [ ] Mobile responsive considerations included
- [ ] Test scenarios provided

## PRP Quality Score

Rate the PRP on a scale of 1-10 for one-pass implementation success:

**Scoring Criteria:**
- **Context Completeness (1-3 points)**: All necessary documentation, examples, gotchas
- **Implementation Clarity (1-3 points)**: Clear tasks, pseudocode, patterns
- **Validation Robustness (1-2 points)**: Executable tests, clear success criteria
- **Error Prevention (1-2 points)**: Known issues addressed, anti-patterns documented

**Score Interpretation:**
- 9-10: Ready for one-pass implementation
- 7-8: May need minor clarifications
- 5-6: Requires additional context
- <5: Needs significant research

Remember: The goal is one-pass implementation success through comprehensive context and clear validation gates specific to frontend development with Tom-Select, Tailwind CSS, and Vite.