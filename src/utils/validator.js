/**
 * Input validation utility for Tom-Select dynamic creation
 * Provides comprehensive validation rules for user-created options
 */
export class OptionValidator {
  constructor(options = {}) {
    this.minLength = options.minLength || 2;
    this.maxLength = options.maxLength || 50;
    this.pattern = options.pattern || /^[a-zA-Z0-9\s\-_]+$/;
    this.reservedWords = options.reservedWords || [
      'admin', 'system', 'null', 'undefined', 'select', 'option',
      'create', 'delete', 'edit', 'remove', 'all', 'none'
    ];
  }
  
  /**
   * Validate user input for option creation
   * @param {string} input - User input to validate
   * @returns {object} Validation result with valid flag and error messages
   */
  validate(input) {
    const errors = [];
    const trimmed = input.trim();
    
    // Length validation
    if (trimmed.length < this.minLength) {
      errors.push(`Minimum ${this.minLength} characters required`);
    }
    
    if (trimmed.length > this.maxLength) {
      errors.push(`Maximum ${this.maxLength} characters allowed`);
    }
    
    // Pattern validation (alphanumeric + spaces, hyphens, underscores)
    if (!this.pattern.test(trimmed)) {
      errors.push('Only letters, numbers, spaces, hyphens, and underscores allowed');
    }
    
    // Reserved words validation
    if (this.reservedWords.includes(trimmed.toLowerCase())) {
      errors.push('This is a reserved word and cannot be used');
    }
    
    // Additional validation rules
    if (trimmed.startsWith(' ') || trimmed.endsWith(' ')) {
      errors.push('Cannot start or end with spaces');
    }
    
    // Check for consecutive spaces
    if (/\s{2,}/.test(trimmed)) {
      errors.push('Multiple consecutive spaces not allowed');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors,
      cleaned: trimmed
    };
  }
  
  /**
   * Check if input would be a duplicate (case-insensitive)
   * @param {string} input - Input to check
   * @param {array} existingOptions - Array of existing options
   * @returns {boolean} True if duplicate exists
   */
  isDuplicate(input, existingOptions) {
    const cleaned = input.trim().toLowerCase();
    return existingOptions.some(option => 
      option.text.toLowerCase() === cleaned
    );
  }
  
  /**
   * Suggest alternatives for invalid input
   * @param {string} input - Original invalid input
   * @returns {array} Array of suggested alternatives
   */
  suggestAlternatives(input) {
    const suggestions = [];
    const cleaned = input.trim();
    
    // Remove invalid characters
    const sanitized = cleaned.replace(/[^a-zA-Z0-9\s\-_]/g, '');
    if (sanitized !== cleaned && sanitized.length >= this.minLength) {
      suggestions.push(sanitized);
    }
    
    // Replace multiple spaces
    const spaceFixed = cleaned.replace(/\s+/g, ' ');
    if (spaceFixed !== cleaned && spaceFixed.length >= this.minLength) {
      suggestions.push(spaceFixed);
    }
    
    // Truncate if too long
    if (cleaned.length > this.maxLength) {
      suggestions.push(cleaned.substring(0, this.maxLength).trim());
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
  }
}