# Tom-Select Project with Vite, Tailwind CSS & JavaScript

A modern, feature-rich select dropdown implementation using Tom-Select, built with Vite, styled with Tailwind CSS, and enhanced with vanilla JavaScript.

## FEATURE:

- **Tom-Select Integration**: Advanced dropdown/select UI component with search, multi-select, and tagging
- **Modern Build System**: Vite for fast development and optimized production builds
- **Tailwind CSS Styling**: Utility-first CSS framework for custom designs
- **Multiple Examples**: Basic select, multi-select, dynamic creation, and remote data loading
- **Responsive Design**: Mobile-first approach with responsive layouts
- **Accessibility**: ARIA labels and keyboard navigation support
- **Performance Optimized**: Lazy loading and virtual scrolling capabilities

## PROJECT STRUCTURE:

```
tom-select/
├── src/
│   ├── main.js           # Tom-Select initialization and configuration
│   ├── style.css         # Tailwind imports and custom styles
│   └── components/       # Reusable Tom-Select components (future)
├── public/
│   └── vite.svg         # Default Vite favicon
├── index.html           # Main HTML entry point
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
├── .gitignore          # Git ignore rules
├── CLAUDE.md           # AI assistant guidelines
├── INITIAL.md          # This file - setup instructions
└── README.md           # Project documentation (to be created)
```

## PREREQUISITES:

- Node.js 18+ and npm 9+
- Basic understanding of JavaScript, HTML, and CSS
- Terminal/command line access
- Code editor (VS Code recommended)

## Project Initialization Steps

### Step 1: Initialize Vite Project
```bash
npm create vite@latest . -- --template vanilla
```
When prompted, confirm to proceed in non-empty directory.

### Step 2: Install Dependencies
```bash
npm install
npm install tom-select
npm install -D tailwindcss postcss autoprefixer
```

### Step 3: Configure Tailwind CSS
```bash
npx tailwindcss init -p
```

Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Step 4: Create Project Structure

#### `src/style.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Tom-select custom overrides */
.ts-wrapper.multi .ts-control > div {
  @apply bg-blue-100 text-blue-800 rounded-md px-2 py-1 mr-1 mb-1;
}

.ts-dropdown {
  @apply shadow-lg border-gray-200;
}

.ts-dropdown .option {
  @apply hover:bg-blue-50;
}
```

#### `index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tom-Select Demo</title>
  </head>
  <body>
    <div id="app" class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Tom-Select Examples</h1>
        
        <!-- Basic Single Select -->
        <div class="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">Basic Single Select</h2>
          <select id="select-basic" placeholder="Pick a state...">
            <option value="">Select a state...</option>
            <option value="CA">California</option>
            <option value="TX">Texas</option>
            <option value="NY">New York</option>
            <option value="FL">Florida</option>
            <option value="IL">Illinois</option>
          </select>
        </div>

        <!-- Multi-Select -->
        <div class="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">Multi-Select with Tags</h2>
          <select id="select-tags" multiple placeholder="Pick your skills...">
            <option value="js">JavaScript</option>
            <option value="py">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="rb">Ruby</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="ts">TypeScript</option>
          </select>
        </div>

        <!-- Dynamic Options -->
        <div class="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">Create New Options</h2>
          <input id="select-create" placeholder="Enter new tags...">
        </div>

        <!-- Remote Data Example -->
        <div class="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">Remote Data (GitHub Repos)</h2>
          <select id="select-remote" placeholder="Search GitHub repositories..."></select>
        </div>
      </div>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

