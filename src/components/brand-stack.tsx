import { cn } from '@/lib/utils'

type BrandStackProps = {
  className?: string
  titleClassName?: string
  subtitleClassName?: string
}

export function BrandStack({
  className,
  titleClassName,
  subtitleClassName,
}: BrandStackProps) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <span className={cn('font-bold tracking-wide uppercase', titleClassName)}>
        ARVIX
      </span>
      <span
        className={cn(
          'text-[10px] leading-tight text-muted-foreground/80',
          subtitleClassName
        )}
      >
        ANALYTICAL REASONING FOR VISIBLE INTELLEGENCE EXECUTION
      </span>
    </div>
  )
}
