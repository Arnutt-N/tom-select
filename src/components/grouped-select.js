/**
 * Grouped Select Component for Tom-Select
 * Provides hierarchical grouped options with expand/collapse, keyboard navigation, and accessibility
 */
import TomSelect from 'tom-select';
import { GroupManager } from '../utils/group-manager.js';
import { TreeNavigation } from '../utils/tree-navigation.js';

export class GroupedSelect {
  constructor(selector, options = {}) {
    this.selector = selector;
    this.element = document.querySelector(selector);
    
    if (!this.element) {
      throw new Error(`Element ${selector} not found`);
    }
    
    // Initialize options with defaults
    this.options = {
      // Group behavior settings
      collapsibleGroups: true,
      defaultExpanded: false,
      multiLevelGroups: true,
      groupSelection: true,
      searchOptgroups: true,
      
      // Performance settings
      maxOptions: 200,
      loadThrottle: 300,
      
      // Merge with user options
      ...options
    };
    
    // Initialize state
    this.groupManager = null;
    this.treeNavigation = null;
    this.tomselect = null;
    this.initialized = false;
    this.searchQuery = '';
    
    // Initialize the component
    this.init();
  }
  
  /**
   * Initialize the grouped select component
   */
  init() {
    try {
      // Build Tom-Select configuration
      const config = this.buildTomSelectConfig();
      
      // Initialize Tom-Select with grouped configuration
      this.tomselect = new TomSelect(this.selector, config);
      
      // Initialize group manager and tree navigation
      this.initializeManagers();
      
      // Setup external controls
      this.setupExternalControls();
      
      // Mark as initialized
      this.initialized = true;
      
      console.log('Grouped Select initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Grouped Tom-Select:', error);
      this.element.style.display = 'block'; // Fallback to native
      throw error;
    }
  }
  
  /**
   * Build Tom-Select configuration with grouped options support
   */
  buildTomSelectConfig() {
    const self = this;
    
    return {
      // Core settings
      maxItems: null, // Allow multiple selections
      create: false,
      sortField: null, // Preserve group order
      searchField: ['text', 'optgroup'],
      
      // Group-specific settings
      optgroupField: 'optgroup',
      optgroupLabelField: 'label',
      optgroupValueField: 'value',
      
      // UI Behavior
      openOnFocus: false,
      hideSelected: false,
      closeAfterSelect: false,
      selectOnTab: true,
      placeholder: this.element.getAttribute('placeholder') || 'Choose from organized categories...',
      
      // Performance
      loadThrottle: this.options.loadThrottle,
      maxOptions: this.options.maxOptions,
      
      // Plugins
      plugins: {
        'remove_button': {}
      },
      
      // Custom rendering for groups
      render: {
        optgroup_header: function(data, escape) {
          return self.renderGroupHeader(data, escape);
        },
        
        optgroup: function(data, escape) {
          return self.renderGroup(data, escape);
        },
        
        option: function(data, escape) {
          return self.renderOption(data, escape);
        },
        
        item: function(data, escape) {
          return self.renderSelectedItem(data, escape);
        },
        
        no_results: function(data, escape) {
          return self.renderNoResults(data, escape);
        }
      },
      
      // Event handlers
      onInitialize: function() {
        // Store instance reference when Tom-Select calls this
        self.tomselect = this;
        self.onInitialize();
      },
      
      onDropdownOpen: function($dropdown) {
        self.onDropdownOpen($dropdown);
      },
      
      onDropdownClose: function($dropdown) {
        self.onDropdownClose($dropdown);
      },
      
      onItemAdd: function(value, $item) {
        self.onItemAdd(value, $item);
      },
      
      onItemRemove: function(value) {
        self.onItemRemove(value);
      },
      
      onChange: function(value) {
        self.onChange(value);
      },
      
      onType: function(str) {
        self.onType(str);
      },
      
      onFocus: function() {
        self.onFocus();
      },
      
      onBlur: function() {
        self.onBlur();
      }
    };
  }
  
  /**
   * Initialize group manager and tree navigation
   */
  initializeManagers() {
    // Initialize Group Manager
    this.groupManager = new GroupManager(this.tomselect);
    this.groupManager.initialize();
    
    // Initialize Tree Navigation
    this.treeNavigation = new TreeNavigation(this.tomselect);
    this.treeNavigation.initialize();
    
    // Store references for easy access
    this.tomselect.groupManager = this.groupManager;
    this.tomselect.treeNavigation = this.treeNavigation;
  }
  
