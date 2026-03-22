import React from 'react';
import PropTypes from 'prop-types';
import {
    LayoutDashboard, Receipt, Clock, Package,
    Settings, ChevronLeft, X, Users, Wallet
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

const STAFF_NAV = [
    { id: 'dashboard', label: 'Dashboard',     icon: LayoutDashboard },
    { id: 'pos',       label: 'POS / Billing', icon: Receipt },
    { id: 'orders',    label: 'Order History', icon: Clock },
    { id: 'credit',    label: 'Credits',       icon: Wallet },
    { id: 'products',  label: 'Products',      icon: Package },
    { id: 'settings',  label: 'Settings',      icon: Settings },
];

const ADMIN_NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users',     label: 'Users',     icon: Users },
];

const Sidebar = ({ activePage, onNavigate, collapsed, setCollapsed, isMobileDrawer }) => {
    const { settings, credits } = useShop();
    const { isAdmin } = useAuth();
    const pendingCreditsCount = (credits || []).filter(c => c.status === 'pending').length;
    const storeName = settings.storeName || 'My Store';
    const initial = storeName.charAt(0).toUpperCase();
    const navItems = isAdmin ? ADMIN_NAV : STAFF_NAV;

    return (
        <aside className={cn(
            "flex flex-col h-screen bg-white/80 backdrop-blur-xl border-r border-slate-200/80 shrink-0 overflow-hidden",
            "transition-[width] duration-300 ease-in-out",
            collapsed ? "w-[68px]" : "w-60"
        )}>

            {/* ── Brand: centered logo + store name ── */}
            <div className={cn(
                "flex flex-col items-center flex-shrink-0 relative",
                "border-b border-slate-100/80",
                collapsed ? "py-4 px-2" : "pt-6 pb-5 px-4"
            )}>
                {/* Mobile close */}
                {isMobileDrawer && !collapsed && (
                    <button onClick={() => setCollapsed(true)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all flex-shrink-0 z-10">
                        <X className="h-4 w-4" />
                    </button>
                )}

                {/* Logo */}
                {settings.logo ? (
                    <img src={settings.logo} alt="Logo"
                        className={cn(
                            "rounded-2xl object-cover ring-2 ring-indigo-500/20 flex-shrink-0 transition-all duration-300 shadow-lg shadow-indigo-100/40",
                            collapsed ? "h-10 w-10 rounded-xl" : "h-16 w-16"
                        )} />
                ) : (
                    <div className={cn(
                        "rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center",
                        "text-white font-bold shadow-lg shadow-indigo-500/25 flex-shrink-0 transition-all duration-300",
                        collapsed ? "h-10 w-10 text-base rounded-xl" : "h-16 w-16 text-2xl"
                    )}>
                        {initial}
                    </div>
                )}

                {/* Store name below logo — hidden when collapsed */}
                <div className={cn(
                    "text-center overflow-hidden transition-all duration-300 w-full",
                    collapsed ? "max-h-0 opacity-0 mt-0" : "max-h-16 opacity-100 mt-3"
                )}>
                    <p className="font-bold text-slate-900 text-sm truncate leading-tight whitespace-nowrap">{storeName}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">POS System</p>
                </div>
            </div>

            {/* ── Navigation ── */}
            <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {!collapsed && (
                    <p className="px-5 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu</p>
                )}
                <div className={cn("space-y-0.5", collapsed ? "px-2" : "px-2.5")}>
                    {navItems.map(({ id, label, icon: Icon }) => {
                        const active = activePage === id;
                        const hasBadge = id === 'credit' && pendingCreditsCount > 0;
                        
                        let iconContainerBg = "";
                        if (!collapsed) {
                            iconContainerBg = active ? "bg-indigo-100/60" : "group-hover:bg-slate-100";
                        }

                        return (
                            <button key={id} onClick={() => onNavigate(id)}
                                title={collapsed ? label : undefined}
                                className={cn(
                                    "w-full flex items-center rounded-xl transition-all duration-200 group relative",
                                    "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                                    collapsed ? "justify-center h-10" : "gap-3 px-3 py-2.5",
                                    active
                                        ? "bg-gradient-to-r from-indigo-50 to-violet-50/50 text-indigo-700 shadow-sm shadow-indigo-100/50 border border-indigo-100/60"
                                        : "text-slate-500 hover:bg-slate-50/80 hover:text-slate-800 border border-transparent"
                                )}>

                                {/* Active left bar */}
                                {active && !collapsed && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-gradient-to-b from-indigo-500 to-violet-500 rounded-r-full" />
                                )}

                                <div className={cn(
                                    "flex items-center justify-center flex-shrink-0 rounded-lg transition-all duration-200",
                                    collapsed ? "" : "h-7 w-7",
                                    iconContainerBg
                                )}>
                                    <Icon className={cn(
                                        "flex-shrink-0 transition-all duration-200",
                                        "h-[17px] w-[17px]",
                                        active
                                            ? "text-indigo-600"
                                            : "text-slate-400 group-hover:text-slate-600 group-hover:scale-110"
                                    )} />
                                </div>

                                {!collapsed && (
                                    <span className={cn(
                                        "text-sm truncate transition-colors duration-200",
                                        active ? "font-semibold" : "font-medium"
                                    )}>
                                        {label}
                                    </span>
                                )}

                                {/* Badge (credits count) */}
                                {!collapsed && hasBadge && (
                                    <span className="ml-auto text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0 leading-none shadow-sm shadow-amber-200">
                                        {pendingCreditsCount}
                                    </span>
                                )}

                                {/* Active dot */}
                                {active && !collapsed && !hasBadge && (
                                    <span className="ml-auto h-[6px] w-[6px] rounded-full bg-indigo-500 flex-shrink-0 shadow-sm shadow-indigo-300" />
                                )}

                                {/* Collapsed badge dot */}
                                {collapsed && hasBadge && (
                                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 border border-white shadow-sm" />
                                )}

                                {/* Tooltip when collapsed */}
                                {collapsed && (
                                    <span className={cn(
                                        "absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap z-50",
                                        "bg-slate-900 text-white shadow-xl",
                                        "opacity-0 translate-x-1 pointer-events-none",
                                        "group-hover:opacity-100 group-hover:translate-x-0",
                                        "transition-all duration-150"
                                    )}>
                                        {label}
                                        {hasBadge && (
                                            <span className="ml-1.5 text-[9px] font-bold bg-amber-500 text-white px-1 py-0.5 rounded-full">
                                                {pendingCreditsCount}
                                            </span>
                                        )}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* ── Collapse toggle (desktop only) ── */}
            {!isMobileDrawer && (
                <div className="flex-shrink-0 border-t border-slate-100/80 p-2.5">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={cn(
                            "w-full flex items-center rounded-xl p-2.5 transition-all duration-200",
                            "text-slate-400 hover:bg-slate-100/80 hover:text-slate-700",
                            collapsed ? "justify-center" : "justify-end pr-2"
                        )}>
                        <ChevronLeft className={cn(
                            "h-4 w-4 transition-transform duration-300",
                            collapsed && "rotate-180"
                        )} />
                    </button>
                </div>
            )}
        </aside>
    );
};

Sidebar.propTypes = {
    activePage: PropTypes.string.isRequired,
    onNavigate: PropTypes.func.isRequired,
    collapsed: PropTypes.bool.isRequired,
    setCollapsed: PropTypes.func.isRequired,
    isMobileDrawer: PropTypes.bool,
};

export default Sidebar;
