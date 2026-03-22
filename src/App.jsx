import React, { useState, useMemo } from 'react';
import Layout from './components/Layout';
import { ShopProvider, useShop } from './context/ShopContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Pos from './pages/POS';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import Credit from './pages/Credit';
import { Card, CardContent } from './components/ui/Card';
import { Button } from './components/ui/Button';
import {
    TrendingUp, ShoppingBag, AlertTriangle, Package,
    ArrowRight, Receipt, BarChart3, Users,
    DollarSign, Percent, Wallet, CheckCircle2,
    Banknote, Smartphone, CreditCard
} from 'lucide-react';
import { cn } from './utils/cn';
import PropTypes from 'prop-types';

// ── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, color, onClick }) => (
    <button
        onClick={onClick}
        className={cn(
            "text-left w-full bg-white rounded-xl border border-slate-200 p-3 sm:p-5 shadow-card",
            "hover:shadow-card-hover hover:border-slate-300 transition-all duration-200 group",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        )}
    >
        <div className="flex items-start justify-between mb-3">
            <div className={cn("p-2.5 rounded-xl", color.bg)}>
                <Icon className={cn("h-5 w-5", color.icon)} />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors mt-0.5" />
        </div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className={cn("text-xl sm:text-2xl font-bold tracking-tight", color.text)}>{value}</p>
        {sub && <p className="text-[10px] sm:text-xs text-slate-400 mt-1">{sub}</p>}
    </button>
);

StatCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    sub: PropTypes.string,
    icon: PropTypes.elementType.isRequired,
    color: PropTypes.shape({
        bg: PropTypes.string.isRequired,
        icon: PropTypes.string.isRequired,
        text: PropTypes.string.isRequired,
    }).isRequired,
    onClick: PropTypes.func.isRequired,
};


// ── Period helpers ────────────────────────────────────────────────────────────
const PERIODS = [
    { key: 'today',   label: 'Today' },
    { key: 'week',    label: 'Week' },
    { key: 'month',   label: 'Month' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year',    label: 'Year' },
];

function getPeriodStart(key) {
    const now = new Date();
    switch (key) {
        case 'today':   return new Date(now.toISOString().split('T')[0] + 'T00:00:00');
        case 'week':    return new Date(now.getTime() - 6 * 86_400_000);
        case 'month':   return new Date(now.getFullYear(), now.getMonth(), 1);
        case 'quarter': return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        case 'year':    return new Date(now.getFullYear(), 0, 1);
        default:        return new Date(0);
    }
}

function calcStats(orders, periodKey) {
    const start = getPeriodStart(periodKey);
    const completed = (Array.isArray(orders) ? orders : []).filter(o => o.status === 'completed');
    const inPeriod = completed.filter(o => o.date && new Date(o.date) >= start);
    const revenue = inPeriod.reduce((s, o) => s + (o.finalTotal || 0), 0);
    const cost = inPeriod.reduce((s, o) => {
        return s + (o.items || []).reduce((si, item) => {
            if (item.costAtSale != null) return si + item.costAtSale * item.quantity;
            return si;
        }, 0);
    }, 0);
    const hasCost = inPeriod.some(o => (o.items || []).some(i => i.costAtSale != null));
    const profit = hasCost ? revenue - cost : null;
    const margin = (profit != null && revenue > 0) ? (profit / revenue) * 100 : null;
    return { revenue, profit, margin, invested: hasCost ? cost : null, orders: inPeriod.length, hasCost };
}

// ── Period Tabs ───────────────────────────────────────────────────────────────
const PeriodTabs = ({ value, onChange }) => (
    <div className="overflow-x-auto">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 min-w-max">
            {PERIODS.map(p => (
                <button key={p.key} onClick={() => onChange(p.key)}
                    className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                        value === p.key
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700')}>
                    {p.label}
                </button>
            ))}
        </div>
    </div>
);

PeriodTabs.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
};

// ── Dashboard helpers ─────────────────────────────────────────────────────────
function getStockAlertItems(inventory) {
    return inventory.flatMap(product => {
        if (product.isVariablePrice) return [];
        const threshold = product.minStockAlert || 5;
        const hasVariants = product.variants && Object.keys(product.variants).length > 0;
        if (hasVariants) {
            return Object.entries(product.variants)
                .filter(([, v]) => (v.quantity || 0) < (v.minStockAlert ?? threshold))
                .map(([vName, v]) => ({
                    name: `${product.name} · ${vName}`,
                    stock: v.quantity || 0,
                    isOutOfStock: (v.quantity || 0) === 0,
                }));
        }
        if (product.stock < threshold) {
            return [{ name: product.name, stock: product.stock, isOutOfStock: product.stock === 0 }];
        }
        return [];
    });
}

