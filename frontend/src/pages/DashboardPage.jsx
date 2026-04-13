import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getCourses, getCourseGroups } from '@/api/courses'
import CourseCard from '@/components/courses/CourseCard'
import CreateCourseDialog from '@/components/courses/CreateCourseDialog'
import GroupCard from '@/components/groups/GroupCard'
import CourseCardSkeleton from '@/components/skeletons/CourseCardSkeleton'
import GroupCardSkeleton from '@/components/skeletons/GroupCardSkeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function DashboardPage() {
  const { user } = useAuth()
  const isInstructor = user?.role === 'INSTRUCTOR'

  const [courses, setCourses] = useState([])
  const [studentGroups, setStudentGroups] = useState([]) // [{ group, courseName }]
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCourses()
        if (isInstructor) {
          setCourses(data)
        } else {
          const groupPromises = data.map((c) =>
            getCourseGroups(c.id)
              .then((groups) => groups.map((g) => ({ group: g, courseName: c.name })))
              .catch(() => [])
          )
          const all = (await Promise.all(groupPromises)).flat()
          setStudentGroups(all)
          setCourses(data)
        }
      } catch {
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isInstructor])

  const handleCourseCreated = (course) => {
    setCourses((prev) => [{ ...course, _count: { groups: 0 } }, ...prev])
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {isInstructor ? 'My Courses' : 'My Groups'}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Welcome back, {user?.name}
          </p>
        </div>
        {isInstructor && (
          <Button onClick={() => setShowCreate(true)}>+ New Course</Button>
        )}
      </div>

      {isInstructor ? (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => <CourseCardSkeleton key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No courses yet.</p>
            <p className="text-sm mt-1">Create your first course to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )
      ) : (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => <GroupCardSkeleton key={i} />)}
          </div>
        ) : studentGroups.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">You haven't been added to any groups yet.</p>
            <p className="text-sm mt-1">Ask your instructor to add you to a group.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentGroups.map(({ group, courseName }) => (
              <GroupCard key={group.id} group={group} courseName={courseName} />
            ))}
          </div>
        )
      )}

      <CreateCourseDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={handleCourseCreated}
      />
    </div>
  )
}
