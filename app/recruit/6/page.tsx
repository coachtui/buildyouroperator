import LessonPage from '@/app/components/LessonPage'
import { Suspense } from 'react'

export default function Lesson6() {
  return (
    <Suspense>
      <LessonPage lesson={{ number: 6, total: 6, title: 'Operator Mindset' }} />
    </Suspense>
  )
}
