/**
 * Group Manager utility for Tom-Select Grouped Options
 * Handles group state management, expand/collapse logic, and group selection
 */
export class GroupManager {
  constructor(tomSelect) {
    this.tomSelect = tomSelect;
    this.groupStates = new Map();
    this.expandedGroups = new Set();
    this.groupData = new Map();
    
    // Bind methods to preserve context
    this.toggleGroup = this.toggleGroup.bind(this);
    this.expandGroup = this.expandGroup.bind(this);
    this.collapseGroup = this.collapseGroup.bind(this);
    this.selectAllInGroup = this.selectAllInGroup.bind(this);
  }
  
  /**
   * Initialize group states from the DOM
   */
  initialize() {
    // Parse optgroup structure and build group hierarchy
    this.buildGroupHierarchy();
    
    // Initialize group states based on data attributes
    this.initializeGroupStates();
    
    // Setup event listeners for group interactions
    this.setupGroupEventListeners();
    
    console.log('Group Manager initialized with', this.groupData.size, 'groups');
  }
  
  /**
   * Build hierarchical structure from optgroups
   */
  buildGroupHierarchy() {
    const optgroups = this.tomSelect.control_input.querySelectorAll('optgroup');
    
    optgroups.forEach((optgroup, index) => {
      const label = optgroup.getAttribute('label');
      const level = parseInt(optgroup.getAttribute('data-level')) || 1;
      const expanded = optgroup.getAttribute('data-expanded') !== 'false';
      
      // Create group data structure
      const groupData = {
        id: `group-${index}`,
        label: label,
        level: level,
        expanded: expanded,
        options: Array.from(optgroup.querySelectorAll('option')).map(opt => ({
          value: opt.value,
          text: opt.textContent,
          icon: opt.getAttribute('data-icon'),
          badge: opt.getAttribute('data-badge')
        })),
        parent: this.findParentGroup(optgroup),
        children: [],
        element: optgroup
      };
      
      this.groupData.set(label, groupData);
      
      if (expanded) {
        this.expandedGroups.add(label);
      }
    });
    
    // Build parent-child relationships
    this.buildParentChildRelations();
  }
  
  /**
   * Find parent group for nested optgroups
   */
  findParentGroup(optgroup) {
    const parentOptgroup = optgroup.closest('optgroup:not(:scope)');
    return parentOptgroup ? parentOptgroup.getAttribute('label') : null;
  }
  
  /**
   * Build parent-child relationships between groups
   */
  buildParentChildRelations() {
    this.groupData.forEach((group, groupName) => {
      if (group.parent) {
        const parentGroup = this.groupData.get(group.parent);
        if (parentGroup) {
          parentGroup.children.push(groupName);
        }
      }
    });
  }
  
  /**
   * Initialize group states from DOM attributes
   */
  initializeGroupStates() {
    this.groupData.forEach((group, groupName) => {
      const state = {
        expanded: group.expanded,
        selected: 0,
        total: group.options.length,
        visible: true,
        loading: false
      };
      
      this.groupStates.set(groupName, state);
    });
  }
  
  /**
   * Setup event listeners for group interactions
   */
  setupGroupEventListeners() {
    // Listen for dropdown events to setup group UI
    this.tomSelect.on('dropdown_open', () => {
      this.updateGroupUI();
      this.setupGroupClickHandlers();
    });
    
    // Listen for selection changes
    this.tomSelect.on('item_add', (value) => {
      this.updateGroupSelectionState(value, true);
    });
    
    this.tomSelect.on('item_remove', (value) => {
      this.updateGroupSelectionState(value, false);
    });
  }
  
  /**
   * Setup click handlers for group elements in dropdown
   */
  setupGroupClickHandlers() {
    const dropdown = this.tomSelect.dropdown;
    if (!dropdown) return;
    
    // Handle group header clicks for expand/collapse
    dropdown.addEventListener('click', (e) => {
      const header = e.target.closest('.optgroup-header');
      if (header) {
        e.preventDefault();
        e.stopPropagation();
        
        const groupName = header.getAttribute('data-group');
        if (groupName) {
          this.toggleGroup(groupName);
        }
      }
      
      // Handle "Select All" button clicks
      const selectAllBtn = e.target.closest('.select-group');
      if (selectAllBtn) {
        e.preventDefault();
        e.stopPropagation();
        
        const groupName = selectAllBtn.getAttribute('data-group');
        if (groupName) {
          this.selectAllInGroup(groupName);
        }
      }
    });
    
    // Handle keyboard events for group navigation
    dropdown.addEventListener('keydown', (e) => {
      this.handleGroupKeyboard(e);
    });
  }
  
  /**
   * Toggle group expand/collapse state
   */
  toggleGroup(groupName) {
    const isExpanded = this.expandedGroups.has(groupName);
    
    if (isExpanded) {
      this.collapseGroup(groupName);
    } else {
      this.expandGroup(groupName);
    }
    
    // Update group state
    const state = this.groupStates.get(groupName);
    if (state) {
      state.expanded = !isExpanded;
    }
    
    // Announce to screen reader
    const action = isExpanded ? 'collapsed' : 'expanded';
    this.announce(`Group ${groupName} ${action}`);
  }
  
