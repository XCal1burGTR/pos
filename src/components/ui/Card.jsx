import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

const Card = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-card",
            "transition-all duration-200",
            className
        )}
        {...props}
    />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1 p-5 pb-4", className)}
        {...props}
    />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, children, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn("font-semibold text-slate-900 leading-tight tracking-tight text-base", className)}
        {...props}
    >
        {children}
    </h3>
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-slate-500 leading-relaxed", className)}
        {...props}
    />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-5 pt-0 gap-3", className)}
        {...props}
    />
));
CardFooter.displayName = "CardFooter";

const commonPropTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
};

Card.propTypes = commonPropTypes;
CardHeader.propTypes = commonPropTypes;
CardTitle.propTypes = commonPropTypes;
CardDescription.propTypes = commonPropTypes;
CardContent.propTypes = commonPropTypes;
CardFooter.propTypes = commonPropTypes;

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
