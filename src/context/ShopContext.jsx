import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';

const ShopContext = createContext();

export const useShop = () => useContext(ShopContext);

const getIpcRenderer = () => {
    // Strict check: Only enable in real Electron environment
    if (!navigator.userAgent.includes('Electron')) {
        return null;
    }

    try {
        if (globalThis.require) {
            const electron = globalThis.require('electron');
            const ipc = electron.ipcRenderer;
            if (ipc && typeof ipc.invoke === 'function') {
                return ipc;
            }
        }
    } catch (e) {
        console.warn("Electron IPC not available:", e);
    }
    return null;
};

const ipcRenderer = getIpcRenderer();

const calculateVariantTotals = (variants, fallbackCost = 0) => {
    const vals = Object.values(variants || {});
    if (vals.length === 0) return { totalQty: 0, avgCost: 0 };
    let totalVal = 0;
    let totalQty = 0;
    for (const v of vals) {
        const q = typeof v === 'number' ? v : (v.quantity || 0);
        const c = typeof v === 'number' ? fallbackCost : (v.avgCost || 0);
        totalVal += q * c;
        totalQty += q;
    }
    return { totalQty, avgCost: totalQty > 0 ? totalVal / totalQty : 0 };
};

const calculateNewAvgCost = (oldQty, oldCost, addQty, addCost) => {
    if (addQty <= 0) return oldCost;
    if (oldQty <= 0) return addCost;
    return ((oldQty * oldCost) + (addQty * addCost)) / (oldQty + addQty);
};

