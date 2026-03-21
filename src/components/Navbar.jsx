import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
    Menu, Bell, Clock, Calendar, AlertTriangle, Package,
    Settings, LogOut, ChevronDown, User, KeyRound, AtSign,
    Mail, Eye, EyeOff, Save, LayoutDashboard, Receipt,
    Wallet, ChevronRight, Shield, Activity,
    Sun, Moon, Sunrise
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import { cn } from '../utils/cn';
import { Modal, ModalBody, ModalFooter } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const PAGE_META = {
    dashboard: { title: 'Dashboard',       subtitle: 'Overview of your store today',       icon: LayoutDashboard, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    pos:       { title: 'Point of Sale',   subtitle: 'Create bills and process sales',     icon: Receipt,         color: 'text-violet-600', bg: 'bg-violet-50' },
    orders:    { title: 'Order History',   subtitle: 'View all past transactions',         icon: Clock,           color: 'text-sky-600',    bg: 'bg-sky-50' },
    products:  { title: 'Products',        subtitle: 'Manage your product catalog',        icon: Package,         color: 'text-emerald-600',bg: 'bg-emerald-50' },
    inventory: { title: 'Inventory',       subtitle: 'Track stock levels',                 icon: Package,         color: 'text-teal-600',   bg: 'bg-teal-50' },
    pricing:   { title: 'Pricing',         subtitle: 'Set prices and GST rates',           icon: Receipt,         color: 'text-amber-600',  bg: 'bg-amber-50' },
    settings:  { title: 'Settings',        subtitle: 'Configure your store',               icon: Settings,        color: 'text-slate-600',  bg: 'bg-slate-100' },
    users:     { title: 'User Management', subtitle: 'Manage staff accounts',              icon: User,            color: 'text-rose-600',   bg: 'bg-rose-50' },
    credit:    { title: 'Credits',         subtitle: 'Track credit sales and collections', icon: Wallet,          color: 'text-amber-600',  bg: 'bg-amber-50' },
};

const FieldLabel = ({ children }) => (
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{children}</p>
);

FieldLabel.propTypes = {
    children: PropTypes.node.isRequired,
};

const getStockAlertItems = (inventory) => {
    return inventory.flatMap(product => {
        if (product.isVariablePrice) return [];
        const threshold = product.minStockAlert || 5;
        const hasVariants = product.variants && Object.keys(product.variants).length > 0;
        if (hasVariants) {
            return Object.entries(product.variants)
                .filter(([, v]) => (v.quantity || 0) < threshold)
                .map(([vName, v]) => ({ name: `${product.name} · ${vName}`, stock: v.quantity || 0, isOutOfStock: (v.quantity || 0) === 0 }));
        }
        if (product.stock < threshold) {
            return [{ name: product.name, stock: product.stock, isOutOfStock: product.stock === 0 }];
        }
        return [];
    });
};

const getGreeting = (hour) => {
    if (hour < 5)  return { text: 'Good Night',     icon: Moon,    color: 'text-indigo-400' };
    if (hour < 12) return { text: 'Good Morning',   icon: Sunrise, color: 'text-amber-500' };
    if (hour < 17) return { text: 'Good Afternoon',  icon: Sun,     color: 'text-orange-500' };
    if (hour < 21) return { text: 'Good Evening',   icon: Sunrise, color: 'text-violet-500' };
    return { text: 'Good Night', icon: Moon, color: 'text-indigo-400' };
};

const Navbar = ({ activePage, onMenuOpen, onNavigate, isMobile }) => {
    const { inventory, orders, credits } = useShop();
    const { currentUser, isAdmin, logout } = useAuth();

    const [time, setTime] = useState(new Date());
    const [notifOpen, setNotifOpen]     = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [colonVisible, setColonVisible] = useState(true);
    const notifRef    = useRef(null);
    const userMenuRef = useRef(null);

    // ── Modal states ──
    const [accountModalOpen,  setAccountModalOpen]  = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);

    // Clock tick + colon blink
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 30000);
        const blink = setInterval(() => setColonVisible(v => !v), 1000);
        return () => { clearInterval(t); clearInterval(blink); };
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Stock alert list
    const stockAlertItems = getStockAlertItems(inventory);
    const outOfStockItems = stockAlertItems.filter(i => i.isOutOfStock);
    const lowStockItems   = stockAlertItems.filter(i => !i.isOutOfStock);

    // Quick stats
    const pendingCredits = (credits || []).filter(c => c.status === 'pending');
    const todayOrders = (orders || []).filter(o => {
        const today = new Date().toLocaleDateString();
        return o.date === today && o.status !== 'cancelled';
    });

    const page = PAGE_META[activePage] || PAGE_META.dashboard;
    const PageIcon = page.icon;
    const userInitial = (currentUser?.username || 'U').charAt(0).toUpperCase();
    const greeting = getGreeting(time.getHours());
    const GreetingIcon = greeting.icon;

    // ── Open modals ──
    const openAccountModal = () => {
        setAccountModalOpen(true);
        setUserMenuOpen(false);
    };

    const openPasswordModal = () => {
        setPasswordModalOpen(true);
        setUserMenuOpen(false);
    };

    return (
        <>
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 relative z-30">

            {/* ── Left: page context ── */}
            <div className="flex items-center gap-3 min-w-0">
                {isMobile && (
                    <button onClick={onMenuOpen}
                        aria-label="Open menu"
                        className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-150 active:scale-95 flex-shrink-0">
                        <Menu className="h-5 w-5" />
                    </button>
                )}

                {/* Page icon badge */}
                <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300",
                    page.bg
                )}>
                    <PageIcon className={cn("h-[18px] w-[18px]", page.color)} />
                </div>

                <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900 truncate leading-tight">{page.title}</h2>
                    <p className="text-[11px] text-slate-400 hidden sm:block leading-tight mt-0.5 truncate">{page.subtitle}</p>
                </div>
            </div>

            {/* ── Center: greeting (desktop only) ── */}
            <div className="hidden lg:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
                <GreetingIcon className={cn("h-4 w-4", greeting.color)} />
                <span className="text-sm text-slate-500">
                    <span className="font-medium">{greeting.text}</span>
                    {currentUser?.name && (
                        <span className="text-slate-400">, {currentUser.name.split(' ')[0]}</span>
                    )}
                    {!currentUser?.name && currentUser?.username && !isAdmin && (
                        <span className="text-slate-400">, {currentUser.username}</span>
                    )}
                </span>
            </div>

            {/* ── Right ── */}
            <div className="flex items-center gap-1.5 flex-shrink-0">

                {/* ── Date / Time chip ── */}
                <div className="hidden md:flex items-center gap-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl px-3 py-1.5 mr-0.5">
                    <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="text-sm font-semibold text-slate-700 tabular-nums tracking-tight">
                            {format(time, 'h')}<span className={cn("transition-opacity duration-300", colonVisible ? "opacity-100" : "opacity-30")}>:</span>{format(time, 'mm')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{format(time, 'a')}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">{format(time, 'dd MMM')}</span>
                    </div>
                </div>

                {/* ── Notifications ── */}
                <div className="relative" ref={notifRef}>
                    <button onClick={() => { setNotifOpen(v => !v); setUserMenuOpen(false); }}
                        aria-label="Notifications"
                        className={cn(
                            "relative p-2.5 rounded-xl transition-all duration-200 active:scale-95",
                            notifOpen ? "bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100" : "",
                            !notifOpen && stockAlertItems.length > 0 ? "text-slate-500 hover:bg-rose-50 hover:text-rose-600" : "",
                            !notifOpen && stockAlertItems.length === 0 ? "text-slate-400 hover:bg-slate-100 hover:text-slate-700" : ""
                        )}>
                        <Bell className="h-5 w-5" />
                        {stockAlertItems.length > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 border-2 border-white flex items-center justify-center px-0.5 shadow-sm shadow-rose-200">
                                <span className="text-[9px] font-bold text-white leading-none">
                                    {stockAlertItems.length > 9 ? '9+' : stockAlertItems.length}
                                </span>
                            </span>
                        )}
                    </button>

                    {notifOpen && (
                        <div className="absolute right-0 top-full mt-2.5 w-80 bg-white rounded-2xl shadow-2xl shadow-slate-200/60 border border-slate-200/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                                <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                                        <Bell className="h-3.5 w-3.5 text-indigo-600" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                                </div>
                                {stockAlertItems.length > 0 && (
                                    <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                                        {stockAlertItems.length}
                                    </span>
                                )}
                            </div>
                            {stockAlertItems.length === 0 ? (
                                <div className="py-10 px-4 text-center">
                                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                                        <Package className="h-6 w-6 text-emerald-500" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700">All stock levels healthy</p>
                                    <p className="text-xs text-slate-400 mt-1">No alerts at this time</p>
                                </div>
                            ) : (
                                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                    {outOfStockItems.length > 0 && (
                                        <>
                                            <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                                                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Out of Stock ({outOfStockItems.length})</p>
                                            </div>
                                            {outOfStockItems.map((item) => (
                                                <div key={item.name} className="flex items-center justify-between px-4 py-2 hover:bg-rose-50/50 transition-colors cursor-default">
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                                        <div className="h-6 w-6 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                                                            <AlertTriangle className="h-3 w-3 text-rose-500" />
                                                        </div>
                                                        <span className="text-xs text-slate-700 truncate font-medium">{item.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex-shrink-0">0 left</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {lowStockItems.length > 0 && (
                                        <>
                                            <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                                                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Low Stock ({lowStockItems.length})</p>
                                            </div>
                                            {lowStockItems.map((item) => (
                                                <div key={item.name} className="flex items-center justify-between px-4 py-2 hover:bg-amber-50/50 transition-colors cursor-default">
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                                        <div className="h-6 w-6 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                            <Package className="h-3 w-3 text-amber-600" />
                                                        </div>
                                                        <span className="text-xs text-slate-700 truncate font-medium">{item.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex-shrink-0">{item.stock} left</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                            {stockAlertItems.length > 0 && (
                                <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/50">
                                    <button
                                        onClick={() => { onNavigate('products'); setNotifOpen(false); }}
                                        className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg py-2 transition-colors"
                                    >
                                        <Package className="h-3.5 w-3.5" /> Restock Products
                                        <ChevronRight className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            {stockAlertItems.length === 0 && (
                                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                                    <p className="text-[10px] text-slate-400 text-center">You're all caught up</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="hidden sm:block h-7 w-px bg-slate-200/60 mx-0.5" />

                {/* ── User avatar dropdown ── */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => { setUserMenuOpen(v => !v); setNotifOpen(false); }}
                        aria-label="User menu"
                        className={cn(
                            "flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-xl border transition-all duration-200 active:scale-[0.97]",
                            userMenuOpen
                                ? "bg-indigo-50/60 border-indigo-200 shadow-sm shadow-indigo-100/50"
                                : "border-transparent hover:bg-slate-50 hover:border-slate-200"
                        )}>
                        <div className="relative">
                            <div className={cn(
                                "h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center",
                                "text-white text-sm font-bold shadow-sm flex-shrink-0 transition-all duration-200",
                                userMenuOpen ? "shadow-indigo-300/50 shadow-md scale-105" : ""
                            )}>
                                {userInitial}
                            </div>
                            {/* Online indicator */}
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                        </div>
                        <div className="hidden lg:block text-left leading-tight">
                            <p className="text-sm font-semibold text-slate-800 truncate max-w-[100px]">
                                {currentUser?.name || currentUser?.username || ''}
                            </p>
                            <p className="text-[11px] font-medium flex items-center gap-1">
                                {isAdmin ? (
                                    <><Shield className="h-2.5 w-2.5 text-amber-500" /><span className="text-amber-600">Admin</span></>
                                ) : (
                                    <><Activity className="h-2.5 w-2.5 text-emerald-500" /><span className="text-emerald-600">Staff</span></>
                                )}
                            </p>
                        </div>
                        <ChevronDown className={cn(
                            "h-3.5 w-3.5 text-slate-400 hidden lg:block transition-transform duration-200 flex-shrink-0",
                            userMenuOpen && "rotate-180 text-indigo-500"
                        )} />
                    </button>

                    {/* Dropdown */}
                    {userMenuOpen && (
                        <div className="absolute right-0 top-full mt-2.5 w-72 bg-white rounded-2xl shadow-2xl shadow-slate-200/60 border border-slate-200/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

                            {/* Profile header */}
                            <div className="px-4 pt-4 pb-3 border-b border-slate-100 bg-gradient-to-br from-indigo-50/40 via-white to-violet-50/30">
                                <div className="flex items-start gap-3">
                                    <div className="relative">
                                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-md shadow-indigo-200/50">
                                            {userInitial}
                                        </div>
                                        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-900 truncate">{currentUser?.name || currentUser?.username}</p>
                                        {currentUser?.name && (
                                            <p className="text-[11px] text-slate-400 truncate">@{currentUser?.username}</p>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-1">
                                            {isAdmin ? (
                                                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                    <Shield className="h-2.5 w-2.5" /> Administrator
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                    <Activity className="h-2.5 w-2.5" /> Active
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Quick stats row */}
                                {!isAdmin && (
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100/80">
                                        <div className="flex-1 text-center">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Today</p>
                                            <p className="text-sm font-bold text-slate-800">{todayOrders.length} <span className="text-[10px] font-normal text-slate-400">orders</span></p>
                                        </div>
                                        <div className="h-6 w-px bg-slate-200/60" />
                                        <div className="flex-1 text-center">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Credits</p>
                                            <p className="text-sm font-bold text-amber-600">{pendingCredits.length} <span className="text-[10px] font-normal text-slate-400">pending</span></p>
                                        </div>
                                        <div className="h-6 w-px bg-slate-200/60" />
                                        <div className="flex-1 text-center">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Stock</p>
                                            <p className={cn("text-sm font-bold", stockAlertItems.length > 0 ? "text-rose-600" : "text-emerald-600")}>
                                                {stockAlertItems.length > 0 ? stockAlertItems.length : 'OK'}
                                                {stockAlertItems.length > 0 && <span className="text-[10px] font-normal text-slate-400"> alerts</span>}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Menu items */}
                            <div className="p-1.5 space-y-0.5">
                                <button onClick={openAccountModal}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all duration-150 group">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 group-hover:scale-105 transition-all duration-150">
                                        <User className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">My Account</p>
                                        <p className="text-[10px] text-slate-400">Profile & login details</p>
                                    </div>
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-150" />
                                </button>

                                <button onClick={openPasswordModal}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all duration-150 group">
                                    <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 group-hover:scale-105 transition-all duration-150">
                                        <KeyRound className="h-4 w-4 text-teal-600" />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 group-hover:text-teal-700 transition-colors">Change Password</p>
                                        <p className="text-[10px] text-slate-400">Update login credentials</p>
                                    </div>
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all duration-150" />
                                </button>

                                <button onClick={() => { onNavigate('settings'); setUserMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all duration-150 group">
                                    <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 group-hover:scale-105 transition-all duration-150">
                                        <Settings className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 group-hover:text-amber-700 transition-colors">Settings</p>
                                        <p className="text-[10px] text-slate-400">Store configuration</p>
                                    </div>
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all duration-150" />
                                </button>

                                <div className="mx-2 my-1.5 border-t border-slate-100" />

                                <button onClick={() => { logout(); setUserMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 transition-all duration-150 group">
                                    <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100 group-hover:scale-105 transition-all duration-150">
                                        <LogOut className="h-4 w-4 text-rose-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-semibold text-rose-600 group-hover:text-rose-700 transition-colors">Sign Out</p>
                                        <p className="text-[10px] text-slate-400">End your session</p>
                                    </div>
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/40">
                                <p className="text-[10px] text-slate-400 text-center">
                                    {format(time, 'EEEE, MMMM d, yyyy')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>

                <MyAccountModal isOpen={accountModalOpen} onClose={() => setAccountModalOpen(false)} />
        <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
        </>
    );
};


const MyAccountModal = ({ isOpen, onClose }) => {
    const { currentUser, isAdmin, updateOwnProfile, changeOwnUsername } = useAuth();
    const { toast } = useToast();

    const [profileName, setProfileName] = useState('');
    const [profileEmail, setProfileEmail] = useState('');
    const [accountUsername, setAccountUsername] = useState('');
    const [accountErr, setAccountErr] = useState('');
    const [isSavingAccount, setIsSavingAccount] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setProfileName(currentUser?.name || '');
            setProfileEmail(currentUser?.email || '');
            setAccountUsername(currentUser?.username || '');
            setAccountErr('');
        }
    }, [isOpen, currentUser]);

    const handleAccountSave = () => {
        setAccountErr('');
        let changed = false;
        const nameVal  = profileName.trim();
        const emailVal = profileEmail.trim();
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal))
            return setAccountErr('Email address is not valid.');
        if (nameVal !== (currentUser?.name || '') || emailVal !== (currentUser?.email || '')) {
            const result = updateOwnProfile({ name: nameVal || null, email: emailVal || null });
            if (!result.success) return setAccountErr(result.error);
            changed = true;
        }
        if (!isAdmin) {
            const trimmed = accountUsername.trim();
            if (trimmed && trimmed !== currentUser?.username) {
                const result = changeOwnUsername(trimmed);
                if (!result.success) return setAccountErr(result.error);
                changed = true;
            }
        }
        if (!changed) return setAccountErr('No changes to save.');
        setIsSavingAccount(true);
        setTimeout(() => {
            setIsSavingAccount(false);
            onClose();
            toast({ title: 'Account updated', type: 'success' });
        }, 400);
    };

    const userInitial = (currentUser?.username || 'U').charAt(0).toUpperCase();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="My Account" size="sm">
            <ModalBody className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                        {userInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-sm truncate">{currentUser?.username}</p>
                        <p className="text-[11px] text-indigo-500 font-medium mt-0.5">{isAdmin ? 'Administrator' : 'Staff'}</p>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full flex-shrink-0">Active</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <FieldLabel>Full Name</FieldLabel>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            <Input className="pl-9" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Your full name" />
                        </div>
                    </div>
                    <div>
                        <FieldLabel>Email</FieldLabel>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            <Input className="pl-9" type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="contact@example.com" />
                        </div>
                    </div>
                </div>

                {!isAdmin && (
                    <div>
                        <FieldLabel>Username (Login ID)</FieldLabel>
                        <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            <Input className="pl-9" value={accountUsername} onChange={e => setAccountUsername(e.target.value)} placeholder="Login username" />
                        </div>
                    </div>
                )}

                {accountErr && (
                    <p className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{accountErr}</p>
                )}
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button variant={isSavingAccount ? 'outline' : 'primary'} disabled={isSavingAccount} onClick={handleAccountSave}>
                    {isSavingAccount
                        ? <><div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Saving...</>
                        : <><Save className="h-3.5 w-3.5" /> Save Account</>}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

MyAccountModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

const ChangePasswordModal = ({ isOpen, onClose }) => {
    const { isAdmin, changeAdminPassword, changeOwnPassword } = useAuth();
    const { toast } = useToast();

    const [curPass, setCurPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showCur, setShowCur] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [passErr, setPassErr] = useState('');
    const [isSavingPass, setIsSavingPass] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurPass(''); setNewPass(''); setConfirmPass('');
            setShowCur(false); setShowNew(false);
            setPassErr('');
        }
    }, [isOpen]);

    const handlePasswordSave = () => {
        setPassErr('');
        if (!curPass)  return setPassErr('Enter your current password.');
        if (!newPass)  return setPassErr('Enter a new password.');
        if (newPass.length < 6) return setPassErr('New password must be at least 6 characters.');
        if (newPass !== confirmPass) return setPassErr('Passwords do not match.');
        const result = isAdmin
            ? changeAdminPassword(curPass, newPass)
            : changeOwnPassword(curPass, newPass);
        if (!result.success) return setPassErr(result.error);
        setIsSavingPass(true);
        setTimeout(() => {
            setIsSavingPass(false);
            onClose();
            toast({ title: 'Password updated', type: 'success' });
        }, 400);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Change Password" size="sm">
            <ModalBody className="space-y-3">
                <div>
                    <FieldLabel>Current Password</FieldLabel>
                    <div className="relative">
                        <Input type={showCur ? 'text' : 'password'} value={curPass}
                            onChange={e => setCurPass(e.target.value)} placeholder="Enter current password" className="pr-9" />
                        <button type="button" onClick={() => setShowCur(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                            {showCur ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
                    <div>
                        <FieldLabel>New Password</FieldLabel>
                        <div className="relative">
                            <Input type={showNew ? 'text' : 'password'} value={newPass}
                                onChange={e => setNewPass(e.target.value)} placeholder="Min 6 characters" className="pr-9" />
                            <button type="button" onClick={() => setShowNew(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                                {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <FieldLabel>Confirm Password</FieldLabel>
                        <Input type="password" value={confirmPass}
                            onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat new password" />
                    </div>
                </div>

                {passErr && (
                    <p className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{passErr}</p>
                )}
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button variant={isSavingPass ? 'outline' : 'primary'} disabled={isSavingPass} onClick={handlePasswordSave}>
                    {isSavingPass
                        ? <><div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Saving...</>
                        : <><KeyRound className="h-3.5 w-3.5" /> Update Password</>}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

ChangePasswordModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

Navbar.propTypes = {
    activePage: PropTypes.string.isRequired,
    onMenuOpen: PropTypes.func.isRequired,
    onNavigate: PropTypes.func.isRequired,
    isMobile: PropTypes.bool.isRequired,
};

export default Navbar;
