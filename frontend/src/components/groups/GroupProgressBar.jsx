import { Progress } from '@/components/ui/progress'

export default function GroupProgressBar({ tasks = [] }) {
  const pct = tasks.length
    ? Math.round((tasks.filter((t) => t.status === 'DONE').length / tasks.length) * 100)
    : 0

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span>{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  )
}
