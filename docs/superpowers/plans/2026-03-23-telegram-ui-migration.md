# Telegram UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Burro dos Concertos mini app from custom Tailwind styling to @telegram-apps/telegram-ui native components

**Architecture:** Bottom-up migration starting with AppRoot setup, then smallest components (Input, Button) progressing to composed components (ConcertCard, TabNavigation) and finally containers (ConcertList, Modal). Each component migration includes test updates and verification before commit.

**Tech Stack:** React 19, TypeScript, @telegram-apps/telegram-ui, Tailwind CSS 4, Vitest

---

## File Structure

### Files to Modify
- `web/package.json` - Add @telegram-apps/telegram-ui dependency
- `web/src/main.tsx` - Add AppRoot wrapper and library CSS import
- `web/src/App.tsx` - Replace search input, remove custom theme handling
- `web/src/components/ConcertCard.tsx` - Migrate to Cell component with Button votes
- `web/src/components/TabNavigation.tsx` - Migrate to Tabbar/TabbarItem
- `web/src/components/ConcertList.tsx` - Wrap with List/Section
- `web/src/components/ConcertDetail.tsx` - Migrate to Modal component
- `web/src/components/CalendarSubscription.tsx` - Use Section/Button
- `web/src/__tests__/components/ConcertCard.test.tsx` - Update for new structure
- `web/src/__tests__/components/TabNavigation.test.tsx` - Update for new structure
- `web/src/__tests__/components/ConcertList.test.tsx` - Update for new structure
- `web/src/__tests__/components/ConcertDetail.test.tsx` - Update for new structure
- `web/src/__tests__/components/CalendarSubscription.test.tsx` - Update for new structure

### No New Files
All changes are modifications to existing files.

---

## Task 1: Install Dependencies and Setup AppRoot

**Files:**
- Modify: `web/package.json`
- Modify: `web/src/main.tsx`

- [ ] **Step 1: Install @telegram-apps/telegram-ui**

Run from web directory:
```bash
cd web
pnpm add @telegram-apps/telegram-ui
```

Expected: Package added to dependencies in package.json

- [ ] **Step 2: Verify installation**

```bash
cat package.json | grep telegram-ui
```

Expected output shows: `"@telegram-apps/telegram-ui": "<version>"`

- [ ] **Step 3: Read current main.tsx**

```bash
cat src/main.tsx
```

Note the current structure to preserve React.StrictMode and root rendering.

- [ ] **Step 4: Update main.tsx with AppRoot wrapper**

Modify `web/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { AppRoot } from "@telegram-apps/telegram-ui";
import "@telegram-apps/telegram-ui/dist/styles.css";
import { App } from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRoot>
      <App />
    </AppRoot>
  </React.StrictMode>
);
```

- [ ] **Step 5: Verify build works**

```bash
pnpm build
```

Expected: BUILD SUCCESS with no errors

- [ ] **Step 6: Start dev server and verify app renders**

```bash
pnpm dev
```

Open browser to dev server URL.
Expected: App renders with no visual changes, no console errors

- [ ] **Step 7: Commit AppRoot setup**

```bash
git add package.json pnpm-lock.yaml src/main.tsx
git commit -m "Setup Telegram UI library AppRoot wrapper

Add @telegram-apps/telegram-ui dependency and wrap app in AppRoot
for theme context. No visual changes yet - foundation for migration.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Migrate Search Input

**Files:**
- Modify: `web/src/App.tsx:71-82`

- [ ] **Step 1: Read current App.tsx search input**

```bash
sed -n '71,82p' src/App.tsx
```

Note: Custom input with Tailwind classes and inline theme styles

- [ ] **Step 2: Add Input import to App.tsx**

At top of `web/src/App.tsx`, add to imports:
```tsx
import { Input } from "@telegram-apps/telegram-ui";
```

- [ ] **Step 3: Replace custom input with library Input**

In `web/src/App.tsx`, replace lines 71-82 with:

```tsx
        <Input
          placeholder="Search concerts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />
