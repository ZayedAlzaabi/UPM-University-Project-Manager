import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { updateTask, deleteTask, getComments, addComment } from '@/api/tasks'
import { createSupportRequest, getSupportRequests, replySupportRequest, resolveRequest } from '@/api/support'
import { toast } from 'sonner'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function SupportRequestItem({ req, isInstructor, onReply, onResolve }) {
  const [replyBody, setReplyBody] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyBody.trim()) return
    setLoading(true)
    try {
      await onReply(req.id, replyBody)
      setReplyBody('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px]">{initials(req.author.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-xs">{req.author.name}</span>
          <span className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</span>
        </div>
        <Badge variant={req.status === 'OPEN' ? 'default' : 'secondary'} className="text-[10px]">
          {req.status}
        </Badge>
      </div>
      <p className="text-muted-foreground pl-6.5">{req.message}</p>

      {req.replies?.map((r) => (
        <div key={r.id} className="ml-6 bg-muted/50 rounded p-2 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-4 w-4">
              <AvatarFallback className="text-[8px]">{initials(r.author.name)}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">{r.author.name}</span>
            <span className="text-[10px] text-muted-foreground">{formatDate(r.createdAt)}</span>
          </div>
          <p className="text-xs text-muted-foreground pl-5">{r.body}</p>
        </div>
      ))}

      {isInstructor && req.status === 'OPEN' && (
        <form onSubmit={handleReply} className="ml-6 flex gap-2">
          <Input
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Reply…"
            className="h-7 text-xs flex-1"
          />
          <Button size="sm" type="submit" disabled={loading || !replyBody.trim()} className="h-7 text-xs">
            Reply
          </Button>
          <Button
            size="sm"
            variant="outline"
            type="button"
            className="h-7 text-xs"
            onClick={() => onResolve(req.id)}
          >
            Resolve
          </Button>
        </form>
      )}
    </div>
  )
}

