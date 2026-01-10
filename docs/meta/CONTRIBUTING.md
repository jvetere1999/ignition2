# Contributing to DAW Shortcuts

Thank you for your interest in contributing! This guide will help you get started.

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/daw-shortcuts.git
   cd daw-shortcuts
   ```

2. **Install Node.js 22+**
   - Using [nvm](https://github.com/nvm-sh/nvm):
     ```bash
     nvm install 22
     nvm use 22
     ```
   - Or download from [nodejs.org](https://nodejs.org)

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   - App opens at `http://localhost:5173`
   - Code changes hot-reload automatically

## Development Workflow

### Before Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/add-shortcut-data
   ```

2. Make sure everything passes locally:
   ```bash
   npm run test  # Runs check + build + tests
   ```

### Adding Shortcut Data

See [Adding a New Product](../README.md#adding-a-new-product) in the main README.

**Quick example:**

1. Edit `src/lib/data/ableton12suite.ts`:
   ```typescript
   {
       id: 'ableton12suite:new-shortcut',
       productId: 'ableton12suite',
       type: 'edit',  // or 'transport', 'view', etc.
       command: 'New Shortcut Name',
       keys: '⌘N',   // macOS style
       keysWin: 'Ctrl+N',  // Optional Windows override
       context: 'Global',  // Where this shortcut applies
       tags: ['tag1', 'tag2']  // For better search
   }
   ```

2. Test locally:
   ```bash
   npm run dev
   # Search for your new shortcut to verify it appears
   ```

### Running Tests

**Before opening a PR, ensure all tests pass:**

```bash
npm run test
```

**During development:**

- **Interactive test UI** (great for debugging):
  ```bash
  npm run test:e2e:ui
  ```

- **Step through tests** with debugger:
  ```bash
  npm run test:e2e:debug
  ```

- **Watch type errors**:
  ```bash
  npm run check:watch
  ```

### Code Style

- **TypeScript**: All code should be typed properly
- **Svelte**: Follow standard Svelte conventions
- **Formatting**: The project uses no auto-formatter (yet), but keep code readable

### Committing

Use clear, descriptive commit messages:

```bash
git add .
git commit -m "add: Serum 2 shortcuts for wavetable editing"
# Good!

git commit -m "update"
# Not helpful
```

## Pull Request Process

1. **Push your branch**:
   ```bash
   git push origin feature/add-shortcut-data
   ```

2. **Open a PR** with a description of:
   - What you added/changed
   - Why (if not obvious)
   - Testing notes (e.g., "tested favorites persist with chrome")

3. **CI will run automatically**:
   - Type checking
   - Build verification
   - All Playwright tests

4. **Address feedback** if any, then merge!

## Project Structure Reference

```
src/
├── lib/
│   ├── entries.ts        # Entry types (ShortcutEntry, FeatureEntry)
│   ├── types.ts          # Type re-exports + legacy types
│   ├── products.ts       # Product registry
│   ├── shortcuts.ts      # Aggregates + validates all data modules
│   ├── search.ts         # FlexSearch integration
│   ├── filter.ts         # Filtering utilities
│   ├── favorites.ts      # Favorites persistence (cookies + localStorage)
│   ├── platform.ts       # OS detection + key conversion
│   ├── theme.ts          # Theme management (light/dark/system)
│   ├── grouping.ts       # Group normalization
│   ├── __tests__/        # Unit tests
│   └── data/
│       ├── serum2.ts
│       ├── serum2PowerFeatures.ts  # Power features!
│       ├── ableton12suite.ts
│       └── reasonrack.ts
├── routes/
│   ├── +layout.svelte    # App layout (PWA setup)
│   └── +page.svelte      # Main page (search, filters, display)
└── app.html              # HTML template (theme no-flash script)
```

## Common Tasks

### I found a bug

1. Open an issue describing the bug
2. Include steps to reproduce
3. Optionally: Open a PR with a fix

### I want to add a new DAW/Plugin

1. Add to `src/lib/products.ts`
2. Create `src/lib/data/{productId}.ts` with shortcuts
3. Add test data (at least 3 seed shortcuts)
4. Update README with product info
5. Open a PR!

### I want to improve the search

- Edit `src/lib/search.ts`
- Test with `npm run test:e2e:ui` to see results live
- Ensure no test regressions

### I want to add a new filter type

- Edit `src/routes/+page.svelte` to add UI
- Update `matchesFilters()` logic
- Add tests in `tests/homepage.spec.ts`
- Ensure new filter shows in `typeOptions`

## Need Help?

- Check the [README.md](./README.md) for architecture details
- Review existing shortcut data in `src/lib/data/*.ts` for examples
- Look at test cases in `tests/homepage.spec.ts` for expected behavior
- Open a discussion issue with questions

## Questions?

Feel free to:
- Open an issue with your question
- Comment on relevant PRs/issues
- Start a discussion

Thank you for contributing! 🎵

