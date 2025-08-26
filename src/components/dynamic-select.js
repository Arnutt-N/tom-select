/**
 * Dynamic Select Component for Tom-Select
 * Provides dynamic option creation with validation, persistence, and advanced features
 */
import TomSelect from 'tom-select';
import { OptionValidator } from '../utils/validator.js';
import { OptionStorage } from '../utils/storage.js';

export class DynamicSelect {
  constructor(selector, options = {}) {
    this.selector = selector;
    this.element = document.querySelector(selector);
    
    if (!this.element) {
      throw new Error(`Element ${selector} not found`);
    }
    
    // Initialize utilities
    this.validator = new OptionValidator(options.validation);
    this.storage = new OptionStorage(options.storageKey, options.storage);
    
    // State management
    this.creationHistory = [];
    this.historyIndex = -1;
    this.maxHistorySize = options.maxHistory || 50;
    this.createdCount = 0;
    
    // Configuration
    this.config = this.buildConfiguration(options);
    
    // Initialize Tom-Select
    this.init();
  }
  
  buildConfiguration(options) {
    const self = this;
    
    return {
      // Core settings for dynamic creation
      create: function(input, callback) {
        self.createOption(input, callback);
      },
      createOnBlur: false,  // Don't create on blur - confusing UX
      persist: false,       // We handle persistence manually
      
      // Multi-select settings
      maxItems: options.maxItems || null,
      plugins: options.plugins || ['remove_button', 'restore_on_backspace'],
      
      // Search and behavior
      searchField: ['text'],
      hideSelected: false,
      closeAfterSelect: false,
      
      // Performance
      loadThrottle: 300,
      maxOptions: 100,
      
      // Custom rendering
      render: {
        option_create: function(data, escape) {
          return `
            <div class="create-option flex items-center p-2 bg-green-50 border-l-4 border-green-500 hover:bg-green-100">
              <svg class="w-5 h-5 mr-2 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              <span>Create: <strong>${escape(data.input)}</strong></span>
            </div>
          `;
        },
        
        option: function(data, escape) {
          if (data.created) {
            return `
              <div class="flex items-center justify-between p-2 hover:bg-blue-50">
                <span class="flex items-center">
                  <span class="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></span>
                  <span>${escape(data.text)}</span>
                </span>
                <span class="text-xs text-gray-500 ml-2">Created</span>
              </div>
            `;
          }
          return `<div class="p-2 hover:bg-gray-50">${escape(data.text)}</div>`;
        },
        
        item: function(data, escape) {
          if (data.created) {
            return `
              <div class="inline-flex items-center bg-green-100 text-green-800 rounded-md px-2 py-1 mr-1 mb-1">
                <span class="mr-1">${escape(data.text)}</span>
                <button class="text-green-600 hover:text-green-800 ml-1" 
                        onclick="event.stopPropagation(); ${self.selector.replace('#', '')}DynamicSelect.editCreatedOption('${data.value}')"
                        title="Edit this tag"
                        tabindex="-1">
                  ✏️
                </button>
              </div>
            `;
          }
          return `<div class="inline-flex items-center bg-blue-100 text-blue-800 rounded-md px-2 py-1 mr-1 mb-1">
            <span>${escape(data.text)}</span>
          </div>`;
        },
        
        no_results: function(data, escape) {
          if (data.input && data.input.length > 0) {
            const validation = self.validator.validate(data.input);
            if (validation.valid) {
              return `
                <div class="p-3 text-center">
                  <p class="text-gray-500">No results found</p>
                  <p class="text-sm text-green-600 mt-1">
                    Press Enter to create "${escape(data.input)}"
                  </p>
                </div>
              `;
            } else {
              return `
                <div class="p-3 text-center">
                  <p class="text-gray-500">No results found</p>
                  <div class="text-sm text-red-600 mt-1">
                    <p>Cannot create "${escape(data.input)}":</p>
                    <ul class="list-disc list-inside mt-1">
                      ${validation.errors.map(error => `<li>${escape(error)}</li>`).join('')}
                    </ul>
                  </div>
                </div>
              `;
            }
          }
          return '<div class="p-3 text-center text-gray-500">Start typing to search or create new tags...</div>';
        }
      },
      
      // Event handlers
      onInitialize: function() {
        self.onInitialize();
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
      
      // Merge user options
      ...options.tomSelect
    };
  }
  
  init() {
    try {
      // Initialize Tom-Select
      this.instance = new TomSelect(this.selector, this.config);
      
      // Load persisted options
      this.loadPersistedOptions();
      
      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      // Setup external controls
      this.setupExternalControls();
      
      // Store reference for debugging and external access
      window.tomSelectInstances = window.tomSelectInstances || {};
      window.tomSelectInstances[this.element.id] = this.instance;
      
      // Store reference to this component for global access
      const elementId = this.element.id.replace('-', '');
      window[elementId + 'DynamicSelect'] = this;
      
      console.log('Dynamic Tom-Select initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Dynamic Tom-Select:', error);
      this.element.style.display = 'block'; // Fallback to native
      throw error;
    }
  }
  
  createOption(input, callback) {
    const startTime = performance.now();
    
    // Validate input
    const validation = this.validator.validate(input);
    
    if (!validation.valid) {
      validation.errors.forEach(error => this.notify(error, 'error'));
      return callback();
    }
    
    // Check for duplicates
    const existingOptions = Object.values(this.instance.options);
    if (this.validator.isDuplicate(validation.cleaned, existingOptions)) {
      this.notify('This option already exists', 'warning');
      return callback();
    }
    
    // Generate unique value
    const value = this.storage.generateId();
    
    // Create option object
    const optionData = {
      value: value,
      text: validation.cleaned,
      created: true,
      timestamp: Date.now()
    };
    
    // Add to history for undo/redo
    this.addToHistory('create', optionData);
    
    // Persist if enabled
    this.storage.addOption(optionData);
    
    // Create the option
    callback(optionData);
    
    // Performance check
    const duration = performance.now() - startTime;
    if (duration > 50) {
      console.warn(`Option creation took ${duration.toFixed(2)}ms - exceeds 50ms target`);
    }
    
    // Announce to screen reader
    this.announce(`Created new tag: ${validation.cleaned}`);
    
    // Update counter
    this.createdCount++;
    this.updateCreatedCounter();
    
    // Notify success
    this.notify(`Created "${validation.cleaned}"`, 'success');
  }
  
  editCreatedOption(value) {
    const option = this.instance.options[value];
    if (!option || !option.created) return;
    
    const newText = prompt('Edit tag:', option.text);
    if (!newText || newText === option.text) return;
    
    const validation = this.validator.validate(newText);
    if (!validation.valid) {
      alert('Invalid input: ' + validation.errors.join(', '));
      return;
    }
    
    // Check for duplicates (excluding current option)
    const existingOptions = Object.values(this.instance.options).filter(opt => opt.value !== value);
    if (this.validator.isDuplicate(validation.cleaned, existingOptions)) {
      alert('This option already exists');
      return;
    }
    
    // Add to history
    this.addToHistory('edit', { 
      oldOption: { ...option }, 
      newOption: { ...option, text: validation.cleaned }
    });
    
    // Update option
    this.instance.updateOption(value, { ...option, text: validation.cleaned });
    
    // Update storage
    this.storage.removeOption(value);
    this.storage.addOption({ ...option, text: validation.cleaned });
    
    this.notify(`Updated "${option.text}" to "${validation.cleaned}"`, 'success');
  }
  
  loadPersistedOptions() {
    const stored = this.storage.load();
    let loadedCount = 0;
    
    stored.forEach(item => {
      try {
        this.instance.addOption({
          value: item.value || item.id,
          text: item.text,
          created: true,
          timestamp: item.timestamp
        });
        loadedCount++;
      } catch (error) {
        console.warn('Failed to load persisted option:', item, error);
      }
    });
    
    if (loadedCount > 0) {
      this.createdCount = loadedCount;
      this.updateCreatedCounter();
      console.log(`Loaded ${loadedCount} persisted options`);
    }
  }
  
  addToHistory(action, data) {
    // Remove any history after current position (for redo)
    this.creationHistory = this.creationHistory.slice(0, this.historyIndex + 1);
    
    // Add new action
    this.creationHistory.push({
      action: action,
      data: data,
      timestamp: Date.now()
    });
    
    // Maintain history size limit
    if (this.creationHistory.length > this.maxHistorySize) {
      this.creationHistory.shift();
    } else {
      this.historyIndex++;
    }
    
    this.updateUndoRedoButtons();
  }
  
  undo() {
    if (this.historyIndex < 0) {
      this.notify('Nothing to undo', 'info');
      return;
    }
    
    const historyItem = this.creationHistory[this.historyIndex];
    
    try {
      switch (historyItem.action) {
        case 'create':
          // Remove the created option
          this.instance.removeOption(historyItem.data.value);
          this.storage.removeOption(historyItem.data.value);
          this.createdCount--;
          this.announce(`Undone: removed "${historyItem.data.text}"`);
          break;
          
        case 'edit':
          // Restore old option
          this.instance.updateOption(historyItem.data.newOption.value, historyItem.data.oldOption);
          this.storage.removeOption(historyItem.data.newOption.value);
          this.storage.addOption(historyItem.data.oldOption);
          this.announce(`Undone: restored "${historyItem.data.oldOption.text}"`);
          break;
          
        case 'remove':
          // Restore removed option
          this.instance.addOption(historyItem.data);
          this.storage.addOption(historyItem.data);
          this.createdCount++;
          this.announce(`Undone: restored "${historyItem.data.text}"`);
          break;
      }
      
      this.historyIndex--;
      this.updateCreatedCounter();
      this.updateUndoRedoButtons();
      this.notify('Action undone', 'info');
      
    } catch (error) {
      console.error('Undo failed:', error);
      this.notify('Undo failed', 'error');
    }
  }
  
  redo() {
    if (this.historyIndex >= this.creationHistory.length - 1) {
      this.notify('Nothing to redo', 'info');
      return;
    }
    
    this.historyIndex++;
    const historyItem = this.creationHistory[this.historyIndex];
    
    try {
      switch (historyItem.action) {
        case 'create':
          // Re-add the option
          this.instance.addOption(historyItem.data);
          this.storage.addOption(historyItem.data);
          this.createdCount++;
          this.announce(`Redone: created "${historyItem.data.text}"`);
          break;
          
        case 'edit':
          // Re-apply the edit
          this.instance.updateOption(historyItem.data.oldOption.value, historyItem.data.newOption);
          this.storage.removeOption(historyItem.data.oldOption.value);
          this.storage.addOption(historyItem.data.newOption);
          this.announce(`Redone: updated to "${historyItem.data.newOption.text}"`);
          break;
          
        case 'remove':
          // Re-remove the option
          this.instance.removeOption(historyItem.data.value);
          this.storage.removeOption(historyItem.data.value);
          this.createdCount--;
          this.announce(`Redone: removed "${historyItem.data.text}"`);
          break;
      }
      
      this.updateCreatedCounter();
      this.updateUndoRedoButtons();
      this.notify('Action redone', 'info');
      
    } catch (error) {
      console.error('Redo failed:', error);
      this.notify('Redo failed', 'error');
    }
  }
  
  // Event handlers
  onInitialize() {
    this.instance.control.setAttribute('role', 'combobox');
    this.instance.control.setAttribute('aria-label', 'Tags input with creation');
    this.instance.control.setAttribute('aria-describedby', this.element.id + '-description');
    
    console.log('Dynamic Tom-Select initialized');
  }
  
  onItemAdd(value, $item) {
    const option = this.instance.options[value];
    if (option && option.created) {
      // Track analytics if available
      if (window.gtag) {
        gtag('event', 'option_created', {
          'event_category': 'engagement',
          'event_label': option.text
        });
      }
    }
  }
  
  onItemRemove(value) {
    const option = this.instance.options[value];
    if (option && option.created) {
      this.addToHistory('remove', option);
      this.storage.removeOption(value);
      this.createdCount--;
      this.updateCreatedCounter();
      this.announce(`Removed tag: ${option.text}`);
    }
  }
  
  onChange(value) {
    // Custom event for integration
    this.element.dispatchEvent(new CustomEvent('dynamic-select:change', {
      detail: { 
        value: value,
        createdCount: this.createdCount,
        totalItems: this.instance.items.length
      }
    }));
  }
  
  onType(str) {
    // Could implement live validation feedback here
  }
  
  // Utility methods
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when our element is focused or active
      if (!this.instance.isFocused && document.activeElement !== this.element) return;
      
      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      
      // Ctrl/Cmd + Shift + Z: Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        this.redo();
      }
      
