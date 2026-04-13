import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function CourseCard({ course }) {
  const navigate = useNavigate()
  const groupCount = course._count?.groups ?? 0

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/courses/${course.id}`)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{course.name}</CardTitle>
          <Badge variant="outline" className="shrink-0 text-xs">{course.semester} {course.year}</Badge>
        </div>
        <CardDescription>{groupCount} {groupCount === 1 ? 'group' : 'groups'}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button size="sm" variant="outline" className="w-full">View Course</Button>
      </CardFooter>
    </Card>
  )
}
