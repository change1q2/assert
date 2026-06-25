import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr';

export interface Course {
  id: string;
  title: string;
  description: string;
  language: Language;
  level: string;
  lessons: number;
  thumbnail?: string;
}

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  selectedLanguage: Language | null;
  filter: string;
  setCourses: (courses: Course[]) => void;
  selectCourse: (course: Course | null) => void;
  setLanguage: (language: Language | null) => void;
  setFilter: (filter: string) => void;
}

export const useCourseStore = create<CourseState>()(
  persist(
    (set) => ({
      courses: [],
      currentCourse: null,
      selectedLanguage: null,
      filter: '',

      setCourses: (courses: Course[]) => set({ courses }),

      selectCourse: (course: Course | null) => set({ currentCourse: course }),

      setLanguage: (language: Language | null) => set({ selectedLanguage: language }),

      setFilter: (filter: string) => set({ filter }),
    }),
    {
      name: 'course-storage',
    }
  )
);
