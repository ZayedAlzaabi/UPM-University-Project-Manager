import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createGroup } from '@/api/courses'
import { toast } from 'sonner'

export default function CreateGroupDialog({ open, onOpenChange, courseId, onCreated }) {
  const [form, setForm] = useState({ name: '', projectTitle: '', projectDesc: '', deadline: '' })
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const group = await createGroup(courseId, {
        ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      })
      toast.success('Group created')
      onCreated(group)
      onOpenChange(false)
      setForm({ name: '', projectTitle: '', projectDesc: '', deadline: '' })
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gname">Group Name</Label>
            <Input id="gname" value={form.name} onChange={set('name')} placeholder="Group Alpha" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="projectTitle">Project Title</Label>
            <Input id="projectTitle" value={form.projectTitle} onChange={set('projectTitle')} placeholder="UPM System" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="projectDesc">Description</Label>
            <Textarea id="projectDesc" value={form.projectDesc} onChange={set('projectDesc')} placeholder="Brief project description…" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="datetime-local" value={form.deadline} onChange={set('deadline')} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
