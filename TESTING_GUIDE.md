# Tom-Select Basic Implementation - Testing Guide

## Overview
This guide provides comprehensive testing instructions for the Basic Single Select Tom-Select implementation based on the PRP requirements.

## Setup Instructions

### 1. Install Dependencies
```bash
# Install all dependencies
npm install

# Expected packages installed:
# - tom-select@^2.3.1
# - tailwindcss@^3.4.0
# - postcss@^8.4.32
# - autoprefixer@^10.4.16
# - vite@^5.0.8
```

### 2. Start Development Server
```bash
npm run dev
# Expected: Server starts at http://localhost:5173
# Expected: Browser opens automatically
# Expected: No console errors in terminal
```

## Level 1: Build & Syntax Validation

### Commands to Execute
```bash
# Check JavaScript syntax and build
npm run build
# Expected: Build completes without errors
# Expected: dist/ directory created with assets

# Check CSS compilation
npm run dev
# Expected: No CSS compilation errors
# Expected: Tailwind CSS processed correctly

# Production preview test
npm run build && npm run preview
# Expected: Production build works correctly
# Expected: Feature functions identically to dev build
```

### Expected Outcomes
- ✅ No JavaScript syntax errors
- ✅ No CSS compilation errors  
- ✅ Vite builds without warnings
- ✅ Production build creates optimized bundles
- ✅ Bundle size <500KB total

## Level 2: Functionality Testing

### Test 1: Basic Initialization
**Instructions:**
1. Open http://localhost:5173 in browser
2. Check browser console for errors
3. Verify page loads without issues

**Expected Results:**
- ✅ Page loads completely
- ✅ No console errors or warnings
- ✅ Tom-Select initializes successfully
- ✅ Console shows: "Basic select initialized successfully"
- ✅ Dropdown appears as styled input field

### Test 2: Dropdown Interaction
**Instructions:**
1. Click on the dropdown
2. Verify dropdown opens with smooth animation
3. Click outside to close
4. Focus the dropdown and verify it opens

**Expected Results:**
- ✅ Dropdown opens on click/focus
- ✅ Shows all 10 state options
- ✅ Closes when clicking outside
- ✅ Smooth open/close animations
- ✅ Proper visual styling applied

### Test 3: Search Functionality
**Instructions:**
1. Open dropdown
2. Type "cal" (should filter to California)
3. Type "tex" (should filter to Texas)
4. Type "xyz" (should show no results)

**Expected Results:**
- ✅ Real-time filtering works as you type
- ✅ "cal" shows only California
- ✅ "tex" shows only Texas  
- ✅ "xyz" shows "No results found for xyz"
- ✅ Filter response time <16ms (use DevTools Performance tab)

### Test 4: Selection Behavior
**Instructions:**
1. Open dropdown and select California
2. Verify selection displays correctly
3. Verify dropdown closes after selection
4. Try selecting different states

**Expected Results:**
- ✅ Selection displays in control
- ✅ Dropdown closes after selection
- ✅ Only one item can be selected (single-select)
- ✅ Console shows: "Selection changed to: CA"
- ✅ Custom event fires with correct value

### Test 5: Keyboard Navigation
**Instructions:**
1. Tab to focus the select
2. Press Space/Enter to open dropdown
3. Use Arrow Down/Up to navigate options
4. Press Enter to select highlighted option
5. Press Escape to close without selecting

**Expected Results:**
- ✅ Tab focuses the select correctly
- ✅ Space/Enter opens dropdown
- ✅ Arrow keys highlight different options
- ✅ Enter selects highlighted option
- ✅ Escape closes dropdown
- ✅ Tab when dropdown open selects highlighted option

### Test 6: Browser DevTools Validation
**Instructions:**
Open browser DevTools console and run:
```javascript
// Test instance exists
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

**Expected Results:**
- ✅ All console.assert statements pass
- ✅ No assertion errors in console
- ✅ Programmatic API works correctly

## Level 3: Accessibility Testing

### Screen Reader Testing
**Instructions:**
1. Use NVDA, JAWS, or VoiceOver
2. Navigate to the select with screen reader
3. Test opening and navigating options
4. Test selection announcement

**Expected Results:**
- ✅ Focus announces: "State selection dropdown, combobox"
- ✅ Arrow navigation announces each option
- ✅ Selection announces: "[State] selected"
- ✅ Dropdown state changes announced (expanded/collapsed)

### Keyboard-Only Navigation
**Instructions:**
1. Use only Tab, Arrow keys, Enter, Escape
2. Navigate entire interface without mouse
3. Ensure all functionality accessible

**Expected Results:**
- ✅ All functionality available via keyboard
- ✅ Clear focus indicators visible
- ✅ Tab order is logical
- ✅ No keyboard traps

### ARIA Attributes Validation
**Instructions:**
Check HTML attributes in DevTools:
```html
<!-- Expected ARIA attributes on control -->
<div role="combobox" 
     aria-label="State selection dropdown"
     aria-expanded="false"
     aria-describedby="state-description">