```

- [ ] **Step 4: Run tests to check for regressions**

```bash
pnpm test
```

Expected: Tests should still pass (search functionality unchanged)

- [ ] **Step 5: Visual verification in dev server**

```bash
pnpm dev
```

Test: Type in search box, verify concerts filter correctly
Expected: Search works identically to before

- [ ] **Step 6: Commit search input migration**

```bash
git add src/App.tsx
git commit -m "Migrate search input to Telegram UI

Replace custom styled input with library Input component.
Preserves exact functionality with Telegram native theming.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Migrate Vote Buttons in ConcertCard

**Files:**
- Modify: `web/src/components/ConcertCard.tsx:121-147`
- Modify: `web/src/__tests__/components/ConcertCard.test.tsx`

- [ ] **Step 1: Read current vote buttons implementation**

```bash
sed -n '115,152p' src/components/ConcertCard.tsx
```

Note: Custom button elements with getButtonClasses and getButtonStyle

- [ ] **Step 2: Add Button import to ConcertCard**

At top of `web/src/components/ConcertCard.tsx`, add:
```tsx
import { Button } from "@telegram-apps/telegram-ui";
```

- [ ] **Step 3: Replace getButtonClasses and getButtonStyle helpers**

Remove `getButtonClasses` function (lines 33-40) and `getButtonStyle` function (lines 42-51).

Add new helper:
```tsx
const getButtonMode = (responseType: "going" | "interested" | "not_going"): "filled" | "outline" => {
  const isSelected = concert.responses?.userResponse === responseType;
  return isSelected ? "filled" : "outline";
};
```

- [ ] **Step 4: Replace vote buttons with library Button**

In `web/src/components/ConcertCard.tsx`, replace lines 121-147 with:

```tsx
            <Button
              onClick={(e) => handleVote(e, "going")}
              disabled={isVoting}
              mode={getButtonMode("going")}
              size="s"
              className="flex-1"
            >
              🎉 Going ({concert.responses.going})
            </Button>

            <Button
              onClick={(e) => handleVote(e, "interested")}
              disabled={isVoting}
              mode={getButtonMode("interested")}
              size="s"
              className="flex-1"
            >
              🤔 Interested ({concert.responses.interested})
            </Button>

            <Button
              onClick={(e) => handleVote(e, "not_going")}
              disabled={isVoting}
              mode={getButtonMode("not_going")}
              size="s"
              className="flex-1"
            >
              ❌ Not Going ({concert.responses.not_going})
            </Button>
```

- [ ] **Step 5: Update ConcertCard test**

In `web/src/__tests__/components/ConcertCard.test.tsx`, update button queries.

Replace button queries like:
```tsx
const goingButton = screen.getByRole("button", { name: /going/i });
```

No changes needed if using getByRole - library Button renders as button element.

- [ ] **Step 6: Run ConcertCard tests**

```bash
pnpm test src/__tests__/components/ConcertCard.test.tsx
```

Expected: All tests pass

- [ ] **Step 7: Visual verification**

```bash
pnpm dev
```

Test: Click vote buttons, verify state changes
Expected: Buttons work identically, styling matches Telegram theme

- [ ] **Step 8: Commit vote buttons migration**