  /**
   * Render group header with expand/collapse toggle
   */
  renderGroupHeader(data, escape) {
    if (!data || !data.label) return '';
    
    const count = data.options ? data.options.length : 0;
    const expanded = data.expanded !== false;
    const level = data.level || 1;
    const groupId = `group-${escape(data.label.replace(/\s+/g, '-'))}`;
    
    return `
      <div class="optgroup-header flex items-center justify-between p-3 cursor-pointer bg-gray-100 hover:bg-gray-200 border-b border-gray-200"
           data-group="${escape(data.label)}"
           role="treeitem"
           aria-expanded="${expanded}"
           aria-level="${level}"
           aria-labelledby="${groupId}"
           tabindex="0">
        <div class="flex items-center">
          <div class="group-indicator w-2 h-2 rounded-full mr-2 bg-gray-300"></div>
          <button class="expand-toggle p-1 rounded hover:bg-gray-200 transition-all duration-200 mr-2"
                  aria-label="${expanded ? 'Collapse' : 'Expand'} group">
            <svg class="w-4 h-4 transition-transform duration-300 ease-in-out ${expanded ? 'rotate-90' : ''}" 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 5l7 7-7 7"/>
            </svg>
          </button>
          <span id="${groupId}" class="font-medium text-gray-800">${escape(data.label)}</span>
          <span class="group-count ml-2 text-sm text-gray-500">(${count})</span>
        </div>
        ${this.options.groupSelection ? `
          <button class="select-group text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-100 transition-colors duration-200"
                  data-group="${escape(data.label)}"
                  aria-label="Select all in ${escape(data.label)}"
                  tabindex="-1">
            Select All
          </button>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Render group container with content
   */
  renderGroup(data, escape) {
    if (!data) return '';
    
    const expanded = data.expanded !== false;
    const groupClass = expanded ? 'expanded' : 'collapsed';
    
    return `
      <div class="optgroup ${groupClass} transition-all duration-300"
           data-group="${escape(data.label)}"
           role="group"
           aria-labelledby="group-${escape(data.label.replace(/\s+/g, '-'))}">
        <div class="optgroup-content transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }">
          ${data.html || ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Render individual option with hierarchical styling
   */
  renderOption(data, escape) {
    if (!data) return '';
    
    const level = data.groupLevel || 2; // Options are typically level 2+
    const indent = (level - 1) * 20; // 20px per level
    const icon = data.icon || '';
    const badge = data.badge || '';
    const selected = this.tomselect && this.tomselect.items.includes(data.value);
    
    return `
      <div class="option-item flex items-center py-2 px-3 cursor-pointer border-l-2 border-transparent hover:bg-blue-50 hover:border-l-blue-500 transition-all duration-150 ${
        selected ? 'bg-blue-100 border-l-blue-600' : ''
      }"
           style="padding-left: ${Math.max(indent + 16, 16)}px"
           role="treeitem"
           aria-level="${level}"
           aria-selected="${selected}"
           data-value="${escape(data.value)}"
           tabindex="-1">
        <div class="option-content flex items-center w-full">
          ${icon ? `<span class="option-icon mr-2 text-base flex-shrink-0">${icon}</span>` : ''}
          <span class="option-text flex-grow text-sm text-gray-900">${escape(data.text)}</span>
          ${badge ? `<span class="option-badge ml-auto px-2 py-1 bg-gray-200 text-xs rounded text-gray-600 font-medium">${escape(badge)}</span>` : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Render selected item in control
   */
  renderSelectedItem(data, escape) {
    if (!data) return '';
    
    const icon = data.icon || '';
    
    return `
      <div class="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium mr-1 mb-1">
        ${icon ? `<span class="mr-1 text-sm">${icon}</span>` : ''}
        <span>${escape(data.text)}</span>
      </div>
    `;
  }
  
  /**
   * Render no results message
   */
  renderNoResults(data, escape) {
    const query = data.input || '';
    
    return `
      <div class="grouped-no-results p-6 text-center text-gray-500">
        <div class="no-results-icon w-12 h-12 mx-auto mb-3 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <div class="no-results-title text-lg font-medium mb-2">
          ${query ? `No results found for "${escape(query)}"` : 'No options available'}
        </div>
        <div class="no-results-subtitle text-sm">
          ${query ? 'Try expanding more groups or adjusting your search terms' : 'All groups appear to be empty'}
        </div>
      </div>
    `;
  }
  
  /**
   * Setup external control buttons
   */
  setupExternalControls() {
    // Expand All button
    const expandAllBtn = document.getElementById('expand-all');
    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.expandAll();
      });
    }
    
