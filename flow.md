# Application Flow — Shop Management POS

## 1. Startup & Data Load

```
Electron main.js
  └── Creates BrowserWindow (1280×800)
        ├── DEV  → loads http://localhost:5173  (Vite dev server)
        └── PROD → loads dist/index.html

React mount  (src/main.jsx)
  └── <App>
        └── <ShopProvider>          ← loads all persisted data via IPC
              └── <ToastProvider>
                    └── <AppContent>
                          └── <Layout>  (Sidebar + Navbar + main content)
```

**On ShopProvider mount** (`useEffect`), five IPC calls fire in sequence:
```
ipcRenderer.invoke('get-data', 'inventory')  → setInventory([...])
ipcRenderer.invoke('get-data', 'settings')   → setSettings({...})
ipcRenderer.invoke('get-data', 'stockLogs')  → setStockLogs([...])
ipcRenderer.invoke('get-data', 'orders')     → setOrders([...])
ipcRenderer.invoke('get-data', 'credits')    → setCredits([...])
```
While loading, `isLoading = true`. After all five resolve (or fail gracefully), `isLoading = false` and the app renders fully.

---

## 2. Global State (ShopContext)

All pages share one context. Every mutation immediately persists to disk via `ipcRenderer.send('save-data', key, value)`.

| State key    | Type    | Description                                        |
|--------------|---------|----------------------------------------------------|
| `inventory`  | Array   | All products with stock, variants, costs           |
| `orders`     | Array   | All completed sales (newest first)                 |
| `stockLogs`  | Array   | All stock-in events (purchase history)             |
| `cart`       | Array   | Current in-progress sale items                     |
| `settings`   | Object  | Store info, logo, owner details                    |
| `credits`    | Array   | All credit sales with payment history              |

### Product data shape
```json
{
  "id": 1710000000000,
  "name": "Airtel Recharge",
  "description": "Prepaid and DTH recharge plans",
  "hsnCode": "9984",
  "stock": 150,
  "price": 299,
  "gstRate": 18,
  "avgCostPrice": 280,
  "isVariablePrice": false,
  "minStockAlert": 10,
  "variants": {
    "Prepaid": {
      "quantity": 100, "avgCost": 278, "price": 299, "gstRate": 18,
      "code": "AIR-PRE", "color": "Red", "description": "Unlimited calls"
    },
    "DTH": {
      "quantity": 50, "avgCost": 283, "price": 349, "gstRate": 18,
      "code": "AIR-DTH", "color": "Blue", "description": "HD channels"
    }
  }
}
```

### Credit record data shape
```json
{
  "id": 1710000000001,
  "date": "2026-03-16T10:00:00.000Z",
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "customerAddress": "123 Main St",
  "totalAmount": 500,
  "paidAmount": 200,
  "pendingAmount": 300,
  "paymentMethod": "cash",
  "status": "pending",
  "orderId": 1710000000000,
  "payments": [
    { "date": "2026-03-17T09:00:00.000Z", "amount": 100, "note": "Partial" }
  ]
}
```

---

## 3. Module-by-Module Flow

### 3.1 Dashboard (`App.jsx`)
- Reads `inventory`, `orders`, and `credits` from context (no mutations)
- Computes live stats on every render:
  - **Total Sales Today** — sums `finalTotal` from orders where `date` starts with today's ISO date string
  - **Total Orders Today** — count of today's orders
  - **Low Stock Alert** — count of non-service products where `stock < minStockAlert`
  - **Credit Due** — sum of `pendingAmount` from credits with `status: 'pending'`
  - **Credit Collected** — sum of all payments made across credit records
- **Collections by Payment Mode** — sums `tenderedAmount` (capped at `finalTotal`) from completed orders, grouped by `paymentMethod` (Cash / UPI / Card)

---

### 3.2 Products Master (`Products.jsx`)

**Create / Update Stock flow:**
```
User types product name
  → auto-matched against inventory (case-insensitive)
  → if matched: form pre-fills with existing data (isExisting = true)
  → if not matched: new product form

User fills:
  - HSN Code, Description
  - Variants (each with: name, Code/SKU, Color, Variant Description)
  - Per variant: Add Qty, Total Buying Cost → Cost Per Unit (auto = total/qty)
  - Per variant: Selling Price, GST %

handleSave
  → compute unitCost = totalCost / quantity for each variant row
  → saveProductWithVariants({ name, hsnCode, description, isVariablePrice, minStockAlert, variantRows })
        → if existing: update variants (weighted avg cost), update hsnCode/description
        → if new: create product with all fields
        → saveInventory + saveStockLogs
```

