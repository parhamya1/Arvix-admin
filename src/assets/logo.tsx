import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      id='arvix-logo'
      viewBox='0 0 120 24'
      xmlns='http://www.w3.org/2000/svg'
      role='img'
      aria-label='Arvix logo'
      className={cn('h-6 w-auto', className)}
      {...props}
    >
      <title>Arvix</title>
      <path
        d='M4 20L10 4h6l6 16h-4.5l-1.3-3.8H9.8L8.5 20H4zm6.9-7.2h4.2L13 6.6l-2.1 6.2z'
        fill='currentColor'
      />
      <text
        x='28'
        y='17'
        fill='currentColor'
        fontFamily='system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        fontSize='14'
        fontWeight='700'
        letterSpacing='2'
      >
        ARVIX
      </text>
    </svg>
  )
}
