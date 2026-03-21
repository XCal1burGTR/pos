import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useShop } from '../context/ShopContext';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal, ModalBody, ModalFooter } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Receipt, Calendar, Search, FileText, TrendingUp, XCircle, Banknote, CreditCard, Smartphone, Eye, Download, Printer } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { ThermalReceipt } from './POS';

const { ipcRenderer } = window.require('electron');

const PaymentBadge = ({ method }) => {
    const map = {
        cash: { label: 'Cash', icon: Banknote, variant: 'success' },
        upi:  { label: 'UPI',  icon: Smartphone, variant: 'primary' },
        card: { label: 'Card', icon: CreditCard, variant: 'purple' },
    };
    const cfg = map[method] || { label: method || '—', icon: Banknote, variant: 'default' };
    const Icon = cfg.icon;
    return (
        <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit text-[11px]">
            <Icon className="h-3 w-3" />{cfg.label}
        </Badge>
    );
};

// Derive payment status from credit records
const getPaymentStatus = (order, credits) => {
    const credit = credits.find(c => c.orderId === order.id);
    if (!credit) return 'full';
    if (credit.paidAmount <= 0) return 'credit';
    return 'partial';
};

const PaymentStatusBadge = ({ status }) => {
    if (status === 'full')    return <Badge variant="success"  className="text-[11px] whitespace-nowrap">Full Payment</Badge>;
    if (status === 'partial') return <Badge variant="warning"  className="text-[11px] whitespace-nowrap">Partially Paid</Badge>;
    if (status === 'credit')  return <Badge variant="danger"   className="text-[11px] whitespace-nowrap">Full Credit</Badge>;
    return null;
};

const FilterBtn = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            active
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
    >
        {children}
    </button>
);

