import LessonPage from '@/app/components/LessonPage'
import { Suspense } from 'react'

export default function Lesson1() {
  return (
    <Suspense>
      <LessonPage lesson={{ number: 1, total: 6, title: 'What AI Actually Is' }} />
    </Suspense>
  )
}
