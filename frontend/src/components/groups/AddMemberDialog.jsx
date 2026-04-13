import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addMember } from '@/api/groups'
import { toast } from 'sonner'

export default function AddMemberDialog({ open, onOpenChange, groupId, groupName, onAdded }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const member = await addMember(groupId, { email })
      toast.success(`${member.user.name} added to ${groupName}`)
      onAdded?.(member)
      onOpenChange(false)
      setEmail('')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member to {groupName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="memail">Student Email</Label>
            <Input
              id="memail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@uaeu.ac.ae"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