#### `src/main.js`
```javascript
import './style.css'
import TomSelect from 'tom-select'
import 'tom-select/dist/css/tom-select.css'

// Basic Single Select
new TomSelect('#select-basic', {
  sortField: {
    field: 'text',
    direction: 'asc'
  },
  maxItems: 1
})

// Multi-Select with Tags
new TomSelect('#select-tags', {
  plugins: ['remove_button'],
  maxItems: null,
  create: false,
  onItemAdd: function(value, $item) {
    console.log('Added:', value)
  },
  onItemRemove: function(value) {
    console.log('Removed:', value)
  }
})

// Create New Options
new TomSelect('#select-create', {
  persist: false,
  createOnBlur: true,
  create: true,
  maxItems: null,
  placeholder: 'Enter new tags...',
  plugins: ['remove_button'],
  render: {
    item: function(data, escape) {
      return '<div>' + escape(data.text) + '</div>'
    },
    option_create: function(data, escape) {
      return '<div class="create">Add <strong>' + escape(data.input) + '</strong>&hellip;</div>'
    }
  }
})

// Remote Data Example (GitHub API)
new TomSelect('#select-remote', {
  valueField: 'url',
  labelField: 'name',
  searchField: 'name',
  maxItems: 5,
  plugins: ['remove_button'],
  load: function(query, callback) {
    if (!query.length) return callback()
    
    fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}`)
      .then(response => response.json())
      .then(json => {
        callback(json.items.slice(0, 10))
      })
      .catch(() => {
        callback()
      })
  },
  render: {
    option: function(item, escape) {
      return `<div class="py-2 px-3">
        <div class="font-semibold">${escape(item.name)}</div>
        <div class="text-sm text-gray-600">${escape(item.description || 'No description')}</div>
        <div class="text-xs text-gray-500 mt-1">⭐ ${item.stargazers_count} | 🍴 ${item.forks_count}</div>
      </div>`
    },
    item: function(item, escape) {
      return `<div>${escape(item.name)}</div>`
    }
  }
})
```

### Step 5: Run Development Server
```bash
npm run dev
```

Visit http://localhost:5173 to see the examples.

## IMPLEMENTED EXAMPLES:

### 1. Basic Single Select
- Standard dropdown with alphabetical sorting
- Single value selection
- Placeholder text support
- Keyboard navigation

### 2. Multi-Select with Tags
- Multiple value selection
- Visual tags for selected items
- Remove buttons for each tag
- Event logging for add/remove actions

### 3. Dynamic Option Creation
- Create new options on-the-fly
- Custom rendering for new items
- Persistent vs non-persistent options
- Create on blur functionality

### 4. Remote Data Loading
- GitHub API integration
- Asynchronous data fetching
- Custom rendering for remote items
- Search debouncing
- Loading states

## CONFIGURATION OPTIONS:

### Core Settings
```javascript
{
  maxItems: null,           // Maximum selected items (null = unlimited)
  create: false,            // Allow creating new items
  persist: true,            // Persist created items
  openOnFocus: true,        // Open dropdown on focus
  hideSelected: false,      // Hide selected items from dropdown
  closeAfterSelect: false,  // Close dropdown after selection
  loadThrottle: 300,        // Throttle remote loading (ms)
  loadingClass: 'loading',  // CSS class during loading
  preload: false,           // Preload on focus
  addPrecedence: false      // New items appear at top
}
```

### Plugin System
```javascript
plugins: {
  'remove_button': {
    title: 'Remove this item',
    label: '×'
  },
  'dropdown_header': {
    title: 'Select an option',
    headerClass: 'dropdown-header'
  },
  'clear_button': {
    title: 'Clear all'
  },
  'drag_drop': {
    // Enable drag and drop reordering
  }
}
```

## CUSTOMIZATION GUIDE:

### Theme Customization
```css
/* Custom theme variables */
:root {
  --ts-primary: #3b82f6;      /* Primary color */
  --ts-secondary: #64748b;    /* Secondary color */
  --ts-border: #e5e7eb;       /* Border color */
  --ts-hover: #f3f4f6;        /* Hover background */
  --ts-selected: #dbeafe;     /* Selected background */
  --ts-disabled: #9ca3af;     /* Disabled color */
}

/* Apply custom theme */
.custom-theme .ts-control {
  border-color: var(--ts-border);
  background: white;
}

.custom-theme .ts-control > .item {
  background: var(--ts-selected);
  color: var(--ts-primary);
}
```

### Event Handling
```javascript
const select = new TomSelect('#my-select', {
  // Lifecycle events
  onInitialize: function() {
    console.log('Tom-Select initialized');
  },
  
  // Item events
  onItemAdd: function(value, $item) {
    console.log('Item added:', value);
    // Custom validation
    if (!this.validateItem(value)) {
      this.removeItem(value);
    }
  },
  
  // Dropdown events
  onDropdownOpen: function($dropdown) {
    console.log('Dropdown opened');
    // Custom positioning logic
  },
  
  // Change events
  onChange: function(value) {
    console.log('Value changed:', value);
    // Update related form fields
  }
});
```

## PERFORMANCE OPTIMIZATION:

### Large Dataset Handling
```javascript
// Virtual scrolling for 10,000+ items
new TomSelect('#large-dataset', {
  maxOptions: 100,          // Limit visible options
  firstUrl: (query) => {    // Initial load URL
    return `/api/search?q=${query}&page=1`;
  },
  load: function(query, callback) {
    // Implement pagination
    fetch(`/api/search?q=${query}&page=${this.currentPage}`)
      .then(res => res.json())
      .then(callback);
  },
  virtual: true,            // Enable virtual scrolling
  bufferSize: 50           // Items to render outside viewport
});
```

### Lazy Loading
```javascript
// Load Tom-Select only when needed
const loadTomSelect = async () => {
  const { default: TomSelect } = await import('tom-select');
  await import('tom-select/dist/css/tom-select.css');
  return TomSelect;
};

// Initialize on user interaction
document.querySelector('#lazy-select').addEventListener('focus', async () => {
  const TomSelect = await loadTomSelect();
  new TomSelect('#lazy-select', config);
}, { once: true });
```

## TROUBLESHOOTING:

### Common Issues

1. **Styling not applied**
   - Ensure Tailwind CSS is properly configured
   - Check if PostCSS is processing your CSS
   - Verify the build process includes all CSS files

2. **Tom-Select not initializing**
   - Confirm element exists before initialization
   - Check for JavaScript errors in console
   - Ensure Tom-Select is properly imported

3. **Remote data not loading**
   - Verify API endpoint is accessible
   - Check CORS settings if using external API
   - Inspect network tab for request/response

4. **Performance issues**
   - Implement virtual scrolling for large datasets
   - Use debouncing for search inputs
   - Consider lazy loading for multiple selects

## NEXT STEPS:

1. **Enhanced Features**
   - Implement grouped options with headers
   - Add disabled state handling
   - Create custom dropdown templates

2. **Form Integration**
   - Add validation with custom messages
   - Implement form submission handling
   - Create dependent dropdowns

3. **Component Library**
   - Build reusable Tom-Select components
   - Create preset configurations
   - Document component API

4. **Testing**
   - Set up Vitest for unit testing
   - Add E2E tests with Playwright
   - Implement accessibility testing

5. **Production Optimization**
   - Configure build optimization
   - Implement code splitting
   - Add PWA capabilities

## RESOURCES:

- [Tom-Select Documentation](https://tom-select.js.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [MDN Web Docs - Select Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select)
- [ARIA Authoring Practices - Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)