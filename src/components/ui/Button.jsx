import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const base = [
        "relative inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "transition-all duration-200 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none disabled:!translate-y-0 disabled:!shadow-none",
        "active:scale-[0.97] active:!translate-y-0",
        "overflow-hidden",
        // Top-highlight shimmer overlay (glass inner light)
        "after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-b after:from-white/15 after:to-transparent after:pointer-events-none",
    ].join(' ');

    const variants = {
        primary: [
            "bg-gradient-to-br from-indigo-500 to-violet-600",
            "border border-indigo-400/40",
            "text-white",
            "shadow-btn-primary",
            "hover:from-indigo-400 hover:to-violet-500",
            "hover:shadow-btn-primary-hover hover:-translate-y-px",
            "focus-visible:ring-indigo-400",
        ].join(' '),

        secondary: [
            "bg-gradient-to-br from-slate-700 to-slate-800",
            "border border-slate-600/40",
            "text-white",
            "shadow-btn-secondary",
            "hover:from-slate-600 hover:to-slate-700",
            "hover:shadow-btn-secondary-hover hover:-translate-y-px",
            "focus-visible:ring-slate-500",
        ].join(' '),

        outline: [
            "bg-white/70 backdrop-blur-sm",
            "border border-slate-200/80",
            "text-slate-700",
            "shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
            "hover:bg-white/95 hover:border-indigo-300/60",
            "hover:text-indigo-700 hover:-translate-y-px",
            "hover:shadow-[0_3px_14px_rgba(99,102,241,0.14)]",
            "focus-visible:ring-slate-400",
        ].join(' '),

        ghost: [
            "bg-transparent",
            "border border-transparent",
            "text-slate-600",
            "hover:bg-slate-100/80 hover:text-slate-900",
            "hover:border-slate-200/60",
            "focus-visible:ring-slate-400",
        ].join(' '),

        danger: [
            "bg-gradient-to-br from-rose-500 to-pink-600",
            "border border-rose-400/40",
            "text-white",
            "shadow-btn-danger",
            "hover:from-rose-400 hover:to-pink-500",
            "hover:shadow-btn-danger-hover hover:-translate-y-px",
            "focus-visible:ring-rose-400",
        ].join(' '),

        'danger-outline': [
            "bg-white/70 backdrop-blur-sm",
            "border border-rose-200/80",
            "text-rose-600",
            "shadow-[0_1px_3px_rgba(239,68,68,0.06)]",
            "hover:bg-rose-50/80 hover:border-rose-300/80",
            "hover:shadow-[0_3px_14px_rgba(239,68,68,0.18)] hover:-translate-y-px",
            "focus-visible:ring-rose-400",
        ].join(' '),

        success: [
            "bg-gradient-to-br from-emerald-500 to-teal-600",
            "border border-emerald-400/40",
            "text-white",
            "shadow-btn-success",
            "hover:from-emerald-400 hover:to-teal-500",
            "hover:shadow-btn-success-hover hover:-translate-y-px",
            "focus-visible:ring-emerald-400",
        ].join(' '),

        indigo: [
            "bg-indigo-50/80 backdrop-blur-sm",
            "border border-indigo-100/80",
            "text-indigo-700",
            "shadow-[0_1px_3px_rgba(99,102,241,0.1)]",
            "hover:bg-indigo-100/90 hover:border-indigo-200",
            "hover:text-indigo-800 hover:-translate-y-px",
            "hover:shadow-[0_3px_14px_rgba(99,102,241,0.2)]",
            "focus-visible:ring-indigo-400",
        ].join(' '),
    };

    const sizes = {
        xs:       "h-7 px-2.5 text-xs",
        sm:       "h-8 px-3 text-sm",
        md:       "h-10 px-4 text-sm",
        lg:       "h-11 px-5 text-base",
        xl:       "h-12 px-6 text-base",
        icon:     "h-9 w-9 p-0",
        'icon-sm': "h-8 w-8 p-0",
        'icon-xs': "h-7 w-7 p-0",
        'icon-lg': "h-10 w-10 p-0",
    };

    return (
        <button
            ref={ref}
            className={cn(base, variants[variant] || variants.primary, sizes[size] || sizes.md, className)}
            {...props}
        >
            {children}
        </button>
    );
});

Button.displayName = "Button";

Button.propTypes = {
    className: PropTypes.string,
    variant: PropTypes.oneOf([
        'primary', 'secondary', 'outline', 'ghost', 'danger', 
        'danger-outline', 'success', 'indigo'
    ]),
    size: PropTypes.oneOf([
        'xs', 'sm', 'md', 'lg', 'xl', 
        'icon', 'icon-sm', 'icon-xs', 'icon-lg'
    ]),
    children: PropTypes.node.isRequired,
};

export { Button };