function calcCollectionByMethod(orders, period) {
    const periodStart = getPeriodStart(period);
    return (Array.isArray(orders) ? orders : [])
        .filter(o => o.status === 'completed' && o.date && new Date(o.date) >= periodStart)
        .reduce((acc, o) => {
            const m = o.paymentMethod || 'cash';
            const paid = o.tenderedAmount == null ? (o.finalTotal || 0) : Math.min(o.tenderedAmount, o.finalTotal || 0);
            acc[m] = (acc[m] || 0) + paid;
            return acc;
        }, {});
}

function getCreditStats(credits) {
    const pendingCredits = (credits || []).filter(c => c.status === 'pending');
    const totalCreditDue = pendingCredits.reduce((s, c) => s + (c.pendingAmount || 0), 0);
    const totalCreditCollected = (credits || []).reduce((s, c) =>
        s + (c.payments || []).reduce((ps, p) => ps + (p.amount || 0), 0), 0);
    return { pendingCredits, totalCreditDue, totalCreditCollected };
}

function getLowStockColor(outOfStockCount, alertCount) {
    if (outOfStockCount > 0) return { bg: 'bg-rose-50', icon: 'text-rose-600', text: 'text-rose-700' };
    if (alertCount > 0) return { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' };
    return { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700' };
}

function getLowStockSub(outOfStockCount, alertCount) {
    if (outOfStockCount > 0) return `${outOfStockCount} out of stock`;
    if (alertCount > 0) return 'Needs restocking';
    return 'All levels healthy';
}

function getProfitColor(hasCost, profit) {
    if (hasCost && profit < 0) return { bg: 'bg-rose-50', icon: 'text-rose-600', text: 'text-rose-700' };
    return { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700' };
}

function getProfitSub(hasCost, margin) {
    if (!hasCost) return 'Add cost prices to unlock';
    return margin == null ? '' : `${margin.toFixed(1)}% margin`;
}

function getAdminProfitSub(hasCost, margin) {
    if (!hasCost) return 'Add cost prices to products';
    return margin == null ? '' : `${margin.toFixed(1)}% margin`;
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ onNavigate }) {
    const { inventory, orders, credits } = useShop();
    const [period, setPeriod] = useState('today');

    const stats = useMemo(() => calcStats(orders, period), [orders, period]);
    const fmt = (n) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const stockAlertItems = getStockAlertItems(inventory);
    const lowStockItems = stockAlertItems.filter(i => !i.isOutOfStock);
    const outOfStockItems = stockAlertItems.filter(i => i.isOutOfStock);
    const { pendingCredits, totalCreditDue, totalCreditCollected } = getCreditStats(credits);

    const completed = Array.isArray(orders) ? orders.filter(o => o.status === 'completed') : [];
    const recentOrders = [...completed]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

    const collectionByMethod = useMemo(() => calcCollectionByMethod(orders, period), [orders, period]);

    return (
        <div className="space-y-5">

            {/* Quick Actions row + Period selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex gap-2 flex-1 flex-wrap">
                    {[
                        { icon: Receipt,     label: 'New Sale',     desc: 'Billing terminal', page: 'pos',      color: 'bg-indigo-600' },
                        { icon: Package,     label: 'Add Stock',    desc: 'Update inventory',  page: 'products', color: 'bg-emerald-600' },
                        { icon: ShoppingBag, label: 'New Product',  desc: 'Add to catalog',    page: 'products', color: 'bg-violet-600' },
                        { icon: Wallet,      label: 'Credits',      desc: 'View credit dues',  page: 'credit',   color: 'bg-amber-500' },
                    ].map(({ icon: Icon, label, desc, page, color }) => (
                        <button key={label} onClick={() => onNavigate(page)}
                            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 transition-all shadow-card group flex-1 min-w-[130px]">
                            <div className={cn('p-1.5 rounded-lg flex-shrink-0', color)}>
                                <Icon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="text-left min-w-0">
                                <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">{label}</p>
                                <p className="text-[10px] text-slate-400 truncate">{desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
                <div className="flex-shrink-0">
                    <PeriodTabs value={period} onChange={setPeriod} />
                </div>
            </div>

            {/* Row 1: Revenue + Cash + UPI + Card */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
                <StatCard
                    label="Revenue"
                    value={fmt(stats.revenue)}
                    sub={`${stats.orders} order${stats.orders === 1 ? '' : 's'}`}
                    icon={TrendingUp}
                    color={{ bg: "bg-indigo-50", icon: "text-indigo-600", text: "text-indigo-700" }}
                    onClick={() => onNavigate('orders')}
                />
                <StatCard
                    label="Cash Collected"
                    value={fmt(collectionByMethod['cash'] || 0)}
                    sub="Cash payments"
                    icon={Banknote}
                    color={{ bg: "bg-emerald-50", icon: "text-emerald-600", text: "text-emerald-700" }}
                    onClick={() => onNavigate('orders')}
                />
                <StatCard
                    label="UPI Collected"
                    value={fmt(collectionByMethod['upi'] || 0)}
                    sub="UPI payments"
                    icon={Smartphone}
                    color={{ bg: "bg-sky-50", icon: "text-sky-600", text: "text-sky-700" }}
                    onClick={() => onNavigate('orders')}
                />
                <StatCard
                    label="Card Collected"
                    value={fmt(collectionByMethod['card'] || 0)}
                    sub="Card payments"
                    icon={CreditCard}
                    color={{ bg: "bg-violet-50", icon: "text-violet-600", text: "text-violet-700" }}
                    onClick={() => onNavigate('orders')}
                />
            </div>

            {/* Row 2: Products + Low Stock + Credit Due + Credit Collected */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
                <StatCard
                    label="Total Products"
                    value={inventory.length}
                    sub="In product catalog"
                    icon={Package}
                    color={{ bg: "bg-emerald-50", icon: "text-emerald-600", text: "text-emerald-700" }}
                    onClick={() => onNavigate('products')}
                />
                <StatCard
                    label="Low Stock"
                    value={stockAlertItems.length}
                    sub={getLowStockSub(outOfStockItems.length, stockAlertItems.length)}
                    icon={AlertTriangle}
                    color={getLowStockColor(outOfStockItems.length, stockAlertItems.length)}
                    onClick={() => onNavigate('products')}
                />
                <StatCard
                    label="Credit Due"
                    value={fmt(totalCreditDue)}
                    sub={`${pendingCredits.length} customer${pendingCredits.length === 1 ? '' : 's'} pending`}
                    icon={Wallet}
                    color={{ bg: "bg-amber-50", icon: "text-amber-600", text: totalCreditDue > 0 ? "text-amber-700" : "text-slate-500" }}
                    onClick={() => onNavigate('credit')}
                />
                <StatCard
                    label="Credit Collected"
                    value={fmt(totalCreditCollected)}
                    sub="Recovered from dues"
                    icon={CheckCircle2}
                    color={{ bg: "bg-emerald-50", icon: "text-emerald-600", text: totalCreditCollected > 0 ? "text-emerald-700" : "text-slate-500" }}
                    onClick={() => onNavigate('credit')}
                />
            </div>

            {/* Row 3: Money Invested + Profit + Margin + Orders */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
                <StatCard
                    label="Money Invested"
                    value={stats.hasCost ? fmt(stats.invested) : '—'}
                    sub={stats.hasCost ? "Cost of goods sold" : "Add cost prices to unlock"}
                    icon={Banknote}
                    color={{ bg: "bg-rose-50", icon: "text-rose-500", text: "text-rose-700" }}
                    onClick={() => onNavigate('orders')}
                />
                <StatCard
                    label="Profit"
                    value={stats.hasCost ? fmt(stats.profit) : '—'}
                    sub={getProfitSub(stats.hasCost, stats.margin)}
                    icon={DollarSign}
                    color={getProfitColor(stats.hasCost, stats.profit)}
                    onClick={() => onNavigate('orders')}
                />
                <StatCard
                    label="Margin"
                    value={stats.hasCost && stats.margin != null ? `${stats.margin.toFixed(1)}%` : '—'}
                    sub="Profit / Revenue"
                    icon={Percent}
                    color={{ bg: "bg-violet-50", icon: "text-violet-600", text: "text-violet-700" }}
                    onClick={() => onNavigate('orders')}
                />
                <StatCard
                    label="Orders"
                    value={stats.orders}
                    sub="Completed transactions"
                    icon={Receipt}
                    color={{ bg: "bg-sky-50", icon: "text-sky-600", text: "text-sky-700" }}
                    onClick={() => onNavigate('orders')}
                />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent Orders */}
                <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Recent Orders</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Latest transactions</p>
                        </div>
                        <Button variant="ghost" size="xs" onClick={() => onNavigate('orders')}>
                            View all <ArrowRight className="h-3 w-3" />
                        </Button>
                    </div>
                    <CardContent className="p-0">
                        {recentOrders.length === 0 ? (
                            <div className="py-14 text-center">
                                <div className="p-3 bg-slate-100 rounded-2xl inline-block mb-3">
                                    <BarChart3 className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-sm text-slate-500 font-medium">No orders yet</p>
                                <p className="text-xs text-slate-400 mt-1">Completed sales will appear here</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {recentOrders.map(order => (
                                    <div key={order.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                <ShoppingBag className="h-4 w-4 text-indigo-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-800">
                                                    Order #{order.id?.toString().slice(-6) || '???'}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate">
                                                    {order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'}
                                                    {' • '}
                                                    {order.date ? new Date(order.date).toLocaleString([], {
                                                        month: 'short', day: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    }) : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-900 flex-shrink-0 ml-3">
                                            ₹{(order.finalTotal || 0).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right column */}
                <div className="space-y-5">
                    {/* Stock Alerts */}
                    {stockAlertItems.length > 0 && (
                        <Card className="border-amber-200">
                            <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/60 rounded-t-xl">
                                <h3 className="font-semibold text-amber-800 text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Stock Alerts
                                    <span className="ml-auto text-[10px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">
                                        {stockAlertItems.length}
                                    </span>
                                </h3>
                            </div>
                            <CardContent className="p-3 space-y-1">
                                {outOfStockItems.length > 0 && (
                                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wide px-2 pt-1">Out of Stock</p>
                                )}
                                {outOfStockItems.slice(0, 3).map((item) => (
                                    <div key={item.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-rose-50/40">
                                        <span className="text-sm text-slate-700 truncate flex-1 mr-2">{item.name}</span>
                                        <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200 flex-shrink-0">
                                            Out of stock
                                        </span>
                                    </div>
                                ))}
                                {lowStockItems.length > 0 && (
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide px-2 pt-1">Low Stock</p>
                                )}
                                {lowStockItems.slice(0, 4).map((item) => (
                                    <div key={item.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-amber-50/40 transition-colors">
                                        <span className="text-sm text-slate-700 truncate flex-1 mr-2">{item.name}</span>
                                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex-shrink-0">
                                            {item.stock} left
                                        </span>
                                    </div>
                                ))}
                                {stockAlertItems.length > 7 && (
                                    <p className="text-xs text-slate-400 text-center pt-1">
                                        +{stockAlertItems.length - 7} more items
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

Dashboard.propTypes = {
    onNavigate: PropTypes.func.isRequired,
};

// ── Admin stat card ──────────────────────────────────────────────────────────
const AdminStatCard = ({ label, value, sub, icon: Icon, color }) => (
    <div className={cn("bg-white rounded-xl border border-slate-200 p-5 shadow-card")}>
        <div className="flex items-start justify-between mb-3">
            <div className={cn("p-2.5 rounded-xl", color.bg)}>
                <Icon className={cn("h-5 w-5", color.icon)} />
            </div>
        </div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className={cn("text-2xl font-bold tracking-tight", color.text)}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
);

AdminStatCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    sub: PropTypes.string,
    icon: PropTypes.elementType.isRequired,
    color: PropTypes.shape({
        bg: PropTypes.string.isRequired,
        icon: PropTypes.string.isRequired,
        text: PropTypes.string.isRequired,
    }).isRequired,
};

// ── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard({ onNavigate }) {
    const { orders } = useShop();
    const { users, getUserStatus } = useAuth();
    const [period, setPeriod] = useState('today');

    const stats = useMemo(() => calcStats(orders, period), [orders, period]);
    const activeUsers = users.filter(u => getUserStatus(u) === 'active');
    const fmt = (n) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-6">

            {/* Period selector */}
            <div className="flex justify-end gap-4 mb-2">
                <PeriodTabs value={period} onChange={setPeriod} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <AdminStatCard
                    label="Active Staff"
                    value={activeUsers.length}
                    sub={`${users.length} total account${users.length === 1 ? '' : 's'}`}
                    icon={Users}
                    color={{ bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-700' }}
                />
                <AdminStatCard
                    label="Revenue"
                    value={fmt(stats.revenue)}
                    sub={`${stats.orders} order${stats.orders === 1 ? '' : 's'}`}
                    icon={TrendingUp}
                    color={{ bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700' }}
                />
                <AdminStatCard
                    label="Profit"
                    value={stats.hasCost ? fmt(stats.profit) : '—'}
                    sub={getAdminProfitSub(stats.hasCost, stats.margin)}
                    icon={DollarSign}
                    color={stats.hasCost && stats.profit < 0
                        ? { bg: 'bg-rose-50', icon: 'text-rose-600', text: 'text-rose-700' }
                        : { bg: 'bg-violet-50', icon: 'text-violet-600', text: 'text-violet-700' }}
                />
                <AdminStatCard
                    label="Margin"
                    value={stats.hasCost && stats.margin != null ? `${stats.margin.toFixed(1)}%` : '—'}
                    sub="Profit / Revenue"
                    icon={Percent}
                    color={{ bg: 'bg-sky-50', icon: 'text-sky-600', text: 'text-sky-700' }}
                />
            </div>

            {/* Period breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {PERIODS.map(p => {
                    const s = calcStats(orders, p.key);
                    const isSelected = period === p.key;
                    return (
                        <button key={p.key} onClick={() => setPeriod(p.key)}
                            className={cn(
                                'text-left p-4 rounded-xl border transition-all',
                                isSelected
                                    ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                            )}>
                            <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1',
                                isSelected ? 'text-indigo-500' : 'text-slate-400')}>{p.label}</p>
                            <p className={cn('text-base font-bold', isSelected ? 'text-indigo-700' : 'text-slate-800')}>
                                {fmt(s.revenue)}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{s.orders} orders</p>
                            {s.hasCost && (
                                <p className={cn('text-[11px] font-medium mt-0.5',
                                    s.profit >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                                    {s.profit >= 0 ? '+' : ''}{fmt(s.profit)} profit
                                </p>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Active users list */}
            <Card>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div>
                        <h3 className="font-semibold text-slate-900 text-sm">Active Staff</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Currently enabled accounts</p>
                    </div>
                    <Button variant="ghost" size="xs" onClick={() => onNavigate('users')}>
                        Manage <ArrowRight className="h-3 w-3" />
                    </Button>
                </div>
                <CardContent className="p-0">
                    {activeUsers.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="p-3 bg-slate-100 rounded-2xl inline-block mb-3">
                                <Users className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">No active staff accounts</p>
                            <p className="text-xs text-slate-400 mt-1">Create users from the Users page.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {activeUsers.map(user => (
                                <div key={user.id} className="flex items-center gap-3 px-5 py-3.5">
                                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-indigo-600">
                                            {user.username.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-800 truncate">{user.username}</p>
                                        <p className="text-xs text-slate-400">
                                            {user.expiryDate
                                                ? `Expires ${new Date(user.expiryDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}`
                                                : 'No expiry'}
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
                                        Active
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

AdminDashboard.propTypes = {
    onNavigate: PropTypes.func.isRequired,
};

// ── App Shell ────────────────────────────────────────────────────────────────
function AppContent() {
    const [activePage, setActivePage] = useState('dashboard');
    const { isAdmin } = useAuth();

    const renderPage = () => {
        // Admin can only access dashboard, settings, users
        if (isAdmin) {
            switch (activePage) {
                case 'users': return <UserManagement />;
                default:      return <AdminDashboard onNavigate={setActivePage} />;
            }
        }
        // Staff pages
        switch (activePage) {
            case 'dashboard': return <Dashboard onNavigate={setActivePage} />;
            case 'pos':       return <Pos />;
            case 'orders':    return <Orders />;
            case 'products':  return <Products />;
            case 'credit':    return <Credit />;
            case 'settings':  return <Settings />;
            default:          return <Dashboard onNavigate={setActivePage} />;
        }
    };

    return (
        <Layout activePage={activePage} onNavigate={setActivePage}>
            {renderPage()}
        </Layout>
    );
}

function AppRoot() {
    const { currentUser } = useAuth();
    if (!currentUser) return <Login />;
    return <AppContent />;
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                    <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-card p-8 text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
                            <AlertTriangle className="h-6 w-6 text-rose-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
                        <p className="text-sm text-slate-500">{this.state.error?.message || 'An unexpected error occurred.'}</p>
                        <button
                            onClick={() => globalThis.location.reload()}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
};

export default function App() {
    return (
        <ErrorBoundary>
            <ShopProvider>
                <ToastProvider>
                    <AuthProvider>
                        <AppRoot />
                    </AuthProvider>
                </ToastProvider>
            </ShopProvider>
        </ErrorBoundary>
    );
}
