/**
 * Tree Navigation utility for Tom-Select Grouped Options
 * Handles keyboard navigation, focus management, and ARIA support
 */
export class TreeNavigation {
  constructor(tomSelect) {
    this.tomSelect = tomSelect;
    this.currentFocus = null;
    this.visibleItems = [];
    this.focusHistory = [];
    this.navigationMap = new Map();
    
    // Bind methods to preserve context
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.updateVisibleItems = this.updateVisibleItems.bind(this);
    this.focusItem = this.focusItem.bind(this);
  }
  
  /**
   * Initialize tree navigation
   */
  initialize() {
    this.setupEventListeners();
    this.setupFocusManagement();
    
    console.log('Tree Navigation initialized');
  }
  
  /**
   * Setup event listeners for keyboard navigation
   */
  setupEventListeners() {
    // Listen for dropdown open to setup navigation
    this.tomSelect.on('dropdown_open', () => {
      this.updateVisibleItems();
      this.setupDropdownKeyboard();
      this.focusFirstItem();
    });
    
    // Listen for dropdown close to cleanup
    this.tomSelect.on('dropdown_close', () => {
      this.currentFocus = null;
    });
    
    // Listen for search events to update navigation
    this.tomSelect.on('type', () => {
      // Update visible items after search
      setTimeout(() => {
        this.updateVisibleItems();
      }, 10);
    });
  }
  
  /**
   * Setup keyboard event handling for dropdown
   */
  setupDropdownKeyboard() {
    const dropdown = this.tomSelect.dropdown;
    if (!dropdown) return;
    
    // Remove existing listeners to prevent duplicates
    dropdown.removeEventListener('keydown', this.handleKeyDown);
    
    // Add keyboard event listener
    dropdown.addEventListener('keydown', this.handleKeyDown);
    
    // Setup focus trap
    this.setupFocusTrap(dropdown);
  }
  
