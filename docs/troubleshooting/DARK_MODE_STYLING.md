# Dark Mode Styling - Troubleshooting Guide

## Overview

This document provides patterns and solutions for common dark mode visibility issues in the Next.js application using Tailwind CSS v4.

## Common Issues and Solutions

### Issue 1: Insufficient Contrast for Interactive Elements

**Symptom:** Hover states or borders are barely visible in dark mode.

**Root Cause:** Using adjacent Tailwind color steps (e.g., gray-700 hover on gray-800 background) provides insufficient visual contrast.

**Solution:**
- Use **minimum 2-step jumps** in color scale for hover states
- For backgrounds on gray-800/900, use gray-600 for hover states
- For borders on dark backgrounds, use gray-500 or lighter

**Examples:**

```tsx
// ❌ Bad - Insufficient contrast
className="bg-gray-800 hover:bg-gray-700"

// ✅ Good - Clear contrast
className="bg-gray-800 hover:bg-gray-600"

// ❌ Bad - Border barely visible
className="border dark:border-gray-600"

// ✅ Good - Border clearly visible
className="border-2 dark:border-gray-500"
```

### Issue 2: Terminal/Code Output Border Visibility

**Symptom:** Terminal emulator or code block borders blend into dark container backgrounds.

**Root Cause:** Single-pixel borders with similar color values to adjacent backgrounds.

**Solution:**
- Use thicker borders (`border-2` instead of `border`)
- Add subtle glow effects with box-shadow
- Use lighter border colors (gray-500 instead of gray-600)

**Example:**

```tsx
// ReadOnlyTerminal.tsx - Terminal border styling
className={`
  rounded
  border-2
  border-gray-300
  dark:border-gray-500
  dark:shadow-[0_0_0_1px_rgba(107,114,128,0.3)]
  overflow-hidden
`}
```

**Parameters:**
- `border-2`: 2px border for better visibility
- `dark:border-gray-500`: Lighter gray for contrast
- Shadow: `0_0_0_1px_rgba(107,114,128,0.3)` provides subtle outer glow

### Issue 3: Dropdown/Menu Item Hover States

**Symptom:** Can't tell which menu item is being hovered over in dark mode, or active/selected items are too subtle.

**Root Cause:**
- Subtle background transitions without border or additional feedback
- Insufficient contrast between active item background and container background
- Light mode active states too pale (e.g., `bg-blue-50`)
- Dark mode active states too dark (e.g., `dark:bg-blue-900/30`)

**Solution:**
- Use strong hover background color (2+ steps in scale)
- Darken dropdown container background (`dark:bg-gray-900` instead of `dark:bg-gray-800`)
- Increase active state contrast with brighter colors and higher opacity
- Add border highlights that change on hover
- Use active state indicators (colored left border, stronger background)

**Example:**

```tsx
// Dropdown container - darker background for better item contrast
<div className="absolute bottom-full left-0 mb-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20 overflow-hidden">

// Permission mode dropdown item
className={`
  w-full flex items-center gap-2 px-3 py-2 text-sm
  hover:bg-gray-100
  dark:hover:bg-gray-700
  transition-colors
  ${mode.value === defaultMode
    ? 'bg-blue-100 dark:bg-blue-600/40 border-l-2 border-blue-500'
    : ''
  }
`}
```

**Active State Indicators:**
- Left border accent: `border-l-2 border-blue-500`
- Light mode: `bg-blue-100` (stronger than `bg-blue-50`)
- Dark mode: `dark:bg-blue-600/40` (brighter and more opaque than `dark:bg-blue-900/30`)
- Container: `dark:bg-gray-900` (darker than `dark:bg-gray-800` for better contrast)

**Fixed in:** `src/components/chat/ChatInput.tsx` (2026-02-05)

### Issue 4: Focus Ring Accessibility

**Symptom:** No visual feedback for keyboard navigation in dark mode.

**Root Cause:** Missing or insufficient focus ring styles.

**Solution:**
- Always add focus rings to interactive elements
- Use semi-transparent ring colors for visibility on all backgrounds
- Add ring offset for dark backgrounds

