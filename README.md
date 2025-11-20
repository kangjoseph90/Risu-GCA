## RisuAI Plugin Development Template

This is a development template for creating plugins for RisuAI frontend. Plugins are built as single JavaScript files that are imported and executed by the RisuAI application.

## Features

- TypeScript for type-safe development
- Svelte for component-based UI
- Tailwind CSS for styling
- Lucide Svelte for icons
- Single bundle output as UMD module
- RisuAI API integration

## Project Structure

```
src/
├── plugin.ts      - Plugin metadata and argument definitions (required)
├── api.ts         - RisuAI plugin API interface (pre-configured)
├── main.ts        - Entry point for the plugin
├── style.css      - Tailwind styles with layer isolation
├── MyPopup.svelte - Example Svelte component
└── OpenButton.svelte - Example Svelte component
```

## Setup and Configuration

### 1. Define Plugin Information

Edit `src/plugin.ts` to define your plugin's metadata and arguments:

```typescript
const PLUGIN_TITLE = 'my-plugin'
const PLUGIN_VERSION = 'v1.0.0'
const PLUGIN_NAME = `${PLUGIN_TITLE}-${PLUGIN_VERSION}`

const ARG1 = 'my_arg1'
const ARG2 = 'my_arg2'

const RISU_ARGS: RisuArgs = {
    [ARG1]: RisuArgType.String,
    [ARG2]: RisuArgType.Int,
}
```

The plugin name and arguments are required and must follow this format.

### 2. Configure Package Information

Update `package.json` with your plugin name and description:

```json
{
  "name": "your-plugin-name",
  "version": "1.0.0",
  "description": "Your plugin description"
}
```

### 3. Update Vite Configuration

Update `vite.config.ts` to match your plugin name:

```typescript
build: {
  lib: {
    fileName: () => 'your-plugin-name.js',
  }
}
```

## Building

Build the plugin into a single JavaScript file:

```bash
npm run build
```

The compiled plugin will be output to `dist/your-plugin-name.js`.

## Usage with RisuAI

The built JavaScript file can be imported directly by RisuAI:

The compiled bundle includes:
- All Svelte components compiled to JavaScript
- Tailwind CSS compiled and injected via JavaScript
- The RisuAI plugin API integration

## Development

### Using the RisuAI API

The `RisuAPI` interface from `src/api.ts` provides access to RisuAI functionality. Example:

```typescript
import { RisuAPI } from './api';

RisuAPI.onUnload(() => {
    // Cleanup code when plugin unloads
});
```

### Building UI with Svelte

Create Svelte components in the `src` directory and import them in `main.ts`:

```typescript
import MyComponent from './MyComponent.svelte';

const app = new MyComponent({
    target: document.body,
});
```

Svelte provides superior event management and component reusability compared to raw JavaScript DOM manipulation.

### Styling with Tailwind CSS

Use Tailwind CSS classes directly in your components:

```svelte
<button class="px-4 py-2 bg-blue-500 text-white rounded">Click me</button>
```
## API Reference

The RisuAPI provides methods for:
- Fetching data from RisuAI backend
- Managing plugin arguments
- Registering event handlers
- Lifecycle management

See `src/api.ts` for the complete interface definition.

## Output

The build output is a single UMD module:
- File: `dist/your-plugin-name.js`
- Ready to import and execute in RisuAI
- CSS automatically injected on load
- No external dependencies required
