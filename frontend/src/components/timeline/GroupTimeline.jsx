import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import TimelineItem from './TimelineItem'

function buildTimeline(group, tasks) {
  const events = []

  events.push({
    type: 'group_created',
    timestamp: group.createdAt,
    title: 'Group created',
    description: `${group.name} — ${group.projectTitle}`,
    data: null,
  })

  group.members?.forEach((m) => {
    events.push({
      type: 'member_joined',
      timestamp: m.createdAt,
      title: `${m.user.name} joined the group`,
      description: m.user.email,
      data: { user: m.user },
    })
  })

  tasks.forEach((task) => {
    events.push({
      type: 'task_created',
      timestamp: task.createdAt,
      title: 'Task created',
      description: task.title,
      data: { task },
    })

    if (task.status === 'DONE') {
      const diff = new Date(task.updatedAt) - new Date(task.createdAt)
      if (diff > 2000) {
        events.push({
          type: 'task_completed',
          timestamp: task.updatedAt,
          title: 'Task completed',
          description: task.title,
          data: { task },
        })
      }
    }
  })

  return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

export default function GroupTimeline({ group, tasks }) {
  const events = buildTimeline(group, tasks)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div>
            {events.map((event, i) => (
              <TimelineItem
                key={`${event.type}-${event.timestamp}-${i}`}
                event={event}
                isLast={i === events.length - 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
