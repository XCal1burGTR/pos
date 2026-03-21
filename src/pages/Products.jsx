import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ActionBtn } from '../components/ui/ActionButtons';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal, ModalBody, ModalFooter } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ColorPicker } from '../components/ui/ColorPicker';
import {
    Plus, Trash2, Edit, X, Package,
    CheckCircle2, Sparkles, Save, History, Search, ChevronDown
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

// ── SKU auto-generation helpers ───────────────────────────────────────────────
const generateBaseCode = (name) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0].toUpperCase();
    return words.map(w => w[0].toUpperCase()).join('');
};

const makeUniqueCode = (base, takenCodes) => {
    if (!takenCodes.has(base)) return base;
    let i = 1;
    while (takenCodes.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
};

const Products = () => {
    const { inventory, stockLogs, saveProductWithVariants, editProductFull, deleteProduct } = useShop();
    const { toast } = useToast();

    // ── Form state ─────────────────────────────────────────────────────────────
    const [productName, setProductName] = useState('');
    const [hsnCode, setHsnCode] = useState('');
    const [hsnIsAuto, setHsnIsAuto] = useState(true);
    const [description, setDescription] = useState('');
    const [isVariablePrice, setIsVariablePrice] = useState(false);
    const [variantRows, setVariantRows] = useState([
        { id: 1, name: '', variantCode: '', _codeIsAuto: true, variantColor: '', variantDescription: '', quantity: '', totalCost: '', sellingPrice: '', gstRate: '0', minStockAlert: '5' }
    ]);

    // ── Derived ────────────────────────────────────────────────────────────────
    const matchedProduct = inventory.find(
        p => p.name.trim().toLowerCase() === productName.trim().toLowerCase()
    );
    const isExisting = !!matchedProduct;
    const hasName = productName.trim().length > 0;
    const hasStock = variantRows.some(r => parseInt(r.quantity) > 0);

    // ── Variant row helpers ────────────────────────────────────────────────────
    const addVariantRow = () => {
        const anyFilled = variantRows.some(r => r.name.trim() || r.quantity || r.sellingPrice);
        if (!anyFilled) {
            toast({ title: 'Fill at least one variant before adding another', type: 'error' });
            return;
        }
        setVariantRows(prev => [
            ...prev.map(r => {
                const hasSomeData = r.name.trim() || r.quantity || r.sellingPrice || r.variantCode;
                return hasSomeData ? { ...r, _collapsed: true } : r;
            }),
            { id: Date.now(), name: '', variantCode: '', _codeIsAuto: true, _collapsed: false, variantColor: '', variantDescription: '', quantity: '', totalCost: '', sellingPrice: '', gstRate: '0', minStockAlert: '5' },
        ]);
    };

    const removeVariantRow = (id) => {
        if (variantRows.length > 1) setVariantRows(prev => prev.filter(r => r.id !== id));
    };

    const updateVariantRow = (id, field, value) =>
        setVariantRows(prev => prev.map(r => {
            if (r.id !== id) return r;
            const patch = { [field]: value };
            if (field === 'variantCode') patch._codeIsAuto = false;
            if (field === 'name' && r._codeIsAuto) {
                const base = generateBaseCode(value);
                const existingCodes = new Set(
                    inventory.flatMap(p => Object.values(p.variants || {}).map(v => v.code).filter(Boolean))
                );
                const takenByOthers = new Set([
                    ...existingCodes,
                    ...prev.filter(o => o.id !== id).map(o => o.variantCode).filter(Boolean),
                ]);
                patch.variantCode = base ? makeUniqueCode(base, takenByOthers) : '';
            }
            return { ...r, ...patch };
        }));

    // Auto-fill form when existing product is matched
    useEffect(() => {
        if (matchedProduct) {
            setHsnCode(matchedProduct.hsnCode || '');
            setHsnIsAuto(false);
            setDescription(matchedProduct.description || '');
            setIsVariablePrice(matchedProduct.isVariablePrice || false);
            const varEntries = matchedProduct.variants ? Object.entries(matchedProduct.variants) : [];
            if (varEntries.length > 0) {
                setVariantRows(varEntries.map(([vName, vData], i) => {
                    const vObj = typeof vData === 'object' ? vData : { quantity: vData, avgCost: 0 };
                    return {
                        id: i + 1,
                        name: vName === 'Default' ? '' : vName,
                        variantCode: vObj.code || '',
                        variantColor: vObj.color || '',
                        variantDescription: vObj.description || '',
                        quantity: '',
                        totalCost: '',
                        sellingPrice: String(vObj.price ?? matchedProduct.price ?? ''),
                        gstRate: String(vObj.gstRate ?? matchedProduct.gstRate ?? '0'),
                        minStockAlert: String(vObj.minStockAlert ?? matchedProduct.minStockAlert ?? '5'),
                    };
                }));
            } else {
                setVariantRows([{ id: 1, name: '', variantCode: '', variantColor: '', variantDescription: '', quantity: '', totalCost: '', sellingPrice: String(matchedProduct.price ?? ''), gstRate: String(matchedProduct.gstRate ?? '0'), minStockAlert: String(matchedProduct.minStockAlert ?? '5') }]);
            }
        } else {
            setHsnCode(''); setHsnIsAuto(true); setDescription(''); setIsVariablePrice(false);
            setVariantRows([{ id: Date.now(), name: '', variantCode: '', _codeIsAuto: true, variantColor: '', variantDescription: '', quantity: '', totalCost: '', sellingPrice: '', gstRate: '0', minStockAlert: '5' }]);
        }
    }, [matchedProduct?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-generate HSN code from product name (only when in auto mode)
    useEffect(() => {
        if (isExisting || !hsnIsAuto) return;
        setHsnCode(generateBaseCode(productName));
    }, [productName]); // eslint-disable-line react-hooks/exhaustive-deps

    const resetForm = () => {
        setProductName(''); setHsnCode(''); setHsnIsAuto(true); setDescription(''); setIsVariablePrice(false);
        setVariantRows([{ id: Date.now(), name: '', variantCode: '', _codeIsAuto: true, variantColor: '', variantDescription: '', quantity: '', totalCost: '', sellingPrice: '', gstRate: '0', minStockAlert: '5' }]);
    };

    const handleSave = () => {
        const name = productName.trim();
        if (!name) { toast({ title: 'Enter a product name', type: 'error' }); return; }
        const mappedRows = variantRows.map(r => {
            const { _codeIsAuto, _collapsed, ...row } = r;
            const qty = parseFloat(row.quantity) || 0;
            const tc = parseFloat(row.totalCost) || 0;
            return { ...row, unitCost: qty > 0 ? tc / qty : 0 };
        });
        const productMinStock = Math.min(...mappedRows.map(r => parseInt(r.minStockAlert) || 5));
        saveProductWithVariants({ name, hsnCode: hsnCode.trim(), description: description.trim(), isVariablePrice, minStockAlert: productMinStock, variantRows: mappedRows });
        const action = isExisting ? (hasStock ? 'Stock added' : 'Product updated') : 'Product created';
        toast({ title: action, description: name, type: 'success' });
        resetForm();
    };

    // ── Right panel ────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('products');
    const [logSearch, setLogSearch] = useState('');

    const safeLogs = Array.isArray(stockLogs) ? stockLogs : [];
    const filteredLogs = logSearch
        ? safeLogs.filter(l =>
            l.productName?.toLowerCase().includes(logSearch.toLowerCase()) ||
            l.note?.toLowerCase().includes(logSearch.toLowerCase())
        )
        : safeLogs;

    const formatDate = (d) => {
        try { return new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch { return '—'; }
    };

    // ── Edit modal ─────────────────────────────────────────────────────────────
    const [editingProduct, setEditingProduct] = useState(null); // { id, name, hsnCode, isVariablePrice, minStockAlert }
    const [editVariantRows, setEditVariantRows] = useState([]);

    const openEdit = (item) => {
        setEditingProduct({
            id: item.id,
            name: item.name,
            hsnCode: item.hsnCode || '',
            description: item.description || '',
            isVariablePrice: item.isVariablePrice || false,
            minStockAlert: String(item.minStockAlert ?? '5'),
        });
        const varEntries = item.variants && Object.keys(item.variants).length > 0
            ? Object.entries(item.variants)
            : [['Default', { quantity: item.stock || 0, avgCost: item.avgCostPrice || 0, price: item.price || 0, gstRate: item.gstRate || 0 }]];
        setEditVariantRows(varEntries.map(([vName, vData], i) => {
            const vObj = typeof vData === 'object' ? vData : { quantity: vData, avgCost: item.avgCostPrice || 0 };
            return {
                id: i,
                name: vName,
                variantCode: vObj.code || '',
                variantColor: vObj.color || '',
                variantDescription: vObj.description || '',
                currentStock: vObj.quantity || 0,
                avgCost: vObj.avgCost || 0,
                addQty: '',
                totalCost: '',
                sellingPrice: String(vObj.price ?? item.price ?? ''),
                gstRate: String(vObj.gstRate ?? item.gstRate ?? '0'),
                minStockAlert: String(vObj.minStockAlert ?? item.minStockAlert ?? '5'),
                isNew: false,
            };
        }));
    };

    const addEditVariantRow = () => {
        const newRows = editVariantRows.filter(r => r.isNew);
        const anyNewFilled = newRows.length === 0 || newRows.some(r => r.name.trim() || r.addQty || r.sellingPrice);
        if (!anyNewFilled) {
            toast({ title: 'Fill the new variant before adding another', type: 'error' });
            return;
        }
        setEditVariantRows(prev => [...prev, {
            id: Date.now(), name: '', variantCode: '', variantColor: '', variantDescription: '', currentStock: 0, avgCost: 0,
            addQty: '', totalCost: '', sellingPrice: '', gstRate: '0', minStockAlert: '5', isNew: true,
        }]);
    };

    const updateEditVariantRow = (id, field, value) =>
        setEditVariantRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

    const removeEditVariantRow = (id) => setEditVariantRows(prev => prev.filter(r => r.id !== id));

    const handleSaveEdit = () => {
        if (!editingProduct.name.trim()) { toast({ title: 'Product name required', type: 'error' }); return; }
        const editMinStock = Math.min(...editVariantRows.map(r => parseInt(r.minStockAlert) || 5));
        editProductFull({
            id: editingProduct.id,
            name: editingProduct.name.trim(),
            hsnCode: editingProduct.hsnCode,
            description: editingProduct.description || '',
            isVariablePrice: editingProduct.isVariablePrice,
            minStockAlert: editMinStock,
            variantRows: editVariantRows.map(r => {
                const qty = parseFloat(r.addQty) || 0;
                const tc = parseFloat(r.totalCost) || 0;
                return { ...r, unitCost: qty > 0 ? tc / qty : 0 };
            }),
        });
        setEditingProduct(null);
        toast({ title: 'Changes saved', type: 'success' });
    };

    // ── Delete modal ───────────────────────────────────────────────────────────
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const confirmDelete = () => {
        if (deleteConfirm) {
            deleteProduct(deleteConfirm.id);
            toast({ title: 'Product deleted', type: 'info' });
            setDeleteConfirm(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Left: Unified Form ── */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader className="border-b border-slate-100">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 bg-indigo-50 rounded-lg">
                                <Plus className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                            {isExisting ? 'Update Product' : 'New Product'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <div className="space-y-4">

                            {/* Product Name */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Product Name <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    placeholder="e.g. SIM Card, T-Shirt"
                                    value={productName}
                                    onChange={e => { const v = e.target.value; setProductName(v.length > 0 ? v[0].toUpperCase() + v.slice(1) : v); }}
                                />
                                {hasName && (
                                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg animate-in fade-in duration-150 ${
                                        isExisting
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}>
                                        {isExisting
                                            ? <><CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Existing · {matchedProduct.stock} in stock</>
                                            : <><Sparkles className="h-3.5 w-3.5 flex-shrink-0" /> New product</>
                                        }
                                    </div>
                                )}
                            </div>

                            {/* HSN Code + Service toggle (same row) */}
                            <div className="grid grid-cols-2 gap-3 items-end">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">HSN Code</label>
                                    <Input
                                        placeholder="e.g. 8517, 6109"
                                        value={hsnCode}
                                        onChange={e => { setHsnIsAuto(false); setHsnCode(e.target.value); }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Service</label>
                                    <label className={`flex items-center gap-2 h-10 px-3 rounded-lg border cursor-pointer transition-colors ${isVariablePrice ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'} ${isExisting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={isVariablePrice}
                                            onChange={e => setIsVariablePrice(e.target.checked)}
                                            disabled={isExisting}
                                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                        />
                                        <div className="min-w-0">
                                            <span className="text-xs font-medium text-slate-700 block leading-tight">Custom Price</span>
                                            <span className="text-[10px] text-slate-400 leading-tight">cashier sets price</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</label>
                                <textarea
                                    placeholder="Short product description (optional)"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                                />
                            </div>

                            {/* ── Variants & Stock ── */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Variants &amp; Stock
                                </label>

                                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-0.5">
                                    {variantRows.map((row, idx) => {
                                        const vKey = row.name.trim() || 'Default';
                                        const existingVData = matchedProduct?.variants?.[vKey];
                                        const currentStock = existingVData !== undefined
                                            ? (typeof existingVData === 'number' ? existingVData : (existingVData?.quantity ?? 0))
                                            : null;
                                        const avgCost = existingVData && typeof existingVData === 'object' ? (existingVData.avgCost || 0) : 0;
                                        const margin = !isVariablePrice && row.sellingPrice ? (parseFloat(row.sellingPrice) || 0) - avgCost : null;

                                        return (
                                            <div key={row.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                                {row._collapsed ? (
                                                    /* ── Collapsed summary row ── */
                                                    <div
                                                        className="flex items-center gap-2 px-3 py-2 bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                                                        onClick={() => updateVariantRow(row.id, '_collapsed', false)}
                                                    >
                                                        {row.variantColor && (
                                                            <span className="w-3 h-3 rounded-full flex-shrink-0 border border-slate-200" style={{ backgroundColor: row.variantColor }} />
                                                        )}
                                                        <span className="text-sm font-semibold text-slate-700 truncate flex-1 min-w-0">
                                                            {row.name || 'Default'}
                                                        </span>
                                                        {row.variantCode && (
                                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">{row.variantCode}</span>
                                                        )}
                                                        {row.sellingPrice && !isVariablePrice && (
                                                            <span className="text-xs font-semibold text-slate-600 flex-shrink-0">₹{row.sellingPrice}</span>
                                                        )}
                                                        {row.quantity && (
                                                            <span className="text-xs font-bold text-emerald-600 flex-shrink-0">+{row.quantity}</span>
                                                        )}
                                                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 rotate-180" />
                                                        {variantRows.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); removeVariantRow(row.id); }}
                                                                className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* ── Expanded form ── */
                                                    <div className="bg-slate-50 p-3 space-y-2">
                                                        {/* Variant name + current stock + remove */}
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                placeholder={idx === 0 ? "Variant name (optional)" : "e.g. Red, 128GB, Airtel"}
                                                                value={row.name}
                                                                onChange={e => updateVariantRow(row.id, 'name', e.target.value)}
                                                                className="h-8 text-sm flex-1 min-w-0"
                                                            />
                                                            {isExisting && currentStock !== null && (
                                                                <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0">
                                                                    {currentStock} stock
                                                                </span>
                                                            )}
                                                            {variantRows.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateVariantRow(row.id, '_collapsed', true)}
                                                                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
                                                                    title="Collapse"
                                                                >
                                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                            {variantRows.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeVariantRow(row.id)}
                                                                    className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Variant code | color | description */}
                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Code / SKU</label>
                                                                <Input
                                                                    placeholder="e.g. SKU001"
                                                                    value={row.variantCode}
                                                                    onChange={e => updateVariantRow(row.id, 'variantCode', e.target.value)}
                                                                    className="h-8 text-xs"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Color</label>
                                                                <ColorPicker
                                                                    value={row.variantColor}
                                                                    onChange={val => updateVariantRow(row.id, 'variantColor', val)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Variant Description</label>
                                                            <Input
                                                                placeholder="e.g. 128GB storage, unlimited calls"
                                                                value={row.variantDescription}
                                                                onChange={e => updateVariantRow(row.id, 'variantDescription', e.target.value)}
                                                                className="h-8 text-xs"
                                                            />
                                                        </div>

                                                        {/* Row 1: Qty | Total Buying Cost | Cost Per Unit (auto) */}
                                                        <div className="grid grid-cols-3 gap-1.5">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Add Qty</label>
                                                                <Input
                                                                    type="number" placeholder="0" min="0"
                                                                    value={row.quantity}
                                                                    onChange={e => updateVariantRow(row.id, 'quantity', e.target.value)}
                                                                    className="h-8 text-xs text-center"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Total Buy Cost ₹</label>
                                                                <Input
                                                                    type="number" placeholder="0" min="0"
                                                                    value={row.totalCost}
                                                                    onChange={e => updateVariantRow(row.id, 'totalCost', e.target.value)}
                                                                    className="h-8 text-xs text-center"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Cost Per Unit ₹</label>
                                                                <div className="h-8 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                                                                    {(parseFloat(row.quantity) > 0 && parseFloat(row.totalCost) >= 0 && row.totalCost !== '')
                                                                        ? `₹${(parseFloat(row.totalCost) / parseFloat(row.quantity)).toFixed(2)}`
                                                                        : <span className="text-slate-300">auto</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Row 2: Selling Price | Min Stock Alert | GST % */}
                                                        <div className="grid grid-cols-3 gap-1.5">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Selling Price ₹</label>
                                                                <Input
                                                                    type="number" placeholder="0" min="0"
                                                                    value={row.sellingPrice}
                                                                    onChange={e => updateVariantRow(row.id, 'sellingPrice', e.target.value)}
                                                                    disabled={isVariablePrice}
                                                                    className="h-8 text-xs text-center font-semibold"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Min Alert</label>
                                                                <Input
                                                                    type="number" placeholder="5" min="0"
                                                                    value={row.minStockAlert}
                                                                    onChange={e => updateVariantRow(row.id, 'minStockAlert', e.target.value)}
                                                                    className="h-8 text-xs text-center"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">GST %</label>
                                                                <Input
                                                                    type="number" placeholder="0" min="0"
                                                                    value={row.gstRate}
                                                                    onChange={e => updateVariantRow(row.id, 'gstRate', e.target.value)}
                                                                    className="h-8 text-xs text-center"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Margin hint */}
                                                        {isExisting && !isVariablePrice && margin !== null && row.sellingPrice && (
                                                            <p className={`text-right text-[10px] font-semibold ${margin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                                Margin: {margin >= 0 ? '+' : ''}₹{margin.toFixed(2)}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <button
                                    type="button"
                                    onClick={addVariantRow}
                                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    <Plus className="h-3 w-3" /> Add Variant
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="pt-1 space-y-2">
                                <Button onClick={handleSave} className="w-full" disabled={!hasName}>
                                    <Save className="h-4 w-4" />
                                    {!isExisting
                                        ? (hasStock ? 'Create & Add Stock' : 'Create Product')
                                        : (hasStock ? 'Add Stock & Save' : 'Save Changes')
                                    }
                                </Button>
                                {hasName && (
                                    <Button variant="ghost" size="sm" className="w-full text-slate-400" onClick={resetForm}>
                                        <X className="h-3.5 w-3.5" /> Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Right: Tabs ── */}
                <Card className="lg:col-span-2 flex flex-col overflow-hidden h-fit" style={{ maxHeight: 'calc(100vh - 13rem)' }}>
                    <CardHeader className="border-b border-slate-100 flex-row items-center justify-between py-3 flex-shrink-0 gap-3">
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTab('products')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'products' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                <Package className="h-3.5 w-3.5" /> Catalog
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'products' ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>
                                    {inventory.length}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('logs')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                <History className="h-3.5 w-3.5" /> Purchase Log
                                {safeLogs.length > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'logs' ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>
                                        {safeLogs.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {activeTab === 'logs' && (
                            <div className="relative flex-1 max-w-xs">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                <input
                                    placeholder="Filter by product..."
                                    value={logSearch}
                                    onChange={e => setLogSearch(e.target.value)}
                                    className="w-full pl-8 pr-8 h-8 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                />
                                {logSearch && (
                                    <button onClick={() => setLogSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </CardHeader>

                    <div className="flex-1 overflow-auto custom-scrollbar">

                        {/* ── Product Catalog ── */}
                        {activeTab === 'products' && (
                            inventory.length === 0 ? (
                                <EmptyState
                                    icon={Package}
                                    title="No products yet"
                                    description="Create your first product using the form on the left."
                                />
                            ) : (
                                <table className="w-full text-left text-sm min-w-[480px]">
                                    <thead className="bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Stock</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Price / GST</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Variants</th>
                                            <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {inventory.map(item => {
                                            const variantKeys = item.variants ? Object.keys(item.variants) : [];
                                            const namedVariants = variantKeys.filter(k => k !== 'Default');
                                            const hasNamedVariants = namedVariants.length > 0;
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/60 group transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-slate-800">{item.name}</span>
                                                            {item.isVariablePrice && <Badge variant="purple">Service</Badge>}
                                                        </div>
                                                        {item.hsnCode && (
                                                            <p className="text-[10px] text-slate-400 mt-0.5">HSN: {item.hsnCode}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        {item.isVariablePrice ? (
                                                            <Badge variant="purple">∞</Badge>
                                                        ) : item.stock <= (item.minStockAlert || 5) ? (
                                                            <Badge variant="danger">{item.stock}</Badge>
                                                        ) : (
                                                            <Badge variant="success">{item.stock}</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 hidden sm:table-cell">
                                                        {item.isVariablePrice ? (
                                                            <span className="text-xs text-indigo-600 font-semibold">Custom</span>
                                                        ) : hasNamedVariants ? (
                                                            <Badge variant="default">{namedVariants.length} variant{namedVariants.length !== 1 ? 's' : ''}</Badge>
                                                        ) : (
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-800">₹{(item.price || 0).toFixed(2)}</p>
                                                                {item.gstRate > 0 && <p className="text-[10px] text-slate-400">GST {item.gstRate}%</p>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 hidden lg:table-cell">
                                                        {hasNamedVariants ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {namedVariants.slice(0, 3).map(k => (
                                                                    <span key={k} className="text-[10px] border border-slate-200 bg-white px-1.5 py-0.5 rounded-md text-slate-500 shadow-sm">
                                                                        {k}: <b>{item.variants[k]?.quantity ?? 0}</b>
                                                                    </span>
                                                                ))}
                                                                {namedVariants.length > 3 && <span className="text-[10px] text-slate-400">+{namedVariants.length - 3}</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <div className="flex justify-end gap-1.5">
                                                            <button onClick={() => openEdit(item)}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                                                                <Edit className="h-3.5 w-3.5" /> Edit
                                                            </button>
                                                            <button onClick={() => setDeleteConfirm({ id: item.id, name: item.name })}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
                                                                <Trash2 className="h-3.5 w-3.5" /> Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )
                        )}

                        {/* ── Purchase Log ── */}
                        {activeTab === 'logs' && (
                            filteredLogs.length === 0 ? (
                                <EmptyState
                                    icon={History}
                                    title={logSearch ? 'No matches' : 'No purchase logs yet'}
                                    description={logSearch ? 'Try a different search term.' : 'Logs appear here after you add stock.'}
                                />
                            ) : (
                                <table className="w-full text-left text-sm min-w-[520px]">
                                    <thead className="bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Qty</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Cost/Unit</th>
                                            <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(log.date)}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-slate-800 text-sm">{log.productName}</p>
                                                    {log.note && <p className="text-xs text-slate-400 mt-0.5">{log.note}</p>}
                                                </td>
                                                <td className="px-4 py-3 text-center"><Badge variant="primary">+{log.quantity}</Badge></td>
                                                <td className="px-4 py-3 text-right text-slate-600 text-sm">₹{(log.unitCost || 0).toFixed(2)}</td>
                                                <td className="px-5 py-3 text-right font-semibold text-slate-800">₹{(log.totalCost || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50/80 border-t border-slate-200 sticky bottom-0">
                                        <tr>
                                            <td colSpan="4" className="px-5 py-2.5 text-xs font-semibold text-slate-500 text-right uppercase tracking-wide">
                                                Total spent ({filteredLogs.length} entries)
                                            </td>
                                            <td className="px-5 py-2.5 text-right font-bold text-slate-900">
                                                ₹{filteredLogs.reduce((s, l) => s + (l.totalCost || 0), 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )
                        )}
                    </div>
                </Card>
            </div>

            {/* ── Edit Modal ── */}
            <Modal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} title="Edit Product" size="xl">
                {editingProduct && (
                    <>
                        <ModalBody className="space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">

                            {/* Product metadata */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5 col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Product Name</label>
                                    <Input
                                        value={editingProduct.name}
                                        onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">HSN Code</label>
                                    <Input
                                        placeholder="e.g. 8517"
                                        value={editingProduct.hsnCode}
                                        onChange={e => setEditingProduct({ ...editingProduct, hsnCode: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</label>
                                    <textarea
                                        placeholder="Short product description (optional)"
                                        value={editingProduct.description || ''}
                                        onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editingProduct.isVariablePrice}
                                    onChange={e => setEditingProduct({ ...editingProduct, isVariablePrice: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 accent-indigo-600"
                                />
                                <div>
                                    <span className="text-sm font-medium text-indigo-900 block">Service / Variable Price</span>
                                    <span className="text-[11px] text-indigo-600/70">Cashier enters amount at sale</span>
                                </div>
                            </label>

                            {/* Variants */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Variants &amp; Stock
                                </label>

                                <div className="space-y-2">
                                    {editVariantRows.map(row => (
                                        <div key={row.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                                            {/* Variant name + stock + remove */}
                                            <div className="flex items-center gap-2">
                                                {row.isNew ? (
                                                    <Input
                                                        placeholder="Variant name e.g. Red, 128GB"
                                                        value={row.name}
                                                        onChange={e => updateEditVariantRow(row.id, 'name', e.target.value)}
                                                        className="h-8 text-sm flex-1 min-w-0"
                                                    />
                                                ) : (
                                                    <span className="text-sm font-semibold text-slate-700 flex-1 truncate">
                                                        {row.name === 'Default' ? 'Default' : row.name}
                                                    </span>
                                                )}
                                                {!row.isNew && (
                                                    <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0">
                                                        {row.currentStock} in stock
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeEditVariantRow(row.id)}
                                                    className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0"
                                                    title="Remove variant"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            {/* Variant code | color | description */}
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Code / SKU</label>
                                                    <Input
                                                        placeholder="e.g. SKU001"
                                                        value={row.variantCode}
                                                        onChange={e => updateEditVariantRow(row.id, 'variantCode', e.target.value)}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Color</label>
                                                    <ColorPicker
                                                        value={row.variantColor}
                                                        onChange={val => updateEditVariantRow(row.id, 'variantColor', val)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Variant Description</label>
                                                <Input
                                                    placeholder="e.g. 128GB storage, unlimited calls"
                                                    value={row.variantDescription}
                                                    onChange={e => updateEditVariantRow(row.id, 'variantDescription', e.target.value)}
                                                    className="h-8 text-xs"
                                                />
                                            </div>

                                            {/* Row 1: Add Qty | Total Buying Cost | Cost Per Unit (auto) */}
                                            <div className="grid grid-cols-3 gap-1.5">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Add Qty</label>
                                                    <Input
                                                        type="number" placeholder="0" min="0"
                                                        value={row.addQty}
                                                        onChange={e => updateEditVariantRow(row.id, 'addQty', e.target.value)}
                                                        className="h-8 text-xs text-center"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Total Buy Cost ₹</label>
                                                    <Input
                                                        type="number" placeholder="0" min="0"
                                                        value={row.totalCost}
                                                        onChange={e => updateEditVariantRow(row.id, 'totalCost', e.target.value)}
                                                        className="h-8 text-xs text-center"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Cost Per Unit ₹</label>
                                                    <div className="h-8 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                                                        {(parseFloat(row.addQty) > 0 && parseFloat(row.totalCost) >= 0 && row.totalCost !== '')
                                                            ? `₹${(parseFloat(row.totalCost) / parseFloat(row.addQty)).toFixed(2)}`
                                                            : <span className="text-slate-300">auto</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Row 2: Selling Price | Min Stock Alert | GST % */}
                                            <div className="grid grid-cols-3 gap-1.5">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Selling Price ₹</label>
                                                    <Input
                                                        type="number" placeholder="0" min="0"
                                                        value={row.sellingPrice}
                                                        onChange={e => updateEditVariantRow(row.id, 'sellingPrice', e.target.value)}
                                                        disabled={editingProduct.isVariablePrice}
                                                        className="h-8 text-xs text-center font-semibold"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Min Alert</label>
                                                    <Input
                                                        type="number" placeholder="5" min="0"
                                                        value={row.minStockAlert}
                                                        onChange={e => updateEditVariantRow(row.id, 'minStockAlert', e.target.value)}
                                                        className="h-8 text-xs text-center"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">GST %</label>
                                                    <Input
                                                        type="number" placeholder="0" min="0"
                                                        value={row.gstRate}
                                                        onChange={e => updateEditVariantRow(row.id, 'gstRate', e.target.value)}
                                                        className="h-8 text-xs text-center"
                                                    />
                                                </div>
                                            </div>

                                            {/* Avg cost hint */}
                                            {!row.isNew && row.avgCost > 0 && (
                                                <p className="text-[10px] text-slate-400 text-right">
                                                    Avg cost: ₹{row.avgCost.toFixed(2)}
                                                    {row.sellingPrice && !editingProduct.isVariablePrice && (
                                                        <span className={`ml-2 font-semibold ${(parseFloat(row.sellingPrice) - row.avgCost) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                            · Margin: {(parseFloat(row.sellingPrice) - row.avgCost) >= 0 ? '+' : ''}₹{(parseFloat(row.sellingPrice) - row.avgCost).toFixed(2)}
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addEditVariantRow}
                                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    <Plus className="h-3 w-3" /> Add Variant
                                </button>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="ghost" onClick={() => setEditingProduct(null)}>Cancel</Button>
                            <Button onClick={handleSaveEdit}>Save Changes</Button>
                        </ModalFooter>
                    </>
                )}
            </Modal>

            {/* ── Delete Confirm ── */}
            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Product" size="sm">
                {deleteConfirm && (
                    <>
                        <ModalBody>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Delete <strong className="text-slate-900">{deleteConfirm.name}</strong>?
                                This cannot be undone.
                            </p>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                        </ModalFooter>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default Products;
