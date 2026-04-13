import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGroup, getGroupTasks } from '@/api/groups'
import { updateTask } from '@/api/tasks'
import { useAuth } from '@/hooks/useAuth'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import TaskDialog from '@/components/tasks/TaskDialog'
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog'
import GroupProgressBar from '@/components/groups/GroupProgressBar'
import GroupDetailSkeleton from '@/components/skeletons/GroupDetailSkeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function GroupDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const isInstructor = user?.role === 'INSTRUCTOR'

  const [group, setGroup] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showCreateTask, setShowCreateTask] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [g, t] = await Promise.all([getGroup(id), getGroupTasks(id)])
        setGroup(g)
        setTasks(t)
      } catch {
        toast.error('Failed to load group')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleTaskUpdated = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)))
    if (selectedTask?.id === updated.id) setSelectedTask((prev) => ({ ...prev, ...updated }))
  }

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  const handleTaskCreated = (task) => {
    setTasks((prev) => [...prev, task])
  }

  const handleTaskStatusChange = async (task, newStatus) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t))
    try {
      const updated = await updateTask(task.id, { status: newStatus })
      setTasks((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t))
    } catch (err) {
      // Revert on error
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: task.status } : t))
      toast.error(err.response?.data?.error ?? 'Failed to update task status')
    }
  }

  if (loading) return <GroupDetailSkeleton />
  if (!group) return <div className="text-center py-16 text-muted-foreground">Group not found.</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        <Link to="/dashboard" className="hover:underline">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link to={`/courses/${group.course.id}`} className="hover:underline">{group.course.name}</Link>
        <span className="mx-2">/</span>
        <span>{group.name}</span>
      </div>

      {/* Project Panel */}
      <div className="bg-card border rounded-lg p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold">{group.name}</h1>
              <Badge variant="secondary">{group.course.semester} {group.course.year}</Badge>
            </div>
            <p className="text-base font-medium text-muted-foreground">{group.projectTitle}</p>
            {group.projectDesc && (
              <p className="text-sm text-muted-foreground mt-1">{group.projectDesc}</p>
            )}
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-xs text-muted-foreground">Deadline</p>
            <p className="text-sm font-medium">{formatDate(group.deadline)}</p>
          </div>
        </div>

        <GroupProgressBar tasks={tasks} />

        <Separator />

        {/* Members */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Members</p>
          <div className="flex flex-wrap gap-2">
            {group.members?.map((m) => (
              <div key={m.userId} className="flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">{initials(m.user.name)}</AvatarFallback>
                </Avatar>
                <span className="text-xs">{m.user.name}</span>
              </div>
            ))}
            {(!group.members || group.members.length === 0) && (
              <p className="text-xs text-muted-foreground">No members yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <Button size="sm" onClick={() => setShowCreateTask(true)}>+ New Task</Button>
        </div>
        <KanbanBoard
          tasks={tasks}
          onTaskClick={setSelectedTask}
          onTaskStatusChange={handleTaskStatusChange}
        />
      </div>

      {/* Task Detail Dialog */}
      <TaskDialog
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(v) => { if (!v) setSelectedTask(null) }}
        members={group.members ?? []}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
      />

      {/* Create Task Dialog — now available to both students and instructors */}
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        groupId={id}
        members={group.members ?? []}
        onCreated={handleTaskCreated}
      />
    </div>
  )
}
