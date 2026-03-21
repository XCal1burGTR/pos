import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

const PageHeader = ({ title, subtitle, actions, className }) => {
    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6", className)}>
            <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2 flex-shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
};

PageHeader.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    actions: PropTypes.node,
    className: PropTypes.string,
};

export { PageHeader };
