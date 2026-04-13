import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getNotifications, replySupportRequest, resolveRequest } from '@/api/support'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function SupportRequestCard({ req, onReply, onResolve }) {
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
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">{initials(req.author.name)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{req.author.name}</span>
            <span className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Task: <span className="font-medium text-foreground">{req.task?.title}</span>
            {' · '}Group: <span className="font-medium text-foreground">{req.task?.group?.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={req.status === 'OPEN' ? 'default' : 'secondary'}>{req.status}</Badge>
          {req.status === 'OPEN' && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onResolve(req.id)}>
              Resolve
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm bg-muted/50 rounded p-2">{req.message}</p>

      {req.replies?.length > 0 && (
        <div className="space-y-2 pl-4">
          {req.replies.map((r) => (
            <div key={r.id} className="bg-muted rounded p-2 space-y-0.5">
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
        </div>
      )}

      {req.status === 'OPEN' && (
        <form onSubmit={handleReply} className="flex gap-2">
          <Input
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Reply to this request…"
            className="h-8 text-sm flex-1"
          />
          <Button size="sm" type="submit" disabled={loading || !replyBody.trim()} className="h-8">
            {loading ? 'Sending…' : 'Reply'}
          </Button>
        </form>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isInstructor = user?.role === 'INSTRUCTOR'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNotifications()
      .then(setData)
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false))
  }, [])

  const handleReply = async (requestId, body) => {
    try {
      const reply = await replySupportRequest(requestId, { body })
      setData((prev) => ({
        ...prev,
        supportRequests: prev.supportRequests.map((r) =>
          r.id === requestId ? { ...r, replies: [...(r.replies ?? []), reply] } : r
        ),
      }))
      toast.success('Reply sent')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to reply')
    }
  }

  const handleResolve = async (requestId) => {
    try {
      const updated = await resolveRequest(requestId)
      setData((prev) => ({
        ...prev,
        supportRequests: prev.supportRequests.map((r) => r.id === requestId ? updated : r),
      }))
      toast.success('Marked as resolved')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to resolve')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Notifications</h1>

      {loading ? (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : isInstructor ? (
        <>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium">Open Support Requests</h2>
            <Badge variant="outline">{data?.supportRequests?.length ?? 0}</Badge>
          </div>
          {!data?.supportRequests?.length ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No open support requests.</p>
          ) : (
            <div className="space-y-4">
              {data.supportRequests.map((req) => (
                <SupportRequestCard key={req.id} req={req} onReply={handleReply} onResolve={handleResolve} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Replies to student's support requests */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-medium">Replies from Instructor</h2>
              <Badge variant="outline">{data?.replies?.length ?? 0}</Badge>
            </div>
            {!data?.replies?.length ? (
              <p className="text-muted-foreground text-sm">No replies yet.</p>
            ) : (
              <div className="space-y-3">
                {data.replies.map((r) => (
                  <div
                    key={r.id}
                    className="bg-card border rounded-lg p-4 space-y-2 cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => navigate(`/groups/${r.request?.task?.groupId}`)}
                  >
                    <p className="text-xs text-muted-foreground">
                      Task: <span className="font-medium text-foreground">{r.request?.task?.title}</span>
                      {' · '}Group: <span className="font-medium text-foreground">{r.request?.task?.group?.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Your request: {r.request?.message}</p>
                    <Separator />
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{initials(r.author.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{r.author.name}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                        </div>
                        <p className="text-sm mt-0.5">{r.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructor comments on tasks assigned to student */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-medium">Comments on Your Tasks</h2>
              <Badge variant="outline">{data?.comments?.length ?? 0}</Badge>
            </div>
            {!data?.comments?.length ? (
              <p className="text-muted-foreground text-sm">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {data.comments.map((c) => (
                  <div
                    key={c.id}
                    className="bg-card border rounded-lg p-4 space-y-2 cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => navigate(`/groups/${c.task?.groupId}`)}
                  >
                    <p className="text-xs text-muted-foreground">
                      Task: <span className="font-medium text-foreground">{c.task?.title}</span>
                      {' · '}Group: <span className="font-medium text-foreground">{c.task?.group?.name}</span>
                    </p>
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{initials(c.author.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{c.author.name}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="text-sm mt-0.5">{c.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
