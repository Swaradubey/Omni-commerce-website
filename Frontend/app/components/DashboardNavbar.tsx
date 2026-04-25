import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Search, 
  User as UserIcon, 
  ChevronDown,
  Settings
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { useAuth } from '../context/AuthContext';
import { accountRoleSubtitle } from '../utils/staffRoles';
import { SidebarTrigger } from './ui/sidebar';

type DashboardNavbarProps = {
  /** Premium styling when viewing Dashboard Overview only */
  premiumOverview?: boolean;
};

export function DashboardNavbar({ premiumOverview = false }: DashboardNavbarProps) {
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!premiumOverview) return;
    const id = 'dashboard-overview-font-inter';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
    return () => {
      /* keep font cached for session; do not remove to avoid layout shift on quick nav */
    };
  }, [premiumOverview]);

  return (
    <header
      className={
        premiumOverview
          ? 'sticky top-0 z-40 w-full border-b border-amber-200/30 dark:border-amber-900/20 bg-white/65 dark:bg-zinc-950/70 backdrop-blur-xl shadow-[0_1px_0_rgba(212,175,55,0.08),0_8px_24px_-8px_rgba(0,0,0,0.08)]'
          : 'sticky top-0 z-40 w-full border-b bg-white/50 dark:bg-black/50 backdrop-blur-xl'
      }
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div className="hidden md:flex relative w-64 max-w-[min(16rem,100%)]">
            <Search
              className={
                premiumOverview
                  ? 'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-700/50 dark:text-amber-400/50'
                  : 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground'
              }
            />
            <Input
              placeholder="Search analytics..."
              className={
                premiumOverview
                  ? 'pl-10 h-10 rounded-full border border-amber-200/40 bg-white/80 dark:bg-zinc-900/60 dark:border-amber-900/30 shadow-sm transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:border-amber-300/60'
                  : 'pl-10 bg-gray-100/50 dark:bg-white/5 border-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl'
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className={
              premiumOverview
                ? 'rounded-full transition-all duration-300 hover:bg-amber-500/10 dark:hover:bg-amber-400/10'
                : 'rounded-full hover:bg-gray-100 dark:hover:bg-white/10'
            }
          >
            <Bell className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div
                whileHover={premiumOverview ? { scale: 1.02 } : undefined}
                whileTap={premiumOverview ? { scale: 0.98 } : undefined}
                className="inline-flex"
              >
                <Button
                  variant="ghost"
                  className={
                    premiumOverview
                      ? 'relative flex items-center gap-2 p-1 pr-2 rounded-full border border-transparent transition-all duration-300 hover:border-amber-200/50 hover:bg-amber-500/5 dark:hover:border-amber-800/40 dark:hover:bg-amber-400/5 hover:shadow-md hover:shadow-amber-900/5'
                      : 'relative flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all'
                  }
                >
                  <Avatar className="h-8 w-8 border-2 border-white dark:border-zinc-800 shadow-md ring-2 ring-amber-200/30 dark:ring-amber-700/20">
                    <AvatarImage src={`https://avatar.iran.liara.run/username?username=${user?.name || 'User'}`} />
                    <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-bold leading-none">{user?.name || 'Admin'}</span>
                    <span
                      className={
                        user?.role === 'super_admin'
                          ? 'text-[10px] font-semibold text-violet-700 dark:text-violet-300'
                          : user?.role === 'admin'
                            ? 'text-[10px] font-semibold text-amber-800 dark:text-amber-200/90'
                            : 'text-[10px] text-muted-foreground'
                      }
                    >
                      {accountRoleSubtitle(user?.role)}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={
                premiumOverview
                  ? 'w-56 mt-2 p-2 rounded-2xl border border-amber-200/40 dark:border-amber-900/30 shadow-2xl shadow-amber-900/10 bg-white/92 dark:bg-zinc-950/92 backdrop-blur-xl'
                  : 'w-56 mt-2 p-2 rounded-2xl border-none shadow-2xl bg-white/90 dark:bg-black/90 backdrop-blur-xl'
              }
            >
              <DropdownMenuLabel className="font-bold">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/10" />
              <DropdownMenuItem
                className={
                  premiumOverview
                    ? 'rounded-xl flex items-center gap-2 p-2 cursor-pointer focus:bg-amber-50 dark:focus:bg-amber-950/40 focus:text-amber-900 dark:focus:text-amber-200'
                    : 'rounded-xl flex items-center gap-2 p-2 cursor-pointer focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:text-blue-600 dark:focus:text-blue-400'
                }
              >
                <UserIcon className="w-4 h-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className={
                  premiumOverview
                    ? 'rounded-xl flex items-center gap-2 p-2 cursor-pointer focus:bg-amber-50 dark:focus:bg-amber-950/40 focus:text-amber-900 dark:focus:text-amber-200'
                    : 'rounded-xl flex items-center gap-2 p-2 cursor-pointer focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:text-blue-600 dark:focus:text-blue-400'
                }
              >
                <Settings className="w-4 h-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className={
                  premiumOverview
                    ? 'rounded-xl flex items-center gap-2 p-2 cursor-pointer focus:bg-amber-50 dark:focus:bg-amber-950/40 focus:text-amber-900 dark:focus:text-amber-200'
                    : 'rounded-xl flex items-center gap-2 p-2 cursor-pointer focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:text-blue-600 dark:focus:text-blue-400'
                }
              >
                <Bell className="w-4 h-4" /> Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/10" />
              <DropdownMenuItem
                onClick={logout}
                className="rounded-xl flex items-center gap-2 p-2 cursor-pointer text-rose-500 focus:bg-rose-50 dark:focus:bg-rose-900/20 focus:text-rose-600"
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
