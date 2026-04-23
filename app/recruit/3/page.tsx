import LessonPage from '@/app/components/LessonPage'
import { Suspense } from 'react'

export default function Lesson3() {
  return (
    <Suspense>
      <LessonPage lesson={{ number: 3, total: 6, title: 'Picking Your Tool' }} />
    </Suspense>
  )
}