**Example:**

```tsx
className="
  ...
  focus:ring-2
  focus:ring-blue-500/50
  focus:ring-offset-1
  dark:focus:ring-offset-gray-900
  ...
"
```

## Color Scale Reference

For dark mode backgrounds on Tailwind CSS:

| Background | Hover State | Border | Focus Ring Offset |
|------------|-------------|--------|-------------------|
| gray-900 | gray-700 or gray-600 | gray-500/gray-400 | gray-900 |
| gray-800 | gray-600 | gray-500/gray-400 | gray-900 |
| gray-700 | gray-500 | gray-400 | gray-800 |

## Testing Checklist

When implementing dark mode styles:

- [ ] Test hover states with actual dark mode background colors
- [ ] Verify borders are visible against container backgrounds
- [ ] Check focus rings work for keyboard navigation
- [ ] Ensure active states are clearly distinguishable
- [ ] Test on different displays/brightness levels
- [ ] Verify transitions are smooth (use `transition-all` for multi-property changes)

## Implementation Pattern

### Standard Interactive Element (Button, Select, etc.)

```tsx
className="
  /* Base styles */
  bg-gray-100 dark:bg-gray-800
  border border-gray-200 dark:border-gray-600

  /* Hover states */
  hover:bg-gray-200 dark:hover:bg-gray-600
  hover:border-gray-300 dark:hover:border-gray-500

  /* Focus states */
  focus:ring-2 focus:ring-blue-500/50
  focus:ring-offset-1 dark:focus:ring-offset-gray-900

  /* Transitions */
  transition-all

  /* Disabled states */
  disabled:opacity-50
"
```

### Terminal/Code Container

```tsx
className="
  /* Border with glow */
  rounded
  border-2 border-gray-300 dark:border-gray-500
  dark:shadow-[0_0_0_1px_rgba(107,114,128,0.3)]

  /* Background */
  overflow-hidden
"
style={{ backgroundColor: theme.background }}
```

### Dropdown Menu Item

```tsx
// Container - use darker background for better item contrast
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 ...">

// Menu item
className={`
  /* Base layout */
  w-full flex items-center gap-2 px-3 py-2

  /* Hover states - 2+ step jump for visibility */
  hover:bg-gray-100 dark:hover:bg-gray-700
  transition-colors

  /* Active state - stronger colors and higher opacity */
  ${isActive
    ? 'bg-blue-100 dark:bg-blue-600/40 border-l-2 border-blue-500'
    : ''
  }
`}
```

## Related Files

- `src/components/terminal/ReadOnlyTerminal.tsx` - Terminal border implementation
- `src/components/ui/DefaultModeSelector.tsx` - Select element hover states
- `src/components/chat/ChatInput.tsx` - Mode selector and dropdown examples
- `CLAUDE.md` - Memory section with "Dark Mode Visibility Improvements (2026-02-05)"

## Future Improvements

### Potential Feature: CLI Interactive Responses

**Status:** Deferred (architectural complexity)

**Context:** When CLI prompts for user input (y/n confirmations), users currently cannot respond without switching to interactive terminal mode.

**Requirements for Implementation:**
1. Process lifecycle management - Keep stdin open across requests
2. Process pool with shared map of active processes keyed by session ID
3. New API endpoint: `/api/claude/respond` for writing to stdin
4. State management: Add `pendingCliPrompt` to Zustand store
5. Pattern detection in stream for CLI prompts (regex matching)
6. UI component: `CliPromptResponse.tsx` with Yes/No buttons or text input
7. Integration in `MessageList.tsx` to show response UI

**Complexity:** High - Requires refactoring `/api/claude/route.ts` to maintain long-lived processes and handle concurrency/cleanup.

**Estimated Effort:** 5-8 hours development + testing

**Security Considerations:**
- Process cleanup on errors/disconnects
- Timeout handling for abandoned prompts
- Input validation and sanitization

## References

- Tailwind CSS v4 Color Documentation
- WCAG 2.1 Contrast Guidelines (AA minimum: 4.5:1 for text, 3:1 for UI components)
- Next.js Dark Mode Implementation Guide
