# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Tom-select implementation with HTML, JavaScript, Tailwind CSS, and Vite build system. Tom-select is a powerful, lightweight alternative to Select2/Selectize.js for creating enhanced select dropdowns.

## Development Commands

### Setup and Installation
```bash
npm create vite@latest . -- --template vanilla
npm install
npm install tom-select
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Common Commands
- `npm run dev` - Start development server with hot reload at localhost:5173
- `npm run build` - Build for production (outputs to dist/)
- `npm run preview` - Preview production build locally

## Project Architecture

### Core Structure
```
/
├── index.html          # Main entry point, includes Tom-select initialization
├── src/
│   ├── main.js        # Tom-select configuration and initialization
│   └── style.css      # Tailwind imports and custom styles
├── tailwind.config.js  # Tailwind configuration
├── vite.config.js     # Vite build configuration
└── package.json       # Dependencies and scripts
```

### Tom-select Implementation Pattern
When implementing Tom-select features:
1. Import Tom-select in main.js: `import TomSelect from 'tom-select'`
2. Import Tom-select CSS: `import 'tom-select/dist/css/tom-select.css'`
3. Initialize with: `new TomSelect('#select-id', { options })`

### Tailwind CSS Configuration
Configure tailwind.config.js content paths:
```javascript
content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}"
]
```

### Style Integration
In src/style.css, ensure Tailwind directives:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Key Considerations

### Tom-select Features to Implement
- Multi-select functionality
- Search/filter capabilities  
- Custom rendering of options
- Remote data loading (if needed)
- Keyboard navigation
- Custom styling with Tailwind classes

### Performance Optimizations
- Lazy load Tom-select for large datasets
- Use virtual scroll for extensive option lists
- Implement debounce for search inputs
- Consider pagination for remote data sources

### Accessibility
- Ensure proper ARIA labels
- Maintain keyboard navigation
- Include screen reader support
- Test with accessibility tools

## Common Tom-select Configurations

### Basic Setup
```javascript
new TomSelect('#select', {
  maxItems: null,           // unlimited for multi-select
  create: false,            // disable creating new items
  sortField: 'text',        // sort by text field
  searchField: ['text'],    // search in text field
  placeholder: 'Select...'  // placeholder text
});
```

### Advanced Features
- `plugins`: ['remove_button', 'dropdown_header', 'checkbox_options']
- `render`: Custom rendering functions for options and items
- `load`: Function for loading remote data
- `onItemAdd/onItemRemove`: Event handlers

## Build Optimization
- Vite automatically handles code splitting
- Tom-select CSS can be purged with Tailwind's PurgeCSS
- Consider dynamic imports for conditional Tom-select instances