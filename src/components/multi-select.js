/**
 * Multi-Select with Tags Component for Tom-Select
 * Provides visual tags, remove buttons, drag-and-drop reordering, and keyboard shortcuts
 */
import TomSelect from 'tom-select';
import 'tom-select/dist/css/tom-select.css';

export class MultiSelectTags {
  constructor(selector, options = {}) {
    this.selector = selector;
    this.element = document.querySelector(selector);
    
    if (!this.element) {
      throw new Error(`Element ${selector} not found`);
    }
    
    // Default configuration
    this.config = {
      maxItems: options.maxItems || 5, // Default max 5 items
      create: false,
      
      // Plugin configuration (ORDER MATTERS!)
      plugins: {
        'remove_button': {
          title: 'Remove this item',
          label: '×',
          className: 'remove'
        },
        'clear_button': {
          title: 'Clear all',
          label: 'Clear',
          className: 'clear-all-btn'
        }
      },
      
      // Search and selection behavior
      searchField: ['text', 'value'],
      hideSelected: true,
      closeAfterSelect: false,
      selectOnTab: true,
      openOnFocus: false,
      
      // Performance settings
      loadThrottle: 300,
      maxOptions: 100,
      
      // Custom rendering
      render: {
        item: this.renderItem.bind(this),
        option: this.renderOption.bind(this),
        no_results: this.renderNoResults.bind(this)
      },
      
      // Event handlers
      onInitialize: this.onInitialize.bind(this),
      onItemAdd: this.onItemAdd.bind(this),
      onItemRemove: this.onItemRemove.bind(this),
      onChange: this.onChange.bind(this),
      onDropdownOpen: this.onDropdownOpen.bind(this),
      onDropdownClose: this.onDropdownClose.bind(this),
      
      ...options // Allow override of any settings
    };
    
    // Add drag-drop only on non-touch devices
    if (!('ontouchstart' in window) && options.sortable !== false) {
      this.config.plugins['drag_drop'] = {};
    }
    
    // Add checkbox options for visual feedback
    this.config.plugins['checkbox_options'] = {};
    
    this.init();
  }
  
  init() {
    try {
      this.instance = new TomSelect(this.selector, this.config);
      this.setupKeyboardShortcuts();
      this.setupExternalControls();
      
      // Store globally for debugging
      window.tomSelectInstances = window.tomSelectInstances || {};
      window.tomSelectInstances[this.element.id] = this.instance;
      
      console.log('Multi-select with tags initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize multi-select:', error);
      // Fallback to native select
      this.element.style.display = 'block';
    }
  }
  
  /**
   * Render individual selected tags with color coding
   */
  renderItem(data, escape) {
    const color = data.color || this.getColorForValue(data.value);
    const isDraggable = !('ontouchstart' in window);
    
    return `
      <div class="item-${color} inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-all duration-150 mr-1 mb-1">
        ${isDraggable ? '<span class="drag-handle cursor-move mr-2 text-gray-400">⋮⋮</span>' : ''}
        <span>${escape(data.text)}</span>
      </div>
    `;
  }
  
  /**
   * Render options in dropdown with checkboxes
   */
  renderOption(data, escape) {
    const isSelected = this.instance && this.instance.items.includes(data.value);
    const color = data.color || this.getColorForValue(data.value);
    
    return `
      <div class="flex items-center py-2 px-3 hover:bg-blue-50 cursor-pointer">
        <input type="checkbox" 
               class="mr-2 pointer-events-none" 
               ${isSelected ? 'checked' : ''}>
        <span class="w-3 h-3 rounded-full bg-${color}-200 mr-2 flex-shrink-0"></span>
        <span class="${isSelected ? 'font-semibold text-gray-900' : 'text-gray-700'}">${escape(data.text)}</span>
        ${isSelected ? '<span class="ml-auto text-xs text-green-600">✓ Selected</span>' : ''}
      </div>
    `;
  }
  
