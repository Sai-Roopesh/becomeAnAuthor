'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface ViewSwitcherItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
}

interface ViewHeaderProps {
    /** Page/view title */
    title: string;
    /** Icon displayed before title */
    icon?: React.ReactNode;
    /** Optional subtitle */
    subtitle?: string;
    /** View switcher items (for Plan mode sub-views) */
    viewSwitcher?: ViewSwitcherItem[];
    /** Active view ID */
    activeView?: string;
    /** View change handler */
    onViewChange?: (viewId: string) => void;
    /** Actions to display on right side */
    actions?: React.ReactNode;
    /** Enable search functionality */
    searchEnabled?: boolean;
    /** Search placeholder text */
    searchPlaceholder?: string;
    /** Search value (controlled) */
    searchValue?: string;
    /** Search change handler */
    onSearchChange?: (query: string) => void;
    /** Additional class names */
    className?: string;
}

/**
 * ViewHeader - Standardized header component for all view modes
 * 
 * Features:
 * - Title with optional icon and subtitle
 * - View switcher (segmented buttons) for sub-views
 * - Search input (expandable)
 * - Actions slot for buttons
 * - Responsive: stacks on mobile
 * - Sticky positioning with backdrop blur
 * 
 * @example
 * // Plan mode with sub-views
 * <ViewHeader
 *   title="Plan"
 *   icon={<LayoutTemplate />}
 *   viewSwitcher={[
 *     { id: 'grid', label: 'Grid', icon: <LayoutGrid /> },
 *     { id: 'outline', label: 'Outline', icon: <List /> },
 *   ]}
 *   activeView={viewType}
 *   onViewChange={setViewType}
 *   searchEnabled
 *   onSearchChange={setSearch}
 * />
 * 
 * // Review mode with action button
 * <ViewHeader
 *   title="Story Analysis"
 *   icon={<Sparkles />}
 *   subtitle="AI-powered developmental feedback"
 *   actions={<Button>Run Analysis</Button>}
 * />
 */
export function ViewHeader({
    title,
    icon,
    subtitle,
    viewSwitcher,
    activeView,
    onViewChange,
    actions,
    searchEnabled,
    searchPlaceholder = 'Search...',
    searchValue = '',
    onSearchChange,
    className,
}: ViewHeaderProps) {
    const [searchOpen, setSearchOpen] = useState(false);

    const handleSearchToggle = () => {
        if (searchOpen && searchValue) {
            onSearchChange?.('');
        }
        setSearchOpen(!searchOpen);
    };

    return (
        <div
            className={cn(
                "sticky top-0 z-20",
                "border-b border-border/50",
                "p-4 sm:p-6",
                "bg-background/80 backdrop-blur-md",
                "supports-[backdrop-filter]:bg-background/60",
                className
            )}
        >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Left: Title and subtitle */}
                <div className="flex items-center gap-3 min-w-0">
                    {icon && (
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground truncate">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-sm text-muted-foreground truncate">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Center: View Switcher */}
                {viewSwitcher && viewSwitcher.length > 0 && (
                    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg overflow-x-auto scrollbar-hide">
                        {viewSwitcher.map((item) => (
                            <Tooltip key={item.id}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={item.disabled}
                                        onClick={() => onViewChange?.(item.id)}
                                        className={cn(
                                            "min-h-9 px-3 gap-2 transition-all",
                                            "flex-shrink-0",
                                            activeView === item.id
                                                ? "bg-background shadow-sm text-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {item.icon}
                                        <span className="hidden sm:inline text-sm">
                                            {item.label}
                                        </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="sm:hidden">
                                    {item.label}
                                    {item.disabled && " (Coming soon)"}
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right: Search and Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Search */}
                    {searchEnabled && (
                        <div className="flex items-center">
                            {searchOpen ? (
                                <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200">
                                    <Input
                                        type="text"
                                        placeholder={searchPlaceholder}
                                        value={searchValue}
                                        onChange={(e) => onSearchChange?.(e.target.value)}
                                        className="h-9 w-48 sm:w-64"
                                        autoFocus
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleSearchToggle}
                                        className="h-9 w-9"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleSearchToggle}
                                            className="h-9 w-9"
                                        >
                                            <Search className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Search</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    {actions}
                </div>
            </div>
        </div>
    );
}
