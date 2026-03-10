# Admin UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix four UX issues in the admin panel: onboarding spotlight, modal dismissal guardrails, header contrast, and German validation messages.

**Architecture:** All changes are in the frontend React app. Tasks 1-2 modify the onboarding wizard in `src/App.tsx` and the shared Dialog component. Task 3 tweaks CSS custom properties in `src/styles.css`. Task 4 replaces native HTML `required` validation with inline custom validation in German.

**Tech Stack:** React, Radix UI Dialog, Tailwind CSS v4, Playwright (e2e tests)

---

### Task 1: Onboarding spotlight — highlight the target element through the overlay

**Problem:** The onboarding wizard uses a uniform `bg-black/80 backdrop-blur-xs` overlay that hides the element being explained. The user cannot see what the step is referencing.

**Files:**
- Create: `src/shared/components/ui/spotlight-overlay.tsx`
- Modify: `src/App.tsx:580-596` (target measurement), `src/App.tsx:995-1053` (dialog rendering)
- Test: `tests/e2e/m1.spec.ts`

**Step 1: Write the failing e2e test**

Add to `tests/e2e/m1.spec.ts` after the existing `E2E-ADMIN-008` test:

```typescript
test("E2E-ADMIN-010 onboarding spotlight highlights the target element", async ({ page }) => {
  await page.goto("/admin?onboarding=force");

  const dialog = page.getByRole("dialog", { name: "Admin Einführung" });
  await expect(dialog).toBeVisible();

  // Step 1 (welcome) has no selector — no spotlight expected
  await expect(page.locator("[data-slot='spotlight-overlay']")).toHaveCount(0);

  // Advance to step 2 (theme toggle with selector)
  await dialog.getByRole("button", { name: "Weiter" }).click();
  await expect(dialog).toContainText("Schritt 2 von");

  // Spotlight overlay should now be present
  const spotlight = page.locator("[data-slot='spotlight-overlay']");
  await expect(spotlight).toBeVisible();

  // The target element should NOT be obscured — check it's above the overlay via z-index
  const themeToggle = page.locator("[data-onboarding='theme-toggle']");
  await expect(themeToggle).toBeVisible();
  const zIndex = await themeToggle.evaluate(
    (el) => window.getComputedStyle(el).zIndex,
  );
  expect(Number(zIndex)).toBeGreaterThanOrEqual(50);
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/m1.spec.ts -g "E2E-ADMIN-010" --headed`
Expected: FAIL — no `[data-slot='spotlight-overlay']` element exists yet.

**Step 3: Create the SpotlightOverlay component**

Create `src/shared/components/ui/spotlight-overlay.tsx`:

```tsx
import { useEffect, useState } from "react";

type SpotlightOverlayProps = {
  /** CSS selector for the element to highlight */
  selector: string | undefined;
};

/**
 * Renders a full-screen overlay with a transparent cutout around the target
 * element, using CSS clip-path to "punch a hole" in the dark backdrop.
 */
export function SpotlightOverlay({ selector }: SpotlightOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    function measure() {
      const el = document.querySelector(selector!);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    }

    measure();

    // Re-measure on scroll/resize so the cutout follows the element
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [selector]);

  if (!selector || !rect) {
    return null;
  }

  const padding = 8;
  const borderRadius = 12;
  const top = rect.top - padding;
  const left = rect.left - padding;
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;

  return (
    <div
      data-slot="spotlight-overlay"
      className="fixed inset-0 z-50 bg-black/70 transition-[clip-path] duration-300"
      style={{
        clipPath: `polygon(
          0% 0%, 0% 100%, ${left}px 100%, ${left}px ${top}px,
          ${left + width}px ${top}px, ${left + width}px ${top + height}px,
          ${left}px ${top + height}px, ${left}px 100%, 100% 100%, 100% 0%
        )`,
      }}
    />
  );
}
```

**Step 4: Integrate SpotlightOverlay into the onboarding wizard**

In `src/App.tsx`:

1. Import the component at the top:
   ```tsx
   import { SpotlightOverlay } from "@shared/components/ui/spotlight-overlay";
   ```

2. In the `useEffect` that handles `onboardingStep` (lines 580-596), after `scrollIntoView`, also lift the target element's z-index:
   ```tsx
   useEffect(() => {
     if (!onboardingStep) return;
     if (!onboardingStep.selector) {
       setOnboardingTargetFound(true);
       return;
     }

     const target = document.querySelector(onboardingStep.selector);
     setOnboardingTargetFound(Boolean(target));

     if (target && target instanceof HTMLElement) {
       target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
       target.style.position = "relative";
       target.style.zIndex = "50";
     }

     return () => {
       if (target && target instanceof HTMLElement) {
         target.style.position = "";
         target.style.zIndex = "";
       }
     };
   }, [onboardingStep, createdItems.length, probes.length]);
   ```

3. Render `SpotlightOverlay` just before the onboarding `<Dialog>` (around line 995):
   ```tsx
   {onboardingStep?.selector && (
     <SpotlightOverlay selector={onboardingStep.selector} />
   )}
   ```

