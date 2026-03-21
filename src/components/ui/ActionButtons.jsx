import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

/**
 * ActionBtn — unified action button used across all pages.
 *
 * variants: 'view' | 'edit' | 'print' | 'delete' | 'cancel' | 'default'
 * iconOnly: omits the text label — use for table rows (Products, Pricing)
 *
 * When used inside <ActionGroup>, borders merge into the pill via the parent.
 * When used standalone, renders as its own bordered pill button.
 */
const ActionBtn = React.forwardRef(({
    icon: Icon,
    label,
    variant = 'default',
    iconOnly = false,
    onClick,
    title,
    className,
    ...props
}, ref) => {
    const variants = {
        default: 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-800',
        view:    'text-slate-500 hover:bg-indigo-50/80 hover:text-indigo-600',
        edit:    'text-slate-500 hover:bg-indigo-50/80 hover:text-indigo-600',
        print:   'text-slate-500 hover:bg-slate-50/80 hover:text-slate-800',
        delete:  'text-rose-400 hover:bg-rose-50/80 hover:text-rose-600',
        cancel:  'text-rose-500 hover:bg-rose-50/80 hover:text-rose-600',
    };

    return (
        <button
            ref={ref}
            type="button"
            title={title ?? label}
            onClick={onClick}
            className={cn(
                'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1',
                'disabled:opacity-50 disabled:pointer-events-none',
                'active:scale-[0.96]',
                // standalone (not inside ActionGroup): has its own border + padding + rounded
                'border border-slate-200/80 bg-white/80 backdrop-blur-sm rounded-lg',
                'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
                'hover:border-slate-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)]',
                iconOnly
                    ? 'h-8 w-8 p-0 text-[13px]'
                    : 'h-8 px-3 text-xs',
                variants[variant] ?? variants.default,
                className,
            )}
            {...props}
        >
            {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
            {!iconOnly && label && <span>{label}</span>}
        </button>
    );
});

ActionBtn.displayName = 'ActionBtn';

/**
 * ActionGroup — wraps ActionBtn children in a connected pill strip.
 * Children lose their individual borders and share a single pill outline.
 *
 * Usage:
 *   <ActionGroup>
 *     <ActionBtn variant="view"   icon={FileText} label="View"   onClick={...} />
 *     <ActionBtn variant="print"  icon={Printer}  label="Print"  onClick={...} />
 *     <ActionBtn variant="cancel" icon={XCircle}  label="Cancel" onClick={...} />
 *   </ActionGroup>
 */
const ActionGroup = ({ children, className }) => (
    <div
        className={cn(
            'inline-flex items-center rounded-lg border border-slate-200/80 bg-white/80 backdrop-blur-sm overflow-hidden divide-x divide-slate-100/80',
            'shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-shadow duration-200',
            'hover:shadow-[0_2px_10px_rgba(0,0,0,0.09)]',
            'flex-shrink-0',
            className,
        )}
    >
        {React.Children.map(children, child => {
            if (!child) return null;
            // Strip the standalone border/rounded/bg so the group owns them
            return React.cloneElement(child, {
                className: cn(
                    'border-0 rounded-none bg-transparent shadow-none',
                    child.props.className,
                ),
            });
        })}
    </div>
);

ActionGroup.displayName = 'ActionGroup';

ActionBtn.propTypes = {
    icon: PropTypes.oneOfType([PropTypes.element, PropTypes.func, PropTypes.object, PropTypes.string]),
    label: PropTypes.string,
    variant: PropTypes.oneOf(['view', 'edit', 'print', 'delete', 'cancel', 'default']),
    iconOnly: PropTypes.bool,
    onClick: PropTypes.func,
    title: PropTypes.string,
    className: PropTypes.string,
};

ActionGroup.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

export { ActionBtn, ActionGroup };
