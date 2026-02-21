import { type QueryClient } from '@tanstack/react-query'
import { Link, createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { MessageCircle } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { NavigationProgress } from '@/components/navigation-progress'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: () => {
    return (
      <>
        <NavigationProgress />
        <Outlet />
        <Toaster duration={5000} />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                size='icon'
                className='fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg'
              >
                <Link to='/chats'>
                  <MessageCircle className='size-5' />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Do you need support?</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </>
    )
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
