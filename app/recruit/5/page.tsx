import LessonPage from '@/app/components/LessonPage'
import { Suspense } from 'react'

export default function Lesson5() {
  return (
    <Suspense>
      <LessonPage lesson={{ number: 5, total: 6, title: 'Your First Workflow' }} />
    </Suspense>
  )
}