  /**
   * Expand a group with animation
   */
  expandGroup(groupName, animate = true) {
    this.expandedGroups.add(groupName);
    
    const groupElement = this.findGroupElement(groupName);
    if (!groupElement) return;
    
    const content = groupElement.querySelector('.optgroup-content');
    const header = groupElement.querySelector('.optgroup-header');
    const toggle = header?.querySelector('.expand-toggle');
    
    // Update classes
    groupElement.classList.add('expanded');
    groupElement.classList.remove('collapsed');
    
    if (header) {
      header.setAttribute('aria-expanded', 'true');
    }
    
    if (toggle) {
      toggle.classList.add('expanded');
    }
    
    // Animate expansion
    if (animate && content) {
      // Set max-height for smooth animation
      content.style.maxHeight = content.scrollHeight + 'px';
      
      // Remove max-height after animation
      setTimeout(() => {
        content.style.maxHeight = '';
      }, 300);
    }
    
    console.log(`Expanded group: ${groupName}`);
  }
  
  /**
   * Collapse a group with animation
   */
  collapseGroup(groupName, animate = true) {
    this.expandedGroups.delete(groupName);
    
    const groupElement = this.findGroupElement(groupName);
    if (!groupElement) return;
    
    const content = groupElement.querySelector('.optgroup-content');
    const header = groupElement.querySelector('.optgroup-header');
    const toggle = header?.querySelector('.expand-toggle');
    
    // Update classes
    groupElement.classList.add('collapsed');
    groupElement.classList.remove('expanded');
    
    if (header) {
      header.setAttribute('aria-expanded', 'false');
    }
    
    if (toggle) {
      toggle.classList.remove('expanded');
    }
    
    // Animate collapse
    if (animate && content) {
      // Set current height then animate to 0
      content.style.maxHeight = content.scrollHeight + 'px';
      requestAnimationFrame(() => {
        content.style.maxHeight = '0px';
      });
    }
    
    console.log(`Collapsed group: ${groupName}`);
  }
  
  /**
   * Select all options in a group
   */
  selectAllInGroup(groupName) {
    const group = this.groupData.get(groupName);
    if (!group) return;
    
    let addedCount = 0;
    
    // Add all options in group (including nested groups)
    const allOptions = this.getOptionsInGroup(groupName, true);
    
    allOptions.forEach(option => {
      if (!this.tomSelect.items.includes(option.value)) {
        this.tomSelect.addItem(option.value, true); // Silent add
        addedCount++;
      }
    });
    
    // Update selection counter
    this.updateGroupSelectionCounts();
    
    // Announce action
    this.announce(`Selected ${addedCount} items from group ${groupName}`);
    
    console.log(`Selected all in group: ${groupName}, added: ${addedCount}`);
  }
  
  /**
   * Get all options in a group (with optional nesting)
   */
  getOptionsInGroup(groupName, includeNested = false) {
    const group = this.groupData.get(groupName);
    if (!group) return [];
    
    let options = [...group.options];
    
    // Include nested group options
    if (includeNested && group.children.length > 0) {
      group.children.forEach(childGroupName => {
        options.push(...this.getOptionsInGroup(childGroupName, true));
      });
    }
    
    return options;
  }
  
  /**
   * Update group selection state when items are added/removed
   */
  updateGroupSelectionState(value, isSelected) {
    // Find which group this option belongs to
    const groupName = this.findGroupForOption(value);
    if (!groupName) return;
    
    const state = this.groupStates.get(groupName);
    if (!state) return;
    
    // Update selection count
    if (isSelected) {
      state.selected = Math.min(state.selected + 1, state.total);
    } else {
      state.selected = Math.max(state.selected - 1, 0);
    }
    
    // Update group header indicators
    this.updateGroupHeader(groupName);
  }
  
  /**
   * Find which group contains a specific option
   */
  findGroupForOption(value) {
    for (const [groupName, group] of this.groupData) {
      if (group.options.some(opt => opt.value === value)) {
        return groupName;
      }
    }
    return null;
  }
  
  /**
   * Update group header with selection indicators
   */
  updateGroupHeader(groupName) {
    const state = this.groupStates.get(groupName);
    const header = this.findGroupHeader(groupName);
    
    if (!state || !header) return;
    
    // Update selection indicator
    const indicator = header.querySelector('.group-indicator');
    if (indicator) {
      header.classList.remove('has-selection', 'partial-selection', 'no-selection');
      
      if (state.selected === 0) {
        header.classList.add('no-selection');
      } else if (state.selected === state.total) {
        header.classList.add('has-selection');
      } else {
        header.classList.add('partial-selection');
      }
    }
    
    // Update count display
    const countElement = header.querySelector('.group-count');
    if (countElement) {
      countElement.textContent = `(${state.selected}/${state.total})`;
    }
  }
  
