import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function KpiRunsPage() {
  return (
    <div className='space-y-4 p-4 md:p-6'>
      <h1 className='text-2xl font-semibold tracking-tight'>KPI Runs</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          KPI execution and scheduling dashboard will be available here.
        </CardContent>
      </Card>
    </div>
  )
}