const Orders = () => {
    const { orders, credits, cancelOrder, settings } = useShop();
    const { toast } = useToast();

    const [statusFilter, setStatusFilter]  = useState('all');
    const [methodFilter, setMethodFilter]  = useState('all');
    const [payFilter, setPayFilter]        = useState('all');
    const [searchTerm, setSearchTerm]      = useState('');
    const [cancelConfirm, setCancelConfirm] = useState(null);
    const [viewOrder, setViewOrder]        = useState(null);
    const [pdfPortalData, setPdfPortalData] = useState(null);
    const [pdfAction, setPdfAction]        = useState(null);
    const [pdfGenerating, setPdfGenerating] = useState(false);

    useEffect(() => {
        if (!pdfPortalData || !pdfAction) return;
        const timer = setTimeout(async () => {
            setPdfGenerating(true);
            try {
                if (pdfAction === 'download') {
                    const receiptEl = document.querySelector('.receipt-print-area');
                    const html = receiptEl ? receiptEl.innerHTML : '';
                    await ipcRenderer.invoke('download-pdf', {
                        html,
                        filename: `Invoice-${pdfPortalData.id}.pdf`,
                    });
                } else if (pdfAction === 'print') {
                    await ipcRenderer.invoke('print-window');
                }
            } finally {
                setPdfPortalData(null);
                setPdfAction(null);
                setPdfGenerating(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [pdfPortalData, pdfAction]);

    const handleDownloadPdf = () => {
        if (!viewOrder || pdfGenerating) return;
        setPdfPortalData(buildPrintData(viewOrder));
        setPdfAction('download');
    };

    const handlePrintBill = () => {
        if (!viewOrder || pdfGenerating) return;
        setPdfPortalData(buildPrintData(viewOrder));
        setPdfAction('print');
    };

    const buildPrintData = (order) => {
        const dt = new Date(order.date);
        return {
            id:            order.id,
            date:          dt.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
            time:          dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            items:         order.items || [],
            totals: {
                subtotal:       order.subtotal        || 0,
                totalGst:       order.totalGst        || 0,
                grossTotal:     (order.subtotal || 0) + (order.totalGst || 0),
                discountAmount: order.discount?.amount || 0,
                finalTotal:     order.finalTotal       || 0,
            },
            paymentMethod:  order.paymentMethod,
            tenderedAmount: order.tenderedAmount ?? null,
            changeGiven:    order.changeGiven    ?? null,
        };
    };

    const safeOrders  = Array.isArray(orders)  ? orders  : [];
    const safeCredits = Array.isArray(credits) ? credits : [];

    const getFilteredOrders = () => {
        let filtered = safeOrders;
        const today = new Date().toISOString().split('T')[0];

        // Status filter
        if (statusFilter === 'today')          filtered = filtered.filter(o => o.date?.startsWith(today));
        else if (statusFilter === 'cancelled') filtered = filtered.filter(o => o.status === 'cancelled');
        else if (statusFilter === 'completed') filtered = filtered.filter(o => o.status !== 'cancelled');

        // Payment method filter
        if (methodFilter !== 'all') filtered = filtered.filter(o => o.paymentMethod === methodFilter);

        // Payment status filter
        if (payFilter !== 'all') filtered = filtered.filter(o => getPaymentStatus(o, safeCredits) === payFilter);

        // Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(o =>
                o.id?.toString().includes(term) ||
                o.items?.some(i => i.name?.toLowerCase().includes(term))
            );
        }

        return [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const filteredOrders   = getFilteredOrders();
    const completedOrders  = filteredOrders.filter(o => o.status !== 'cancelled');
    const totalRevenue     = completedOrders.reduce((sum, o) => sum + (o.finalTotal || 0), 0);

    const handleCancelOrder = () => {
        if (!cancelConfirm) return;
        const success = cancelOrder(cancelConfirm.id);
        toast(success
            ? { title: 'Order cancelled', description: 'Stock has been restocked.', type: 'info' }
            : { title: 'Could not cancel order', type: 'error' }
        );
        setCancelConfirm(null);
    };

    const formatDate = (dateStr) => {
        try {
            if (!dateStr) return '—';
            return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return '—'; }
    };

    return (
        <div className="space-y-5">

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-xl flex-shrink-0">
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Revenue</p>
                        <p className="text-xl font-bold text-indigo-700">₹{totalRevenue.toFixed(2)}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card flex items-center gap-3">
                    <div className="p-2.5 bg-violet-50 rounded-xl flex-shrink-0">
                        <Receipt className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Orders</p>
                        <p className="text-xl font-bold text-violet-700">{completedOrders.length}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 space-y-3">
                {/* Row 1: Status + Search */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="flex gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide self-center mr-1">Status</span>
                        {[
                            { key: 'all',       label: 'All' },
                            { key: 'today',     label: 'Today' },
                            { key: 'completed', label: 'Completed' },
                            { key: 'cancelled', label: 'Cancelled' },
                        ].map(f => (
                            <FilterBtn key={f.key} active={statusFilter === f.key} onClick={() => setStatusFilter(f.key)}>
                                {f.label}
                            </FilterBtn>
                        ))}
                    </div>
                    <div className="relative flex-1 w-full sm:w-auto sm:min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input
                            placeholder="Search by order ID or item..."
                            className="pl-9 h-9"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Row 2: Payment mode + Payment status */}
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-1">Mode</span>
                        {[
                            { key: 'all',  label: 'All' },
                            { key: 'cash', label: 'Cash' },
                            { key: 'upi',  label: 'UPI' },
                            { key: 'card', label: 'Card' },
                        ].map(f => (
                            <FilterBtn key={f.key} active={methodFilter === f.key} onClick={() => setMethodFilter(f.key)}>
                                {f.label}
                            </FilterBtn>
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-1">Payment</span>
                        {[
                            { key: 'all',     label: 'All' },
                            { key: 'full',    label: 'Full Payment' },
                            { key: 'partial', label: 'Partially Paid' },
                            { key: 'credit',  label: 'Full Credit' },
                        ].map(f => (
                            <FilterBtn key={f.key} active={payFilter === f.key} onClick={() => setPayFilter(f.key)}>
                                {f.label}
                            </FilterBtn>
                        ))}
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
                {filteredOrders.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        title="No orders found"
                        description="No orders match your current filters."
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Order</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">
                                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Date</span>
                                    </th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Items</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Mode</th>
                                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Payment</th>
                                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Amount</th>
                                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
                                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredOrders.map((order) => {
                                    const isCancelled  = order.status === 'cancelled';
                                    const payStatus    = getPaymentStatus(order, safeCredits);
                                    const creditRecord = safeCredits.find(c => c.orderId === order.id);

                                    return (
                                        <tr
                                            key={order.id}
                                            className={`transition-colors ${isCancelled ? 'bg-rose-50/30' : 'hover:bg-slate-50/60'}`}
                                        >
                                            {/* Order ID */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isCancelled ? 'bg-rose-100' : 'bg-indigo-50'}`}>
                                                        <Receipt className={`h-3.5 w-3.5 ${isCancelled ? 'text-rose-400' : 'text-indigo-600'}`} />
                                                    </div>
                                                    <span className="font-semibold text-slate-800 text-xs">
                                                        #{order.id?.toString().slice(-6) || '???'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Date */}
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(order.date)}</span>
                                            </td>

                                            {/* Items preview */}
                                            <td className="px-4 py-3 max-w-[180px]">
                                                <div className="space-y-0.5">
                                                    {(order.items || []).slice(0, 2).map((item, i) => (
                                                        <p key={i} className="text-xs text-slate-600 truncate">
                                                            {item.name}
                                                            <span className="text-slate-400 ml-1">×{item.quantity}</span>
                                                        </p>
                                                    ))}
                                                    {(order.items?.length || 0) > 2 && (
                                                        <p className="text-[11px] text-slate-400">+{order.items.length - 2} more</p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Payment mode */}
                                            <td className="px-4 py-3">
                                                <PaymentBadge method={order.paymentMethod} />
                                            </td>

                                            {/* Payment status */}
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    <PaymentStatusBadge status={isCancelled ? 'full' : payStatus} />
                                                    {!isCancelled && creditRecord && (
                                                        <p className="text-[10px] text-slate-400 leading-tight">
                                                            {creditRecord.pendingAmount > 0
                                                                ? `₹${creditRecord.pendingAmount.toFixed(2)} pending`
                                                                : 'Settled'}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Amount */}
                                            <td className="px-4 py-3 text-right">
                                                <div>
                                                    <span className={`font-bold text-sm ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                                        ₹{(order.finalTotal || 0).toFixed(2)}
                                                    </span>
                                                    {order.totalGst > 0 && (
                                                        <p className="text-[11px] text-slate-400">GST ₹{(order.totalGst || 0).toFixed(2)}</p>
                                                    )}
                                                    {order.discount?.amount > 0 && (
                                                        <p className="text-[11px] text-emerald-600">-₹{order.discount.amount.toFixed(2)}</p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Order status */}
                                            <td className="px-4 py-3 text-center">
                                                {isCancelled
                                                    ? <Badge variant="danger"  className="text-[11px]">Cancelled</Badge>
                                                    : <Badge variant="success" className="text-[11px]">Completed</Badge>
                                                }
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => setViewOrder(order)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" /> View
                                                    </button>
                                                    {!isCancelled && (
                                                        <button
                                                            onClick={() => setCancelConfirm({ id: order.id, total: order.finalTotal })}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                                        >
                                                            <XCircle className="h-3.5 w-3.5" /> Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* View Bill Modal */}
            <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title={`Bill #${viewOrder?.id?.toString().slice(-6)}`} size="2xl">
                {viewOrder && (
                    <>
                        <ModalBody className="overflow-y-auto max-h-[75vh] p-6">
                            <ThermalReceipt data={buildPrintData(viewOrder)} settings={settings} />
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="ghost" onClick={() => setViewOrder(null)}>Close</Button>
                            <Button variant="outline" onClick={handleDownloadPdf} disabled={pdfGenerating} className="gap-2">
                                <Download className="h-4 w-4" />
                                {pdfGenerating && pdfAction === 'download' ? 'Generating…' : 'Download PDF'}
                            </Button>
                            <Button onClick={handlePrintBill} disabled={pdfGenerating} className="gap-2">
                                <Printer className="h-4 w-4" />
                                {pdfGenerating && pdfAction === 'print' ? 'Printing…' : 'Print'}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </Modal>

            {/* Receipt portal for PDF/print generation */}
            {pdfPortalData && createPortal(
                <div className="receipt-print-area">
                    <ThermalReceipt data={pdfPortalData} settings={settings} />
                </div>,
                document.body
            )}

            {/* Cancel Confirm Modal */}
            <Modal isOpen={!!cancelConfirm} onClose={() => setCancelConfirm(null)} title="Cancel Order" size="sm">
                {cancelConfirm && (
                    <>
                        <ModalBody>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Cancel order <strong className="text-slate-900">#{cancelConfirm.id?.toString().slice(-6)}</strong> for{' '}
                                <strong className="text-slate-900">₹{(cancelConfirm.total || 0).toFixed(2)}</strong>?
                            </p>
                            <p className="text-xs text-slate-400 mt-2">Stock will be restocked automatically.</p>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="ghost" onClick={() => setCancelConfirm(null)}>Keep Order</Button>
                            <Button variant="danger" onClick={handleCancelOrder}>
                                <XCircle className="h-4 w-4" /> Cancel Order
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default Orders;
