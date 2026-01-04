/**
 * Sidebar Module
 * 
 * Split from original sidebar.tsx (727 lines) into focused modules:
 * - provider.tsx: Context, hook, and SidebarProvider
 * - sidebar.tsx: Main Sidebar component and layout helpers
 * - menu.tsx: Menu components
 * - trigger.tsx: Trigger, rail, inset, and input components
 */

// Provider and context
export { SidebarProvider, useSidebar, SidebarContext, type SidebarContextProps } from './provider'

// Main sidebar and layout components
export {
    Sidebar,
    SidebarHeader,
    SidebarFooter,
    SidebarSeparator,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupAction,
    SidebarGroupContent,
} from './sidebar'

// Menu components
export {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuSkeleton,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    sidebarMenuButtonVariants,
} from './menu'

// Trigger and auxiliary components
export {
    SidebarTrigger,
    SidebarRail,
    SidebarInset,
    SidebarInput,
} from './trigger'
