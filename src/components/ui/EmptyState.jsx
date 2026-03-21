import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

const EmptyState = ({ icon: Icon, title, description, action, className }) => {
    return (
        <div className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}>
            {Icon && (
                <div className="mb-4 p-4 bg-slate-100 rounded-2xl">
                    <Icon className="h-8 w-8 text-slate-400" />
                </div>
            )}
            <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{description}</p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
};

EmptyState.propTypes = {
    icon: PropTypes.oneOfType([PropTypes.element, PropTypes.func, PropTypes.object, PropTypes.string]),
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    action: PropTypes.node,
    className: PropTypes.string,
};

export { EmptyState };
