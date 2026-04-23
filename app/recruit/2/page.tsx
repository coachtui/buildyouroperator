import LessonPage from '@/app/components/LessonPage'
import { Suspense } from 'react'

export default function Lesson2() {
  return (
    <Suspense>
      <LessonPage lesson={{ number: 2, total: 6, title: 'Your First Real Instruction' }} />
    </Suspense>
  )
}
