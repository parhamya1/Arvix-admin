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

> راهنمای مرحله‌به‌مرحله اجرا و استفاده (برای اضافه/حذف آیتم سایدبار و ساخت جدول داینامیک)

### 1) اجرا کردن بک‌اند

#### روش A (پیشنهادی): با Docker

```bash
docker compose -f docker-compose.backend.yml up -d
```

بعد از اجرا:

- API روی `http://localhost:4000` بالا می‌آید.
- دیتابیس SQLite داخل فایل `backend/arvix.db` ذخیره می‌شود (نیازی به کانتینر دیتابیس جدا نیست).

#### روش B: بدون Docker (لوکال)

```bash
pnpm backend:dev
```

یا:

```bash
python backend/server.py
```

### 2) تنظیم متغیرهای محیطی

1. فایل `.env.backend.example` را کپی کنید.
2. مقدارها را در محیط خودتان ست کنید:

- `BACKEND_HOST=0.0.0.0`
- `BACKEND_PORT=4000`
- `BACKEND_DB_PATH=./backend/arvix.db`

برای اتصال فرانت به بک‌اند:

- در `.env.example` مقدار `VITE_BACKEND_URL=http://localhost:4000` قرار دارد.

### 3) تست سریع سلامت سرویس

```bash
curl http://localhost:4000/health
```

خروجی مورد انتظار:

```json
{"ok": true}
```

### 4) مدیریت آیتم‌های Sidebar

#### 4-1) دیدن ساختار فعلی سایدبار

```bash
curl http://localhost:4000/api/sidebar-config
```

#### 4-2) اضافه کردن آیتم جدید

```bash
curl -X POST http://localhost:4000/api/sidebar-items \
  -H "Content-Type: application/json" \
  -d '{
    "groupTitle": "General",
    "title": "My Reports",
    "url": "/my-reports",
    "sortOrder": 100
  }'
```

#### 4-3) حذف آیتم

```bash
curl -X DELETE http://localhost:4000/api/sidebar-items/<ITEM_ID>
```

> `ITEM_ID` را از خروجی API یا از `GET /api/sidebar-config` بردارید.

### 5) ساخت جدول داینامیک (با هر تعداد ستون)

#### 5-1) ساخت جدول

```bash
curl -X POST http://localhost:4000/api/dynamic-tables \
  -H "Content-Type: application/json" \
  -d '{
    "name": "site_inventory",
    "columns": [
      { "key": "site_name", "label": "Site Name", "type": "text" },
      { "key": "region", "label": "Region", "type": "text" },
      { "key": "active", "label": "Active", "type": "boolean" },
      { "key": "created_at", "label": "Created At", "type": "date" }
    ]
  }'
```

پاسخ یک `id` برمی‌گرداند (مثلاً `TABLE_ID`) که برای ثبت ردیف‌ها لازم است.

#### 5-2) لیست جدول‌ها

```bash
curl http://localhost:4000/api/dynamic-tables
```

#### 5-3) اضافه کردن ردیف به جدول

```bash
curl -X POST http://localhost:4000/api/dynamic-tables/<TABLE_ID>/rows \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "site_name": "Tehran-01",
      "region": "Tehran",
      "active": true,
      "created_at": "2026-02-20"
    }
  }'
```

#### 5-4) دیدن ردیف‌های جدول

```bash
curl http://localhost:4000/api/dynamic-tables/<TABLE_ID>/rows
```

#### 5-5) حذف یک ردیف

```bash
curl -X DELETE http://localhost:4000/api/dynamic-table-rows/<ROW_ID>
```

#### 5-6) حذف کل جدول

```bash
curl -X DELETE http://localhost:4000/api/dynamic-tables/<TABLE_ID>
```

### 6) خاموش کردن سرویس Docker

```bash
docker compose -f docker-compose.backend.yml down
```

اگر خواستی، در مرحله بعد می‌توانم یک UI داخل پنل ادمین هم اضافه کنم که بدون curl همه این کارها را با فرم انجام بدهی.
