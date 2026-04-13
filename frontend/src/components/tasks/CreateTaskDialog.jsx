import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTask } from '@/api/groups'
import { toast } from 'sonner'

export default function CreateTaskDialog({ open, onOpenChange, groupId, members, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', status: 'TODO', dueDate: '', assigneeId: '' })
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  // Fix: compute display name for the selected assignee
  const selectedMember = members.find((m) => m.userId === form.assigneeId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const task = await createTask(groupId, {
        title: form.title,
        description: form.description || undefined,
        status: form.status,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        assigneeId: form.assigneeId || undefined,
      })
      toast.success('Task created')
      onCreated(task)
      onOpenChange(false)
      setForm({ title: '', description: '', status: 'TODO', dueDate: '', assigneeId: '' })
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ttitle">Title</Label>
            <Input id="ttitle" value={form.title} onChange={set('title')} placeholder="Task title" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tdesc">Description</Label>
            <Textarea id="tdesc" value={form.description} onChange={set('description')} rows={3} placeholder="Optional description…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={setVal('status')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tduedate">Due Date</Label>
              <Input id="tduedate" type="date" value={form.dueDate} onChange={set('dueDate')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select value={form.assigneeId} onValueChange={setVal('assigneeId')}>
              <SelectTrigger>
                {/* Fix: show computed name instead of relying on SelectValue matching */}
                <span className="text-sm">
                  {selectedMember ? selectedMember.user.name : <span className="text-muted-foreground">Unassigned</span>}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>{m.user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create Task'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