4. Remove `backdrop-blur` from the onboarding dialog's overlay. Pass a custom `className` on `DialogContent` or switch the onboarding dialog to use `DialogPortal` + custom overlay directly, so the default `DialogOverlay` with `bg-black/80 backdrop-blur-xs` is not rendered. The SpotlightOverlay already provides the dimming.

   The cleanest approach: add an optional `hideOverlay` prop to `DialogContent`:
   ```tsx
   // In dialog.tsx — DialogContent
   function DialogContent({
     className,
     children,
     showCloseButton = true,
     hideOverlay = false,
     ...props
   }: React.ComponentProps<typeof DialogPrimitive.Content> & {
     showCloseButton?: boolean;
     hideOverlay?: boolean;
   }) {
     return (
       <DialogPortal>
         {!hideOverlay && <DialogOverlay />}
         <DialogPrimitive.Content ...>
           {children}
           ...
         </DialogPrimitive.Content>
       </DialogPortal>
     );
   }
   ```

   Then on the onboarding dialog:
   ```tsx
   <DialogContent showCloseButton={false} hideOverlay className="max-w-xl">
   ```

**Step 5: Run test to verify it passes**

Run: `npx playwright test tests/e2e/m1.spec.ts -g "E2E-ADMIN-010" --headed`
Expected: PASS

**Step 6: Run all existing e2e tests to check for regressions**

Run: `npx playwright test tests/e2e/m1.spec.ts`
Expected: All tests PASS, including E2E-ADMIN-008.

**Step 7: Commit**

```bash
git add src/shared/components/ui/spotlight-overlay.tsx src/shared/components/ui/dialog.tsx src/App.tsx tests/e2e/m1.spec.ts
git commit -m "feat(onboarding): add spotlight overlay to highlight target elements"
```

---

### Task 2: Prevent accidental dismissal of onboarding wizard

**Problem:** Clicking outside the dialog or pressing Escape closes the wizard and marks onboarding as completed. This bypasses the explicit "Überspringen" button.

**Files:**
- Modify: `src/App.tsx:995-1001` (Dialog open/close handler)
- Test: `tests/e2e/m1.spec.ts`

**Step 1: Write the failing e2e test**

```typescript
test("E2E-ADMIN-011 onboarding cannot be dismissed by clicking outside or pressing Escape", async ({ page }) => {
  await page.goto("/admin?onboarding=force");

  const dialog = page.getByRole("dialog", { name: "Admin Einführung" });
  await expect(dialog).toBeVisible();

  // Press Escape — dialog should remain open
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  // Click outside the dialog (top-left corner) — dialog should remain open
  await page.mouse.click(10, 10);
  await expect(dialog).toBeVisible();

  // Explicit skip button still works
  await dialog.getByRole("button", { name: "Überspringen" }).click();
  await expect(dialog).toBeHidden();
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/m1.spec.ts -g "E2E-ADMIN-011" --headed`
Expected: FAIL — dialog disappears on Escape or outside click.

**Step 3: Add dismissal guards to the onboarding Dialog**

In `src/App.tsx`, modify the onboarding `<DialogContent>` to prevent outside interaction and Escape:

```tsx
<DialogContent
  showCloseButton={false}
  hideOverlay
  className="max-w-xl"
  onInteractOutside={(e) => e.preventDefault()}
  onEscapeKeyDown={(e) => e.preventDefault()}
>
```

Also remove the `onOpenChange` handler from the parent `<Dialog>` that calls `markOnboardingCompleted()` on close, since the dialog can no longer be closed externally. Change:

```tsx
<Dialog
  open={Boolean(onboardingStep)}
  onOpenChange={(open) => {
    if (!open && onboardingStep) {
      markOnboardingCompleted();
    }
  }}
>
```

To:

```tsx
<Dialog open={Boolean(onboardingStep)}>
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/m1.spec.ts -g "E2E-ADMIN-011" --headed`
Expected: PASS

**Step 5: Run all e2e tests for regressions**

Run: `npx playwright test tests/e2e/m1.spec.ts`
Expected: All PASS

**Step 6: Commit**

```bash
git add src/App.tsx tests/e2e/m1.spec.ts
git commit -m "fix(onboarding): prevent accidental dismissal via outside click or Escape"
```

---

### Task 3: Improve header text contrast

**Problem:** The admin header title ("Leaf Sap One Up") and subtitle ("Adminbereich") have insufficient contrast in dark mode. The `text-muted-foreground` color is too faint.

**Files:**
- Modify: `src/styles.css:88-89` (dark mode muted-foreground)
- Test: `tests/e2e/m1.spec.ts`

**Step 1: Write the failing e2e test**