  /**
   * Render no results message
   */
  renderNoResults(data, escape) {
    return `
      <div class="p-3 text-gray-500 text-center">
        <div class="text-gray-400 text-lg mb-1">🔍</div>
        <div>No results found for "${escape(data.input)}"</div>
        <div class="text-xs mt-1">Try a different search term</div>
      </div>
    `;
  }
  
  /**
   * Initialize component with ARIA attributes and mobile detection
   */
  onInitialize() {
    // ARIA attributes for accessibility
    this.instance.control.setAttribute('role', 'listbox');
    this.instance.control.setAttribute('aria-multiselectable', 'true');
    this.instance.control.setAttribute('aria-label', 'Multi-select skills dropdown');
    this.instance.control.setAttribute('aria-describedby', 'tags-description');
    
    // Mobile optimizations
    if ('ontouchstart' in window) {
      this.instance.wrapper.classList.add('touch-device');
    }
    
    console.log('Multi-select initialized with accessibility features');
  }
  
  /**
   * Handle item addition with announcements and limit checking
   */
  onItemAdd(value, $item) {
    const option = this.instance.options[value];
    const itemText = option ? option.text : value;
    
    this.announce(`${itemText} added to selection`);
    
    // Check if max items reached
    if (this.config.maxItems && this.instance.items.length >= this.config.maxItems) {
      this.instance.control.classList.add('max-items');
      this.announce(`Maximum of ${this.config.maxItems} items reached`);
      
      // Disable the dropdown to prevent more selections
      setTimeout(() => {
        this.instance.close();
      }, 100);
    }
    
    // Update selection count display
    this.updateSelectionCount();
    
    // Trigger custom event
    this.element.dispatchEvent(new CustomEvent('multi-select:add', {
      detail: { value, text: itemText, count: this.instance.items.length }
    }));
  }
  
  /**
   * Handle item removal with announcements
   */
  onItemRemove(value) {
    const option = this.instance.options[value];
    const itemText = option ? option.text : value;
    
    this.announce(`${itemText} removed from selection`);
    
    // Remove max indicator if below limit
    if (this.instance.control.classList.contains('max-items')) {
      this.instance.control.classList.remove('max-items');
    }
    
    // Update selection count display
    this.updateSelectionCount();
    
    // Trigger custom event
    this.element.dispatchEvent(new CustomEvent('multi-select:remove', {
      detail: { value, text: itemText, count: this.instance.items.length }
    }));
  }
  
  /**
   * Handle selection changes
   */
  onChange(value) {
    console.log('Selection changed:', this.instance.items);
    this.element.dispatchEvent(new CustomEvent('multi-select:change', {
      detail: { values: this.instance.items, count: this.instance.items.length }
    }));
  }
  
  /**
   * Handle dropdown open
   */
  onDropdownOpen($dropdown) {
    this.instance.control.setAttribute('aria-expanded', 'true');
    console.log('Multi-select dropdown opened');
  }
  
  /**
   * Handle dropdown close
   */
  onDropdownClose($dropdown) {
    this.instance.control.setAttribute('aria-expanded', 'false');
    console.log('Multi-select dropdown closed');
  }
  
  /**
   * Setup keyboard shortcuts for power users
   */
  setupKeyboardShortcuts() {
    const control = this.instance.control;
    
    control.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + A: Select all visible options
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        this.selectAll();
        return;
      }
      
      // Backspace: Remove last item when input is empty
      if (e.key === 'Backspace' && !this.instance.isInputActive) {
        if (this.instance.items.length > 0) {
          const lastItem = this.instance.items[this.instance.items.length - 1];
          this.instance.removeItem(lastItem);
        }
        return;
      }
      
      // Delete: Same as backspace for consistency
      if (e.key === 'Delete' && !this.instance.isInputActive) {
        if (this.instance.items.length > 0) {
          const lastItem = this.instance.items[this.instance.items.length - 1];
          this.instance.removeItem(lastItem);
        }
        return;
      }
      
