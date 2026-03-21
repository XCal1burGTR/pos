import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

const Select = React.forwardRef(({ className, children, ...props }, ref) => {
    return (
        <select
            ref={ref}
            className={cn(
                "flex h-10 w-full rounded-lg px-3 py-2 text-sm",
                "bg-white/80 backdrop-blur-sm",
                "border border-slate-200/90",
                "text-slate-900",
                "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
                "transition-all duration-200",
                "hover:border-indigo-300/60 hover:bg-white hover:shadow-[0_1px_8px_rgba(99,102,241,0.08)]",
                "focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-white",
                "focus-visible:border-indigo-400/80 focus-visible:shadow-input-focus",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
                "appearance-none",
                "bg-[url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxNicgaGVpZ2h0PScxNicgdmlld0JveD0nMCAwIDI0IDI0JyBmaWxsPSdub25lJyBzdHJva2U9JyM5NGEzYjgnIHN0cm9rZS13aWR0aD0nMic+PHBhdGggZD0nbTYgOSA2IDYgNi02Jy8+PC9zdmc+\")] bg-no-repeat bg-[right_0.6rem_center]",
                "pr-9",
                className
            )}
            {...props}
        >
            {children}
        </select>
    );
});

Select.displayName = "Select";

Select.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

export { Select };
