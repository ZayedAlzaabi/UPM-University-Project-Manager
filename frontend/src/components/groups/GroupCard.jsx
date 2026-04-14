import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import GroupProgressBar from './GroupProgressBar'

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function GroupCard({ group, courseName, onAddMember, onDelete }) {
  const navigate = useNavigate()
  const memberCount = group._count?.members ?? group.members?.length ?? 0
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(group.id)
    } finally {
      setDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              {courseName && (
                <p className="text-xs text-muted-foreground truncate">{courseName}</p>
              )}
              <CardTitle className="text-base leading-snug">{group.name}</CardTitle>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {group.deadline && (
                <Badge variant="outline" className="text-xs">Due {formatDate(group.deadline)}</Badge>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setShowConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
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

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete group?</DialogTitle>
            <DialogDescription>
              This will permanently delete <span className="font-medium text-foreground">{group.name}</span> and all its tasks, members, and history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
