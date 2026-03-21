import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            ref={ref}
            className={cn(
                "flex h-10 w-full rounded-lg px-3 py-2 text-sm",
                "bg-white/80 backdrop-blur-sm",
                "border border-slate-200/90",
                "text-slate-900 placeholder:text-slate-400",
                "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
                "transition-all duration-200",
                "hover:border-indigo-300/60 hover:bg-white hover:shadow-[0_1px_8px_rgba(99,102,241,0.08)]",
                "focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-white",
                "focus-visible:border-indigo-400/80 focus-visible:shadow-input-focus",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
                "disabled:hover:border-slate-200/90 disabled:hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
                className
            )}
            {...props}
        />
    );
});

Input.displayName = "Input";

Input.propTypes = {
    className: PropTypes.string,
    type: PropTypes.string,
};

export { Input };
