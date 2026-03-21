import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';

export const ToastContext = createContext();

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return ctx;
};

const toastStyles = {
    success: {
        bar: 'bg-emerald-500',
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />,
    },
    error: {
        bar: 'bg-rose-500',
        icon: <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />,
    },
    info: {
        bar: 'bg-indigo-500',
        icon: <Info className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />,
    },
    warning: {
        bar: 'bg-amber-500',
        icon: <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />,
    },
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback(({ title, description, type = 'success', duration = 3500 }) => {
        const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
        setToasts(prev => [...prev, { id, title, description, type }]);
        if (duration > 0) setTimeout(() => removeToast(id), duration);
    }, [removeToast]);

    const contextValue = useMemo(() => ({ toast: addToast }), [addToast]);

    return (
        <ToastContext.Provider value={contextValue}>
            {children}

            {/* Toast container — bottom-right, stacked */}
            <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none w-80">
                {toasts.map(t => {
                    const style = toastStyles[t.type] || toastStyles.info;
                    return (
                        <div
                            key={t.id}
                            role="alert"
                            className={cn(
                                "pointer-events-auto flex items-start gap-3 bg-white rounded-xl border border-slate-200",
                                "px-4 py-3 shadow-lg shadow-slate-900/10",
                                "animate-in slide-in-from-right-full fade-in duration-300",
                                "relative overflow-hidden"
                            )}
                        >
                            {/* Accent bar */}
                            <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", style.bar)} />
                            <div className="pl-2 flex items-start gap-3 flex-1 min-w-0">
                                {style.icon}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 leading-tight">{t.title}</p>
                                    {t.description && (
                                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.description}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => removeToast(t.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

ToastProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
