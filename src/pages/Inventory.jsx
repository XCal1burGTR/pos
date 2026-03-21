import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Save, Plus, Layers, History, X, CheckCircle2, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Inventory = ({ onNavigate }) => {
    const { inventory, stockLogs, addStock } = useShop();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState('stock');
    const [logSearch, setLogSearch] = useState('');

    // Stock-in form state
    const [productName, setProductName] = useState('');
    const [variantName, setVariantName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitCost, setUnitCost] = useState('');

    // Find exact match (case-insensitive)
    const matchedProduct = inventory.find(
        p => p.name.trim().toLowerCase() === productName.trim().toLowerCase()
    );
    const isExisting = !!matchedProduct;
    const hasName = productName.trim().length > 0;

    const existingVariantKeys = matchedProduct?.variants
        ? Object.keys(matchedProduct.variants)
        : [];

    const handleSave = () => {
        if (!productName.trim()) {
            toast({ title: 'Enter a product name', type: 'error' });
            return;
        }
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            toast({ title: 'Enter a valid quantity', type: 'error' });
            return;
        }
        const note = variantName.trim();
        addStock([{
            name: productName.trim(),
            quantity: qty,
            unitCost: parseFloat(unitCost) || 0,
            note,
            isVariablePrice: matchedProduct?.isVariablePrice || false,
        }]);
        toast({
            title: isExisting ? 'Stock updated' : 'Product created',
            description: `${productName.trim()}${note ? ` · ${note}` : ''}`,
            type: 'success'
        });
        setProductName('');
        setVariantName('');
        setQuantity('');
        setUnitCost('');
    };

    const safeLogs = Array.isArray(stockLogs) ? stockLogs : [];
    const filteredLogs = logSearch
        ? safeLogs.filter(l =>
            l.productName?.toLowerCase().includes(logSearch.toLowerCase()) ||
            l.note?.toLowerCase().includes(logSearch.toLowerCase())
        )
        : safeLogs;

    const formatLogDate = (dateStr) => {
        try {
            return new Date(dateStr).toLocaleString([], {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return '—'; }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Stock Entry ── */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader className="border-b border-slate-100">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 bg-emerald-50 rounded-lg">
                                <Plus className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                            Stock In Entry
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
                                    placeholder="e.g. SIM Card, Phone Cover"
                                    value={productName}
                                    onChange={e => setProductName(e.target.value)}
                                />
                                {/* Status feedback */}
                                {hasName && (
                                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg animate-in fade-in duration-150 ${
                                        isExisting
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}>
                                        {isExisting
                                            ? <><CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Product already exists · {matchedProduct.stock} in stock</>
                                            : <><Sparkles className="h-3.5 w-3.5 flex-shrink-0" /> New product will be created</>
                                        }
                                    </div>
                                )}
                            </div>

                            {/* Existing variants chips */}
                            {isExisting && existingVariantKeys.length > 0 && (
                                <div className="space-y-1.5 animate-in fade-in duration-150">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Existing Variants
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {existingVariantKeys.map(vk => (
                                            <button
                                                key={vk}
                                                type="button"
                                                onClick={() => setVariantName(vk)}
                                                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                                    variantName === vk
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                                }`}
                                            >
                                                {vk}
                                                <span className={`ml-1.5 font-semibold ${variantName === vk ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                    {matchedProduct.variants[vk]?.quantity ?? 0}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400">Tap a variant to select it, or type a new name below.</p>
                                </div>
                            )}

                            {/* Variant Name */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Variant / Type
                                    <span className="ml-1 font-normal normal-case text-slate-400">(optional)</span>
                                </label>
                                <Input
                                    placeholder={isExisting ? 'e.g. Red, 128GB — or leave blank' : 'e.g. Red, XL — or leave blank'}
                                    value={variantName}
                                    onChange={e => setVariantName(e.target.value)}
                                />
                            </div>

                            {/* Qty + Cost */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Add Qty <span className="text-rose-500">*</span>
                                    </label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        min="1"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value)}
                                        className="text-center"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Cost / Unit (₹)
                                    </label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        min="0"
                                        value={unitCost}
                                        onChange={e => setUnitCost(e.target.value)}
                                        className="text-center"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-1 space-y-2">
                                <Button onClick={handleSave} className="w-full" disabled={!hasName}>
                                    <Save className="h-4 w-4" />
                                    {isExisting ? 'Add Stock' : 'Create & Add Stock'}
                                </Button>
                                {hasName && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-slate-400"
                                        onClick={() => { setProductName(''); setVariantName(''); setQuantity(''); setUnitCost(''); }}
                                    >
                                        <X className="h-3.5 w-3.5" /> Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Right Panel: Stock Levels + Purchase Log ── */}
                <Card className="lg:col-span-2 flex flex-col overflow-hidden h-fit" style={{ maxHeight: 'calc(100vh - 13rem)' }}>
                    <CardHeader className="border-b border-slate-100 flex-row items-center justify-between py-3 flex-shrink-0 gap-3">
                        {/* Tab switcher */}
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTab('stock')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'stock' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                <Layers className="h-3.5 w-3.5" /> Stock Levels
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

                        {/* ── Stock Levels Tab ── */}
                        {activeTab === 'stock' && (
                            inventory.length === 0 ? (
                                <EmptyState
                                    icon={Layers}
                                    title="No inventory yet"
                                    description="Add products first, then use the form to add stock."
                                />
                            ) : (
                                <table className="w-full text-left text-sm min-w-[380px]">
                                    <thead className="bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Total Stock</th>
                                            <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Breakdown</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {inventory.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-slate-800">{item.name}</span>
                                                        {item.isVariablePrice && <Badge variant="purple">Service</Badge>}
                                                    </div>
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
                                                <td className="px-5 py-3.5 hidden md:table-cell">
                                                    {item.variants && Object.keys(item.variants).length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {Object.entries(item.variants).map(([vName, vData]) => (
                                                                <span key={vName} className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-sm text-slate-600">
                                                                    {vName}: <b className="text-slate-800">{vData.quantity ?? 0}</b>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">No variants</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}

                        {/* ── Purchase Log Tab ── */}
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
                                                <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                                                    {formatLogDate(log.date)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-slate-800 text-sm">{log.productName}</p>
                                                    {log.note && (
                                                        <p className="text-xs text-slate-400 mt-0.5">{log.note}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant="primary">+{log.quantity}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-600 text-sm">
                                                    ₹{(log.unitCost || 0).toFixed(2)}
                                                </td>
                                                <td className="px-5 py-3 text-right font-semibold text-slate-800">
                                                    ₹{(log.totalCost || 0).toFixed(2)}
                                                </td>
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
        </div>
    );
};

export default Inventory;