  /**
   * Update all group selection counts
   */
  updateGroupSelectionCounts() {
    this.groupData.forEach((group, groupName) => {
      const selectedCount = group.options.filter(opt => 
        this.tomSelect.items.includes(opt.value)
      ).length;
      
      const state = this.groupStates.get(groupName);
      if (state) {
        state.selected = selectedCount;
        this.updateGroupHeader(groupName);
      }
    });
  }
  
  /**
   * Update group UI when dropdown opens
   */
  updateGroupUI() {
    // Update all group states and headers
    this.updateGroupSelectionCounts();
    
    // Ensure expanded groups are properly displayed
    this.expandedGroups.forEach(groupName => {
      this.expandGroup(groupName, false); // No animation on initial display
    });
  }
  
  /**
   * Handle keyboard navigation within groups
   */
  handleGroupKeyboard(e) {
    const focused = e.target.closest('[role="treeitem"]');
    if (!focused) return;
    
    const { key } = e;
    
    switch (key) {
      case 'ArrowRight':
        e.preventDefault();
        const groupToExpand = focused.closest('.optgroup-header')?.getAttribute('data-group');
        if (groupToExpand) {
          this.expandGroup(groupToExpand);
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        const groupToCollapse = focused.closest('.optgroup-header')?.getAttribute('data-group');
        if (groupToCollapse) {
          this.collapseGroup(groupToCollapse);
        }
        break;
        
      case ' ':
      case 'Enter':
        e.preventDefault();
        const header = focused.closest('.optgroup-header');
        if (header) {
          const groupName = header.getAttribute('data-group');
          if (groupName) {
            if (key === ' ') {
              this.toggleGroup(groupName);
            } else {
              // Enter key on group header selects all
              this.selectAllInGroup(groupName);
            }
          }
        }
        break;
    }
  }
  
  /**
   * Expand all groups
   */
  expandAll() {
    this.groupData.forEach((group, groupName) => {
      this.expandGroup(groupName);
    });
    
    this.announce('All groups expanded');
  }
  
  /**
   * Collapse all groups
   */
  collapseAll() {
    this.groupData.forEach((group, groupName) => {
      this.collapseGroup(groupName);
    });
    
    this.announce('All groups collapsed');
  }
  
  /**
   * Filter groups based on search query
   */
  filterGroups(query) {
    if (!query || query.trim() === '') {
      // Show all groups when no search
      this.groupData.forEach((group, groupName) => {
        this.setGroupVisibility(groupName, true);
      });
      return;
    }
    
    const searchTerm = query.toLowerCase();
    
    this.groupData.forEach((group, groupName) => {
      // Check if group name matches
      const groupMatches = group.label.toLowerCase().includes(searchTerm);
      
      // Check if any options match
      const optionMatches = group.options.some(opt => 
        opt.text.toLowerCase().includes(searchTerm) ||
        opt.value.toLowerCase().includes(searchTerm)
      );
      
      const shouldShow = groupMatches || optionMatches;
      this.setGroupVisibility(groupName, shouldShow);
      
      // Auto-expand groups with matches
      if (shouldShow && optionMatches) {
        this.expandGroup(groupName);
      }
    });
  }
  
  /**
   * Set group visibility
   */
  setGroupVisibility(groupName, visible) {
    const groupElement = this.findGroupElement(groupName);
    if (groupElement) {
      groupElement.style.display = visible ? '' : 'none';
      groupElement.setAttribute('aria-hidden', (!visible).toString());
    }
    
    const state = this.groupStates.get(groupName);
    if (state) {
      state.visible = visible;
    }
  }
  
  /**
   * Find group element in dropdown
   */
  findGroupElement(groupName) {
    const dropdown = this.tomSelect.dropdown;
    return dropdown?.querySelector(`[data-group="${groupName}"]`);
  }
  
  /**
   * Find group header element
   */
  findGroupHeader(groupName) {
    const dropdown = this.tomSelect.dropdown;
    return dropdown?.querySelector(`.optgroup-header[data-group="${groupName}"]`);
  }
  
  /**
   * Get group statistics
   */
  getStats() {
    const stats = {
      totalGroups: this.groupData.size,
      expandedGroups: this.expandedGroups.size,
      collapsedGroups: this.groupData.size - this.expandedGroups.size,
      totalOptions: 0,
      selectedOptions: 0,
      groupStates: Object.fromEntries(this.groupStates)
    };
    
    this.groupData.forEach(group => {
      stats.totalOptions += group.options.length;
    });
    
    stats.selectedOptions = this.tomSelect.items.length;
    
    return stats;
  }
  
  /**
   * Announce to screen readers
   */
  announce(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
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
    this.groupStates.clear();
    this.expandedGroups.clear();
    this.groupData.clear();
    
    console.log('Group Manager destroyed');
  }
}