```bash
git add src/components/ConcertCard.tsx src/__tests__/components/ConcertCard.test.tsx
git commit -m "Migrate vote buttons to Telegram UI

Replace custom buttons with library Button component.
Uses mode prop for filled/outline variants based on selection.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Migrate ConcertCard to Cell Component

**Files:**
- Modify: `web/src/components/ConcertCard.tsx:70-152`
- Modify: `web/src/__tests__/components/ConcertCard.test.tsx`

- [ ] **Step 1: Add Cell import to ConcertCard**

At top of `web/src/components/ConcertCard.tsx`, add:
```tsx
import { Cell } from "@telegram-apps/telegram-ui";
```

- [ ] **Step 2: Read current card wrapper structure**

```bash
sed -n '70,80p' src/components/ConcertCard.tsx
```

Note: Outer div with onClick, className, and style props

- [ ] **Step 3: Replace card wrapper div with Cell**

Replace outer div (line 71-79) with Cell component.

The Cell component will wrap the entire card. Keep status border with Tailwind classes.

Replace lines 70-152 with:

```tsx
  return (
    <div
      className={`mb-3 ${getStatusBorderClass()}`}
    >
      <Cell
        onClick={onClick}
        className="cursor-pointer"
        subhead={
          <>
            <div className="flex items-center gap-2 mb-1 text-sm">
              <span>📍</span>
              <span>{concert.venue}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>📅</span>
              <span>
                {dateStr}
                {timeStr && ` at ${timeStr}`}
              </span>
            </div>
          </>
        }
        description={concert.notes}
      >
        {concert.artistName}
      </Cell>

      {concert.responses && userId && onVote && (
        <div className="mt-3 pt-3 px-4 pb-3 border-t flex gap-2">
          <Button
            onClick={(e) => handleVote(e, "going")}
            disabled={isVoting}
            mode={getButtonMode("going")}
            size="s"
            className="flex-1"
          >
            🎉 Going ({concert.responses.going})
          </Button>

          <Button
            onClick={(e) => handleVote(e, "interested")}
            disabled={isVoting}
            mode={getButtonMode("interested")}
            size="s"
            className="flex-1"
          >
            🤔 Interested ({concert.responses.interested})
          </Button>

          <Button
            onClick={(e) => handleVote(e, "not_going")}
            disabled={isVoting}
            mode={getButtonMode("not_going")}
            size="s"
            className="flex-1"
          >
            ❌ Not Going ({concert.responses.not_going})
          </Button>
        </div>
      )}
    </div>
  );
```

- [ ] **Step 4: Remove hasStatusBorder variable (no longer needed)**

Delete line 68: `const hasStatusBorder = !!concert.responses?.userResponse;`

- [ ] **Step 5: Update ConcertCard test selectors if needed**

Check if tests query for specific class names or structure.
Update to match Cell component structure.

Run:
```bash
pnpm test src/__tests__/components/ConcertCard.test.tsx
```

If tests fail, update selectors to find Cell component elements.

- [ ] **Step 6: Visual verification**

```bash
pnpm dev
```

Test: View concert cards, verify layout and interactions
Expected: Cards look identical, status borders preserved

- [ ] **Step 7: Commit ConcertCard Cell migration**

```bash
git add src/components/ConcertCard.tsx src/__tests__/components/ConcertCard.test.tsx
git commit -m "Migrate ConcertCard to Telegram UI Cell

Use Cell component for card layout with subhead and description.
Status border preserved with Tailwind classes. Vote buttons remain
in custom wrapper below Cell.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Migrate TabNavigation to Tabbar

**Files:**
- Modify: `web/src/components/TabNavigation.tsx`
- Modify: `web/src/__tests__/components/TabNavigation.test.tsx`

- [ ] **Step 1: Read current TabNavigation structure**

```bash
cat src/components/TabNavigation.tsx
```

Note: Fixed bottom div with two button elements

- [ ] **Step 2: Add Tabbar imports**

At top of `web/src/components/TabNavigation.tsx`, add:
```tsx
import { Tabbar } from "@telegram-apps/telegram-ui";
```

- [ ] **Step 3: Replace TabNavigation implementation**

Replace entire component with:

```tsx
import { TabType } from "@/hooks/useConcerts";
import { Tabbar } from "@telegram-apps/telegram-ui";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  myConcertsCount: number;
}

export function TabNavigation({ activeTab, onTabChange, myConcertsCount }: TabNavigationProps) {
  return (
    <Tabbar className="fixed bottom-0 left-0 right-0">
      <Tabbar.Item
        selected={activeTab === "all"}
        onClick={() => onTabChange("all")}
        text="All Concerts"
      >
        🎵
      </Tabbar.Item>

      <Tabbar.Item
        selected={activeTab === "my"}
        onClick={() => onTabChange("my")}
        text="My Concerts"
      >
        <div className="relative">
          🎤
          {myConcertsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] rounded-full px-1 bg-blue-500 text-white">
              {myConcertsCount}
            </span>
          )}
        </div>
      </Tabbar.Item>
    </Tabbar>
  );
}
```

- [ ] **Step 4: Update TabNavigation test**

In `web/src/__tests__/components/TabNavigation.test.tsx`, update queries to find Tabbar.Item elements.

Expected button roles should still work, but verify class names or test IDs if needed.

- [ ] **Step 5: Run TabNavigation tests**

