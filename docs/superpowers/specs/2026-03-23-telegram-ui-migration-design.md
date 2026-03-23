# Telegram UI Library Migration Design

**Date:** 2026-03-23
**Status:** Approved
**Migration Type:** Complete migration (Approach 1: Direct Component Replacement)

## Overview

Migrate the Burro dos Concertos Telegram Mini App from custom Tailwind CSS styling to `@telegram-apps/telegram-ui` native components. This migration preserves exact current functionality while establishing a foundation for future scaling and design improvements.

## Motivation

- Prefer native Telegram components over custom implementations
- App will scale significantly (future features planned)
- Design mockups exist for post-migration improvements
- Current custom styling approach creates maintenance burden
- Library provides consistent Telegram theming automatically

## Goals

1. **Complete migration** - Replace all custom styled components with library equivalents
2. **Preserve functionality** - Maintain exact current behavior (1:1 replacement)
3. **Maintain tests** - Update tests to work with new components, same assertions
4. **Clean foundation** - Prepare codebase for implementing design mockups post-migration

## Non-Goals

- Implementing new features or design mockups (separate phase after migration)
- Changing application behavior or user interactions
- Refactoring non-UI code (hooks, API layer, business logic)

## Architecture Changes

### Current Structure
- Custom Tailwind CSS with inline `var(--tg-theme-*)` variables
- Direct access to `window.Telegram.WebApp`
- Component-level theme handling via inline styles
- Manual color and styling management