```

**Expected Results:**
- ✅ role="combobox" present
- ✅ aria-label correctly set  
- ✅ aria-expanded updates on open/close
- ✅ aria-describedby references help text

## Level 4: Cross-Browser Testing

### Browser Compatibility
**Test in each browser:**
- Chrome (latest)
- Firefox (latest)  
- Safari (latest)
- Edge (latest)

**Expected Results:**
- ✅ Identical functionality across all browsers
- ✅ Consistent visual appearance
- ✅ No browser-specific console errors
- ✅ Performance within targets on all browsers

## Level 5: Responsive Testing

### Breakpoint Testing
**Test at these viewport sizes:**
1. Mobile: 320px, 375px
2. Tablet: 768px
3. Desktop: 1024px, 1440px

**Expected Results:**
- ✅ Layout adapts appropriately at all breakpoints
- ✅ Touch interactions work on mobile
- ✅ Dropdown height adjusts for mobile (max-h-40 on <640px)
- ✅ Text remains readable at all sizes
- ✅ No horizontal scrolling

## Level 6: Performance Testing

### Performance Metrics
**Instructions:**
1. Open Chrome DevTools Performance tab
2. Measure initialization time:
   ```javascript
   console.time('init');
   // Reload page and let Tom-Select initialize
   console.timeEnd('init');
   ```
3. Measure filter response time:
   ```javascript
   console.time('filter');
   instance.search('cal');
   console.timeEnd('filter');
   ```

**Expected Results:**
- ✅ Initialization time <100ms
- ✅ Filter response time <16ms (60fps)
- ✅ No memory leaks during extended use
- ✅ Smooth 60fps interactions

### Lighthouse Audit
**Instructions:**
1. Open Chrome DevTools > Lighthouse
2. Run audit for Performance and Accessibility
3. Use mobile and desktop profiles

**Expected Results:**
- ✅ Performance score >90
- ✅ Accessibility score >90
- ✅ First Contentful Paint <2s
- ✅ Time to Interactive <3s

## Troubleshooting Common Issues

### Issue: Tom-Select doesn't initialize
**Check:** 
- Console for "Element #select-basic not found"
- DOM ready timing
- Import statements

### Issue: Styling doesn't apply
**Check:**
- Tailwind CSS compilation
- CSS import order
- PostCSS configuration

### Issue: Search doesn't work
**Check:**
- searchField configuration
- loadThrottle setting
- JavaScript errors during typing

### Issue: Keyboard navigation fails  
**Check:**
- selectOnTab setting
- Event handlers
- Focus management

## Success Criteria Checklist

### Functional Requirements
- [ ] Renders correctly in Chrome, Firefox, Safari, Edge
- [ ] Keyboard navigation works (Tab, Arrows, Enter, Escape)  
- [ ] ARIA labels and screen reader compatibility
- [ ] Performance: <100ms initialization, <16ms filter response
- [ ] Responsive: 320px, 768px, 1024px breakpoints
- [ ] No console errors or warnings
- [ ] Passes Lighthouse audit (>90 Performance, >90 Accessibility)

### Implementation Requirements  
- [ ] Single selection only (maxItems: 1)
- [ ] Real-time search/filtering works
- [ ] Custom Tailwind styling applied
- [ ] Error handling implemented
- [ ] XSS prevention in render functions
- [ ] ARIA attributes properly set
- [ ] Custom events dispatch correctly

### Code Quality
- [ ] Follows PRP patterns exactly
- [ ] Proper error handling and logging
- [ ] Element existence checks
- [ ] Instance stored for debugging
- [ ] Semantic HTML structure
- [ ] Accessible markup

## Final Validation Commands

```bash
# Complete validation suite
npm run build
npm run preview

# Check bundle sizes
ls -lh dist/assets/

# Manual validation checklist above
# All items must pass before marking complete
```