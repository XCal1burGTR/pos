import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Save, Tag, Edit, Layers, CheckCircle2, Sparkles } from 'lucide-react';
import { ActionBtn } from '../components/ui/ActionButtons';
import { useToast } from '../context/ToastContext';

const Pricing = () => {
    const { inventory, updateProduct, addProduct } = useShop();
    const { toast } = useToast();

    const [productName, setProductName] = useState('');
    const [variantPrices, setVariantPrices] = useState({ Default: { price: '', gst: '0' } });
    const [isVariable, setIsVariable] = useState(false);

    // Derive matched product from name
    const matchedProduct = inventory.find(
        p => p.name.trim().toLowerCase() === productName.trim().toLowerCase()
    );
    const hasName = productName.trim().length > 0;
    const matchId = matchedProduct?.id ?? null;

    // Auto-load prices when the matched product changes
    useEffect(() => {
        if (matchedProduct) {
            setIsVariable(matchedProduct.isVariablePrice || false);
            const newPrices = {};
            if (matchedProduct.variants && Object.keys(matchedProduct.variants).length > 0) {
                Object.entries(matchedProduct.variants).forEach(([vName, vData]) => {
                    newPrices[vName] = {
                        price: vData.price !== undefined ? String(vData.price) : '',
                        gst: vData.gstRate !== undefined ? String(vData.gstRate) : '0'
                    };
                });
            } else {
                newPrices['Default'] = {
                    price: String(matchedProduct.price || ''),
                    gst: String(matchedProduct.gstRate || '0')
                };
            }
            setVariantPrices(newPrices);
        } else {
            setVariantPrices({ Default: { price: '', gst: '0' } });
            setIsVariable(false);
        }
    }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePriceChange = (variant, field, value) => {
        setVariantPrices(prev => ({
            ...prev,
            [variant]: { ...prev[variant], [field]: value }
        }));
    };

    const handleSave = () => {
        if (!productName.trim()) {
            toast({ title: 'Enter a product name', type: 'error' });
            return;
        }
        if (!isVariable) {
            for (const [vName, data] of Object.entries(variantPrices)) {
                if (isNaN(parseFloat(data.price)) || parseFloat(data.price) < 0) {
                    toast({ title: 'Invalid price', description: `Check price for ${vName}`, type: 'error' });
                    return;
                }
            }
        }

        if (matchedProduct) {
            let updatedFields = { isVariablePrice: isVariable };
            if (!matchedProduct.variants || Object.keys(matchedProduct.variants).length === 0) {
                const d = variantPrices['Default'];
                updatedFields.price = parseFloat(d.price) || 0;
                updatedFields.gstRate = parseFloat(d.gst) || 0;
            } else {
                const updatedVariants = { ...matchedProduct.variants };
                let firstPrice = 0;
                Object.entries(variantPrices).forEach(([vName, data], idx) => {
                    if (!updatedVariants[vName]) updatedVariants[vName] = {};
                    updatedVariants[vName] = { ...updatedVariants[vName], price: parseFloat(data.price) || 0, gstRate: parseFloat(data.gst) || 0 };
                    if (idx === 0) firstPrice = updatedVariants[vName].price;
                });
                updatedFields.variants = updatedVariants;
                updatedFields.price = firstPrice;
            }
            updateProduct(matchedProduct.id, updatedFields);
            toast({ title: 'Pricing updated', description: productName.trim(), type: 'success' });
        } else {
            addProduct({
                name: productName.trim(),
                price: parseFloat(variantPrices['Default']?.price) || 0,
                gstRate: parseFloat(variantPrices['Default']?.gst) || 0,
                stock: 0,
                isVariablePrice: isVariable,
                variants: {}
            });
            toast({ title: 'Product created', description: productName.trim(), type: 'success' });
        }

        setProductName('');
        setVariantPrices({ Default: { price: '', gst: '0' } });
        setIsVariable(false);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Price Editor ── */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader className="border-b border-slate-100">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 bg-violet-50 rounded-lg">
                                <Tag className="h-3.5 w-3.5 text-violet-600" />
                            </div>
                            Set Pricing
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
                                {hasName && (
                                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg animate-in fade-in duration-150 ${
                                        matchedProduct
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}>
                                        {matchedProduct
                                            ? <><CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Existing product · prices loaded</>
                                            : <><Sparkles className="h-3.5 w-3.5 flex-shrink-0" /> New product will be created</>
                                        }
                                    </div>
                                )}
                            </div>

                            {/* Variable price toggle */}
                            <label className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isVariable}
                                    onChange={e => setIsVariable(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 accent-indigo-600"
                                />
                                <div>
                                    <span className="text-sm font-medium text-indigo-900 block">Variable Price</span>
                                    <span className="text-[11px] text-indigo-600/70">Cashier enters amount at sale</span>
                                </div>
                            </label>

                            {/* Variant price rows */}
                            <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                                {Object.entries(variantPrices).map(([variant, data]) => {
                                    const cost = variant === 'Default'
                                        ? (matchedProduct?.avgCostPrice || 0)
                                        : (matchedProduct?.variants?.[variant]?.avgCost || 0);
                                    const margin = (parseFloat(data.price) || 0) - cost;

                                    return (
                                        <div key={variant} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                                            <div className="flex items-center justify-between mb-2.5">
                                                <span className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                                                    <Layers className="h-3 w-3 text-slate-400" />
                                                    {variant === 'Default' ? 'Standard' : variant}
                                                </span>
                                                {matchedProduct && (
                                                    <span className="text-[10px] text-slate-400">Cost: ₹{cost.toFixed(2)}</span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Selling Price</label>
                                                    <Input
                                                        type="number"
                                                        value={data.price}
                                                        onChange={e => handlePriceChange(variant, 'price', e.target.value)}
                                                        disabled={isVariable}
                                                        className="h-9 text-sm font-bold"
                                                        placeholder="0.00"
                                                        min="0"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">GST %</label>
                                                    <Input
                                                        type="number"
                                                        value={data.gst}
                                                        onChange={e => handlePriceChange(variant, 'gst', e.target.value)}
                                                        className="h-9 text-sm"
                                                        placeholder="0"
                                                        min="0"
                                                    />
                                                </div>
                                            </div>
                                            {matchedProduct && !isVariable && (
                                                <div className={`text-right mt-2 text-xs font-semibold ${margin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                    Margin: {margin >= 0 ? '+' : ''}₹{margin.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Actions */}
                            <div className="pt-1 space-y-2">
                                <Button onClick={handleSave} className="w-full" disabled={!hasName}>
                                    <Save className="h-4 w-4" />
                                    {matchedProduct ? 'Save Prices' : 'Create & Set Price'}
                                </Button>
                                {hasName && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-slate-400"
                                        onClick={() => { setProductName(''); setVariantPrices({ Default: { price: '', gst: '0' } }); setIsVariable(false); }}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Price List ── */}
                <Card className="lg:col-span-2 flex flex-col overflow-hidden h-fit" style={{ maxHeight: 'calc(100vh - 13rem)' }}>
                    <CardHeader className="border-b border-slate-100 flex-row items-center justify-between py-4 flex-shrink-0">
                        <CardTitle className="text-sm">Current Prices</CardTitle>
                        <span className="text-xs text-slate-400 font-normal">{inventory.length} products</span>
                    </CardHeader>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {inventory.length === 0 ? (
                            <EmptyState icon={Tag} title="No products" description="Add products first to set pricing." />
                        ) : (
                            <table className="w-full text-left text-sm min-w-[480px]">
                                <thead className="bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Avg Cost</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Variants</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Edit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {inventory.map(item => {
                                        const variantCount = item.variants ? Object.keys(item.variants).length : 0;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/60 group transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium text-slate-800">{item.name}</span>
                                                        {item.isVariablePrice && <Badge variant="purple">VAR</Badge>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell">
                                                    ₹{(item.avgCostPrice || 0).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    {variantCount > 0 ? (
                                                        <Badge variant="default">{variantCount} variants</Badge>
                                                    ) : (
                                                        <span className={`font-semibold text-sm ${item.isVariablePrice ? 'text-indigo-600' : 'text-slate-800'}`}>
                                                            {item.isVariablePrice ? 'Custom' : `₹${(item.price || 0).toFixed(2)}`}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 hidden md:table-cell">
                                                    {variantCount > 0 ? (
                                                        <div className="flex gap-1 flex-wrap">
                                                            {Object.entries(item.variants).slice(0, 2).map(([k, v]) => (
                                                                <span key={k} className="text-[10px] border border-slate-200 bg-white px-1.5 py-0.5 rounded-md text-slate-500 shadow-sm">
                                                                    {k}: {v.price ? `₹${v.price}` : '—'}
                                                                </span>
                                                            ))}
                                                            {variantCount > 2 && (
                                                                <span className="text-[10px] text-slate-400">+{variantCount - 2}</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Default</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <ActionBtn
                                                        variant="edit"
                                                        icon={Edit}
                                                        iconOnly
                                                        title="Edit pricing"
                                                        onClick={() => setProductName(item.name)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>

            </div>
        </div>
    );
};

export default Pricing;