### New Structure
- `@telegram-apps/telegram-ui` provides theme-aware components
- Wrap app in `<AppRoot>` (library's theme provider)
- Components inherit theme automatically from library
- Remove manual theme variable handling
- **Keep Tailwind CSS** - Use library components first, Tailwind only for spacing/layout when library doesn't provide it

### Key Files Affected
- `main.tsx` - Add `AppRoot` wrapper and import library CSS
- `App.tsx` - Replace custom containers with library layout components
- All components in `src/components/` - Migrate to library components
- `index.css` - Keep Tailwind imports
- `src/__tests__/` - Update component tests for new structure

## Dependencies

### To Add
```json
{
  "@telegram-apps/telegram-ui": "latest"
}
```

### To Keep
- `@tailwindcss/vite` - For layout/spacing utilities when library doesn't provide
- `@twa-dev/types` - TypeScript definitions
- All existing dependencies (React, Vite, etc.)

## Component Mapping

### ConcertCard → Cell Component
**Current:** Custom div with Tailwind classes and inline theme styles
**New:** Library's `Cell` component
- `Cell` is the standard Telegram list item
- Supports subtitle, description, before/after content slots
- Compose: `Cell` wrapper + custom vote buttons using library `Button`
- Status border (green/amber/red) - Use Tailwind border utilities if library doesn't provide

### TabNavigation → Tabbar + TabbarItem
**Current:** Custom bottom navigation with inline theme styles
**New:** Library's `Tabbar` and `TabbarItem`
- Native Telegram bottom navigation component
- Supports icons, badges, active states
- Badge count rendering built-in
- Matches current tab structure (All Concerts / My Concerts)

### ConcertList → List + Section
**Current:** Custom div container with mapped concerts
**New:** Library's `List` and `Section` components
- `List` is the container component
- `Section` groups items with optional headers
- Each concert becomes a `Cell` inside the list
- Loading/error states remain custom (library may not provide these patterns)

### ConcertDetail → Modal
**Current:** Custom modal overlay with custom styling
**New:** Library's `Modal` component
- Full-screen modal with close button
- Use `ModalHeader`, `ModalClose` for structure
- Header, content, and action areas
- Matches current overlay pattern

### Search Input → Input Component
**Current:** Custom input with Tailwind and inline theme styles
**New:** Library's `Input` component
- Telegram-themed input with proper focus states
- Built-in placeholder and value handling
- Inherits theme colors automatically

### Vote Buttons → Button Component
**Current:** Custom buttons with manual active state styling
**New:** Library's `Button` component
- Use variants: `primary`, `outline`, or `plain`
- Active state: `mode="filled"` with primary appearance
- Disabled state handled automatically
- Emoji + text + count composition

### CalendarSubscription → Section + Button
**Current:** Custom section with platform-specific buttons
**New:** Mostly preserved, use library's `Section` and `Button`
- Wrap in `Section` for visual grouping
- Platform buttons use library `Button` component
- Keep custom logic for calendar URL generation

## Theming & Integration

### App Initialization
Import library CSS in `main.tsx`:
```tsx
// main.tsx
import { AppRoot } from '@telegram-apps/telegram-ui';
import '@telegram-apps/telegram-ui/dist/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRoot>
      <App />
    </AppRoot>
  </React.StrictMode>
);
```

### Component Theming
- Library components (Button, Cell, Input, etc.) inherit theme from `AppRoot`
- Remove all `style={{color: var(--tg-theme-text-color)}}` patterns
- Use component's built-in `appearance` and `mode` props for variants
- Only add Tailwind classes where library doesn't provide spacing/layout props

### Integration with Hooks
- Keep existing `useTelegram` hook for WebApp methods (showAlert, close, etc.)
- For this migration, preserve current `useTelegram` implementation
- Library handles UI, hooks handle Telegram API interactions

### CSS Structure
- Keep `index.css` for global resets and Tailwind imports
- Add library CSS import in `main.tsx` (as shown above)
- Tailwind remains available for utilities when library gaps exist
- Prefer library component props over Tailwind classes

## Migration Steps

### Step 1: Install Dependencies
```bash
cd web
pnpm add @telegram-apps/telegram-ui
```
- Import library CSS in `main.tsx`
- Verify build still works

### Step 2: Setup AppRoot Wrapper
- Modify `main.tsx` to wrap `<App />` in `<AppRoot>`
- Import library CSS: `import '@telegram-apps/telegram-ui/dist/styles.css'`
- Run dev server and verify app renders (no visual changes expected)
- Commit: "Setup Telegram UI library AppRoot wrapper"

### Step 3: Migrate Components (Bottom-Up)

#### 3.1 Search Input
- Replace custom input in `App.tsx` with library `Input`
- Update tests in `src/__tests__/`
- Verify search functionality works
- Commit: "Migrate search input to Telegram UI"

#### 3.2 Vote Buttons
- Replace custom buttons in `ConcertCard.tsx` with library `Button`
- Map response states to button variants
- Update `ConcertCard.test.tsx`
- Verify voting interaction works
- Commit: "Migrate vote buttons to Telegram UI"

#### 3.3 ConcertCard
- Convert entire component to use library `Cell`
- Preserve status border with Tailwind if needed
- Update `ConcertCard.test.tsx`
- Verify card rendering and interactions
- Commit: "Migrate ConcertCard to Telegram UI Cell"

#### 3.4 TabNavigation
- Replace with library `Tabbar` and `TabbarItem`
- Maintain badge count rendering
- Update `TabNavigation.test.tsx`
- Verify tab switching works
- Commit: "Migrate TabNavigation to Telegram UI Tabbar"

#### 3.5 ConcertList
- Wrap with library `List` and `Section`
- Keep loading/error state rendering
- Update `ConcertList.test.tsx`
- Verify list rendering and filtering
- Commit: "Migrate ConcertList to Telegram UI List"

#### 3.6 ConcertDetail
- Convert to library `Modal` component
- Use `ModalHeader` and `ModalClose` for structure
- Preserve modal behavior and close interaction
- Update `ConcertDetail.test.tsx`
- Verify modal open/close works
- Commit: "Migrate ConcertDetail to Telegram UI Modal"

#### 3.7 CalendarSubscription
- Use library `Section` and `Button`
- Keep custom calendar URL logic
- Update `CalendarSubscription.test.tsx`
- Verify subscription buttons work
- Commit: "Migrate CalendarSubscription to use Telegram UI components"

#### 3.8 App.tsx Cleanup
- Remove any remaining custom theme handling
- Clean up unused inline styles
- Update tests if needed
- Verify entire app flow works
- Commit: "Clean up App.tsx after Telegram UI migration"

### Step 4: Final Cleanup
- Remove unused custom CSS that library now handles
- Verify Tailwind only used where library doesn't provide functionality
- Run full test suite: `pnpm test`
- Visual testing in dev server
- Commit: "Complete Telegram UI migration cleanup"

## Testing Strategy

### Test Updates
- Existing tests in `src/__tests__/` need adjustments for new component structure
- Update selectors to match library component DOM structure
- Keep same test assertions (behavior must not change)
- Example: Query for library's `Cell` elements instead of custom divs

### Verification per Component
After each component migration:
1. **Run unit tests** - `pnpm test` to catch regressions
2. **Visual verification** - Run `pnpm dev`, check component renders correctly
3. **Interaction testing** - Click buttons, vote, navigate tabs, search manually
4. **Theme verification** - Check Telegram theme integration works

### Acceptance Criteria
Migration is complete when:
- All existing tests pass (with updated selectors)
- Visual appearance matches current app (1:1 preservation)
- All user interactions work identically:
  - Concert search and filtering
  - Tab navigation
  - Voting on concerts
  - Opening concert details
  - Calendar subscription
- No console errors or warnings
- App uses library components throughout
- No manual `var(--tg-theme-*)` inline styles remain

### Rollback Plan
- Each component migration is a separate git commit
- If issues found, can revert specific component changes
- Keep git history clean with descriptive commit messages
- Can pause migration at any step if needed

## Risks & Mitigations

### Risk: Library doesn't support exact current styling
**Mitigation:** Use Tailwind utilities as fallback for gaps (e.g., status borders)

### Risk: Breaking changes in component behavior
**Mitigation:** Test thoroughly after each component, separate commits for easy rollback

### Risk: Tests become flaky with new DOM structure
**Mitigation:** Update tests incrementally, use semantic queries where possible

### Risk: Library bundle size impact
**Mitigation:** Check bundle size after migration, library likely smaller than custom CSS

## Success Metrics

- **Zero functionality regressions** - All features work identically
- **100% test pass rate** - All tests updated and passing
- **Clean codebase** - No custom theme variable handling remains
- **Foundation ready** - Can start implementing design mockups immediately after

## Future Work (Post-Migration)

After migration is complete and verified:
1. Implement design mockups using library components
2. Add new features using library's component catalog
3. Consider optimizing Tailwind usage based on library capabilities
4. Explore additional library components (Avatar, Badge, Progress, etc.)

## References

- Library docs: https://tgui.xelene.me/
- Package: `@telegram-apps/telegram-ui`
- Current codebase: `/web/src/`
- Tests: `/web/src/__tests__/`
