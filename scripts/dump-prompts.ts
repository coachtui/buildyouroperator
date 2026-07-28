// Prints every composed lesson prompt. Used to prove refactors don't change
// what Gojo actually sees: dump before a change, dump after, diff the two.
import { LESSON_NUMBERS, composeLessonPrompt } from '../app/lib/lesson-prompts'

for (const lesson of LESSON_NUMBERS) {
  console.log(`===== LESSON ${lesson} =====`)
  console.log(composeLessonPrompt(lesson))
  console.log()
}
