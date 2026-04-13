import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getCourses, getCourseGroups } from '@/api/courses'
import { getGroupTasks } from '@/api/groups'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

function pct(tasks = []) {
  if (!tasks.length) return 0
  return Math.round((tasks.filter((t) => t.status === 'DONE').length / tasks.length) * 100)
}

function formatDeadline(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const STATUS_COLORS = {
  TODO:        'bg-slate-200 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE:        'bg-green-100 text-green-700',
}

function GroupRow({ group }) {
  const [open, setOpen] = useState(false)
  const progress = pct(group.tasks)
  const taskCounts = {
    TODO:        group.tasks.filter((t) => t.status === 'TODO').length,
    IN_PROGRESS: group.tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    DONE:        group.tasks.filter((t) => t.status === 'DONE').length,
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{group.name}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground truncate">{group.projectTitle}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <Progress value={progress} className="h-1.5 flex-1 max-w-[140px]" />
            <span className="text-xs text-muted-foreground">{progress}%</span>
            <span className="text-xs text-muted-foreground">Deadline: {formatDeadline(group.deadline)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {Object.entries(taskCounts).map(([status, count]) => count > 0 && (
            <span key={status} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[status]}`}>
              {count} {status.replace('_', ' ')}
            </span>
          ))}
          <Link
            to={`/groups/${group.id}`}
            onClick={(e) => e.stopPropagation()}
            className="ml-1 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </button>

      {open && (
        <div className="border-t bg-muted/30">
          {group.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground px-4 py-3">No tasks in this group.</p>
          ) : (
            <div className="divide-y">
              {group.tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLORS[task.status]}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm flex-1 truncate">{task.title}</span>
                  {task.assignee && (
                    <span className="text-xs text-muted-foreground shrink-0">{task.assignee.name}</span>
                  )}
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground shrink-0">{formatDeadline(task.dueDate)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CourseSection({ course, groupsCache, onLoad }) {
  const [loading, setLoading] = useState(false)
  const groups = groupsCache[course.id]

  const handleExpand = async () => {
    if (groups !== undefined) return // already loaded
    setLoading(true)
    try {
      await onLoad(course.id)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleExpand()
  }, [course.id])

  const progress = groups
    ? pct(groups.flatMap((g) => g.tasks))
    : null

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base">{course.name}</h3>
            <Badge variant="outline" className="text-xs">{course.semester} {course.year}</Badge>
            {progress !== null && (
              <span className="text-xs text-muted-foreground">Overall: {progress}% complete</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{course._count?.groups ?? 0} groups</p>
        </div>
        <Link to={`/courses/${course.id}`}>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ) : groups?.length === 0 ? (
        <p className="text-sm text-muted-foreground pl-1">No groups in this course.</p>
      ) : (
        <div className="space-y-2">
          {groups?.map((g) => <GroupRow key={g.id} group={g} />)}
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [groupsCache, setGroupsCache] = useState({}) // courseId → groups[]
  const [filterSemester, setFilterSemester] = useState('ALL')
  const [filterCourse, setFilterCourse] = useState('ALL')

  useEffect(() => {
    getCourses()
      .then(setCourses)
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false))
  }, [])

  const loadGroups = async (courseId) => {
    try {
      const groups = await getCourseGroups(courseId)
      // Fetch full task data (with title/assignee/dueDate) for each group in parallel
      const groupsWithTasks = await Promise.all(
        groups.map(async (g) => {
          const tasks = await getGroupTasks(g.id).catch(() => g.tasks ?? [])
          return { ...g, tasks }
        })
      )
      setGroupsCache((prev) => ({ ...prev, [courseId]: groupsWithTasks }))
    } catch {
      toast.error('Failed to load groups')
      setGroupsCache((prev) => ({ ...prev, [courseId]: [] }))
    }
  }

  // Unique semesters for filter dropdown
  const semesters = useMemo(() => {
    const pairs = [...new Set(courses.map((c) => `${c.semester} ${c.year}`))]
    return pairs.sort().reverse()
  }, [courses])

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (filterSemester !== 'ALL' && `${c.semester} ${c.year}` !== filterSemester) return false
      if (filterCourse !== 'ALL' && c.id !== filterCourse) return false
      return true
    })
  }, [courses, filterSemester, filterCourse])

  const clearFilters = () => {
    setFilterSemester('ALL')
    setFilterCourse('ALL')
  }

  const hasFilter = filterSemester !== 'ALL' || filterCourse !== 'ALL'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-muted-foreground text-sm mt-0.5">All courses, groups, and task progress</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Semester</span>
          <Select value={filterSemester} onValueChange={setFilterSemester}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <span>{filterSemester === 'ALL' ? 'All semesters' : filterSemester}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All semesters</SelectItem>
              {semesters.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Course</span>
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <span className="truncate">
                {filterCourse === 'ALL'
                  ? 'All courses'
                  : courses.find((c) => c.id === filterCourse)?.name ?? 'All courses'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All courses</SelectItem>
              {courses
                .filter((c) => filterSemester === 'ALL' || `${c.semester} ${c.year}` === filterSemester)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilter && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} course{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <Separator />

      {/* Course list */}
      {loading ? (
        <div className="space-y-6">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No courses match the selected filters.</p>
          {hasFilter && (
            <Button variant="link" className="mt-2" onClick={clearFilters}>Clear filters</Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {filtered.map((course, i) => (
            <div key={course.id}>
              {i > 0 && <Separator className="mb-8" />}
              <CourseSection
                course={course}
                groupsCache={groupsCache}
                onLoad={loadGroups}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
