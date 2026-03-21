import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children, activePage, onNavigate }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => {
            const w = window.innerWidth;
            const mobile = w < 768;
            setIsMobile(mobile);
            // Auto-collapse on medium screens
            if (w >= 768 && w < 1100) setSidebarCollapsed(true);
            else if (w >= 1100) setSidebarCollapsed(false);
            // Close overlay on resize to desktop
            if (!mobile) setSidebarOpen(false);
        };
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const handleNavigate = (page) => {
        onNavigate(page);
        if (isMobile) setSidebarOpen(false);
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

            {/* ── Desktop / Tablet Sidebar ── */}
            {!isMobile && (
                <Sidebar
                    activePage={activePage}
                    onNavigate={handleNavigate}
                    collapsed={sidebarCollapsed}
                    setCollapsed={setSidebarCollapsed}
                />
            )}

            {/* ── Mobile: Drawer Overlay ── */}
            {isMobile && sidebarOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Close sidebar overlay"
                        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity outline-none border-none cursor-default"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 z-50 animate-in slide-in-from-left-full duration-300">
                        <Sidebar
                            activePage={activePage}
                            onNavigate={handleNavigate}
                            collapsed={false}
                            setCollapsed={() => setSidebarOpen(false)}
                            isMobileDrawer
                        />
                    </div>
                </>
            )}

            {/* ── Main Area ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Navbar
                    activePage={activePage}
                    onMenuOpen={() => setSidebarOpen(true)}
                    onNavigate={handleNavigate}
                    isMobile={isMobile}
                />

                <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-10">
                        <div
                            key={activePage}
                            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                        >
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

Layout.propTypes = {
    children: PropTypes.node.isRequired,
    activePage: PropTypes.string.isRequired,
    onNavigate: PropTypes.func.isRequired,
};

export default Layout;