**Edit flow (Edit Modal):**
```
Click Edit → openEdit(item)
  → editingProduct = { id, name, hsnCode, description, isVariablePrice, minStockAlert }
  → editVariantRows = existing variants with pre-filled code/color/description/sellingPrice/gstRate

User modifies any field including:
  - Product description
  - Per variant: Code/SKU, Color, Variant Description
  - Add more stock (Add Qty + Total Buying Cost → auto CPU)
  - Selling Price, GST %

handleSaveEdit
  → compute unitCost = totalCost / addQty for each row
  → editProductFull({ id, name, hsnCode, description, isVariablePrice, minStockAlert, variantRows })
        → replaces all variants, adds any new stock, recalculates avgCost
        → saves inventory + stock logs
```

**Delete flow:**
```
Click Delete → deleteConfirm = { id, name }  (shows confirmation modal)
  → confirm → deleteProduct(id)
      → inventory.filter(item => item.id !== id)
      → saveInventory(filteredInventory)
```

---

### 3.3 Inventory (`Inventory.jsx`)

**Stock-in flow:**
```
User searches product → selects from dropdown
  → stockEntries initialized:
      { "VariantName": { quantity: '', unitCost: '' }, ... }
      (or { "Default": {...} } for no-variant products)

User fills quantity + cost per variant → handleSave
  → builds updates[] array (skips entries with qty ≤ 0)
  → addStock(updates[])
        → forEach update:
            find product by name in inventory
            calculate new weighted average cost:
              newAvgCost = (oldQty × oldCost + newQty × newCost) / (oldQty + newQty)
            update variant: { quantity: oldQty + newQty, avgCost: newAvgCost }
            recalculate master avgCostPrice from all variants
        → saveInventory(updated)
        → saveStockLogs([...newLogs, ...stockLogs])
```

**Current stock display** (right panel) — live read from `inventory`, auto-updates on any inventory change. Service products (`isVariablePrice`) show a purple "∞" badge; other products show green/red based on `minStockAlert`.

---

### 3.4 Pricing (`Pricing.jsx`)

**Edit price flow:**
```
User selects product from search or table row
  → variantPrices initialized:
      { "VariantName": { price: vData.price, gst: vData.gstRate }, ... }
      (or { "Default": { price: product.price, gst: product.gstRate } })

  → user edits selling price + GST per variant
  → handleSave
      Case A — no variants:
        updateProduct(id, { price, gstRate, isVariablePrice })

      Case B — has variants:
        merge price/gstRate into each variant object (preserving quantity/avgCost/code/color/description)
        updateProduct(id, { variants: updatedVariants, price: firstVariantPrice, isVariablePrice })
```

**Margin display** — shown per variant: `sellingPrice − avgCost` (green if positive, red if negative).

**Quick create** — if search term not found, "Create" button creates a new product with `isVariablePrice: true` via `addProduct`.

---

### 3.5 POS / Billing (`POS.jsx`)

#### Product selection
```
Click product card
  ├── Has variants? → open Variant Selection Overlay
  │     ├── isRecharge (name includes "recharge")?
  │     │     → open Recharge Modal (enter mobile number + amount)
  │     │           → handleRechargeSubmit → addToCart(rechargeItem) → close both overlays
  │     └── Standard variant?
  │           → stock check: variantData.quantity > 0 && currentCartQty < variantData.quantity
  │           → addToCart(variantItem with id="${productId}-${variantName}")
  │           → close overlay
  └── No variants?
        → stock check (skip for isVariablePrice)
        → addToCart({ ...product, maxStock: product.stock })
```

#### Cart item IDs
| Item type        | Cart `id`                                            |
|------------------|------------------------------------------------------|
| Standard product | product.id                                           |
| Variant item     | `${product.id}-${variantName}`                       |
| Recharge item    | `${product.id}-${variantName}-${Date.now()}` (unique)|

#### Quantity controls
- **"−"** → `updateCartQuantity(id, qty − 1)` — removes item if qty reaches 0
- **"+"** → blocked if `item.quantity >= item.maxStock` (toast shown)
- Variable-price items show an inline `<input>` for the price, connected to `updateCartPrice`

