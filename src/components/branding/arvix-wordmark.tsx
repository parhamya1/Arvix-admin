import { cn } from '@/lib/utils'

type ArvixWordmarkProps = {
  className?: string
  titleClassName?: string
  subtitleClassName?: string
}

export function ArvixWordmark({
  className,
  titleClassName,
  subtitleClassName,
}: ArvixWordmarkProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1 text-center', className)}>
      <span
        className={cn(
          'text-4xl leading-none font-black tracking-[0.35em] text-foreground',
          titleClassName
        )}
      >
        ARVIX
      </span>
      <span
        className={cn(
          'text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase',
          subtitleClassName
        )}
      >
        Analytical Reasoning For Visible Intelligent Execution
      </span>
    </div>
  )
}