export default function TaskDialog({ task, open, onOpenChange, members, onUpdated, onDeleted }) {
  const { user } = useAuth()
  const isInstructor = user?.role === 'INSTRUCTOR'

  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState([])
  const [commentBody, setCommentBody] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [supportRequests, setSupportRequests] = useState([])
  const [showSupportForm, setShowSupportForm] = useState(false)
  const [supportMessage, setSupportMessage] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)

  useEffect(() => {
    if (!task || !open) return
    setForm({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      assigneeId: task.assigneeId ?? '',
    })
    setEditing(false)
    setShowSupportForm(false)
    Promise.all([
      getComments(task.id).catch(() => []),
      getSupportRequests(task.id).catch(() => []),
    ]).then(([c, s]) => {
      setComments(c)
      setSupportRequests(s)
    })
  }, [task, open])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  // Fix: compute display name for selected assignee
  const selectedMember = members.find((m) => m.userId === form.assigneeId)

  const handleSave = async () => {
    setLoading(true)
    try {
      const updated = await updateTask(task.id, {
        title: form.title,
        description: form.description || null,
        status: form.status,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        assigneeId: form.assigneeId || null,
      })
      toast.success('Task updated')
      onUpdated(updated)
      setEditing(false)
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to update task')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (status) => {
    setForm((f) => ({ ...f, status }))
    try {
      const updated = await updateTask(task.id, { status })
      onUpdated(updated)
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to update status')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return
    try {
      await deleteTask(task.id)
      toast.success('Task deleted')
      onDeleted(task.id)
      onOpenChange(false)
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to delete task')
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentBody.trim()) return
    setCommentLoading(true)
    try {
      const comment = await addComment(task.id, { body: commentBody })
      setComments((c) => [...c, comment])
      setCommentBody('')
      toast.success('Comment added')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to add comment')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleSupportSubmit = async (e) => {
    e.preventDefault()
    if (!supportMessage.trim()) return
    setSupportLoading(true)
    try {
      const req = await createSupportRequest(task.id, { message: supportMessage })
      setSupportRequests((prev) => [req, ...prev])
      setSupportMessage('')
      setShowSupportForm(false)
      toast.success('Support request sent')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to send support request')
    } finally {
      setSupportLoading(false)
    }
  }

  const handleSupportReply = async (requestId, body) => {
    try {
      const reply = await replySupportRequest(requestId, { body })
      setSupportRequests((prev) =>
        prev.map((r) => r.id === requestId ? { ...r, replies: [...(r.replies ?? []), reply] } : r)
      )
      toast.success('Reply sent')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to reply')
    }
  }

  const handleSupportResolve = async (requestId) => {
    try {
      const updated = await resolveRequest(requestId)
      setSupportRequests((prev) => prev.map((r) => r.id === requestId ? updated : r))
      toast.success('Marked as resolved')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to resolve')
    }
  }

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">
            {editing ? (
              <Input value={form.title} onChange={set('title')} className="text-base font-semibold" />
            ) : (
              task.title
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <Label className="w-20 shrink-0 text-muted-foreground text-xs">Status</Label>
            {isInstructor ? (
              <Badge>{form.status?.replace('_', ' ')}</Badge>
            ) : (
              <Select value={form.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-36 h-7 text-xs">
                  <span>{form.status?.replace('_', ' ')}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-3">
            <Label className="w-20 shrink-0 text-muted-foreground text-xs">Assignee</Label>
            {editing ? (
              <Select value={form.assigneeId} onValueChange={setVal('assigneeId')}>
                <SelectTrigger className="flex-1 h-7 text-xs">
                  <span>{selectedMember ? selectedMember.user.name : <span className="text-muted-foreground">Unassigned</span>}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>{m.user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : task.assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">{initials(task.assignee.name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{task.assignee.name}</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Unassigned</span>
            )}
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-3">
            <Label className="w-20 shrink-0 text-muted-foreground text-xs">Due Date</Label>
            {editing ? (
              <Input type="date" value={form.dueDate} onChange={set('dueDate')} className="flex-1 h-7 text-xs" />
            ) : (
              <span className="text-sm">{formatDate(task.dueDate)}</span>
            )}
          </div>

          {/* Last changed */}
          {task.updatedAt && (
            <div className="flex items-center gap-3">
              <Label className="w-20 shrink-0 text-muted-foreground text-xs">Last changed</Label>
              <span className="text-sm text-muted-foreground" title={new Date(task.updatedAt).toLocaleString()}>
                {formatDate(task.updatedAt)}
              </span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Description</Label>
            {editing ? (
              <Textarea value={form.description} onChange={set('description')} rows={3} placeholder="Task description…" />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description || 'No description'}
              </p>
            )}
          </div>

          {/* Student actions */}
          {!isInstructor && (
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={handleDelete}>Delete</Button>
                </>
              )}
            </div>
          )}

          <Separator />

          {/* Instructor Comments */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Comments ({comments.length})</h4>
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">{initials(c.author.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{c.author.name}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                </div>
                <p className="text-sm pl-6 text-muted-foreground">{c.body}</p>
              </div>
            ))}

            {isInstructor && (
              <form onSubmit={handleComment} className="space-y-2 pt-1">
                <Textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Leave feedback…"
                  rows={2}
                />
                <Button size="sm" type="submit" disabled={commentLoading || !commentBody.trim()}>
                  {commentLoading ? 'Posting…' : 'Post Comment'}
                </Button>
              </form>
            )}
          </div>

          <Separator />

          {/* Support Requests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Support Requests ({supportRequests.length})
              </h4>
              {!isInstructor && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowSupportForm((v) => !v)}>
                  {showSupportForm ? 'Cancel' : 'Request Support'}
                </Button>
              )}
            </div>

            {!isInstructor && showSupportForm && (
              <form onSubmit={handleSupportSubmit} className="space-y-2">
                <Textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Describe what you need help with…"
                  rows={3}
                />
                <Button size="sm" type="submit" disabled={supportLoading || !supportMessage.trim()}>
                  {supportLoading ? 'Sending…' : 'Send Request'}
                </Button>
              </form>
            )}

            {supportRequests.length === 0 && (
              <p className="text-xs text-muted-foreground">No support requests.</p>
            )}

            {supportRequests.map((req) => (
              <SupportRequestItem
                key={req.id}
                req={req}
                isInstructor={isInstructor}
                onReply={handleSupportReply}
                onResolve={handleSupportResolve}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
