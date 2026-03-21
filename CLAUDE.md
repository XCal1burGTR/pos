# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start development (React + Electron together)
npm run dev

# Run only the React dev server (Vite on port 5173)
npm run dev:react

# Run only the Electron process (waits for Vite to be ready)
npm run dev:electron

# Production build (Vite build + electron-builder package)
npm run build

# Lint (ESLint, zero warnings allowed)
npm run lint
```

There are no test scripts configured.

## Architecture

This is an **Electron + React** desktop POS (Point of Sale) application for a retail/communications shop. The React frontend runs in an Electron BrowserWindow — in dev mode it loads from `http://localhost:5173`, in production from the `dist/` build output.

### Data Persistence

There is **no database**. All data is persisted via [electron-store](https://github.com/sindresorhus/electron-store) (JSON files in the OS app data directory). Communication between the React renderer and Electron main process uses IPC:

- `ipcRenderer.invoke('get-data', key)` — read a key
- `ipcRenderer.send('save-data', key, value)` — write a key

Stored keys: `inventory`, `settings`, `stockLogs`, `orders`, `credits`, `users`, `adminPassword`.

### Authentication & Roles

[src/context/AuthContext.jsx](src/context/AuthContext.jsx) manages login state. The app always shows [src/pages/Login.jsx](src/pages/Login.jsx) when no session exists (`sessionStorage` key `auth_user`).

There are two roles with completely different UIs:

- **Administrator** — built-in account (`username: 'Administrator'`, default password `Password123`, stored in electron-store under `adminPassword`). Sees `AdminDashboard`, `Settings`, and `UserManagement` only. Cannot access POS, orders, or inventory.
- **Staff** — accounts created by admin (stored under `users` key). Sees the full POS interface.

User accounts have optional `expiryDate` and `deactivationDate` fields; `getUserStatus()` returns `'active'`, `'expired'`, or `'deactivated'` based on these. Passwords are stored in plaintext in electron-store.

[src/pages/UserManagement.jsx](src/pages/UserManagement.jsx) (admin-only) supports batch user creation, edit, password reset, and deletion.

### State Management

Global app state lives in [src/context/ShopContext.jsx](src/context/ShopContext.jsx). This single context holds `inventory`, `cart`, `orders`, `stockLogs`, `settings`, and `credits`, along with all mutation functions (`addProduct`, `addStock`, `processSale`, `addCredit`, `recordCreditPayment`, etc.). It syncs to electron-store on every change via `useEffect`.

[src/context/ToastContext.jsx](src/context/ToastContext.jsx) provides toast notifications app-wide.

### Key Product Concepts

Products have two special types that affect POS behavior:

- **Variable price** (`isVariablePrice: true`) — no fixed price; cashier enters the amount at sale time (used for services)
- **Recharge products** (`isRecharge: true`) — variants represent telecom operators/plans; treated specially in billing

Products with variants store stock and weighted-average cost per variant. Batch stock additions recalculate the weighted average cost automatically.

#### Product fields
- `name`, `hsnCode`, `description` — product identity
- `isVariablePrice`, `minStockAlert`, `stock`, `price`, `gstRate`, `avgCostPrice`
- `variants` — map of variant name → `{ quantity, avgCost, price, gstRate, code, color, description }`

#### Stock input form (Products page)
The variant stock form is split into two rows:
- **Row 1:** Add Quantity | Total Buying Cost | Cost Per Unit (auto = total ÷ qty, read-only)
- **Row 2:** Selling Price per unit | GST %

Each variant also has: **Code/SKU**, **Color**, **Variant Description** — stored on the variant object.

### Credit Sales

When a customer pays less than the bill total, the sale is recorded as a credit sale:
- Customer name, phone, and address are captured at checkout
- A credit record is saved with `status: 'pending'`, `paidAmount`, and `pendingAmount`
- Payments are recorded via the Credits page (`recordCreditPayment`)
- When fully paid, status changes to `'settled'`

Credit functionality works for all payment methods: Cash, UPI, and Card.

### Pages

| Page           | File                                                               | Role       | Purpose                                           |
|----------------|--------------------------------------------------------------------|------------|---------------------------------------------------|
| Login          | [src/pages/Login.jsx](src/pages/Login.jsx)                        | All        | Login screen (shown when no session)              |
| Dashboard      | `Dashboard` in [src/App.jsx](src/App.jsx)                         | Staff      | Stats overview + collection breakdown             |
| Admin Dashboard| `AdminDashboard` in [src/App.jsx](src/App.jsx)                    | Admin      | Revenue/profit overview + active staff list       |
| POS            | [src/pages/POS.jsx](src/pages/POS.jsx)                            | Staff      | Billing, cart, receipts, GST, credit sales        |
| Products       | [src/pages/Products.jsx](src/pages/Products.jsx)                  | Staff      | Product CRUD with variant support (2-row stock form) |
| Orders         | [src/pages/Orders.jsx](src/pages/Orders.jsx)                      | Staff      | Sales history                                     |
| Credits        | [src/pages/Credit.jsx](src/pages/Credit.jsx)                      | Staff      | Credit sale tracking and payment collection       |
| Settings       | [src/pages/Settings.jsx](src/pages/Settings.jsx)                  | Both       | Store info, logo upload with canvas cropping      |
| User Management| [src/pages/UserManagement.jsx](src/pages/UserManagement.jsx)      | Admin      | Create/edit/delete staff accounts                 |

> `src/pages/Inventory.jsx` and `src/pages/Pricing.jsx` exist as files but are **not currently routed** in `App.jsx` or the sidebar.

### Dashboard Stats

The staff `Dashboard` supports five time periods (Today / Week / Month / Quarter / Year) and displays:
- **Revenue**, **Orders** — filtered by selected period
- **Cash / UPI / Card Collected** — payment method breakdown for selected period
- **Money Invested, Profit, Margin** — only shown when products have `avgCostPrice` set
- **Total Products, Low Stock** — stock alert count with out-of-stock vs low-stock breakdown
- **Credit Due** — total pending amount across all credit records
- **Credit Collected** — total payments received on credit sales

The admin `AdminDashboard` shows Revenue / Profit / Margin / Margin % across all periods plus an active staff list.

### Sidebar Navigation

[src/components/Sidebar.jsx](src/components/Sidebar.jsx) renders different nav sets per role:

- **Staff nav:** Dashboard, POS / Billing, Order History, Credits (with amber badge for pending count), Products, Settings
- **Admin nav:** Dashboard, Settings, Users

The sidebar is collapsible on desktop and becomes a drawer on mobile.

### Styling

Tailwind CSS with custom theme colors defined in [tailwind.config.js](tailwind.config.js): `primary` (indigo `#6366f1`), `secondary` (pink `#ec4899`), `dark` (`#1e293b`), `darker` (`#0f172a`). The `cn()` utility in [src/utils/cn.js](src/utils/cn.js) merges Tailwind classes (clsx + tailwind-merge).

### Electron Security Note

[electron/main.js](electron/main.js) runs with `nodeIntegration: true` and `contextIsolation: false` — a deliberate simplification for this local-only desktop app.
