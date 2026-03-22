import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useShop } from '../context/ShopContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalBody, ModalFooter } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Select } from '../components/ui/Select';
import { cn } from '../utils/cn';
import {
    Search, ShoppingCart, Trash2, Printer,
    Minus, Plus, X, Package,
    Banknote, CreditCard, Smartphone, CheckCircle2
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useToast } from '../context/ToastContext';

const { ipcRenderer } = globalThis.require('electron');

// ── Payment method config ─────────────────────────────────────────────────────
const PAYMENT_METHODS = [
    { id: 'cash',  label: 'Cash',  icon: Banknote,    color: 'text-emerald-600' },
    { id: 'upi',   label: 'UPI',   icon: Smartphone,  color: 'text-indigo-600'  },
    { id: 'card',  label: 'Card',  icon: CreditCard,  color: 'text-violet-600'  },
];

// ── Checkout / Payment Modal ──────────────────────────────────────────────────
const PaymentModal = ({ isOpen, onClose, finalTotal, onConfirm }) => {
    const [method, setMethod] = useState('cash');
    const [paid, setPaid] = useState('');
    const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });

    useEffect(() => {
        if (isOpen) { setMethod('cash'); setPaid(''); setCustomer({ name: '', phone: '', address: '' }); }
    }, [isOpen]);

    const paidNum = Number.parseFloat(paid) || 0;
    // UPI/Card with empty input → treat as full payment
    const effectivePaid = paid === '' && method !== 'cash' ? finalTotal : paidNum;
    const change = method === 'cash' ? Math.max(0, effectivePaid - finalTotal) : 0;
    const pendingAmount = paid !== '' && effectivePaid < finalTotal ? finalTotal - effectivePaid : 0;
    const isCreditSale = pendingAmount > 0;
    let isValid;
    if (isCreditSale) {
        isValid = customer.name.trim() !== '';
    } else if (method === 'cash') {
        isValid = effectivePaid >= finalTotal;
    } else {
        isValid = true;
    }

    const handleMethodChange = (m) => {
        setMethod(m);
        setPaid('');
        setCustomer({ name: '', phone: '', address: '' });
    };

    const handleConfirm = () => {
        if (!isValid) return;
        onConfirm({
            method,
            tenderedAmount: effectivePaid || null,
            changeGiven: method === 'cash' ? change : null,
            isCreditSale,
            creditCustomer: isCreditSale ? customer : null,
            pendingAmount: isCreditSale ? pendingAmount : 0,
        });
        setMethod('cash'); setPaid(''); setCustomer({ name: '', phone: '', address: '' });
    };

    const exactAmt = String(finalTotal.toFixed(2));
    const inputLabels = { cash: 'Cash Tendered (₹)', upi: 'Amount Received — UPI (₹)', card: 'Amount Received — Card (₹)' };
    const inputLabel = inputLabels[method];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Payment" size="sm">
            <ModalBody className="space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Amount due */}
                <div className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">Amount Due</p>
                    <p className="text-3xl font-bold text-indigo-700">₹{finalTotal.toFixed(2)}</p>
                </div>

                {/* Payment method selector */}
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Payment Method</p>
                    <div className="grid grid-cols-3 gap-2">
                        {PAYMENT_METHODS.map(({ id, label, icon: Icon, color }) => (
                            <button key={id} onClick={() => handleMethodChange(id)}
                                className={cn("flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all",
                                    method === id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300")}
                            >
                                <Icon className={cn("h-5 w-5", method === id ? "text-indigo-600" : color)} />
                                <span className={cn("text-xs font-semibold", method === id ? "text-indigo-700" : "text-slate-600")}>{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Amount input + quick select (all methods) */}
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">{inputLabel}</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400 pointer-events-none">₹</span>
                            <Input type="number" placeholder={finalTotal.toFixed(2)} value={paid}
                                onChange={e => { const v = e.target.value; if (v === '' || Number.parseFloat(v) >= 0) setPaid(v); }}
                                className="text-xl font-bold text-center pl-8 h-14" autoFocus min={0} />
                        </div>
                    </div>

                    {/* Quick Select */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Quick Select</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[50, 100, 200, 500].map(amt => (
                                <button key={amt} onClick={() => setPaid(String(amt))}
                                    className={cn("py-2 text-sm font-bold rounded-xl border-2 transition-all active:scale-95",
                                        paid === String(amt)
                                            ? "border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700")}
                                >₹{amt}</button>
                            ))}
                            <button onClick={() => setPaid(exactAmt)}
                                className={cn("py-2 text-sm font-bold rounded-xl border-2 transition-all active:scale-95",
                                    paid === exactAmt
                                        ? "border-emerald-500 bg-emerald-600 text-white shadow-md shadow-emerald-200"
                                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100")}
                            >Exact</button>
                            <button onClick={() => setPaid('0')}
                                className={cn("py-2 text-sm font-bold rounded-xl border-2 transition-all active:scale-95",
                                    paid === '0'
                                        ? "border-amber-500 bg-amber-600 text-white shadow-md shadow-amber-200"
                                        : "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100")}
                            >Credit</button>
                        </div>
                    </div>

                    {/* Cash change */}
                    {method === 'cash' && effectivePaid >= finalTotal && effectivePaid > 0 && (
                        <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100 animate-in fade-in duration-200">
                            <span className="text-sm font-semibold text-emerald-700">Change to Return</span>
                            <span className="text-xl font-bold text-emerald-700">₹{change.toFixed(2)}</span>
                        </div>
                    )}

                    {/* UPI/Card confirmation */}
                    {method !== 'cash' && !isCreditSale && (
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <p className="text-sm text-slate-600">
                                {method === 'upi' ? 'UPI payment confirmed by cashier' : 'Card payment confirmed by cashier'}
                            </p>
                        </div>
                    )}

                    {/* Credit sale — customer info */}
                    {isCreditSale && (
                        <div className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-200 animate-in fade-in duration-200">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="h-2 w-2 rounded-full bg-amber-500" />
                                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Credit Sale — ₹{pendingAmount.toFixed(2)} Pending</p>
                            </div>
                            <div className="space-y-2">
                                <Input placeholder="Customer Name *" value={customer.name}
                                    onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))}
                                    className="h-9 border-amber-200 focus:border-amber-400" />
                                <Input type="tel" placeholder="Mobile Number" value={customer.phone}
                                    onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))}
                                    className="h-9 border-amber-200 focus:border-amber-400" />
                                <Input placeholder="Address (optional)" value={customer.address}
                                    onChange={e => setCustomer(p => ({ ...p, address: e.target.value }))}
                                    className="h-9 border-amber-200 focus:border-amber-400" />
                            </div>
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button onClick={handleConfirm} disabled={!isValid} className="gap-2">
                    <Printer className="h-4 w-4" /> {isCreditSale ? 'Save Credit & Print' : 'Confirm & Print'}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

PaymentModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    finalTotal: PropTypes.number.isRequired,
    onConfirm: PropTypes.func.isRequired,
};

// ── Main POS Component ────────────────────────────────────────────────────────
const POS = () => {
    const {
        inventory, cart, settings,
        addToCart, removeFromCart, updateCartQuantity,
        updateCartPrice, clearCart, processSale, getNextInvoiceId, addCredit
    } = useShop();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [discountType, setDiscountType] = useState('percent');
    const [discountValue, setDiscountValue] = useState(0);
    const [activeProduct, setActiveProduct] = useState(null);
    const [printData, setPrintData] = useState(null);
    const [rechargeModal, setRechargeModal] = useState({ isOpen: false, variantName: '', variantData: null });
    const [rechargeInputs, setRechargeInputs] = useState({ number: '', amount: '' });
    const [cartOpen, setCartOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);

    // Trigger print after React renders the receipt portal
    useEffect(() => {
        if (!printData) return;
        const timer = setTimeout(async () => {
            try {
                const area = document.querySelector('.receipt-print-area');
                if (area) {
                    await ipcRenderer.invoke('print-receipt', area.innerHTML);
                }
            } finally {
                setPrintData(null);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [printData]);

    const filteredProducts = inventory.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleProductClick = (product) => {
        const hasVariants = !product.isVariablePrice && product.variants && Object.keys(product.variants).length > 0;
        if (hasVariants) {
            setActiveProduct(product);
        } else {
            if (!product.isVariablePrice && product.stock <= 0) {
                toast({ title: 'Out of stock', type: 'error' });
                return;
            }
            const existing = cart.find(i => i.id === product.id);
            const currentQty = existing ? existing.quantity : 0;
            if (!product.isVariablePrice && currentQty >= product.stock) {
                toast({ title: 'Stock limit reached', description: `Only ${product.stock} units available.`, type: 'error' });
                return;
            }
            addToCart({ ...product, maxStock: product.stock });
        }
    };

    const handleVariantSelect = (variantName, variantData) => {
        if (!activeProduct) return;
        if (activeProduct.name.toLowerCase().includes('recharge')) {
            setRechargeModal({ isOpen: true, variantName, variantData: { ...variantData, price: variantData.price || 0 } });
            setRechargeInputs({ number: '', amount: variantData.price ? variantData.price.toString() : '' });
            return;
        }
        const cartId = `${activeProduct.id}-${variantName}`;
        const existing = cart.find(i => i.id === cartId);
        const currentQty = existing ? existing.quantity : 0;
        if (variantData.quantity <= 0) {
            toast({ title: 'Out of stock', description: `${variantName} is out of stock.`, type: 'error' });
            return;
        }
        if (currentQty >= variantData.quantity) {
            toast({ title: 'Stock limit reached', description: `Only ${variantData.quantity} of ${variantName} available.`, type: 'error' });
            return;
        }
        addToCart({
            ...activeProduct,
            id: cartId,
            name: `${activeProduct.name} (${variantName})`,
            price: Number.parseFloat(variantData.price) || 0,
            gstRate: Number.parseFloat(variantData.gstRate) || 0,
            originalId: activeProduct.id,
            variantName,
            maxStock: variantData.quantity
        });
        toast({ title: `${variantName} added`, type: 'success' });
    };

    const handleRechargeSubmit = () => {
        const { variantName, variantData } = rechargeModal;
        const { number, amount } = rechargeInputs;
        if (!number || !amount) return;
        let safeGst = 0;
        if (variantData?.gstRate !== undefined) {
            safeGst = Number.parseFloat(variantData.gstRate);
        } else if (activeProduct?.gstRate) {
            safeGst = Number.parseFloat(activeProduct.gstRate);
        }
        addToCart({
            ...activeProduct,
            id: `${activeProduct.id}-${variantName}-${Date.now()}`,
            name: `${activeProduct.name} (${variantName}) - ${number}`,
            price: Number.parseFloat(amount) || 0,
            gstRate: Number.isNaN(safeGst) ? 0 : safeGst,
            quantity: 1,
            originalId: activeProduct.id,
            variantName,
            isVariablePrice: true,
            details: { number, type: 'recharge' }
        });
        toast({ title: 'Recharge added', type: 'success' });
        setRechargeModal({ isOpen: false, variantName: '', variantData: null });
        setActiveProduct(null);
    };

    const calculateTotals = () => {
        let subtotal = 0, totalGst = 0;
        cart.forEach(item => {
            const t = item.price * item.quantity;
            subtotal += t;
            totalGst += (t * (item.gstRate || 0)) / 100;
        });
        const grossTotal = subtotal + totalGst;
        const discountAmount = discountType === 'percent'
            ? (grossTotal * (Number.parseFloat(discountValue) || 0)) / 100
            : Number.parseFloat(discountValue) || 0;
        return { subtotal, totalGst, grossTotal, discountAmount, finalTotal: Math.max(0, grossTotal - discountAmount) };
    };

    const { subtotal, totalGst, grossTotal, discountAmount, finalTotal } = calculateTotals();

    const handlePaymentConfirm = (paymentInfo) => {
        if (cart.length === 0) return;

        const invoiceId = getNextInvoiceId();
        const now = new Date();
        const orderDetails = {
            id: invoiceId,
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            items: [...cart],
            totals: { subtotal, totalGst, grossTotal, discountAmount, finalTotal },
            paymentMethod: paymentInfo.method,
            tenderedAmount: paymentInfo.tenderedAmount,
            changeGiven: paymentInfo.changeGiven,
        };
        setPrintData(orderDetails);
        processSale(cart, { type: discountType, value: discountValue, amount: discountAmount }, paymentInfo, invoiceId);
        if (paymentInfo.isCreditSale && paymentInfo.creditCustomer) {
            addCredit({
                orderId: invoiceId,
                customerName: paymentInfo.creditCustomer.name,
                customerPhone: paymentInfo.creditCustomer.phone || '',
                customerAddress: paymentInfo.creditCustomer.address || '',
                totalAmount: finalTotal,
                paidAmount: paymentInfo.tenderedAmount || 0,
                pendingAmount: paymentInfo.pendingAmount,
                date: new Date().toISOString(),
            });
        }
        toast({ title: 'Sale completed', type: 'success' });
        setDiscountValue(0);
        setCartOpen(false);
        setPaymentModalOpen(false);
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-5 relative">

            {/* ── SCREEN ── */}
            <div className="flex-1 flex gap-5 h-full print:hidden min-w-0">

                {/* Left: Products */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <div className="relative z-10 flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input
                            placeholder="Search products..."
                            className="pl-9 h-10"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start pb-4">
                            {filteredProducts.length === 0 ? (
                                <div className="col-span-full">
                                    <EmptyState icon={Package} title="No products found" description="Try a different search term." />
                                </div>
                            ) : filteredProducts.map(product => {
                                const variantEntries = (!product.isVariablePrice && product.variants) ? Object.entries(product.variants) : [];
                                const variantCount = variantEntries.length;
                                const hasVariants = variantCount > 0;
                                const isOutOfStock = !product.isVariablePrice && !hasVariants && product.stock <= 0;
                                const previewVariants = variantEntries.slice(0, 3);
                                return (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => !isOutOfStock && handleProductClick(product)}
                                        className={cn(
                                            "bg-white border rounded-xl p-3 flex flex-col gap-2 w-full text-left",
                                            "transition-all duration-150 relative overflow-hidden",
                                            isOutOfStock
                                                ? "opacity-50 cursor-not-allowed border-slate-100"
                                                : "cursor-pointer border-slate-200 hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-500/10 active:scale-[0.97] group"
                                        )}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/40 group-hover:to-violet-50/20 transition-all duration-200 pointer-events-none" />

                                        {/* Header row */}
                                        <div className="relative flex items-start justify-between gap-1">
                                            <h3 className="font-semibold text-slate-800 text-sm leading-tight">{product.name}</h3>
                                            {product.isVariablePrice && (
                                                <Badge variant="purple" className="text-[10px] flex-shrink-0">Service</Badge>
                                            )}
                                            {hasVariants && !product.isVariablePrice && (
                                                <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5 font-medium">{variantCount}v</span>
                                            )}
                                        </div>

                                        {/* Variant rows */}
                                        {hasVariants ? (
                                            <div className="relative flex flex-col gap-1">
                                                {previewVariants.map(([vName, vData]) => {
                                                    const oos = (vData.quantity || 0) <= 0;
                                                    return (
                                                        <div key={vName} className={cn("flex items-center justify-between", oos && "opacity-40")}>
                                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                <div
                                                                    className="h-2.5 w-2.5 rounded-full flex-shrink-0 ring-1 ring-black/10"
                                                                    style={{ backgroundColor: vData.color || '#cbd5e1' }}
                                                                />
                                                                <span className="text-[11px] text-slate-600 truncate leading-tight">{vName}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                                                                {oos ? (
                                                                    <span className="text-[9px] font-semibold text-rose-500">OOS</span>
                                                                ) : (
                                                                    <span className="text-[9px] text-slate-400">{vData.quantity}</span>
                                                                )}
                                                                <span className="text-[11px] font-bold text-indigo-600">₹{vData.price || product.price}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {variantCount > 3 && (
                                                    <p className="text-[10px] text-slate-400">+{variantCount - 3} more</p>
                                                )}
                                            </div>
                                        ) : (
                                            /* Simple product */
                                            <div className="relative flex items-end justify-between">
                                                {product.isVariablePrice ? (
                                                    <span className="text-[11px] text-slate-400">Enter at sale</span>
                                                ) : (
                                                    <p className={cn("text-[10px] font-medium", isOutOfStock ? "text-rose-500" : "text-slate-400")}>
                                                        {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
                                                    </p>
                                                )}
                                                <span className="font-bold text-sm text-indigo-600">
                                                    {product.isVariablePrice ? 'Custom' : `₹${product.price}`}
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Variant overlay */}
                    {activeProduct && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 rounded-xl">
                            <button
                                type="button"
                                aria-label="Close variant picker"
                                className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] rounded-xl"
                                onClick={() => setActiveProduct(null)}
                            />
                            <div
                                className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85%] animate-in fade-in zoom-in-95 duration-200"
                            >
                                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                    <div>
                                        <h3 className="font-semibold text-slate-900 text-base">{activeProduct.name}</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Tap variants to add · click outside to close</p>
                                    </div>
                                    <Button size="icon-sm" variant="ghost" onClick={() => setActiveProduct(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                        {Object.entries(activeProduct.variants).map(([vName, vData]) => {
                                            const cartId = `${activeProduct.id}-${vName}`;
                                            const inCart = cart.find(i => i.id === cartId)?.quantity || 0;
                                            const oos = vData.quantity <= 0;
                                            let variantCardClass = "border-slate-100 opacity-50 cursor-not-allowed";
                                            if (!oos) {
                                                variantCardClass = inCart > 0
                                                    ? "cursor-pointer border-indigo-400 bg-indigo-50/40 shadow-md shadow-indigo-500/10"
                                                    : "cursor-pointer border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10 hover:bg-indigo-50/30";
                                            }
                                            return (
                                                <button
                                                    key={vName}
                                                    type="button"
                                                    onClick={() => handleVariantSelect(vName, vData)}
                                                    className={cn("group bg-white border-2 p-3 rounded-xl transition-all duration-150 active:scale-[0.97] text-left w-full", variantCardClass)}
                                                >
                                                    <div className="flex justify-between items-start mb-2.5">
                                                        <div
                                                            className={cn(
                                                                "h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-bold shadow-sm transition-colors",
                                                                !vData.color && "bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 group-hover:from-indigo-200 group-hover:to-violet-200"
                                                            )}
                                                            style={vData.color ? { backgroundColor: vData.color, color: '#fff' } : undefined}
                                                        >
                                                            {vName.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <Badge variant={oos ? 'danger' : 'default'} className="text-[10px]">{vData.quantity}</Badge>
                                                            {inCart > 0 && (
                                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full leading-none">
                                                                    +{inCart}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <h4 className="font-semibold text-xs text-slate-800 leading-tight mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors">{vName}</h4>
                                                    <div className="flex justify-between items-center border-t border-slate-100 pt-1.5">
                                                        <span className="text-[10px] text-slate-400">GST {vData.gstRate ?? activeProduct.gstRate}%</span>
                                                        <span className="font-bold text-sm text-indigo-600">₹{vData.price || activeProduct.price}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Cart (desktop) */}
                <div className="w-80 xl:w-96 flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card h-fit max-h-full hidden md:flex">
                    <CartPanel
                        cart={cart}
                        discountType={discountType}
                        discountValue={discountValue}
                        subtotal={subtotal}
                        totalGst={totalGst}
                        discountAmount={discountAmount}
                        finalTotal={finalTotal}
                        onDiscountTypeChange={setDiscountType}
                        onDiscountValueChange={setDiscountValue}
                        onUpdateQty={updateCartQuantity}
                        onUpdatePrice={updateCartPrice}
                        onRemove={removeFromCart}
                        onClear={clearCart}
                        onCheckout={() => setPaymentModalOpen(true)}
                        toast={toast}
                    />
                </div>
            </div>

            {/* Mobile cart FAB */}
            <div className="fixed bottom-5 right-5 md:hidden z-30 print:hidden">
                <button
                    onClick={() => setCartOpen(true)}
                    className="h-14 w-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl flex items-center justify-center transition-colors relative"
                >
                    <ShoppingCart className="h-6 w-6" />
                    {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white">
                            {cart.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Mobile cart sheet */}
            {cartOpen && (
                <div className="fixed inset-0 z-50 md:hidden print:hidden">
                    <button type="button" aria-label="Close cart" className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
                    <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-indigo-600" /> Cart
                            </h2>
                            <Button size="icon-sm" variant="ghost" onClick={() => setCartOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <CartPanel
                                cart={cart}
                                discountType={discountType}
                                discountValue={discountValue}
                                subtotal={subtotal}
                                totalGst={totalGst}
                                discountAmount={discountAmount}
                                finalTotal={finalTotal}
                                onDiscountTypeChange={setDiscountType}
                                onDiscountValueChange={setDiscountValue}
                                onUpdateQty={updateCartQuantity}
                                onUpdatePrice={updateCartPrice}
                                onRemove={removeFromCart}
                                onClear={clearCart}
                                onCheckout={() => { setCartOpen(false); setPaymentModalOpen(true); }}
                                toast={toast}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Recharge Modal */}
            <Modal
                isOpen={rechargeModal.isOpen}
                onClose={() => setRechargeModal({ isOpen: false, variantName: '', variantData: null })}
                title={`${rechargeModal.variantName} Recharge`}
                size="sm"
            >
                <ModalBody className="space-y-3">
                    <div className="space-y-1.5">
                        <label htmlFor="recharge-number" className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Mobile / DTH Number</label>
                        <Input
                            id="recharge-number"
                            placeholder="e.g. 9876543210"
                            value={rechargeInputs.number}
                            onChange={e => setRechargeInputs(p => ({ ...p, number: e.target.value }))}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="recharge-amount" className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Amount (₹)</label>
                        <Input
                            id="recharge-amount"
                            type="number"
                            placeholder="0.00"
                            value={rechargeInputs.amount}
                            onChange={e => setRechargeInputs(p => ({ ...p, amount: e.target.value }))}
                            className="text-lg font-bold text-indigo-600"
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setRechargeModal({ isOpen: false, variantName: '', variantData: null })}>Cancel</Button>
                    <Button onClick={handleRechargeSubmit} disabled={!rechargeInputs.number || !rechargeInputs.amount}>Add to Bill</Button>
                </ModalFooter>
            </Modal>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                finalTotal={finalTotal}
                onConfirm={handlePaymentConfirm}
            />

            {/* ── Thermal Receipt (Print Only) — rendered as portal so print CSS can target it directly ── */}
            {printData && createPortal(
                <div className="receipt-print-area">
                    <ThermalReceipt data={printData} settings={settings} />
                </div>,
                document.body
            )}
        </div>
    );
};

// ── Cart quantity input with local draft state ────────────────────────────────
const CartQtyInput = ({ value, maxStock, onCommit, toast }) => {
    const [draft, setDraft] = useState(String(value));
    useEffect(() => { setDraft(String(value)); }, [value]);

    const commit = () => {
        const n = Number.parseInt(draft, 10);
        if (!n || n < 1) { setDraft(String(value)); return; }
        if (maxStock !== undefined && n > maxStock) {
            toast({ title: 'Stock limit', description: `Max ${maxStock} units.`, type: 'error' });
            setDraft(String(maxStock));
            onCommit(maxStock);
            return;
        }
        onCommit(n);
    };

    return (
        <input
            type="number"
            value={draft}
            min="1"
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            className="text-xs font-bold w-10 text-center text-slate-800 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 focus:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-0.5"
        />
    );
};

CartQtyInput.propTypes = {
    value: PropTypes.number.isRequired,
    maxStock: PropTypes.number,
    onCommit: PropTypes.func.isRequired,
    toast: PropTypes.func.isRequired,
};

// ── Cart Panel ────────────────────────────────────────────────────────────────
const CartPanel = ({
    cart, discountType, discountValue, subtotal, totalGst,
    discountAmount, finalTotal,
    onDiscountTypeChange, onDiscountValueChange,
    onUpdateQty, onUpdatePrice, onRemove, onClear, onCheckout, toast
}) => (
    <>
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-indigo-600" />
                Current Bill
                {cart.length > 0 && <Badge variant="primary">{cart.length}</Badge>}
            </h2>
            {cart.length > 0 && (
                <Button variant="ghost" size="xs" onClick={onClear} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                    Clear
                </Button>
            )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/40">
            {cart.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="Cart is empty" description="Click products to add them." />
            ) : cart.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm space-y-2">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                {item.isVariablePrice ? (
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-400">₹</span>
                                        <input
                                            type="number"
                                            className="w-20 h-6 text-xs border border-slate-200 rounded-lg px-2 focus:ring-1 focus:ring-indigo-500 outline-none hover:border-indigo-300 transition-colors"
                                            value={item.price}
                                            onChange={e => { const v = Number.parseFloat(e.target.value); onUpdatePrice(item.id, v >= 0 ? e.target.value : '0'); }}
                                            placeholder="0"
                                            min="0"
                                            autoFocus
                                        />
                                    </div>
                                ) : (
                                    <span>₹{item.price}</span>
                                )}
                                <span className="text-slate-300">×</span>
                                <span>{item.quantity}</span>
                            </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 flex-shrink-0">
                            ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-50">
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                                className="h-6 w-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
                                <Minus className="h-3 w-3" />
                            </button>
                            <CartQtyInput
                                value={item.quantity}
                                maxStock={item.maxStock}
                                onCommit={(n) => onUpdateQty(item.id, n)}
                                toast={toast}
                            />
                            <button
                                onClick={() => {
                                    if (item.maxStock !== undefined && item.quantity >= item.maxStock) {
                                        toast({ title: 'Stock limit', description: `Max ${item.maxStock} units.`, type: 'error' });
                                        return;
                                    }
                                    onUpdateQty(item.id, item.quantity + 1);
                                }}
                                disabled={item.maxStock !== undefined && item.quantity >= item.maxStock}
                                className="h-6 w-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors disabled:opacity-40"
                            >
                                <Plus className="h-3 w-3" />
                            </button>
                        </div>
                        <button onClick={() => onRemove(item.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>

        <div className="p-4 border-t border-slate-100 space-y-3 flex-shrink-0 bg-white">
            <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                    <span>GST</span>
                    <span>₹{totalGst.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 py-1">
                    <Select
                        value={discountType}
                        onChange={e => onDiscountTypeChange(e.target.value)}
                        className="h-8 text-xs px-2 flex-shrink-0"
                        style={{ minWidth: '72px', width: 'auto' }}
                    >
                        <option value="percent">Disc %</option>
                        <option value="amount">Disc ₹</option>
                    </Select>
                    <Input
                        type="number"
                        className="flex-1 h-8 text-xs text-right"
                        value={discountValue}
                        onChange={e => onDiscountValueChange(e.target.value)}
                        placeholder="0"
                        min="0"
                    />
                </div>
                {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Discount</span>
                        <span>−₹{discountAmount.toFixed(2)}</span>
                    </div>
                )}
                {discountAmount > 0 && discountAmount > (subtotal + totalGst) && (
                    <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                        Discount exceeds total — capped at ₹{(subtotal + totalGst).toFixed(2)}
                    </p>
                )}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-2xl font-bold text-indigo-700">₹{finalTotal.toFixed(2)}</span>
            </div>
            <Button
                onClick={onCheckout}
                disabled={cart.length === 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/20"
                size="md"
            >
                <Printer className="h-4 w-4" /> Checkout
            </Button>
        </div>
    </>
);

CartPanel.propTypes = {
    cart: PropTypes.array.isRequired,
    discountType: PropTypes.string.isRequired,
    discountValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    subtotal: PropTypes.number.isRequired,
    totalGst: PropTypes.number.isRequired,
    discountAmount: PropTypes.number.isRequired,
    finalTotal: PropTypes.number.isRequired,
    onDiscountTypeChange: PropTypes.func.isRequired,
    onDiscountValueChange: PropTypes.func.isRequired,
    onUpdateQty: PropTypes.func.isRequired,
    onUpdatePrice: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    onCheckout: PropTypes.func.isRequired,
    toast: PropTypes.func.isRequired,
};

// ── A4 Invoice (print-only) ───────────────────────────────────────────────────
export const ThermalReceipt = ({ data, settings }) => {
    const payLabel = { cash: 'Cash', upi: 'UPI', card: 'Card' }[data.paymentMethod] || 'Cash';

    // Per-item tax breakdown
    const itemRows = data.items.map(item => {
        const taxableAmt = item.price * item.quantity;
        const gstRate = Number.parseFloat(item.gstRate) || 0;
        const cgstRate = gstRate / 2;
        const sgstRate = gstRate / 2;
        const cgstAmt = taxableAmt * cgstRate / 100;
        const sgstAmt = taxableAmt * sgstRate / 100;
        const lineTotal = taxableAmt + cgstAmt + sgstAmt;
        const baseName = item.name.split('(')[0].trim();
        const variantPart = item.name.includes('(') ? item.name.split('(')[1]?.replace(')', '') : null;
        return { ...item, baseName, variantPart, taxableAmt, gstRate, cgstRate, sgstRate, cgstAmt, sgstAmt, lineTotal };
    });

    const totalCgst = data.totals.totalGst / 2;
    const totalSgst = data.totals.totalGst / 2;

    const S = {
        page: { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12px', color: '#111', lineHeight: '1.4', padding: '0' },
        header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #1e1e2e' },
        logoWrap: { display: 'flex', alignItems: 'center', gap: '14px' },
        storeName: { fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px', color: '#1e1e2e', margin: '0 0 2px' },
        storeSub: { fontSize: '11px', color: '#555', margin: '1px 0' },
        invoiceLabel: { textAlign: 'right' },
        invoiceTitle: { fontSize: '22px', fontWeight: '800', color: '#4f46e5', letterSpacing: '1px', margin: '0 0 6px' },
        invoiceMeta: { fontSize: '11px', color: '#444', margin: '2px 0' },
        sectionDivider: { border: 'none', borderTop: '1px solid #e2e8f0', margin: '12px 0' },
        table: { width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '12px' },
        th: { background: '#1e1e2e', color: '#fff', padding: '6px 8px', textAlign: 'left', fontWeight: '700', fontSize: '10px', letterSpacing: '0.4px', textTransform: 'uppercase' },
        thRight: { background: '#1e1e2e', color: '#fff', padding: '6px 8px', textAlign: 'right', fontWeight: '700', fontSize: '10px', letterSpacing: '0.4px', textTransform: 'uppercase' },
        td: { padding: '6px 8px', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9' },
        tdRight: { padding: '6px 8px', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9', textAlign: 'right' },
        tdCenter: { padding: '6px 8px', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9', textAlign: 'center' },
        summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', color: '#444' },
        summaryLabel: { color: '#666' },
        totalBox: { background: '#1e1e2e', color: '#fff', borderRadius: '6px', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' },
        totalLabel: { fontSize: '14px', fontWeight: '700', letterSpacing: '0.5px' },
        totalValue: { fontSize: '20px', fontWeight: '800' },
        payBox: { border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', marginTop: '12px', fontSize: '11px', background: '#f8fafc' },
        footer: { marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '11px', color: '#666' },
        generated: { fontSize: '10px', color: '#999', textAlign: 'right', marginBottom: '12px' },
    };

    return (
        <div style={S.page}>
            {/* ── Header ── */}
            <div style={S.header}>
                <div style={S.logoWrap}>
                    {settings.logo && (
                        <img src={settings.logo} alt="Logo" style={{ height: '64px', width: '64px', objectFit: 'contain', borderRadius: '6px' }} />
                    )}
                    <div>
                        <p style={S.storeName}>{settings.storeName || 'My Store'}</p>
                        {settings.address && <p style={S.storeSub}>{settings.address}</p>}
                        {(settings.phone || settings.email) && (
                            <p style={S.storeSub}>
                                {settings.phone && `Tel: ${settings.phone}`}
                                {settings.phone && settings.email && '  |  '}
                                {settings.email}
                            </p>
                        )}
                        {settings.gstin && <p style={{ ...S.storeSub, fontWeight: '600', marginTop: '4px' }}>GSTIN: {settings.gstin}</p>}
                    </div>
                </div>
                <div style={S.invoiceLabel}>
                    <p style={S.invoiceTitle}>TAX INVOICE</p>
                    <p style={S.invoiceMeta}><b>Invoice #:</b> {data.id}</p>
                </div>
            </div>

            {/* ── Items Table ── */}
            <table style={S.table}>
                <thead>
                    <tr>
                        <th style={{ ...S.th, width: '4%' }}>#</th>
                        <th style={{ ...S.th, width: '30%' }}>Description</th>
                        <th style={{ ...S.th, width: '10%' }}>HSN</th>
                        <th style={{ ...S.thRight, width: '6%' }}>Qty</th>
                        <th style={{ ...S.thRight, width: '11%' }}>Unit Price</th>
                        <th style={{ ...S.thRight, width: '11%' }}>Taxable Amt</th>
                        <th style={{ ...S.thRight, width: '9%' }}>CGST</th>
                        <th style={{ ...S.thRight, width: '9%' }}>SGST</th>
                        <th style={{ ...S.thRight, width: '10%' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {itemRows.map((item, i) => (
                        <tr key={`${item.id}-${i}`} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                            <td style={S.tdCenter}>{i + 1}</td>
                            <td style={S.td}>
                                <div style={{ fontWeight: '600' }}>{item.baseName}</div>
                                {item.variantPart && <div style={{ fontSize: '10px', color: '#666' }}>{item.variantPart}</div>}
                            </td>
                            <td style={{ ...S.td, fontSize: '10px', color: '#555' }}>{item.hsnCode || '—'}</td>
                            <td style={S.tdRight}>{item.quantity}</td>
                            <td style={S.tdRight}>₹{Number(item.price).toFixed(2)}</td>
                            <td style={S.tdRight}>₹{item.taxableAmt.toFixed(2)}</td>
                            <td style={S.tdRight}>
                                <div>₹{item.cgstAmt.toFixed(2)}</div>
                                {item.cgstRate > 0 && <div style={{ fontSize: '9px', color: '#888' }}>{item.cgstRate}%</div>}
                            </td>
                            <td style={S.tdRight}>
                                <div>₹{item.sgstAmt.toFixed(2)}</div>
                                {item.sgstRate > 0 && <div style={{ fontSize: '9px', color: '#888' }}>{item.sgstRate}%</div>}
                            </td>
                            <td style={{ ...S.tdRight, fontWeight: '700' }}>₹{item.lineTotal.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* ── Summary ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '280px' }}>
                    <div style={S.summaryRow}>
                        <span style={S.summaryLabel}>Subtotal (Taxable)</span>
                        <span>₹{data.totals.subtotal.toFixed(2)}</span>
                    </div>
                    {data.totals.totalGst > 0 && (
                        <>
                            <div style={S.summaryRow}>
                                <span style={S.summaryLabel}>CGST</span>
                                <span>₹{totalCgst.toFixed(2)}</span>
                            </div>
                            <div style={S.summaryRow}>
                                <span style={S.summaryLabel}>SGST</span>
                                <span>₹{totalSgst.toFixed(2)}</span>
                            </div>
                        </>
                    )}
                    {data.totals.discountAmount > 0 && (
                        <div style={{ ...S.summaryRow, color: '#16a34a' }}>
                            <span>Discount</span>
                            <span>−₹{data.totals.discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div style={S.totalBox}>
                        <span style={S.totalLabel}>GRAND TOTAL</span>
                        <span style={S.totalValue}>₹{data.totals.finalTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* ── Payment details ── */}
            <div style={S.payBox}>
                <span style={{ fontWeight: '600' }}>Payment Mode: {payLabel}</span>
                {data.tenderedAmount != null && (
                    <span style={{ marginLeft: '20px' }}>Cash Tendered: ₹{data.tenderedAmount.toFixed(2)}</span>
                )}
                {data.changeGiven != null && data.changeGiven > 0 && (
                    <span style={{ marginLeft: '20px', color: '#16a34a', fontWeight: '600' }}>
                        Change Returned: ₹{data.changeGiven.toFixed(2)}
                    </span>
                )}
            </div>

            {/* ── Generated info ── */}
            <div style={{ fontSize: '10px', color: '#777', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                <div>Generated on: {data.date} {data.time}</div>
                <div>Generated by: {settings.storeName || 'My Store'}</div>
            </div>

            {/* ── Footer ── */}
            <div style={S.footer}>
                <p style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>
                    {settings.footerMessage || 'Thank you for your business!'}
                </p>
                <p style={{ color: '#aaa', fontSize: '10px' }}>Software by Xyberix</p>
            </div>
        </div>
    );
};

ThermalReceipt.propTypes = {
    data: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        date: PropTypes.string,
        time: PropTypes.string,
        items: PropTypes.array.isRequired,
        totals: PropTypes.shape({
            subtotal: PropTypes.number,
            totalGst: PropTypes.number,
            discountAmount: PropTypes.number,
            finalTotal: PropTypes.number,
        }).isRequired,
        paymentMethod: PropTypes.string,
        tenderedAmount: PropTypes.number,
        changeGiven: PropTypes.number,
    }).isRequired,
    settings: PropTypes.shape({
        storeName: PropTypes.string,
        address: PropTypes.string,
        phone: PropTypes.string,
        email: PropTypes.string,
        gstin: PropTypes.string,
        logo: PropTypes.string,
        footerMessage: PropTypes.string,
    }).isRequired,
};

export default POS;