export const ShopProvider = ({ children }) => {
    const [inventory, setInventory] = useState([]);
    const [stockLogs, setStockLogs] = useState([]); // Master Log of Purchases
    const [orders, setOrders] = useState([]); // Master Log of Add Sales
    const [cart, setCart] = useState([]);
    const [credits, setCredits] = useState([]);
    const [invoiceCounter, setInvoiceCounter] = useState(0);
    const [settings, setSettings] = useState({
        storeName: 'Aman Communication',
        address: 'Main Market, City',
        phone: '9876543210',
        email: 'store@example.com',
        gstin: '',
        pan: '',
        logo: '', // Base64 string
        ownerName: 'Your Name',
        ownerPhone: '',
        ownerEmail: '',
        footerMessage: 'Thank you for shopping with us!'
    });

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!ipcRenderer) return setIsLoading(false);

            const fetchSafe = async (key, fallback) => {
                try {
                    const data = await ipcRenderer.invoke('get-data', key);
                    return data ?? fallback;
                } catch {
                    return fallback;
                }
            };

            try {
                const [inv, set, stkl, ord, cred, cnt] = await Promise.all([
                    fetchSafe('inventory', []),
                    fetchSafe('settings', null),
                    fetchSafe('stockLogs', []),
                    fetchSafe('orders', []),
                    fetchSafe('credits', []),
                    fetchSafe('invoiceCounter', 0)
                ]);

                if (Array.isArray(inv)) setInventory(inv);
                if (set) setSettings(set);
                if (Array.isArray(stkl)) setStockLogs(stkl);
                setOrders(Array.isArray(ord) ? ord : []);
                if (Array.isArray(cred)) setCredits(cred);
                if (typeof cnt === 'number') setInvoiceCounter(cnt);
            } catch (err) {
                console.error("Critical: Failed to load data session:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // ... (saveInventory) ...

    const saveOrders = (newOrders) => {
        setOrders(newOrders);
        if (ipcRenderer) {
            ipcRenderer.send('save-data', 'orders', newOrders);
        }
    };

    const saveCredits = (newCredits) => {
        setCredits(newCredits);
        if (ipcRenderer) ipcRenderer.send('save-data', 'credits', newCredits);
    };

    // Helper to save inventory
    const saveInventory = (newInventory) => {
        setInventory(newInventory);
        if (ipcRenderer) {
            ipcRenderer.send('save-data', 'inventory', newInventory);
        }
    };

    // Helper to save logs
    const saveStockLogs = (newLogs) => {
        setStockLogs(newLogs);
        if (ipcRenderer) {
            ipcRenderer.send('save-data', 'stockLogs', newLogs);
        }
    };

    // Helper to save invoice counter
    const saveInvoiceCounter = (n) => {
        setInvoiceCounter(n);
        if (ipcRenderer) {
            ipcRenderer.send('save-data', 'invoiceCounter', n);
        }
    };

    // Generate next invoice ID in DDMMYY-000001 format (never resets)
    const getNextInvoiceId = () => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        const next = invoiceCounter + 1;
        saveInvoiceCounter(next);
        return `${dd}${mm}${yy}-${String(next).padStart(6, '0')}`;
    };

    // Helper to save settings
    const saveSettings = (newSettings) => {
        setSettings(newSettings);
        if (ipcRenderer) {
            ipcRenderer.send('save-data', 'settings', newSettings);
        }
    };

    // STOCK IN (Add Stock & Calculate Avg Cost)
    // STOCK IN (Add Stock & Calculate Avg Cost) - Handles Multiple Batches
    const addStock = (items) => {
        // Normalize to array
        const batch = Array.isArray(items) ? items : [items];
        const date = new Date().toISOString();
        const newLogs = [];

        // Calculate new inventory state based on CURRENT inventory
        // We use a functional approach to accumulate changes across the batch
        let currentInventory = [...inventory];

        batch.forEach(({ name, quantity, unitCost, sellingPrice, isVariablePrice = false, note = '' }) => {
            const existingProductIndex = currentInventory.findIndex(p => p.name.toLowerCase() === name.toLowerCase());

            if (existingProductIndex >= 0) {
                // Update Existing Product
                const item = currentInventory[existingProductIndex];

                // Variants Logic: Promote to Rich Object { quantity, avgCost }
                const currentVariants = item.variants || {};
                const variantKey = note || 'Default';

                // Handle backward compatibility (if variant was just a number)
                let oldVariantStats = currentVariants[variantKey];
                if (typeof oldVariantStats === 'number') {
                    oldVariantStats = { quantity: oldVariantStats, avgCost: item.avgCostPrice || 0 };
                } else if (!oldVariantStats) {
                    oldVariantStats = { quantity: 0, avgCost: 0 };
                }

                const oldVarQty = oldVariantStats.quantity;
                const oldVarCost = oldVariantStats.avgCost;

                // Calculate User's specific unit cost for this batch
                // If they provided a total cost, strict unit cost is total / qty.
                // If they left it blank, we might fallback or assume 0? 
                // Context: The UI calculates `unitCost` passed here as (Total / Qty) OR (Existing Avg).
                // So `unitCost` here is strictly the "Buying Price of this batch".

                let newVarAvgCost = oldVarCost;
                if (quantity > 0) {
                    newVarAvgCost = ((oldVarQty * oldVarCost) + (quantity * unitCost)) / (oldVarQty + quantity);
                }

                const newVariantQty = oldVarQty + quantity;

                // Update the Variant Map
                const updatedVariants = {
                    ...currentVariants,
                    [variantKey]: {
                        ...(typeof currentVariants[variantKey] === 'object' ? currentVariants[variantKey] : {}),
                        quantity: newVariantQty,
                        avgCost: newVarAvgCost
                    }
                };

                // Recalculate Global Weighted Average for the Master Product (for summary)
                // We can either simple-average the batch, or re-calculate total value of all variants
                // Strategy: Re-sum all variant values to get true master average
                let totalStockVal = 0;
                let totalStockQty = 0;

                Object.values(updatedVariants).forEach(v => {
                    const vQty = typeof v === 'number' ? v : v.quantity;
                    const vCost = typeof v === 'number' ? (item.avgCostPrice || 0) : v.avgCost;
                    totalStockVal += (vQty * vCost);
                    totalStockQty += vQty;
                });

                const masterAvgCost = totalStockQty > 0 ? (totalStockVal / totalStockQty) : 0;

                const updatedItem = {
                    ...item,
                    stock: totalStockQty, // Sync stock with sum of variants
                    avgCostPrice: masterAvgCost,
                    price: sellingPrice === undefined ? item.price : sellingPrice,
                    variants: updatedVariants
                };

                // Update the temporary inventory array strictly at the index
                currentInventory[existingProductIndex] = updatedItem;

            } else {
                // Create New Product
                const variantKey = note || 'Default';
                const initialVariants = {
                    [variantKey]: { quantity: quantity, avgCost: unitCost }
                };

                const newProduct = {
                    id: Date.now() + Math.random(),
                    name: name,
                    stock: quantity,
                    avgCostPrice: unitCost,
                    price: sellingPrice || 0,
                    gstRate: 0,
                    isVariablePrice: isVariablePrice,
                    variants: initialVariants
                };
                currentInventory.push(newProduct);
            }

            // Prepare Log
            newLogs.push({
                id: Date.now() + Math.random(),
                productName: name,
                quantity,
                unitCost,
                totalCost: quantity * unitCost,
                date,
                note
            });
        });

        // Commit all changes at once
        saveInventory(currentInventory);
        saveStockLogs([...newLogs, ...stockLogs]);
    };

    const addProduct = (product) => {
        // Initialize variants structure if provided as array of names or object
        let initialVariants = {};
        if (product.variants && Array.isArray(product.variants)) {
            // Convert ["Red", "Blue"] to { "Red": { quantity: 0, avgCost: 0 }, ... }
            product.variants.forEach(v => {
                initialVariants[v] = { quantity: 0, avgCost: 0 };
            });
        } else if (product.variants) {
            initialVariants = product.variants;
        }

        const newProduct = {
            ...product,
            id: Date.now(),
            avgCostPrice: 0,
            variants: initialVariants
        };
        const updatedInventory = [...inventory, newProduct];
        saveInventory(updatedInventory);
    };

    const deleteProduct = (id) => {
        const updatedInventory = inventory.filter(item => item.id !== id);
        saveInventory(updatedInventory);
    };

    const updateProduct = (id, updatedFields) => {
        const updatedInventory = inventory.map(item =>
            item.id === id ? { ...item, ...updatedFields } : item
        );
        saveInventory(updatedInventory);
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateCartQuantity = (id, quantity) => {
        if (quantity < 1) {
            removeFromCart(id);
            return;
        }
        setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));
    };

    const updateCartPrice = (id, price) => {
        setCart(prev => prev.map(item => item.id === id ? { ...item, price: Number.parseFloat(price) || 0 } : item));
    };

    const clearCart = () => setCart([]);

    // UPSERT PRODUCT — create-or-update with optional stock-in (atomic, no stale-closure issue)
    const upsertProduct = ({ name, hsnCode = '', price = 0, gstRate = 0, isVariablePrice = false, minStockAlert = 5, quantity = 0, unitCost = 0, variantNote = '' }) => {
        const date = new Date().toISOString();
        let currentInventory = [...inventory];
        const existingIndex = currentInventory.findIndex(p => p.name.toLowerCase() === name.toLowerCase());

        if (existingIndex >= 0) {
            const item = currentInventory[existingIndex];
            let updatedItem = { ...item, hsnCode, gstRate, price: price === undefined ? item.price : price };

            if (quantity > 0) {
                const variantKey = variantNote || 'Default';
                const currentVariants = item.variants || {};
                let old = currentVariants[variantKey];
                if (typeof old === 'number') old = { quantity: old, avgCost: item.avgCostPrice || 0 };
                else if (!old) old = { quantity: 0, avgCost: 0 };

                const newAvgCost = calculateNewAvgCost(old.quantity, old.avgCost, quantity, unitCost);

                const updatedVariants = { ...currentVariants, [variantKey]: { ...old, quantity: old.quantity + quantity, avgCost: newAvgCost } };

                const { totalQty, avgCost } = calculateVariantTotals(updatedVariants, item.avgCostPrice);
                updatedItem = { ...updatedItem, stock: totalQty, variants: updatedVariants, avgCostPrice: avgCost };
            }
            currentInventory[existingIndex] = updatedItem;
        } else {
            const variantKey = variantNote || 'Default';
            currentInventory.push({
                id: Date.now(),
                name, hsnCode, stock: quantity, avgCostPrice: unitCost,
                price, gstRate, isVariablePrice,
                minStockAlert: isVariablePrice ? 0 : minStockAlert,
                variants: { [variantKey]: { quantity, avgCost: unitCost } }
            });
        }

        saveInventory(currentInventory);
        if (quantity > 0) {
            saveStockLogs([{
                id: Date.now() + Math.random(),
                productName: name, quantity, unitCost,
                totalCost: quantity * unitCost, date, note: variantNote
            }, ...stockLogs]);
        }
    };

    // SAVE PRODUCT WITH MULTIPLE VARIANTS — atomic batch create/update
    const saveProductWithVariants = ({ name, hsnCode = '', description = '', isVariablePrice = false, minStockAlert = 5, variantRows = [] }) => {
        const date = new Date().toISOString();
        let currentInventory = [...inventory];
        const existingIndex = currentInventory.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
        const newLogs = [];

        if (existingIndex >= 0) {
            const item = currentInventory[existingIndex];
            const updatedVariants = item.variants ? { ...item.variants } : {};

            variantRows.forEach(row => {
                const vKey = row.name.trim() || 'Default';
                const qty = Number.parseInt(row.quantity) || 0;
                const cost = Number.parseFloat(row.unitCost) || 0;
                const sp = Number.parseFloat(row.sellingPrice) || 0;
                const gr = Number.parseFloat(row.gstRate) || 0;
                const vCode = row.variantCode || '';
                const vColor = row.variantColor || '';
                const vDesc = row.variantDescription || '';
                const vMinStock = Number.parseInt(row.minStockAlert) || 5;

                let old = updatedVariants[vKey];
                if (typeof old === 'number') old = { quantity: old, avgCost: item.avgCostPrice || 0 };
                else if (!old) old = { quantity: 0, avgCost: 0 };

                const newAvgCost = calculateNewAvgCost(old.quantity || 0, old.avgCost || 0, qty, cost);

                updatedVariants[vKey] = { ...old, quantity: (old.quantity || 0) + qty, avgCost: newAvgCost, price: sp, gstRate: gr, code: vCode, color: vColor, description: vDesc, minStockAlert: vMinStock };

                if (qty > 0) {
                    newLogs.push({ id: Date.now() + Math.random(), productName: name, note: row.name.trim(), quantity: qty, unitCost: cost, totalCost: qty * cost, date });
                }
            });

            let totalStockVal = 0, totalStockQty = 0;
            Object.values(updatedVariants).forEach(v => {
                const q = typeof v === 'number' ? v : (v.quantity || 0);
                const c = typeof v === 'number' ? (item.avgCostPrice || 0) : (v.avgCost || 0);
                totalStockVal += q * c; totalStockQty += q;
            });
            const firstV = Object.values(updatedVariants)[0];
            const masterPrice = (typeof firstV === 'object' ? firstV.price : null) ?? item.price ?? 0;

            currentInventory[existingIndex] = {
                ...item, hsnCode, description,
                variants: updatedVariants,
                stock: totalStockQty,
                avgCostPrice: totalStockQty > 0 ? totalStockVal / totalStockQty : 0,
                price: masterPrice,
            };
        } else {
            const productVariants = {};
            let totalQty = 0, totalVal = 0, firstPrice = 0, firstGst = 0;

            variantRows.forEach((row, i) => {
                const vKey = row.name.trim() || 'Default';
                const qty = Number.parseInt(row.quantity) || 0;
                const cost = Number.parseFloat(row.unitCost) || 0;
                const sp = Number.parseFloat(row.sellingPrice) || 0;
                const gr = Number.parseFloat(row.gstRate) || 0;
                productVariants[vKey] = { quantity: qty, avgCost: cost, price: sp, gstRate: gr, code: row.variantCode || '', color: row.variantColor || '', description: row.variantDescription || '', minStockAlert: Number.parseInt(row.minStockAlert) || 5 };
                totalQty += qty; totalVal += qty * cost;
                if (i === 0) { firstPrice = sp; firstGst = gr; }
                if (qty > 0) {
                    newLogs.push({ id: Date.now() + Math.random(), productName: name, note: row.name.trim(), quantity: qty, unitCost: cost, totalCost: qty * cost, date });
                }
            });

            currentInventory.push({
                id: Date.now(), name, hsnCode, description, isVariablePrice,
                minStockAlert: isVariablePrice ? 0 : (Number.parseInt(minStockAlert) || 5),
                stock: totalQty,
                avgCostPrice: totalQty > 0 ? totalVal / totalQty : 0,
                price: firstPrice, gstRate: firstGst,
                variants: productVariants,
            });
        }

        saveInventory(currentInventory);
        if (newLogs.length > 0) {
            saveStockLogs([...newLogs, ...stockLogs]);
        }
    };

    // EDIT PRODUCT FULL — update metadata + all variants (replaces variants, adds stock)
    const editProductFull = ({ id, name, hsnCode = '', description = '', isVariablePrice = false, minStockAlert = 5, variantRows = [] }) => {
        // variantRows: [{ name, isNew, currentStock, avgCost, addQty, unitCost, sellingPrice, gstRate }]
        const date = new Date().toISOString();
        let currentInventory = [...inventory];
        const existingIndex = currentInventory.findIndex(p => p.id === id);
        if (existingIndex === -1) return;

        const item = currentInventory[existingIndex];
        const newVariants = {};
        const newLogs = [];

        variantRows.forEach(row => {
            const vKey = row.name.trim() || 'Default';
            const qty = Number.parseInt(row.addQty) || 0;
            const cost = Number.parseFloat(row.unitCost) || 0;
            const sp = Number.parseFloat(row.sellingPrice) || 0;
            const gr = Number.parseFloat(row.gstRate) || 0;

            let oldQty = 0, oldAvgCost = 0;
            if (!row.isNew) {
                const existingV = item.variants?.[row.name];
                if (existingV === undefined) {
                    oldQty = row.currentStock || 0;
                    oldAvgCost = row.avgCost || 0;
                } else {
                    oldQty = typeof existingV === 'number' ? existingV : (existingV.quantity || 0);
                    oldAvgCost = typeof existingV === 'number' ? (item.avgCostPrice || 0) : (existingV.avgCost || 0);
                }
            }

            const newAvgCost = calculateNewAvgCost(oldQty, oldAvgCost, qty, cost);

            newVariants[vKey] = { quantity: oldQty + qty, avgCost: newAvgCost, price: sp, gstRate: gr, code: row.variantCode || '', color: row.variantColor || '', description: row.variantDescription || '', minStockAlert: Number.parseInt(row.minStockAlert) || 5 };

            if (qty > 0) {
                newLogs.push({ id: Date.now() + Math.random(), productName: name, note: vKey === 'Default' ? '' : vKey, quantity: qty, unitCost: cost, totalCost: qty * cost, date });
            }
        });

        const { totalQty: newTotalQty, avgCost: newAvgCostGlobal } = calculateVariantTotals(newVariants, item.avgCostPrice);
        const firstV = Object.values(newVariants)[0];
        const masterPrice = firstV?.price ?? item.price ?? 0;

        currentInventory[existingIndex] = {
            ...item,
            name, hsnCode, description, isVariablePrice,
            minStockAlert: isVariablePrice ? 0 : (Number.parseInt(minStockAlert) || 5),
            variants: newVariants,
            stock: newTotalQty,
            avgCostPrice: newAvgCostGlobal,
            price: masterPrice,
        };

        saveInventory(currentInventory);
        if (newLogs.length > 0) {
            saveStockLogs([...newLogs, ...stockLogs]);
        }
    };

    // RESET ALL DATA (Wipe inventory, orders, stockLogs — keep settings)
    const resetAllData = () => {
        saveInventory([]);
        saveOrders([]);
        saveStockLogs([]);
        setCart([]);
    };

    // CANCEL ORDER (Restock + Mark Cancelled)
    const cancelOrder = (orderId) => {
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) return false;
        const order = orders[orderIndex];
        if (order.status === 'cancelled') return false;

        const currentInventory = [...inventory];

        order.items.forEach(item => {
            // Don't restock variable-price / service items
            if (item.isVariablePrice) return;

            const productIndex = currentInventory.findIndex(
                p => p.id === (item.originalId || item.id)
            );
            if (productIndex === -1) return;
            const product = currentInventory[productIndex];

            if (item.variantName && product.variants?.[item.variantName]) {
                const variant = product.variants[item.variantName];
                const oldQty = typeof variant === 'number' ? variant : (variant.quantity || 0);
                const oldCost = typeof variant === 'number' ? (product.avgCostPrice || 0) : variant.avgCost;
                const extraProps = typeof variant === 'object' ? variant : {};

                const updatedVariants = {
                    ...product.variants,
                    [item.variantName]: { ...extraProps, quantity: oldQty + item.quantity, avgCost: oldCost }
                };
                let totalStock = 0;
                Object.values(updatedVariants).forEach(v => {
                    totalStock += (typeof v === 'number' ? v : (v.quantity || 0));
                });
                currentInventory[productIndex] = { ...product, stock: totalStock, variants: updatedVariants };
            } else {
                currentInventory[productIndex] = { ...product, stock: (product.stock || 0) + item.quantity };
            }
        });

        saveInventory(currentInventory);
        const updatedOrders = orders.map((o, i) =>
            i === orderIndex
                ? { ...o, status: 'cancelled', cancelledAt: new Date().toISOString() }
                : o
        );
        saveOrders(updatedOrders);
        return true;
    };

    // PROCESS SALE (Deduct Stock & Create Order)
    const DEFAULT_DISCOUNT = { type: 'percent', value: 0, amount: 0 };
    const processSale = (cartItems, discountDetails = DEFAULT_DISCOUNT, paymentInfo = {}, invoiceId = null) => {
        const currentInventory = [...inventory];
        const date = new Date().toISOString();

        let subtotal = 0;
        let totalGst = 0;

        // 1. Deduct Stock & Calculate Totals
        const orderItems = cartItems.map(cartItem => {
            const productIndex = currentInventory.findIndex(p => p.id === (cartItem.originalId || cartItem.id));
            if (productIndex === -1) return cartItem; // Should not happen

            const product = currentInventory[productIndex];

            // Calculate Item Totals for Record
            const itemTotal = cartItem.price * cartItem.quantity;
            const itemGst = (itemTotal * cartItem.gstRate) / 100;
            subtotal += itemTotal;
            totalGst += itemGst;

            // Handle Variant Deduction
            if (cartItem.variantName && product.variants?.[cartItem.variantName]) {
                const variant = product.variants[cartItem.variantName];
                const oldQty = typeof variant === 'number' ? variant : variant.quantity;
                const oldCost = typeof variant === 'number' ? (product.avgCostPrice || 0) : variant.avgCost;
                const extraProps = typeof variant === 'object' ? variant : {};
                const newQty = Math.max(0, oldQty - cartItem.quantity);

                const updatedVariants = {
                    ...product.variants,
                    [cartItem.variantName]: { ...extraProps, quantity: newQty, avgCost: oldCost }
                };

                // Recalc Master Stock
                let totalStock = 0;
                Object.values(updatedVariants).forEach(v => totalStock += (typeof v === 'number' ? v : v.quantity));

                currentInventory[productIndex] = { ...product, stock: totalStock, variants: updatedVariants };

            } else {
                // Standard Product Deduction
                const newStock = Math.max(0, product.stock - cartItem.quantity);
                currentInventory[productIndex] = { ...product, stock: newStock };
            }

            let costAtSale = product.avgCostPrice || 0;
            if (cartItem.variantName && product.variants?.[cartItem.variantName]) {
                const variant = product.variants[cartItem.variantName];
                costAtSale = typeof variant === 'object' ? variant.avgCost : (product.avgCostPrice || 0);
            }

            return {
                ...cartItem,
                itemTotal,
                itemGst,
                costAtSale,
            };
        });

        // 2. Finalize Order Data
        const grossTotal = subtotal + totalGst;
        const discountAmount = discountDetails.amount || 0;
        const finalTotal = Math.max(0, grossTotal - discountAmount);

        const newOrder = {
            id: invoiceId || Date.now().toString(),
            date,
            items: orderItems,
            subtotal,
            totalGst,
            discount: discountDetails,
            finalTotal,
            status: 'completed',
            paymentMethod: paymentInfo.method || 'cash',
            tenderedAmount: paymentInfo.tenderedAmount ?? null,
            changeGiven: paymentInfo.changeGiven ?? null,
        };

        // 3. Save Everything
        saveInventory(currentInventory);

        const updatedOrders = [newOrder, ...orders];
        saveOrders(updatedOrders);

        setCart([]);
    };

    const addCredit = (creditData) => {
        const newCredit = {
            id: Date.now(),
            ...creditData,
            status: creditData.pendingAmount < 0.01 ? 'settled' : 'pending',
            payments: [],
            createdAt: new Date().toISOString(),
        };
        const updated = [newCredit, ...credits];
        saveCredits(updated);
        return newCredit;
    };

    const recordCreditPayment = (creditId, amount, note = '') => {
        const updated = credits.map(c => {
            if (c.id !== creditId) return c;
            const newPaid = (c.paidAmount || 0) + amount;
            const newPending = Math.max(0, c.totalAmount - newPaid);
            const payment = { amount, date: new Date().toISOString(), note };
            return {
                ...c,
                paidAmount: newPaid,
                pendingAmount: newPending,
                status: newPending < 0.01 ? 'settled' : 'pending',
                payments: [...(c.payments || []), payment],
            };
        });
        saveCredits(updated);
    };

    const contextValue = useMemo(() => ({
        inventory,
        orders,
        cart,
        settings,
        stockLogs,
        isLoading,
        addStock,
        addProduct,
        upsertProduct,
        saveProductWithVariants,
        editProductFull,
        deleteProduct,
        updateProduct,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartPrice,
        clearCart,
        processSale,
        cancelOrder,
        resetAllData,
        getNextInvoiceId,
        updateSettings: saveSettings,
        credits,
        addCredit,
        recordCreditPayment
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [inventory, orders, cart, settings, stockLogs, isLoading, credits]);

    return (
        <ShopContext.Provider value={contextValue}>
            {children}
        </ShopContext.Provider>
    );
};

ShopProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
