import { useDroppable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import TaskCard from './TaskCard'

const COLUMN_LABELS = {
  TODO:        'To Do',
  IN_PROGRESS: 'In Progress',
  DONE:        'Done',
}

const COLUMN_COLORS = {
  TODO:        'bg-slate-100 dark:bg-slate-900',
  IN_PROGRESS: 'bg-blue-50 dark:bg-blue-950/40',
  DONE:        'bg-green-50 dark:bg-green-950/40',
}

export default function KanbanColumn({ status, tasks, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg p-3 space-y-2 min-h-[200px] transition-colors',
        COLUMN_COLORS[status],
        isOver && 'ring-2 ring-primary ring-inset'
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold">{COLUMN_LABELS[status]}</h3>
        <Badge variant="outline" className="text-xs h-5 px-1.5">{tasks.length}</Badge>
      </div>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onClick={onTaskClick} />
      ))}
      {tasks.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">No tasks</p>
      )}
    </div>
  )
}
