import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function GroupCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-40 mt-1" />
        <Skeleton className="h-3 w-full mt-1" />
      </CardHeader>
      <CardContent className="pb-3 space-y-2">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
      <CardFooter className="gap-2">
        <Skeleton className="h-8 flex-1" />
      </CardFooter>
    </Card>
  )
}
