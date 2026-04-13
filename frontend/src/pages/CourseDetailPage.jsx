import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourse, getCourseGroups } from '@/api/courses'
import GroupCard from '@/components/groups/GroupCard'
import CreateGroupDialog from '@/components/groups/CreateGroupDialog'
import AddMemberDialog from '@/components/groups/AddMemberDialog'
import GroupCardSkeleton from '@/components/skeletons/GroupCardSkeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function CourseDetailPage() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [memberTarget, setMemberTarget] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [c, g] = await Promise.all([getCourse(id), getCourseGroups(id)])
        setCourse(c)
        setGroups(g)
      } catch {
        toast.error('Failed to load course')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        <Link to="/dashboard" className="hover:underline">Dashboard</Link>
        <span className="mx-2">/</span>
        {loading ? <Skeleton className="inline-block h-4 w-24 align-middle" /> : <span>{course?.name}</span>}
      </div>

      {/* Header */}
      {loading ? (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{course.name}</h1>
              <Badge variant="outline">{course.semester} {course.year}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Instructor: {course.instructor?.name}</p>
          </div>
          <Button onClick={() => setShowCreateGroup(true)}>+ New Group</Button>
        </div>
      )}

      {/* Groups grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(4).fill(0).map((_, i) => <GroupCardSkeleton key={i} />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No groups yet.</p>
          <p className="text-sm mt-1">Create a group to assign students and tasks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              courseName={course?.name}
              onAddMember={(group) => setMemberTarget(group)}
            />
          ))}
        </div>
      )}

      {course && (
        <>
          <CreateGroupDialog
            open={showCreateGroup}
            onOpenChange={setShowCreateGroup}
            courseId={id}
            onCreated={(group) => setGroups((prev) => [...prev, { ...group, tasks: [], _count: { members: 0, tasks: 0 } }])}
          />
          {memberTarget && (
            <AddMemberDialog
              open={!!memberTarget}
              onOpenChange={(v) => { if (!v) setMemberTarget(null) }}
              groupId={memberTarget.id}
              groupName={memberTarget.name}
              onAdded={() => setMemberTarget(null)}
            />
          )}
        </>
      )}
    </div>
  )
}
