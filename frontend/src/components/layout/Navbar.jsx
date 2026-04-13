import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bell, LayoutDashboard, History } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import ThemeToggle from './ThemeToggle'
import { getNotifications } from '@/api/support'
import uaeuLogo from '@/assets/uaeu-logo.svg'

function NavLink({ to, icon: Icon, label, active }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    getNotifications()
      .then((data) => {
        if (user.role === 'INSTRUCTOR') {
          setUnreadCount(data.supportRequests?.length ?? 0)
        } else {
          setUnreadCount((data.replies?.length ?? 0) + (data.comments?.length ?? 0))
        }
      })
      .catch(() => {})
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Left: Logo + brand */}
        <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <img src={uaeuLogo} alt="UAEU" className="h-8 w-auto" />
          <span className="font-semibold text-base tracking-tight hidden sm:block">UPM</span>
        </Link>

        {/* Centre: Nav links */}
        {user && (
          <nav className="flex items-center gap-1">
            <NavLink
              to="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              active={pathname === '/dashboard'}
            />
            {user.role === 'INSTRUCTOR' && (
              <NavLink
                to="/history"
                icon={History}
                label="History"
                active={pathname === '/history'}
              />
            )}
          </nav>
        )}

        {/* Right: controls */}
        {user && (
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            <Badge variant={user.role === 'INSTRUCTOR' ? 'default' : 'secondary'} className="hidden sm:flex">
              {user.role === 'INSTRUCTOR' ? 'Instructor' : 'Student'}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm font-medium">{user.name}</div>
                <div className="px-2 pb-1 text-xs text-muted-foreground">{user.email}</div>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  )
}
