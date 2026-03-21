import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

const badgeVariants = {
    default: "bg-slate-100/80 text-slate-700 border-slate-200/80",
    primary: "bg-indigo-50/80 text-indigo-700 border-indigo-200/80",
    success: "bg-emerald-50/80 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50/80 text-amber-700 border-amber-200/80",
    danger:  "bg-rose-50/80 text-rose-700 border-rose-200/80",
    purple:  "bg-purple-50/80 text-purple-700 border-purple-200/80",
    outline: "bg-white/60 backdrop-blur-sm border-slate-300/80 text-slate-600",
};

const Badge = ({ className, variant = 'default', children, ...props }) => {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-none",
                badgeVariants[variant] || badgeVariants.default,
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
};

Badge.propTypes = {
    className: PropTypes.string,
    variant: PropTypes.oneOf([
        'default', 'primary', 'success', 'warning', 'danger', 'purple', 'outline'
    ]),
    children: PropTypes.node.isRequired,
};

export { Badge };