      // Ctrl/Cmd + E: Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        this.exportOptions();
      }
      
      // Ctrl/Cmd + I: Import
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        this.triggerImport();
      }
    });
  }
  
  setupExternalControls() {
    // Undo button
    const undoBtn = document.querySelector('#undo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }
    
    // Redo button  
    const redoBtn = document.querySelector('#redo-btn');
    if (redoBtn) {
      redoBtn.addEventListener('click', () => this.redo());
    }
    
    // Export button
    const exportBtn = document.querySelector('#export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportOptions());
    }
    
    // Import button
    const importBtn = document.querySelector('#import-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.triggerImport());
    }
    
    this.updateUndoRedoButtons();
  }
  
  updateUndoRedoButtons() {
    const undoBtn = document.querySelector('#undo-btn');
    const redoBtn = document.querySelector('#redo-btn');
    
    if (undoBtn) {
      undoBtn.disabled = this.historyIndex < 0;
    }
    
    if (redoBtn) {
      redoBtn.disabled = this.historyIndex >= this.creationHistory.length - 1;
    }
  }
  
  updateCreatedCounter() {
    const counter = document.querySelector('#created-count');
    if (counter) {
      counter.textContent = `${this.createdCount} created tag${this.createdCount === 1 ? '' : 's'}`;
    }
  }
  
  exportOptions() {
    try {
      this.storage.export();
      this.notify('Tags exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.notify('Export failed', 'error');
    }
  }
  
  triggerImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const result = await this.storage.import(file);
        
        // Add imported options to Tom-Select
        result.options.filter(opt => opt.imported).forEach(option => {
          try {
            this.instance.addOption({
              value: option.value || option.id,
              text: option.text,
              created: true,
              imported: true,
              timestamp: option.timestamp
            });
          } catch (error) {
            console.warn('Failed to add imported option:', option);
          }
        });
        
        this.createdCount = result.options.filter(opt => opt.created || opt.imported).length;
        this.updateCreatedCounter();
        
        this.notify(
          `Import successful: ${result.added} added, ${result.skipped} skipped`,
          'success'
        );
        
      } catch (error) {
        console.error('Import failed:', error);
        this.notify('Import failed: ' + error.message, 'error');
      }
      
      document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    input.click();
  }
  
  notify(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm`;
    
    const colors = {
      info: 'bg-blue-100 text-blue-800 border border-blue-200',
      success: 'bg-green-100 text-green-800 border border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      error: 'bg-red-100 text-red-800 border border-red-200'
    };
    
    notification.className += ' ' + colors[type];
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
  
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
  
  // Public API methods
  getCreatedOptions() {
    return Object.values(this.instance.options).filter(opt => opt.created);
  }
  
  getStats() {
    return {
      total: Object.keys(this.instance.options).length,
      created: this.createdCount,
      selected: this.instance.items.length,
      storage: this.storage.getStats()
    };
  }
  
  clearCreated() {
    const created = this.getCreatedOptions();
    created.forEach(option => {
      this.instance.removeOption(option.value);
    });
    this.storage.clear();
    this.createdCount = 0;
    this.updateCreatedCounter();
    this.notify('All created tags cleared', 'info');
  }
  
  destroy() {
    if (this.instance) {
      this.instance.destroy();
    }
  }
}