  /**
   * Setup focus trap to keep focus within dropdown
   */
  setupFocusTrap(dropdown) {
    const focusableElements = dropdown.querySelectorAll(
      '[role="treeitem"], button, [tabindex="0"]'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    dropdown.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    });
  }
  
  /**
   * Handle keyboard navigation
   */
  handleKeyDown(e) {
    const { key, ctrlKey, metaKey } = e;
    
    // Don't interfere with Tom-Select's built-in navigation for basic keys
    if (this.isBasicNavigationKey(key)) {
      return;
    }
    
    switch (key) {
      case 'ArrowDown':
        e.preventDefault();
        this.focusNext();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.focusPrevious();
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        this.handleArrowRight();
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        this.handleArrowLeft();
        break;
        
      case 'Home':
        e.preventDefault();
        this.focusFirst();
        break;
        
      case 'End':
        e.preventDefault();
        this.focusLast();
        break;
        
      case 'PageDown':
        e.preventDefault();
        this.focusPageDown();
        break;
        
      case 'PageUp':
        e.preventDefault();
        this.focusPageUp();
        break;
        
      case 'Enter':
        e.preventDefault();
        this.activateCurrentItem();
        break;
        
      case ' ':
        e.preventDefault();
        this.toggleCurrentItem();
        break;
        
      case 'Escape':
        e.preventDefault();
        this.tomSelect.close();
        break;
        
      case 'a':
      case 'A':
        if (ctrlKey || metaKey) {
          e.preventDefault();
          this.selectAllInCurrentGroup();
        }
        break;
        
      // Letter navigation for quick search
      default:
        if (this.isLetterKey(key)) {
          this.handleLetterNavigation(key);
        }
        break;
    }
  }
  
  /**
   * Check if key is a basic navigation key handled by Tom-Select
   */
  isBasicNavigationKey(key) {
    return ['Tab', 'Shift'].includes(key);
  }
  
  /**
   * Check if key is a letter for quick navigation
   */
  isLetterKey(key) {
    return key.length === 1 && /[a-zA-Z0-9]/.test(key);
  }
  
  /**
   * Update list of visible items for navigation
   */
  updateVisibleItems() {
    const dropdown = this.tomSelect.dropdown;
    if (!dropdown) return;
    
    // Get all visible tree items (groups and options)
    this.visibleItems = Array.from(
      dropdown.querySelectorAll('[role="treeitem"]:not([aria-hidden="true"])')
    ).filter(item => {
      // Check if item is actually visible (not in collapsed group)
      return this.isItemVisible(item);
    });
    
    // Build navigation map for efficient lookups
    this.buildNavigationMap();
    
    console.log(`Updated visible items: ${this.visibleItems.length} items`);
  }
  
  /**
   * Check if item is visible (considering collapsed groups)
   */
  isItemVisible(item) {
    let parent = item.parentElement;
    
    while (parent && parent !== this.tomSelect.dropdown) {
      if (parent.classList.contains('optgroup') && parent.classList.contains('collapsed')) {
        return false;
      }
      if (parent.style.display === 'none' || parent.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      parent = parent.parentElement;
    }
    
    return item.style.display !== 'none' && item.getAttribute('aria-hidden') !== 'true';
  }
  
  /**
   * Build navigation map for efficient tree traversal
   */
  buildNavigationMap() {
    this.navigationMap.clear();
    
    this.visibleItems.forEach((item, index) => {
      const level = parseInt(item.getAttribute('aria-level')) || 1;
      const isGroup = item.classList.contains('optgroup-header');
      
      this.navigationMap.set(item, {
        index: index,
        level: level,
        isGroup: isGroup,
        parent: this.findParentItem(item),
        children: this.findChildItems(item),
        siblings: this.findSiblingItems(item, level)
      });
    });
  }
  
  /**
   * Find parent item in tree structure
   */
  findParentItem(item) {
    const itemLevel = parseInt(item.getAttribute('aria-level')) || 1;
    const itemIndex = this.visibleItems.indexOf(item);
    
    for (let i = itemIndex - 1; i >= 0; i--) {
      const candidate = this.visibleItems[i];
      const candidateLevel = parseInt(candidate.getAttribute('aria-level')) || 1;
      
      if (candidateLevel < itemLevel) {
        return candidate;
      }
    }
    
    return null;
  }
  
  /**
   * Find child items in tree structure
   */
  findChildItems(item) {
    const itemLevel = parseInt(item.getAttribute('aria-level')) || 1;
    const itemIndex = this.visibleItems.indexOf(item);
    const children = [];
    
    for (let i = itemIndex + 1; i < this.visibleItems.length; i++) {
      const candidate = this.visibleItems[i];
      const candidateLevel = parseInt(candidate.getAttribute('aria-level')) || 1;
      
      if (candidateLevel <= itemLevel) {
        break; // No more children
      }
      
      if (candidateLevel === itemLevel + 1) {
        children.push(candidate);
      }
    }
    
    return children;
  }
  
  /**
   * Find sibling items at same level
   */
  findSiblingItems(item, level) {
    return this.visibleItems.filter(candidate => {
      const candidateLevel = parseInt(candidate.getAttribute('aria-level')) || 1;
      return candidateLevel === level && candidate !== item;
    });
  }
  
  /**
   * Focus next item in navigation order
   */
  focusNext() {
    this.updateVisibleItems();
    
    if (this.visibleItems.length === 0) return;
    
    const currentIndex = this.currentFocus 
      ? this.visibleItems.indexOf(this.currentFocus)
      : -1;
      
    const nextIndex = currentIndex < this.visibleItems.length - 1 
      ? currentIndex + 1 
      : 0; // Wrap to first
      
    this.focusItem(this.visibleItems[nextIndex]);
  }
  
  /**
   * Focus previous item in navigation order
   */
  focusPrevious() {
    this.updateVisibleItems();
    
    if (this.visibleItems.length === 0) return;
    
    const currentIndex = this.currentFocus 
      ? this.visibleItems.indexOf(this.currentFocus)
      : 0;
      
    const prevIndex = currentIndex > 0 
      ? currentIndex - 1 
      : this.visibleItems.length - 1; // Wrap to last
      
    this.focusItem(this.visibleItems[prevIndex]);
  }
  
  /**
   * Focus first visible item
   */
  focusFirst() {
    this.updateVisibleItems();
    if (this.visibleItems.length > 0) {
      this.focusItem(this.visibleItems[0]);
    }
  }
  
  /**
   * Focus last visible item
   */
  focusLast() {
    this.updateVisibleItems();
    if (this.visibleItems.length > 0) {
      this.focusItem(this.visibleItems[this.visibleItems.length - 1]);
    }
  }
  
  /**
   * Focus first item when dropdown opens
   */
  focusFirstItem() {
    setTimeout(() => {
      this.updateVisibleItems();
      
      // Try to focus first expanded group or first option
      const firstVisible = this.visibleItems.find(item => {
        return !item.closest('.collapsed');
      });
      
      if (firstVisible) {
        this.focusItem(firstVisible);
      }
    }, 50); // Small delay to ensure DOM is ready
  }
  
  /**
   * Focus item with proper ARIA and visual feedback
   */
  focusItem(item) {
    if (!item || !this.isItemVisible(item)) return;
    
    // Remove focus from current item
    if (this.currentFocus) {
      this.currentFocus.setAttribute('tabindex', '-1');
      this.currentFocus.classList.remove('focused');
    }
    
    // Set focus on new item
    item.setAttribute('tabindex', '0');
    item.classList.add('focused');
    item.focus();
    
    // Store current focus
    this.currentFocus = item;
    
    // Add to focus history
    this.focusHistory.push(item);
    if (this.focusHistory.length > 20) {
      this.focusHistory.shift(); // Keep history manageable
    }
    
    // Scroll into view if needed
    this.scrollIntoView(item);
    
    // Announce current item to screen readers
    this.announceCurrentItem(item);
  }
  
  /**
   * Handle right arrow key (expand group or move to child)
   */
  handleArrowRight() {
    if (!this.currentFocus) return;
    
    const navInfo = this.navigationMap.get(this.currentFocus);
    if (!navInfo) return;
    
    if (navInfo.isGroup) {
      // Expand group if it's collapsed
      const groupName = this.currentFocus.getAttribute('data-group');
      if (groupName && this.tomSelect.groupManager) {
        const isExpanded = this.currentFocus.getAttribute('aria-expanded') === 'true';
        if (!isExpanded) {
          this.tomSelect.groupManager.expandGroup(groupName);
          this.updateVisibleItems();
          return;
        }
      }
    }
    
    // Move to first child if expanded group
    if (navInfo.children.length > 0) {
      this.focusItem(navInfo.children[0]);
    }
  }
  
  /**
   * Handle left arrow key (collapse group or move to parent)
   */
  handleArrowLeft() {
    if (!this.currentFocus) return;
    
    const navInfo = this.navigationMap.get(this.currentFocus);
    if (!navInfo) return;
    
    if (navInfo.isGroup) {
      // Collapse group if it's expanded
      const groupName = this.currentFocus.getAttribute('data-group');
      if (groupName && this.tomSelect.groupManager) {
        const isExpanded = this.currentFocus.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
          this.tomSelect.groupManager.collapseGroup(groupName);
          this.updateVisibleItems();
          return;
        }
      }
    }
    
    // Move to parent
    if (navInfo.parent) {
      this.focusItem(navInfo.parent);
    }
  }
  
  /**
   * Focus page down (10 items or to last)
   */
  focusPageDown() {
    this.updateVisibleItems();
    
    if (this.visibleItems.length === 0) return;
    
    const currentIndex = this.currentFocus 
      ? this.visibleItems.indexOf(this.currentFocus)
      : 0;
      
    const targetIndex = Math.min(currentIndex + 10, this.visibleItems.length - 1);
    this.focusItem(this.visibleItems[targetIndex]);
  }
  
  /**
   * Focus page up (10 items or to first)
   */
  focusPageUp() {
    this.updateVisibleItems();
    
    if (this.visibleItems.length === 0) return;
    
    const currentIndex = this.currentFocus 
      ? this.visibleItems.indexOf(this.currentFocus)
      : 0;
      
    const targetIndex = Math.max(currentIndex - 10, 0);
    this.focusItem(this.visibleItems[targetIndex]);
  }
  
  /**
   * Activate current item (select option or toggle group)
   */
  activateCurrentItem() {
    if (!this.currentFocus) return;
    
    const navInfo = this.navigationMap.get(this.currentFocus);
    if (!navInfo) return;
    
    if (navInfo.isGroup) {
      // Toggle group expansion
      const groupName = this.currentFocus.getAttribute('data-group');
      if (groupName && this.tomSelect.groupManager) {
        this.tomSelect.groupManager.toggleGroup(groupName);
        this.updateVisibleItems();
      }
    } else {
      // Select/deselect option
      const optionValue = this.currentFocus.getAttribute('data-value');
      if (optionValue) {
        if (this.tomSelect.items.includes(optionValue)) {
          this.tomSelect.removeItem(optionValue);
        } else {
          this.tomSelect.addItem(optionValue);
        }
      }
    }
  }
  
  /**
   * Toggle current item (space key behavior)
   */
  toggleCurrentItem() {
    if (!this.currentFocus) return;
    
    const navInfo = this.navigationMap.get(this.currentFocus);
    if (!navInfo) return;
    
    if (navInfo.isGroup) {
      // Space on group header toggles expansion
      const groupName = this.currentFocus.getAttribute('data-group');
      if (groupName && this.tomSelect.groupManager) {
        this.tomSelect.groupManager.toggleGroup(groupName);
        this.updateVisibleItems();
      }
    } else {
      // Space on option toggles selection
      this.activateCurrentItem();
    }
  }
  
  /**
   * Select all items in current group (Ctrl+A)
   */
  selectAllInCurrentGroup() {
    if (!this.currentFocus) return;
    
    // Find the group this item belongs to
    let groupHeader = this.currentFocus;
    
    if (!groupHeader.classList.contains('optgroup-header')) {
      // Find parent group
      const navInfo = this.navigationMap.get(this.currentFocus);
      groupHeader = navInfo?.parent;
      
      while (groupHeader && !groupHeader.classList.contains('optgroup-header')) {
        const parentNavInfo = this.navigationMap.get(groupHeader);
        groupHeader = parentNavInfo?.parent;
      }
    }
    
    if (groupHeader) {
      const groupName = groupHeader.getAttribute('data-group');
      if (groupName && this.tomSelect.groupManager) {
        this.tomSelect.groupManager.selectAllInGroup(groupName);
      }
    }
  }
  
  /**
   * Handle letter navigation for quick item search
   */
  handleLetterNavigation(letter) {
    this.updateVisibleItems();
    
    const currentIndex = this.currentFocus 
      ? this.visibleItems.indexOf(this.currentFocus)
      : -1;
    
    // Search from current position forward, then wrap around
    const searchItems = [
      ...this.visibleItems.slice(currentIndex + 1),
      ...this.visibleItems.slice(0, currentIndex + 1)
    ];
    
    const matchingItem = searchItems.find(item => {
      const text = item.textContent || '';
      return text.toLowerCase().startsWith(letter.toLowerCase());
    });
    
    if (matchingItem) {
      this.focusItem(matchingItem);
    }
  }
  
  /**
   * Scroll item into view if needed
   */
  scrollIntoView(item) {
    const dropdown = this.tomSelect.dropdown;
    if (!dropdown || !item) return;
    
    const dropdownRect = dropdown.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    
    const isAbove = itemRect.top < dropdownRect.top;
    const isBelow = itemRect.bottom > dropdownRect.bottom;
    
    if (isAbove || isBelow) {
      item.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }
  
  /**
   * Announce current item to screen readers
   */
  announceCurrentItem(item) {
    const navInfo = this.navigationMap.get(item);
    if (!navInfo) return;
    
    let announcement = '';
    const itemText = item.textContent?.trim() || '';
    
    if (navInfo.isGroup) {
      const isExpanded = item.getAttribute('aria-expanded') === 'true';
      const state = isExpanded ? 'expanded' : 'collapsed';
      announcement = `Group ${itemText}, level ${navInfo.level}, ${state}`;
    } else {
      const isSelected = this.tomSelect.items.includes(item.getAttribute('data-value'));
      const selectionState = isSelected ? 'selected' : 'not selected';
      announcement = `Option ${itemText}, level ${navInfo.level}, ${selectionState}`;
    }
    
    this.announce(announcement);
  }
  
  /**
   * Setup focus management
   */
  setupFocusManagement() {
    // Ensure proper tabindex management
    this.updateTabIndices();
  }
  
  /**
   * Update tabindex attributes for proper focus flow
   */
  updateTabIndices() {
    this.updateVisibleItems();
    
    // Set all items to tabindex="-1" except focused item
    this.visibleItems.forEach(item => {
      item.setAttribute('tabindex', item === this.currentFocus ? '0' : '-1');
    });
  }
  
  /**
   * Get navigation statistics
   */
  getStats() {
    return {
      visibleItems: this.visibleItems.length,
      currentFocus: this.currentFocus ? {
        text: this.currentFocus.textContent?.trim(),
        level: this.currentFocus.getAttribute('aria-level'),
        isGroup: this.currentFocus.classList.contains('optgroup-header')
      } : null,
      focusHistoryLength: this.focusHistory.length,
      navigationMapSize: this.navigationMap.size
    };
  }
  
  /**
   * Announce to screen readers
   */
  announce(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.classList.add('sr-only');
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  }
  
  /**
   * Cleanup when destroying
   */
  destroy() {
    if (this.tomSelect.dropdown) {
      this.tomSelect.dropdown.removeEventListener('keydown', this.handleKeyDown);
    }
    
    this.currentFocus = null;
    this.visibleItems = [];
    this.focusHistory = [];
    this.navigationMap.clear();
    
    console.log('Tree Navigation destroyed');
  }
}