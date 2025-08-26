# Execute Tom-Select PRP

Implement a Tom-Select feature using the specified PRP file.

## PRP File: $ARGUMENTS

## Execution Process

### 1. **Load PRP & Context Gathering**
   - Read the specified PRP file completely
   - Understand all requirements and success criteria
   - Review referenced documentation and codebase patterns
   - Ensure all necessary context is available:
     - Tom-Select configuration options
     - Tailwind CSS classes needed
     - Vite build requirements
     - Browser compatibility targets
   - Perform additional research if needed:
     - WebSearch for Tom-Select examples
     - Review existing implementations in src/main.js
     - Check Tailwind documentation for utilities

### 2. **ULTRATHINK - Planning Phase**
   - Analyze the feature requirements comprehensively
   - Break down implementation into atomic tasks:
     - HTML structure creation
     - JavaScript initialization
     - Styling implementation
     - Event handling setup
     - Testing preparation
   - Use TodoWrite tool to create implementation plan with clear milestones
   - Identify patterns from existing codebase to maintain consistency
   - Consider edge cases and error scenarios
   - Plan validation strategy for each component

### 3. **Execute Implementation**
   
   #### Phase 1: Setup & Structure
   - Create/modify HTML structure with semantic markup
   - Add proper Tailwind classes for styling
   - Include accessibility attributes (ARIA labels, roles)
   
   #### Phase 2: Core Implementation
   - Implement Tom-Select initialization in src/main.js
   - Configure all required options and plugins
   - Add event handlers and callbacks
   - Implement custom render functions if needed
   
   #### Phase 3: Styling & Polish
   - Add custom styles to src/style.css if required
   - Ensure responsive design works at all breakpoints
   - Verify visual consistency with existing components
   
   #### Phase 4: Integration
   - Connect with existing features if applicable
   - Add any required API endpoints or data sources
   - Implement error handling and user feedback

### 4. **Validate - Multi-Level Testing**

   #### Level 1: Build Validation
   ```bash
   # Ensure project builds without errors
   npm run build
   
   # Start dev server and check for console errors
   npm run dev
   ```
   
   #### Level 2: Functionality Testing
   - Open http://localhost:5173 in browser
   - Test all interactive features:
     - Dropdown opening/closing
     - Item selection/deselection
     - Search/filter functionality
     - Keyboard navigation (Tab, Arrow keys, Enter, Escape)
     - Mouse interactions
   
   #### Level 3: Cross-Browser Testing
   - Test in Chrome, Firefox, Safari, Edge
   - Verify consistent behavior across browsers
   - Check for browser-specific console errors
   
   #### Level 4: Accessibility Audit
   - Test with keyboard-only navigation
   - Use screen reader (NVDA/JAWS) if available
   - Run Chrome DevTools Lighthouse audit:
     - Target: Accessibility score >90
     - Target: Performance score >90
   
   #### Level 5: Responsive Testing
   - Test at mobile (320px, 375px)
   - Test at tablet (768px)
   - Test at desktop (1024px, 1440px)
   - Verify touch interactions on mobile
   
   #### Level 6: Performance Validation
   ```bash
   # Check production bundle size
   npm run build
   ls -lh dist/assets/*.js
   # Should be <500KB total
   
   # Run Lighthouse performance audit
   # Target: First Contentful Paint <2s
   # Target: Time to Interactive <3s
   ```

### 5. **Fix & Iterate**
   - If any validation fails:
     - Read error messages carefully
     - Consult PRP for gotchas and anti-patterns
     - Fix the issue at its root cause
     - Re-run ALL validation steps
   - Common issues to check:
     - DOM not ready before initialization
     - Missing escape() in render functions
     - Incorrect Tailwind class names
     - Missing accessibility attributes
     - Browser-specific quirks

### 6. **Complete - Final Verification**

   #### Checklist Verification
   - [ ] All PRP success criteria met
   - [ ] Feature works in all target browsers
   - [ ] Keyboard navigation fully functional
   - [ ] Accessibility standards met (WCAG 2.1 AA)
   - [ ] Responsive design verified at all breakpoints
   - [ ] No console errors or warnings
   - [ ] Performance targets achieved
   - [ ] Code follows existing patterns
   - [ ] Error handling implemented
   - [ ] Documentation updated if needed
   
   #### Final Validation Suite
   ```bash
   # Run complete validation
   npm run build && npm run preview
   
   # If tests exist
   npm run test
   
   # Manual verification
   # 1. Test feature end-to-end
   # 2. Verify all edge cases handled
   # 3. Confirm error messages user-friendly
   ```
   
   #### Status Report
   - List all implemented features
   - Note any deviations from PRP
   - Document any discovered issues
   - Provide usage instructions if complex

### 7. **Reference & Documentation**
   - Re-read PRP to ensure nothing missed
   - Update INITIAL.md if new patterns introduced
   - Add comments in code for complex logic
   - Document any workarounds or browser-specific fixes

## Execution Guidelines

### Quality Standards
- **Code Quality**: Follow existing patterns, use consistent formatting
- **Performance**: Optimize for fast load times and smooth interactions
- **Accessibility**: Ensure full keyboard and screen reader support
- **Maintainability**: Write clear, self-documenting code
- **Testing**: Validate thoroughly at each stage

### Common Pitfalls to Avoid
- Initializing Tom-Select before DOM ready
- Forgetting to escape user input in renders
- Using inline styles instead of Tailwind utilities
- Skipping accessibility attributes
- Ignoring mobile responsive requirements
- Not testing in all target browsers
- Overlooking error handling

### Success Metrics
- Zero console errors across all browsers
- Lighthouse scores >90 for Performance and Accessibility
- Feature works identically in all target browsers
- Smooth performance on mobile devices
- All validation commands pass without warnings

Note: If validation fails repeatedly, revisit the PRP for additional context or patterns. Use browser DevTools extensively for debugging. Consider breaking complex features into smaller, testable components.