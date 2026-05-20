# QABug UI Revamp to Premium Modern SaaS Dashboard

Revamp the application UI into a premium, modern, and highly polished SaaS dashboard experience inspired by Linear, Vercel, Supabase, and Notion Calendar.

## User Review Required

> [!IMPORTANT]
> - **Theme Persistence:** We will configure `next-themes` as the provider to persist dark/light selections. By default, it will match the system settings but allow manual override.
> - **UI Changes:** A floating sidebar layout will be implemented for desktop views, keeping content centered and structured. Cards will receive `rounded-2xl` corners and soft shadows.

## Open Questions

- *Do you have a preferred theme-toggle icon animation? We plan to implement a smooth rotation fade animation using standard Tailwind transitions.*

---

## Proposed Changes

### 1. Root Setup & Themes Configuration

#### [NEW] [ThemeProvider.tsx](file:///c:/Users/Rachma Adzima/Downloads/QA-Management-System/src/components/providers/ThemeProvider.tsx)
Create a Next.js client-side wrapper around `next-themes`' `ThemeProvider` to support theme injection in App Router.

#### [MODIFY] [layout.tsx](file:///c:/Users/Rachma Adzima/Downloads/QA-Management-System/src/app/layout.tsx)
- Import `Plus Jakarta Sans` Google Font.
- Wrap elements with `ThemeProvider` supporting both `light` and `dark` classes.
- Remove hardcoded `dark` className from the `<html>` root element.

#### [MODIFY] [globals.css](file:///c:/Users/Rachma Adzima/Downloads/QA-Management-System/src/app/globals.css)
- Define premium color palettes for light and dark modes based on clean Slate/Zinc.
- Update CSS variables for cards, borders, buttons, and popovers.
- Configure `Plus Jakarta Sans` font declarations.

---

### 2. Workspace Navigation Layout

#### [NEW] [ThemeToggle.tsx](file:///c:/Users/Rachma Adzima/Downloads/QA-Management-System/src/components/workspace/ThemeToggle.tsx)
Create an animated sun/moon icon toggle using framer-motion to switch between light and dark modes.

#### [MODIFY] [layout.tsx](file:///c:/Users/Rachma Adzima/Downloads/QA-Management-System/src/app/(workspace)/layout.tsx)
- Redesign layouts to use a floating sidebar style on desktop with soft backgrounds.
- Update loading skeletons to match light/dark styling.

#### [MODIFY] [AppSidebar.tsx](file:///c:/Users/Rachma Adzima/Downloads/QA-Management-System/src/components/workspace/AppSidebar.tsx)
- Redesign the sidebar: floating card layout with subtle shadows, refined hover interactions, and elegant text tracking.

#### [MODIFY] [Navbar.tsx](file:///c:/Users/Rachma Adzima/Downloads/QA-Management-System/src/components/workspace/Navbar.tsx)
- Add the new `ThemeToggle` component to the right section.
- Modernize breadcrumb navigation and role badge presentation.

---

### 3. Dashboard, Projects & Bugs Redesign

#### [MODIFY] [page.tsx](file:///c:/Users/Rachma Adzima/Downloads/QA-Management-System/src/app/(workspace)/dashboard/page.tsx)
- Redesign analytics cards with gradient indicators and soft borders.
- Make charts compatible with both light and dark backgrounds.

#### [MODIFY] [ProjectCard.tsx](file:///c:/Users/Rachma Adzima/Downloads/QA-Management-System/src/components/workspace/ProjectCard.tsx)
- Apply `rounded-2xl` styling, soft borders, and hover translation effects.

#### [MODIFY] [EndpointTable.tsx](file:///c:/Users/Rachma Adzima/Downloads/QA-Management-System/src/components/workspace/EndpointTable.tsx)
- Add a monospace font for API endpoint paths.
- Polish filter controls and empty states.

#### [MODIFY] [page.tsx](file:///c:/Users/Rachma Adzima/Downloads/QA-Management-System/src/app/(workspace)/bugs/[id]/page.tsx)
- Revamp timeline nodes, severity tags, and details cards.

#### [MODIFY] [page.tsx](file:///c:/Users/Rachma Adzima/Downloads/QA-Management-System/src/app/login/page.tsx)
- Restyle auth cards to match the soft-minimalist SaaS login page format.

---

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` to verify type safety.
- Run `npm run build` to verify standard production bundle output.

### Manual Verification
- Test light mode and dark mode switching via the navigation header toggle.
- Verify that forms, dialog overlays, tables, and buttons render cleanly in both light and dark themes.