```bash
pnpm test src/__tests__/components/TabNavigation.test.tsx
```

Expected: All tests pass

- [ ] **Step 6: Visual verification**

```bash
pnpm dev
```

Test: Click tabs, verify active state and badge count
Expected: Tabs work identically with Telegram styling

- [ ] **Step 7: Commit TabNavigation migration**

```bash
git add src/components/TabNavigation.tsx src/__tests__/components/TabNavigation.test.tsx
git commit -m "Migrate TabNavigation to Telegram UI Tabbar

Replace custom bottom navigation with library Tabbar component.
Badge count preserved with custom styling.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Migrate ConcertList to List/Section

**Files:**
- Modify: `web/src/components/ConcertList.tsx`
- Modify: `web/src/__tests__/components/ConcertList.test.tsx`

- [ ] **Step 1: Read current ConcertList structure**

```bash
cat src/components/ConcertList.tsx
```

Note: Returns loading/error states or maps concerts in a fragment

- [ ] **Step 2: Add List import**

At top of `web/src/components/ConcertList.tsx`, add:
```tsx
import { List } from "@telegram-apps/telegram-ui";
```

- [ ] **Step 3: Wrap concert mapping with List component**

Modify `web/src/components/ConcertList.tsx` to wrap the mapped concerts:

```tsx
import { Concert } from "@/types/concert";
import { ConcertCard } from "./ConcertCard";
import { List } from "@telegram-apps/telegram-ui";

