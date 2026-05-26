# Project Bug Form Configuration Implementation Plan

This feature allows administrators to customize which default bug form fields are visible and required for each project. Core fields like `title` and `description` will always be visible, but their required state remains configurable. Existing projects will fallback to default configurations automatically.

## User Review Required

> [!IMPORTANT]
> - **Configuration Storage:** The custom form settings will be saved inside each project document in Firestore under `bugFormConfig` field.
> - **Admin Access Only:** Project settings modification is restricted to accounts with the `admin` role. Non-admin users attempting to access the configuration page will be shown an Access Denied message.
> - **Screenshots Validation:** If screenshots are marked as required, the form will prevent submission unless at least one file is uploaded.

## Proposed Changes

---

### 1. Reusable Config Utilities & Dynamic Schema

#### [NEW] [bugFormUtils.ts](file:///C:/Users/Rachma%20Adzima/Downloads/QA-Management-System/src/lib/bugFormUtils.ts)
Create a helper library defining default project configurations, typescript interfaces, and a dynamic Zod schema generator.
- Define `BugFieldConfig` and `BugFormConfig` types.
- Provide `DEFAULT_BUG_FORM_CONFIG` to handle automatic fallback for existing projects.
- Export `generateBugSchema(config)` which dynamically builds a Zod validation object.

---

### 2. UI Components

#### [NEW] [switch.tsx](file:///C:/Users/Rachma%20Adzima/Downloads/QA-Management-System/src/components/ui/switch.tsx)
Build a premium toggle component using TailwindCSS transitions and HSL variables.

#### [NEW] [checkbox.tsx](file:///C:/Users/C:\Users\Rachma Adzima\Downloads\QA-Management-System\src\components\ui\checkbox.tsx)
Build a customizable checkbox component.

---

### 3. Project Settings Page

#### [NEW] [page.tsx](file:///C:/Users/Rachma%20Adzima/Downloads/QA-Management-System/src/app/(workspace)/projects/[id]/settings/page.tsx)
Implement the page layout at `/projects/[id]/settings`.
- Authenticate and authorize `admin` access.
- Fetch project details and extract `bugFormConfig` (with default fallback).
- Layout each field in a compact card row with subtle hover states, visibility toggle, and required toggle.
- Automatically disable the required toggle if visibility is turned off (and clear the required state).
- Provide options to Save, Discard changes, and Reset to default configuration.

---

### 4. Dynamic Bug Dialog Rendering

#### [MODIFY] [BugDialog.tsx](file:///C:/Users/Rachma%20Adzima/Downloads/QA-Management-System/src/components/workspace/BugDialog.tsx)
Update the bug creation dialog to render fields conditionally based on the project's config.
- Fetch the project document using React Query.
- Use `generateBugSchema` to create a dynamic Zod schema.
- Wire `screenshotUrls` state to a `"screenshots"` field in React Hook Form to validate screenshot presence.
- Conditionally render fields and show `*` required markers according to the dynamic configuration.

---

### 5. Link Navigation to Settings

#### [MODIFY] [page.tsx](file:///C:/Users/Rachma%20Adzima/Downloads/QA-Management-System/src/app/(workspace)/projects/[id]/page.tsx)
Add a "Settings" link button in the project header, visible only to admins, linking to `/projects/[id]/settings`.

---

## Verification Plan

### Automated Verification
- Run `npx tsc --noEmit` to verify type checking.
- Run `npm run build` to verify there are no compilation errors.

### Manual Verification
- Access the project settings page as an Admin and change fields configuration (e.g. disable actualResult, require endpointId).
- Log in as a QA user, open the Bug Dialog, and check if:
  - Hidden fields (like actualResult) are completely gone.
  - Required fields have asterisk labels and trigger validation errors when left empty.
  - Form submission saves values correctly to Firestore.
- Try to access the project settings page as a non-Admin user and verify the access-denied message.
