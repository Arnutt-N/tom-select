/**
 * Storage utility for Tom-Select dynamic creation
 * Handles persistence, cleanup, and import/export of created options
 */
export class OptionStorage {
  constructor(key = 'tomselect_created', options = {}) {
    this.key = key;
    this.maxItems = options.maxItems || 100;
    this.maxAge = options.maxAge || (30 * 24 * 60 * 60 * 1000); // 30 days
    this.compressionEnabled = options.compression || false;
  }
  
  /**
   * Save options to storage with fallback strategy
   * @param {array} options - Array of option objects to save
   * @returns {boolean} Success status
   */
  save(options) {
    try {
      const data = this.compressionEnabled 
        ? this.compress(JSON.stringify(options))
        : JSON.stringify(options);
      
      // Try localStorage first
      if (this.isStorageAvailable('localStorage')) {
        localStorage.setItem(this.key, data);
        return true;
      }
      
      // Fallback to sessionStorage
      if (this.isStorageAvailable('sessionStorage')) {
        sessionStorage.setItem(this.key, data);
        console.warn('Using sessionStorage fallback - data will not persist between sessions');
        return true;
      }
      
      console.error('No storage available');
      return false;
    } catch (e) {
      console.error('Storage failed:', e);
      return false;
    }
  }
  
  /**
   * Load options from storage
   * @returns {array} Array of saved options
   */
  load() {
    try {
      let data = null;
      
      // Try localStorage first
      if (this.isStorageAvailable('localStorage')) {
        data = localStorage.getItem(this.key);
      }
      
      // Fallback to sessionStorage
      if (!data && this.isStorageAvailable('sessionStorage')) {
        data = sessionStorage.getItem(this.key);
      }
      
      if (!data) return [];
      
      const parsed = this.compressionEnabled 
        ? JSON.parse(this.decompress(data))
        : JSON.parse(data);
      
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Load failed:', e);
      return [];
    }
  }
  
  /**
   * Cleanup old entries and maintain size limits
   * @returns {array} Cleaned array of options
   */
  cleanup() {
    const options = this.load();
    const now = Date.now();
    const cutoff = now - this.maxAge;
    
    // Remove old entries
    const filtered = options.filter(opt => 
      opt.timestamp && opt.timestamp > cutoff
    );
    
    // Sort by timestamp (newest first) and keep only maxItems
    const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);
    const recent = sorted.slice(0, this.maxItems);
    
    // Save cleaned data
    this.save(recent);
    return recent;
  }
  
  /**
   * Add a new option to storage
   * @param {object} option - Option object to add
   * @returns {boolean} Success status
   */
  addOption(option) {
    const existing = this.load();
    const newOption = {
      ...option,
      timestamp: Date.now(),
      id: this.generateId()
    };
    
    // Check for duplicates by text (case-insensitive)
    const isDuplicate = existing.some(opt => 
      opt.text.toLowerCase() === option.text.toLowerCase()
    );
    
    if (isDuplicate) {
      return false;
    }
    
    existing.push(newOption);
    return this.save(existing);
  }
  
  /**
   * Remove option from storage
   * @param {string} valueOrId - Value or ID of option to remove
   * @returns {boolean} Success status
   */
  removeOption(valueOrId) {
    const existing = this.load();
    const filtered = existing.filter(opt => 
      opt.value !== valueOrId && opt.id !== valueOrId
    );
    
    return this.save(filtered);
  }
  
  /**
   * Export options to downloadable JSON file
   * @param {string} filename - Optional filename for export
   */
  export(filename) {
    const options = this.load();
    const exportData = {
      version: '1.0',
      timestamp: Date.now(),
      count: options.length,
      options: options
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `tom-select-tags-${Date.now()}.json`;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }
  
  /**
   * Import options from file
   * @param {File} file - File object to import
   * @returns {Promise} Promise resolving to import result
   */
  async import(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // Validate import data structure
          if (!this.validateImportData(data)) {
            throw new Error('Invalid file format');
          }
          
          const importedOptions = data.options || data; // Support both formats
          
          // Validate each option
          const validOptions = importedOptions.filter(this.validateOptionStructure);
          
          if (validOptions.length === 0) {
            throw new Error('No valid options found in file');
          }
          
          // Merge with existing options
          const existing = this.load();
          const merged = [...existing];
          let addedCount = 0;
          
          validOptions.forEach(option => {
            // Check for duplicates
            const isDuplicate = merged.some(existing => 
              existing.text.toLowerCase() === option.text.toLowerCase()
            );
            
            if (!isDuplicate) {
              merged.push({
                ...option,
                timestamp: Date.now(),
                id: this.generateId(),
                imported: true
              });
              addedCount++;
            }
          });
          
          // Save merged data
          this.save(merged);
          
          resolve({
            success: true,
            total: validOptions.length,
            added: addedCount,
            skipped: validOptions.length - addedCount,
            options: merged
          });
          
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
  
  /**
   * Get storage statistics
   * @returns {object} Storage usage statistics
   */
  getStats() {
    const options = this.load();
    const now = Date.now();
    
    const stats = {
      total: options.length,
      created: options.filter(opt => opt.created && !opt.imported).length,
      imported: options.filter(opt => opt.imported).length,
      oldest: options.length > 0 ? Math.min(...options.map(opt => opt.timestamp)) : null,
      newest: options.length > 0 ? Math.max(...options.map(opt => opt.timestamp)) : null,
      storageUsed: this.getStorageSize(),
      maxItems: this.maxItems
    };
    
    if (stats.oldest) {
      stats.oldestAge = Math.floor((now - stats.oldest) / (24 * 60 * 60 * 1000)); // days
    }
    
    return stats;
  }
  
  /**
   * Clear all stored options
   * @returns {boolean} Success status
   */
  clear() {
    try {
      if (this.isStorageAvailable('localStorage')) {
        localStorage.removeItem(this.key);
      }
      if (this.isStorageAvailable('sessionStorage')) {
        sessionStorage.removeItem(this.key);
      }
      return true;
    } catch (e) {
      console.error('Clear failed:', e);
      return false;
    }
  }
  
  // Private helper methods
  
  isStorageAvailable(type) {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  generateId() {
    return 'created_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  getStorageSize() {
    try {
      const data = localStorage.getItem(this.key) || sessionStorage.getItem(this.key) || '';
      return new Blob([data]).size;
    } catch (e) {
      return 0;
    }
  }
  
  validateImportData(data) {
    // Support both direct array and wrapped format
    if (Array.isArray(data)) return true;
    return data && (Array.isArray(data.options) || Array.isArray(data));
  }
  
  validateOptionStructure(option) {
    return option && 
           typeof option.text === 'string' && 
           option.text.length > 0 &&
           (option.value === undefined || typeof option.value === 'string');
  }
  
  // Simple compression helpers (if needed for large datasets)
  compress(str) {
    // Simple compression could be implemented here if needed
    // For now, just return the string as-is
    return str;
  }
  
  decompress(str) {
    // Decompression counterpart
    return str;
  }
}