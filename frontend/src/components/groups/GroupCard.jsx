import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import GroupProgressBar from './GroupProgressBar'

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function GroupCard({ group, courseName, onAddMember }) {
  const navigate = useNavigate()
  const memberCount = group._count?.members ?? group.members?.length ?? 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            {courseName && (
              <p className="text-xs text-muted-foreground truncate">{courseName}</p>
            )}
            <CardTitle className="text-base leading-snug">{group.name}</CardTitle>
          </div>
          {group.deadline && (
            <Badge variant="outline" className="text-xs shrink-0">Due {formatDate(group.deadline)}</Badge>
          )}
        </div>
        <CardDescription className="font-medium text-foreground/80">{group.projectTitle}</CardDescription>
        {group.projectDesc && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{group.projectDesc}</p>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        <GroupProgressBar tasks={group.tasks ?? []} />
        <p className="text-xs text-muted-foreground mt-2">{memberCount} {memberCount === 1 ? 'member' : 'members'}</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/groups/${group.id}`)}>
          View Group
        </Button>
        {onAddMember && (
          <Button size="sm" variant="ghost" onClick={() => onAddMember(group)}>
            + Member
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
