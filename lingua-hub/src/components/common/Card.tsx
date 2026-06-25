import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        'rounded-xl bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200',
        className
      )}
    >
      {children}
    </motion.div>
  )
}