#### Payment flow
```
handleCheckout → opens PaymentModal

PaymentModal state:
  method: 'cash' | 'upi' | 'card'
  tenderedAmount (cash) / partialPaid (upi/card)

  paidNum derived:
    cash → parseFloat(tenderedAmount) || 0
    upi/card → partialPaid === '' ? finalTotal : parseFloat(partialPaid)

  pendingAmount = max(0, finalTotal - paidNum)
  isCreditSale = pendingAmount > 0

  if isCreditSale:
    → show amber box with customer Name, Phone, Address inputs

  cash: show quick-amount buttons (exact, round values above total)
  upi/card: show Amount Received input
    → confirmation message shown only when amount >= finalTotal or no input yet

handlePaymentConfirm:
  1. Snapshot cart + totals into printData
  2. processSale(cart, discountDetails, { method, tenderedAmount })
       → saves order with paymentMethod + tenderedAmount
  3. if isCreditSale → addCredit({ customer, totalAmount, paidAmount, pendingAmount, method, orderId })
  4. setTimeout(window.print, 300ms)
  5. Reset modal state; show success toast
```

#### Discount calculation
```
grossTotal = subtotal + totalGst
discountAmount:
  percent → (grossTotal × discountValue) / 100
  amount  → discountValue (flat)
finalTotal = max(0, grossTotal − discountAmount)
```

---

### 3.6 Orders (`Orders.jsx`)

Read-only view of `orders` array from context.

```
Filter by date:
  "all"   → all orders
  "today" → orders where order.date.startsWith(today ISO date)

Search:
  matches order.id (toString) OR any item.name (case-insensitive)

Sort: newest first (by order.date descending)

Stats: sum of finalTotal for filtered set
```

---

### 3.7 Credits (`Credit.jsx`)

Manages credit sales (orders where customer paid less than total).

```
Display:
  tabs: Pending | Settled | All
  search by customer name or phone
  shows: customer info, total/paid/pending amounts, payment history

Record Payment modal:
  enter amount + optional note
  → recordCreditPayment(creditId, amount, note)
        → appends to credit.payments[]
        → updates paidAmount, pendingAmount
        → if pendingAmount === 0: status = 'settled'
        → saveCredits(updatedCredits)
```

---

### 3.8 Settings (`Settings.jsx`)

```
formData = local copy of settings (re-synced on settings change via useEffect)

handleChange → updates formData field (name attr maps to settings key)

Logo upload flow:
  file input → FileReader → base64 data URL → imageSrc
  → Cropper modal (react-easy-crop, 1:1 aspect)
  → handleCropSave:
      getCroppedImg(imageSrc, croppedAreaPixels)
        → draws crop region on <canvas>
        → canvas.toDataURL('image/png')  → base64 string
      → formData.logo = croppedBase64

handleSubmit (form submit):
  updateSettings(formData)
    → setSettings(formData)
    → ipcRenderer.send('save-data', 'settings', formData)
  → logo immediately appears in Sidebar and on printed receipts
```

---

## 4. Inter-Module Data Flow

```
Products   ──creates──▶  inventory[]  ◀──reads── POS (product grid)
                              │                   │
Inventory  ──addStock──▶      │         POS ──processSale──▶ orders[]
                              │                   │
Pricing    ──updatePrice──▶   │         POS ──addCredit──▶ credits[]
                              │                              │
                    Dashboard reads all             Credits ◀──reads──┘
```

### Lifecycle of a product
```
1. Products → create (stock=0, price=0) — set description, HSN, variant details
2. Pricing  → set selling price + GST per variant
3. Inventory → add stock + purchase cost (calculates avgCost for margin)
4. POS      → sell (deducts stock, creates order; optionally creates credit)
5. Credits  → collect pending payment if credit sale
6. Dashboard / Orders → report on sales and collections
```

---

## 5. Electron IPC Reference

| Direction       | Channel      | Payload        | Purpose                    |
|-----------------|--------------|----------------|----------------------------|
| Renderer → Main | `save-data`  | `(key, value)` | Persist state to JSON file |
| Renderer → Main | `get-data`   | `(key)`        | Load state on startup      |

Stored keys: `inventory`, `settings`, `stockLogs`, `orders`, `credits`

Data lives in the OS app-data directory (managed by `electron-store`).