    // Collapse All button
    const collapseAllBtn = document.getElementById('collapse-all');
    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.collapseAll();
      });
    }
    
    console.log('External controls setup complete');
  }
  
  // Event handlers
  
  onInitialize() {
    if (!this.tomselect || !this.tomselect.control) {
      console.warn('Grouped Tom-Select instance not properly initialized');
      return;
    }
    
    // Set ARIA attributes for accessibility
    this.tomselect.control.setAttribute('role', 'tree');
    this.tomselect.control.setAttribute('aria-multiselectable', 'true');
    this.tomselect.control.setAttribute('aria-label', 'Hierarchical technology selection');
    
    console.log('Grouped Tom-Select initialized with accessibility support');
  }
  
  onDropdownOpen($dropdown) {
    // Update group UI and focus management
    if (this.groupManager) {
      this.groupManager.updateGroupUI();
    }
    
    if (this.treeNavigation) {
      this.treeNavigation.updateVisibleItems();
      this.treeNavigation.focusFirstItem();
    }
    
    this.updateSelectedCount();
    
    console.log('Grouped dropdown opened');
  }
  
  onDropdownClose($dropdown) {
    console.log('Grouped dropdown closed');
  }
  
  onItemAdd(value, $item) {
    // Update group selection states
    if (this.groupManager) {
      this.groupManager.updateGroupSelectionState(value, true);
    }
    
    this.updateSelectedCount();
    
    // Announce selection to screen reader
    const option = this.tomselect.options[value];
    if (option) {
      this.announce(`Selected ${option.text}`);
    }
  }
  
  onItemRemove(value) {
    // Update group selection states
    if (this.groupManager) {
      this.groupManager.updateGroupSelectionState(value, false);
    }
    
    this.updateSelectedCount();
    
    // Announce removal to screen reader
    const option = this.tomselect.options[value];
    if (option) {
      this.announce(`Removed ${option.text}`);
    }
  }
  
  onChange(value) {
    // Dispatch custom event for integration
    this.element.dispatchEvent(new CustomEvent('grouped-select:change', {
      detail: {
        value: value,
        selectedCount: Array.isArray(value) ? value.length : (value ? 1 : 0),
        groupStats: this.groupManager ? this.groupManager.getStats() : null
      }
    }));
  }
  
  onType(str) {
    this.searchQuery = str;
    
    // Filter groups based on search
    if (this.groupManager && str.length > 0) {
      this.groupManager.filterGroups(str);
    } else if (this.groupManager) {
      // Show all groups when search is cleared
      this.groupManager.filterGroups('');
    }
    
    // Update navigation after search
    if (this.treeNavigation) {
      setTimeout(() => {
        this.treeNavigation.updateVisibleItems();
      }, 10);
    }
  }
  
  onFocus() {
    // Add focused class to wrapper
    this.tomselect.wrapper.classList.add('focused');
  }
  
  onBlur() {
    // Remove focused class from wrapper
    this.tomselect.wrapper.classList.remove('focused');
  }
  
  // Public API methods
  
  /**
   * Expand all groups
   */
  expandAll() {
    if (this.groupManager) {
      this.groupManager.expandAll();
    }
  }
  
  /**
   * Collapse all groups
   */
  collapseAll() {
    if (this.groupManager) {
      this.groupManager.collapseAll();
    }
  }
  
  /**
   * Toggle specific group
   */
  toggleGroup(groupName) {
    if (this.groupManager) {
      this.groupManager.toggleGroup(groupName);
    }
  }
  
  /**
   * Select all items in a group
   */
  selectAllInGroup(groupName) {
    if (this.groupManager) {
      this.groupManager.selectAllInGroup(groupName);
    }
  }
  
  /**
   * Get component statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      selectedItems: this.tomselect ? this.tomselect.items.length : 0,
      searchQuery: this.searchQuery,
      groupStats: this.groupManager ? this.groupManager.getStats() : null,
      navigationStats: this.treeNavigation ? this.treeNavigation.getStats() : null
    };
  }
  
  /**
   * Update selected count display
   */
  updateSelectedCount() {
    const countElement = document.getElementById('grouped-count');
    if (countElement && this.tomselect) {
      const count = this.tomselect.items.length;
      countElement.textContent = `${count} selected`;
    }
  }
  
  /**
   * Focus specific item by value
   */
  focusItem(value) {
    if (this.treeNavigation && this.tomselect.dropdown) {
      const item = this.tomselect.dropdown.querySelector(`[data-value="${value}"]`);
      if (item) {
        this.treeNavigation.focusItem(item);
      }
    }
  }
  
  /**
   * Clear all selections
   */
  clearAll() {
    if (this.tomselect) {
      this.tomselect.clear();
      this.updateSelectedCount();
      this.announce('All selections cleared');
    }
  }
  
  /**
   * Refresh the component
   */
  refresh() {
    if (this.groupManager) {
      this.groupManager.updateGroupUI();
    }
    
    if (this.treeNavigation) {
      this.treeNavigation.updateVisibleItems();
    }
    
    this.updateSelectedCount();
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
   * Destroy the component
   */
  destroy() {
    if (this.groupManager) {
      this.groupManager.destroy();
      this.groupManager = null;
    }
    
    if (this.treeNavigation) {
      this.treeNavigation.destroy();
      this.treeNavigation = null;
    }
    
    if (this.tomselect) {
      this.tomselect.destroy();
      this.tomselect = null;
    }
    
    this.initialized = false;
    
    console.log('Grouped Select destroyed');
  }
}