interface ConcertListProps {
  concerts: Concert[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  activeTab: "all" | "my";
  userId?: number;
  onConcertClick: (concert: Concert) => void;
  onVote: (concertId: number, responseType: "going" | "interested" | "not_going") => Promise<void>;
}

export function ConcertList({
  concerts,
  loading,
  error,
  searchQuery,
  activeTab,
  userId,
  onConcertClick,
  onVote,
}: ConcertListProps) {
  if (loading) {
    return <div className="text-center py-8">Loading concerts...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  const filteredConcerts = concerts.filter((concert) => {
    const matchesSearch =
      concert.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      concert.venue.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === "all" || (activeTab === "my" && concert.responses?.userResponse);

    return matchesSearch && matchesTab;
  });

  if (filteredConcerts.length === 0) {
    return (
      <div className="text-center py-8">
        {searchQuery ? "No concerts match your search" : "No concerts found"}
      </div>
    );
  }

  return (
    <List>
      {filteredConcerts.map((concert) => (
        <ConcertCard
          key={concert.id}
          concert={concert}
          onClick={() => onConcertClick(concert)}
          onVote={(responseType) => onVote(concert.id, responseType)}
          userId={userId}
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 4: Update ConcertList test**

Tests should still pass as we're just wrapping in List. Verify:

```bash
pnpm test src/__tests__/components/ConcertList.test.tsx
```

Expected: All tests pass

- [ ] **Step 5: Visual verification**

```bash
pnpm dev
```

Test: Browse concerts, search, switch tabs
Expected: List works identically with Telegram styling

- [ ] **Step 6: Commit ConcertList migration**

```bash
git add src/components/ConcertList.tsx src/__tests__/components/ConcertList.test.tsx
git commit -m "Migrate ConcertList to Telegram UI List

Wrap concert cards in library List component.
Loading and error states remain custom.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Migrate ConcertDetail to Modal

**Files:**
- Modify: `web/src/components/ConcertDetail.tsx`
- Modify: `web/src/__tests__/components/ConcertDetail.test.tsx`

- [ ] **Step 1: Read current ConcertDetail structure**

```bash
cat src/components/ConcertDetail.tsx
```

Note: Custom modal overlay with fixed positioning

- [ ] **Step 2: Add Modal imports**

At top of `web/src/components/ConcertDetail.tsx`, add:
```tsx
import { ModalHeader, ModalClose } from "@telegram-apps/telegram-ui";
```

Note: Library may use different component names. Check actual API if imports fail.

- [ ] **Step 3: Replace modal implementation**

Replace the component with Modal structure. Since we need to verify the exact Modal API from the library, use a basic overlay approach with library components:

```tsx
import { Concert } from "@/types/concert";
import { format } from "date-fns";
import { ModalHeader, ModalClose } from "@telegram-apps/telegram-ui";

interface ConcertDetailProps {
  concert: Concert;
  onClose: () => void;
}

export function ConcertDetail({ concert, onClose }: ConcertDetailProps) {
  const concertDate = new Date(concert.concertDate);
  const dateStr = format(concertDate, "EEEE, MMMM d, yyyy");
  const timeStr = concert.concertTime ? format(new Date(concert.concertTime), "h:mm a") : null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader
          after={<ModalClose onClick={onClose} />}
        >
          {concert.artistName}
        </ModalHeader>

        <div className="p-4">
          <div className="mb-4">
            <h3 className="font-semibold mb-2">📍 Venue</h3>
            <p>{concert.venue}</p>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-2">📅 Date & Time</h3>
            <p>
              {dateStr}
              {timeStr && <> at {timeStr}</>}
            </p>
          </div>

          {concert.notes && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">📝 Notes</h3>
              <p>{concert.notes}</p>
            </div>
          )}

          {concert.concertUrl && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">🔗 More Info</h3>
              <a
                href={concert.concertUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                View Event Details
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update ConcertDetail test**

Update test to find ModalHeader and ModalClose components:

```bash
pnpm test src/__tests__/components/ConcertDetail.test.tsx
```

If tests fail, adjust queries for new structure.

- [ ] **Step 5: Visual verification**

```bash
pnpm dev
```

Test: Click concert card to open modal, click close button
Expected: Modal opens/closes correctly with Telegram styling

- [ ] **Step 6: Commit ConcertDetail migration**

```bash
git add src/components/ConcertDetail.tsx src/__tests__/components/ConcertDetail.test.tsx
git commit -m "Migrate ConcertDetail to Telegram UI Modal components

Use ModalHeader and ModalClose for native modal structure.
Custom overlay wrapper preserved for positioning.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Migrate CalendarSubscription

**Files:**
- Modify: `web/src/components/CalendarSubscription.tsx`
- Modify: `web/src/__tests__/components/CalendarSubscription.test.tsx`

- [ ] **Step 1: Read current CalendarSubscription**

```bash
cat src/components/CalendarSubscription.tsx
```

Note: Custom section wrapper with platform buttons

- [ ] **Step 2: Add Section and Button imports**

At top of `web/src/components/CalendarSubscription.tsx`, add:
```tsx
import { Section, Button } from "@telegram-apps/telegram-ui";
```

- [ ] **Step 3: Replace section wrapper and buttons**

Wrap the component content in Section and replace buttons:

```tsx
import { Section, Button } from "@telegram-apps/telegram-ui";
import type { WebApp } from "@twa-dev/types";
import { useCalendar } from "@/hooks/useCalendar";

interface CalendarSubscriptionProps {
  userId: number;
  webApp: WebApp;
}

export function CalendarSubscription({ userId, webApp }: CalendarSubscriptionProps) {
  const { calendarUrl, handleSubscribe } = useCalendar({ userId, webApp });

  if (!calendarUrl) return null;

  return (
    <Section header="📅 Calendar Subscription">
      <div className="mb-4">
        <p className="text-sm mb-3">
          Subscribe to your concert calendar in your favorite calendar app:
        </p>

        <div className="flex flex-col gap-2">
          <Button
            mode="filled"
            size="m"
            onClick={() => handleSubscribe("apple")}
            className="w-full"
          >
            🍎 Add to Apple Calendar
          </Button>

          <Button
            mode="filled"
            size="m"
            onClick={() => handleSubscribe("google")}
            className="w-full"
          >
            📅 Add to Google Calendar
          </Button>

          <Button
            mode="filled"
            size="m"
            onClick={() => handleSubscribe("samsung")}
            className="w-full"
          >
            📱 Add to Samsung Calendar
          </Button>
        </div>
      </div>
    </Section>
  );
}
```

- [ ] **Step 4: Update CalendarSubscription test**

```bash
pnpm test src/__tests__/components/CalendarSubscription.test.tsx
```

Update queries if needed to find Section and Button components.

- [ ] **Step 5: Visual verification**

```bash
pnpm dev
```

Test: Navigate to My Concerts tab, verify calendar section
Expected: Calendar subscription works with Telegram styling

- [ ] **Step 6: Commit CalendarSubscription migration**

```bash
git add src/components/CalendarSubscription.tsx src/__tests__/components/CalendarSubscription.test.tsx
git commit -m "Migrate CalendarSubscription to Telegram UI components

Use Section for grouping and Button for platform actions.
Calendar logic preserved unchanged.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Clean Up App.tsx

**Files:**
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Read App.tsx for remaining custom theme handling**

```bash
grep -n "var(--tg-theme" src/App.tsx
```

Find all instances of inline theme variable styles.

- [ ] **Step 2: Remove custom theme styles from container div**

In `web/src/App.tsx`, find the main container div (around line 52-56):

Remove `style` prop, rely on AppRoot theme:

```tsx
      <div className="min-h-screen pb-20">
```

- [ ] **Step 3: Remove custom theme styles from h1**

Find h1 element (around line 59-63), remove style prop:

```tsx
        <h1 className="text-2xl font-bold mb-4">
          {activeTab === "all" ? "All Concerts" : "My Concerts"}
        </h1>
```

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: All tests pass

- [ ] **Step 5: Visual verification**

```bash
pnpm dev
```

Test: Full app flow - search, vote, tabs, modal, calendar
Expected: Everything works identically with Telegram theming

- [ ] **Step 6: Commit App.tsx cleanup**

```bash
git add src/App.tsx
git commit -m "Clean up App.tsx after Telegram UI migration

Remove custom theme variable handling. AppRoot now provides
theme context to all components.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Final Cleanup and Verification

**Files:**
- Modify: `web/src/index.css` (if needed)

- [ ] **Step 1: Search for remaining custom theme variables**

```bash
grep -rn "var(--tg-theme" web/src --include="*.tsx" --include="*.css"
```

Expected: Only index.css should have theme variables for global styles

- [ ] **Step 2: Review index.css**

```bash
cat src/index.css
```

Keep Tailwind imports and body theme variables (they're for fallback).
Library components override these with their own theming.

- [ ] **Step 3: Run full test suite**

```bash
cd web
pnpm test
```

Expected: All tests pass with 100% success rate

- [ ] **Step 4: Run build**

```bash
pnpm build
```

Expected: Build succeeds with no errors or warnings

- [ ] **Step 5: Check bundle size**

```bash
ls -lh dist/assets/*.js
```

Note the JavaScript bundle size for reference.

- [ ] **Step 6: Full manual testing in dev server**

```bash
pnpm dev
```

Test complete user flows:
1. Search for concerts
2. Switch between All/My Concerts tabs
3. Vote on concerts (going, interested, not going)
4. Open concert detail modal
5. Close modal
6. View calendar subscription section

Expected: All functionality works identically to before migration

- [ ] **Step 7: Commit final cleanup**

```bash
git add .
git commit -m "Complete Telegram UI migration cleanup

Final verification: all tests pass, build succeeds, functionality
preserved. Migration from custom Tailwind styling to @telegram-apps/telegram-ui
native components complete.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] All tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] No console errors in dev server
- [ ] Search functionality works
- [ ] Tab navigation works with badge count
- [ ] Vote buttons work with state changes
- [ ] Concert detail modal opens/closes
- [ ] Calendar subscription buttons work
- [ ] No custom `var(--tg-theme-*)` inline styles remain (except in index.css for fallbacks)
- [ ] App uses library components throughout
- [ ] Visual appearance matches pre-migration (1:1 preservation)

## Notes for Implementer

- **TDD approach:** Each task includes test verification before commit
- **Incremental commits:** Each component migration is separately committed for easy rollback
- **Library API verification:** If imports fail (e.g., ModalHeader/ModalClose), check library docs at https://tgui.xelene.me/ and adjust component names
- **Tailwind usage:** Keep Tailwind for spacing/layout where library doesn't provide (e.g., `mb-4`, `flex gap-2`)
- **Theme handling:** Let library components handle Telegram theming via AppRoot context
- **Test updates:** Focus on behavioral assertions, not implementation details

## Success Criteria

- Zero functionality regressions
- All existing tests pass
- Clean codebase with no custom theme handling
- Foundation ready for implementing design mockups
