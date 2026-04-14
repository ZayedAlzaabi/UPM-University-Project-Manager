import { FolderOpen, UserPlus, ClipboardList, CheckCircle2, PlayCircle, RotateCcw } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const EVENT_CONFIG = {
  group_created: {
    Icon: FolderOpen,
    dotClass: 'bg-blue-500',
    iconClass: 'text-blue-500',
  },
  member_joined: {
    Icon: UserPlus,
    dotClass: 'bg-emerald-500',
    iconClass: 'text-emerald-500',
  },
  task_created: {
    Icon: ClipboardList,
    dotClass: 'bg-violet-500',
    iconClass: 'text-violet-500',
  },
  task_started: {
    Icon: PlayCircle,
    dotClass: 'bg-amber-500',
    iconClass: 'text-amber-500',
  },
  task_completed: {
    Icon: CheckCircle2,
    dotClass: 'bg-green-500',
    iconClass: 'text-green-500',
  },
  task_returned: {
    Icon: RotateCcw,
    dotClass: 'bg-orange-500',
    iconClass: 'text-orange-500',
  },
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatRelative(date) {
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function formatFull(date) {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TimelineItem({ event, isLast }) {
  const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.group_created
  const { Icon, dotClass, iconClass } = config
  const date = new Date(event.timestamp)
  const isMember = event.type === 'member_joined'

  return (
    <div className="flex gap-3 min-h-[3rem]">
      {/* Left: dot + connector line */}
      <div className="relative flex flex-col items-center">
        <div className={`z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${dotClass} bg-opacity-15 ring-2 ring-offset-2 ring-offset-background`}
          style={{ ringColor: 'currentColor' }}>
          <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
        </div>
        {!isLast && (
          <div className="mt-1 w-px flex-1 bg-border" />
        )}
      </div>

      {/* Right: event content */}
      <div className={`flex flex-col gap-0.5 ${isLast ? '' : 'pb-5'}`}>
        <div className="flex items-center gap-2 flex-wrap">
          {isMember && event.data?.user && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px]">{initials(event.data.user.name)}</AvatarFallback>
            </Avatar>
          )}
          <span className="text-sm font-medium leading-none">{event.title}</span>
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground">{event.description}</p>
        )}
        <p
          className="text-[11px] text-muted-foreground/70 mt-0.5"
          title={formatFull(date)}
        >
          {formatRelative(date)}
        </p>
      </div>
    </div>
  )
}