```typescript
test("E2E-ADMIN-012 header text meets minimum contrast in dark mode", async ({ page }) => {
  // Force dark mode via API + onboarding=off to avoid wizard interference
  await page.goto("/admin?onboarding=off");
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
  });

  const subtitle = page.locator("text=Adminbereich");
  await expect(subtitle).toBeVisible();

  // Extract computed color and background, verify lightness is adequate
  const lightness = await subtitle.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const color = style.color;
    // Parse rgb values
    const match = color.match(/(\d+)/g);
    if (!match) return 0;
    const [r, g, b] = match.map(Number);
    // Relative luminance approximation
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  });

  // WCAG AA for normal text requires 4.5:1 ratio.
  // On dark bg (~0.15 background), foreground luminance should be > 0.5
  expect(lightness).toBeGreaterThan(0.5);
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/m1.spec.ts -g "E2E-ADMIN-012" --headed`
Expected: FAIL — current `muted-foreground` in dark mode is too dim.

**Step 3: Increase dark-mode muted-foreground lightness**

In `src/styles.css`, change the dark mode `--muted-foreground` value from:

```css
--muted-foreground: oklch(0.737 0.021 106.9);
```

To a brighter value that passes WCAG AA (4.5:1) against `--background: oklch(0.153 ...)`:

```css
--muted-foreground: oklch(0.80 0.021 106.9);
```

This raises lightness from 0.737 to 0.80 while keeping the same hue and chroma.

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/m1.spec.ts -g "E2E-ADMIN-012" --headed`
Expected: PASS

**Step 5: Visually verify**

Open `/admin` in dark mode in a browser. Confirm "Leaf Sap One Up" and "Adminbereich" are clearly legible. Check that other muted-foreground text (descriptions, labels) also look good — no elements should become overly bright.

**Step 6: Commit**

```bash
git add src/styles.css tests/e2e/m1.spec.ts
git commit -m "fix(ui): increase dark-mode muted-foreground contrast for WCAG AA"
```

---

### Task 4: Replace native browser validation with custom German messages

**Problem:** The `required` attribute on form inputs triggers the browser's native validation tooltip in the browser's locale (e.g. "Please fill in this field." in English), breaking the German-only UI.

**Files:**
- Modify: `src/App.tsx:643-681` (create-probes form)
- Test: `tests/e2e/m1.spec.ts`

**Step 1: Write the failing e2e test**

```typescript
test("E2E-ADMIN-013 form validation messages appear in German", async ({ page }) => {
  await page.goto("/admin?onboarding=off");

  // Leave "Kunde" field empty and submit
  const orderInput = page.locator("#order-number");
  await orderInput.fill("TEST-123");

  const submitButton = page.getByRole("button", { name: "Links erstellen" });
  await submitButton.click();

  // Expect a visible inline German error, not the native tooltip
  const errorMessage = page.locator("[data-slot='field-error']").first();
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText("Pflichtfeld");
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/m1.spec.ts -g "E2E-ADMIN-013" --headed`
Expected: FAIL — no `[data-slot='field-error']` element exists.

**Step 3: Add custom validation to the create-probes form**

In `src/App.tsx`, change the form to use `noValidate` and add inline error state:

1. Add validation state near the other state declarations:
   ```tsx
   const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
   ```

2. Add `noValidate` to the form element and wrap the `handleCreate` to validate first:
   ```tsx
   <form className="grid gap-4 md:grid-cols-3" noValidate onSubmit={(e) => {
     e.preventDefault();
     const errors: Record<string, string> = {};
     if (!customerName.trim()) errors["customer-name"] = "Pflichtfeld";
     if (!orderNumber.trim()) errors["order-number"] = "Pflichtfeld";
     if (!probeCount || probeCount < 1) errors["probe-count"] = "Mindestens 1";
     setFieldErrors(errors);
     if (Object.keys(errors).length > 0) return;
     handleCreate(e);
   }}>
   ```

3. After each `<Input>` that has `required`, add an inline error message and remove the `required` attribute:
   ```tsx
   <Input
     id="customer-name"
     value={customerName}
     onChange={(event) => {
       setCustomerName(event.target.value);
       setFieldErrors((prev) => { const next = { ...prev }; delete next["customer-name"]; return next; });
     }}
   />
   {fieldErrors["customer-name"] && (
     <p data-slot="field-error" className="text-xs text-destructive">{fieldErrors["customer-name"]}</p>
   )}
   ```

   Repeat the same pattern for `order-number` and `probe-count` inputs.

4. Remove the `required` attribute from all three inputs in the create-probes form (`customer-name`, `order-number`, `probe-count`).

**Step 4: Run test to verify it passes**

Run: `npx playwright test tests/e2e/m1.spec.ts -g "E2E-ADMIN-013" --headed`
Expected: PASS

**Step 5: Run all e2e tests for regressions**

Run: `npx playwright test tests/e2e/m1.spec.ts`
Expected: All PASS

**Step 6: Commit**

```bash
git add src/App.tsx tests/e2e/m1.spec.ts
git commit -m "fix(i18n): replace native required validation with custom German messages"
```

---

## Execution Notes

- **Task order matters:** Task 1 creates `hideOverlay` prop in `dialog.tsx`; Task 2 depends on it being present.
- **Task 3 and 4 are independent** of Tasks 1-2 and can be parallelized.
- Run `npx playwright test` after all tasks to ensure no regressions across the full suite.
- The farmer-facing form (`/probe/:token`) also has `required` attributes (lines 1325-1385). Task 4 scope is admin form only. A follow-up task can address the farmer form if needed.