      // Escape: Close dropdown and blur
      if (e.key === 'Escape') {
        this.instance.close();
        this.instance.blur();
        return;
      }
    });
  }
  
  /**
   * Setup external control buttons (Select All, Clear All)
   */
  setupExternalControls() {
    // Select All button
    const selectAllBtn = document.querySelector('#select-all');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectAll();
      });
    }
    
    // Clear All button (also handled by clear_button plugin)
    const clearAllBtn = document.querySelector('#clear-all');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearAll();
      });
    }
  }
  
  /**
   * Select all available options (respecting max limit)
   */
  selectAll() {
    const allOptions = Object.keys(this.instance.options);
    let addedCount = 0;
    
    for (const value of allOptions) {
      // Check if we haven't reached the max limit
      if (this.config.maxItems && this.instance.items.length >= this.config.maxItems) {
        this.announce(`Maximum of ${this.config.maxItems} items reached`);
        break;
      }
      
      // Add item if not already selected
      if (!this.instance.items.includes(value)) {
        this.instance.addItem(value, true); // Silent add to prevent individual announcements
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      this.announce(`Selected ${addedCount} items`);
    } else {
      this.announce('All available items already selected');
    }
  }
  
  /**
   * Clear all selected items
   */
  clearAll() {
    const count = this.instance.items.length;
    this.instance.clear();
    
    if (count > 0) {
      this.announce(`Cleared ${count} items`);
    }
  }
  
  /**
   * Update selection count in UI
   */
  updateSelectionCount() {
    // This could be used to update a counter elsewhere in the UI
    const count = this.instance.items.length;
    const maxItems = this.config.maxItems;
    
    // Update any count displays
    const countElements = document.querySelectorAll('[data-multi-select-count]');
    countElements.forEach(el => {
      if (maxItems) {
        el.textContent = `${count}/${maxItems} selected`;
      } else {
        el.textContent = `${count} selected`;
      }
    });
  }
  
  /**
   * Get color scheme for a value based on technology type
   */
  getColorForValue(value) {
    const colorMap = {
      // JavaScript ecosystem
      js: 'blue', ts: 'blue', react: 'blue', nodejs: 'green',
      
      // Backend languages
      py: 'green', java: 'orange', cpp: 'purple', csharp: 'purple',
      rb: 'red', go: 'cyan', rust: 'amber', php: 'violet',
      
      // Mobile
      swift: 'orange', kotlin: 'green', dart: 'cyan',
      
      // Frontend frameworks
      vue: 'green', angular: 'red',
      
      // DevOps
      docker: 'blue', kubernetes: 'cyan', aws: 'orange'
    };
    
    return colorMap[value] || 'gray';
  }
  
  /**
   * Announce message to screen readers
   */
  announce(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.classList.add('sr-only');
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Clean up announcement after screen reader has processed it
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  }
  
  // Public API methods
  
  /**
   * Get currently selected values
   */
  getValues() {
    return this.instance ? this.instance.items : [];
  }
  
  /**
   * Set selected values programmatically
   */
  setValues(values) {
    if (!this.instance) return;
    
    this.instance.clear();
    values.forEach(v => {
      if (this.instance.options[v]) {
        this.instance.addItem(v);
      }
    });
  }
  
  /**
   * Get selected items with their data
   */
  getSelectedItems() {
    if (!this.instance) return [];
    
    return this.instance.items.map(value => ({
      value: value,
      text: this.instance.options[value]?.text || value,
      color: this.getColorForValue(value)
    }));
  }
  
  /**
   * Enable or disable the component
   */
  setEnabled(enabled) {
    if (!this.instance) return;
    
    if (enabled) {
      this.instance.enable();
    } else {
      this.instance.disable();
    }
  }
  
  /**
   * Destroy the component and clean up
   */
  destroy() {
    if (this.instance) {
      this.instance.destroy();
    }
    
    // Clean up global reference
    if (window.tomSelectInstances && window.tomSelectInstances[this.element.id]) {
      delete window.tomSelectInstances[this.element.id];
    }
  }
}