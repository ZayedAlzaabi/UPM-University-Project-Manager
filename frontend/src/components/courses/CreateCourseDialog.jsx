import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCourse } from '@/api/courses'
import { toast } from 'sonner'

export default function CreateCourseDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({ name: '', semester: '', year: new Date().getFullYear() })
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.semester || !form.year) return
    setLoading(true)
    try {
      const course = await createCourse({ ...form, year: Number(form.year) })
      toast.success('Course created')
      onCreated(course)
      onOpenChange(false)
      setForm({ name: '', semester: '', year: new Date().getFullYear() })
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to create course')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Course Name</Label>
            <Input id="name" value={form.name} onChange={set('name')} placeholder="Web Applications" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="semester">Semester</Label>
              <Input id="semester" value={form.semester} onChange={set('semester')} placeholder="Spring" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Year</Label>
              <Input id="year" type="number" value={form.year} onChange={set('year')} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
