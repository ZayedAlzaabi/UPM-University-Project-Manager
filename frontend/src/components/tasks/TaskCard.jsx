import { useDraggable } from '@dnd-kit/core'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatRelative(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={cn(
          'cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow',
          isDragging && 'opacity-50 shadow-lg'
        )}
        onClick={(e) => {
          // Only fire click if not dragging
          if (!isDragging) onClick(task)
        }}
      >
        <CardContent className="p-3 space-y-2">
          <p className="text-sm font-medium leading-snug">{task.title}</p>

          <div className="flex items-center justify-between gap-2">
            {task.assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">{initials(task.assignee.name)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate max-w-[90px]">{task.assignee.name}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}

            {task.dueDate && (
              <span className="text-xs text-muted-foreground shrink-0">{formatDate(task.dueDate)}</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-1">
            {task._count?.comments > 0 ? (
              <p className="text-xs text-muted-foreground">
                {task._count.comments} comment{task._count.comments !== 1 ? 's' : ''}
              </p>
            ) : <span />}
            {task.updatedAt && (
              <span className="text-[10px] text-muted-foreground/70" title={new Date(task.updatedAt).toLocaleString()}>
                {formatRelative(task.updatedAt)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
