# Shadcn Admin Dashboard

Admin Dashboard UI crafted with Shadcn and Vite. Built with responsiveness and accessibility in mind.

![alt text](public/images/shadcn-admin.png)

[![Sponsored by Clerk](https://img.shields.io/badge/Sponsored%20by-Clerk-5b6ee1?logo=clerk)](https://go.clerk.com/GttUAaK)

I've been creating dashboard UIs at work and for my personal projects. I always wanted to make a reusable collection of dashboard UI for future projects; and here it is now. While I've created a few custom components, some of the code is directly adapted from ShadcnUI examples.

> This is not a starter project (template) though. I'll probably make one in the future.

## Features

- Light/dark mode
- Responsive
- Accessible
- With built-in Sidebar component
- Global search command
- 10+ pages
- Extra custom components
- RTL support

<details>
<summary>Customized Components (click to expand)</summary>

This project uses Shadcn UI components, but some have been slightly modified for better RTL (Right-to-Left) support and other improvements. These customized components differ from the original Shadcn UI versions.

If you want to update components using the Shadcn CLI (e.g., `npx shadcn@latest add <component>`), it's generally safe for non-customized components. For the listed customized ones, you may need to manually merge changes to preserve the project's modifications and avoid overwriting RTL support or other updates.

> If you don't require RTL support, you can safely update the 'RTL Updated Components' via the Shadcn CLI, as these changes are primarily for RTL compatibility. The 'Modified Components' may have other customizations to consider.

### Modified Components

- scroll-area
- sonner
- separator

### RTL Updated Components

- alert-dialog
- calendar
- command
- dialog
- dropdown-menu
- select
- table
- sheet
- sidebar
- switch

**Notes:**

- **Modified Components**: These have general updates, potentially including RTL adjustments.
- **RTL Updated Components**: These have specific changes for RTL language support (e.g., layout, positioning).
- For implementation details, check the source files in `src/components/ui/`.
- All other Shadcn UI components in the project are standard and can be safely updated via the CLI.

</details>

## Tech Stack

**UI:** [ShadcnUI](https://ui.shadcn.com) (TailwindCSS + RadixUI)

**Build Tool:** [Vite](https://vitejs.dev/)

**Routing:** [TanStack Router](https://tanstack.com/router/latest)

**Type Checking:** [TypeScript](https://www.typescriptlang.org/)

**Linting/Formatting:** [ESLint](https://eslint.org/) & [Prettier](https://prettier.io/)

**Icons:** [Lucide Icons](https://lucide.dev/icons/), [Tabler Icons](https://tabler.io/icons) (Brand icons only)

**Auth (partial):** [Clerk](https://go.clerk.com/GttUAaK)

## Run Locally

Clone the project

```bash
  git clone https://github.com/satnaing/shadcn-admin.git
```

Go to the project directory

```bash
  cd shadcn-admin
```

Install dependencies

```bash
  pnpm install
```

Start the server

```bash
  pnpm run dev
```

## Sponsoring this project ❤️

If you find this project helpful or use this in your own work, consider [sponsoring me](https://github.com/sponsors/satnaing) to support development and maintenance. You can [buy me a coffee](https://buymeacoffee.com/satnaing) as well. Don’t worry, every penny helps. Thank you! 🙏

For questions or sponsorship inquiries, feel free to reach out at [satnaingdev@gmail.com](mailto:satnaingdev@gmail.com).

### Current Sponsor

- [Clerk](https://go.clerk.com/GttUAaK) - authentication and user management for the modern web

## Author

Crafted with 🤍 by [@satnaing](https://github.com/satnaing)

## License

Licensed under the [MIT License](https://choosealicense.com/licenses/mit/)

## Dynamic backend for Sidebar + Flexible Tables

This project includes a lightweight backend API so you can manage sidebar categories/menus and dynamic tables at runtime.

### 1) Start backend

#### Docker

```bash
docker compose -f docker-compose.backend.yml up -d
```

#### Local

```bash
pnpm backend:dev
```

Backend API base URL: `http://localhost:4000`

### 2) Configure env

Backend env (`.env.backend.example`):

- `BACKEND_HOST=0.0.0.0`
- `BACKEND_PORT=4000`
- `BACKEND_DB_PATH=./backend/arvix.db`

Frontend env (`.env.example`):

- `VITE_BACKEND_URL=http://localhost:4000`

### 3) Health check

```bash
curl http://localhost:4000/health
```

Expected:

```json
{"ok": true}
```

### 4) How to test Category Management end-to-end

1. Open dashboard and go to **Settings > Category Management**.
2. Create a new item:
   - Group: `Other`
   - Title: `Audit Log`
   - URL: `/reporting/audit-log`
   - Display mode: `vertical`
   - Parent: `No parent`
3. Click **Add menu item**.
4. Confirm it appears in the left main sidebar immediately (no hard refresh needed).
5. Refresh the page and confirm the item still exists (DB persistence check).
8. Validate via API:

```bash
curl http://localhost:4000/api/sidebar-items
```

7. Confirm dynamic items are merged without removing existing static menu items.

### 5) How to test Table Management end-to-end

1. Open **Settings > Table Management**.
2. Create a table:
   - Table name: `audit_events`
   - Columns: `event(text)`, `actor(text)`, `timestamp(date)`
   - Attach to menu item: choose the item created in Category Management (optional).
3. Click **Create table**.
4. Open created table and add rows using the generated form.
5. After assignment, verify the table appears immediately in the sidebar as a child menu item under the assigned category.
6. Click that sidebar table item and verify it opens `/dynamic-tables/<TABLE_ID>` with:
   - a final user-facing table page
   - small top action icons (Filter and Add Row)
   - per-column filters applied from the filter icon dialog
   - add row via top icon dialog
   - delete row via top delete icon that opens full table with per-row delete buttons
7. Refresh page and verify table and rows are still present.
8. Validate via API:

```bash
curl http://localhost:4000/api/dynamic-tables
```

```bash
curl http://localhost:4000/api/dynamic-tables/<TABLE_ID>/rows
```

9. Re-assign table to another menu item using the assignment selector and verify **Assignment Preview** updates immediately on the same page.
10. Delete a row and then delete the table to confirm full CRUD.

### 6) API reference

#### Sidebar/category management

- `GET /api/sidebar-config` (hierarchical tree)
- `GET /api/sidebar-items` (flat list)
- `POST /api/sidebar-items`
- `DELETE /api/sidebar-items/:id`

`displayMode` values:

- `hierarchy` (sidebar-like nested menu)
- `vertical` (in-page vertical list style)

#### Dynamic tables

- `GET /api/dynamic-tables`
- `POST /api/dynamic-tables`
- `PATCH /api/dynamic-tables/:id/assignment`
- `DELETE /api/dynamic-tables/:id`
- `GET /api/dynamic-tables/:id/rows`
- `POST /api/dynamic-tables/:id/rows`
- `DELETE /api/dynamic-table-rows/:id`

### 7) Stop backend

```bash
docker compose -f docker-compose.backend.yml down
```
