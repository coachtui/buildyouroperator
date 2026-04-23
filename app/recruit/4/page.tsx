import LessonPage from '@/app/components/LessonPage'
import { Suspense } from 'react'

export default function Lesson4() {
  return (
    <Suspense>
      <LessonPage lesson={{ number: 4, total: 6, title: 'AI for Your Job' }} />
    </Suspense>
  )
}
