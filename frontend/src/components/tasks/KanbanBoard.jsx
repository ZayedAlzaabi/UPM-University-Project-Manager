import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { useState } from 'react'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE']

export default function KanbanBoard({ tasks, onTaskClick, onTaskStatusChange }) {
  const [activeTask, setActiveTask] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s)
    return acc
  }, {})

  const handleDragStart = ({ active }) => {
    const task = tasks.find((t) => t.id === active.id)
    setActiveTask(task ?? null)
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveTask(null)
    if (!over) return
    const newStatus = over.id // droppable IDs are the status strings
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.status === newStatus) return
    if (STATUSES.includes(newStatus)) {
      onTaskStatusChange(task, newStatus)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={grouped[status]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 opacity-90">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
