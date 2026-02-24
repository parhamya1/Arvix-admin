import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createKpi, getKpi, updateKpi } from '@/lib/kpiApi'

type BuilderState = {
  metadata: { description: string }
  mapping: { source: string }
  formula: { expression: string }
  thresholds: { warning: string; critical: string }
}

const defaultState: BuilderState = {
  metadata: { description: '' },
  mapping: { source: '' },
  formula: { expression: '' },
  thresholds: { warning: '', critical: '' },
}

export function KpiBuilderPage({ id }: { id?: string }) {
  const navigate = useNavigate()
  const isEditMode = Boolean(id)
  const [name, setName] = useState('')
  const [builderState, setBuilderState] = useState<BuilderState>(defaultState)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!id) return

    let isMounted = true
    const load = async () => {
      setIsLoading(true)
      try {
        const data = await getKpi(id)
        if (!isMounted) return

        setName(data.name)
        const payload = data.payload as Partial<BuilderState>
        setBuilderState({
          metadata: {
            description:
              (payload.metadata as { description?: string } | undefined)?.description ?? '',
          },
          mapping: {
            source: (payload.mapping as { source?: string } | undefined)?.source ?? '',
          },
          formula: {
            expression:
              (payload.formula as { expression?: string } | undefined)?.expression ?? '',
          },
          thresholds: {
            warning:
              (payload.thresholds as { warning?: string } | undefined)?.warning ?? '',
            critical:
              (payload.thresholds as { critical?: string } | undefined)?.critical ?? '',
          },
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load KPI')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [id])

  const payload = useMemo(
    () => ({
      metadata: builderState.metadata,
      mapping: builderState.mapping,
      formula: builderState.formula,
      thresholds: builderState.thresholds,
    }),
    [builderState]
  )

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    setIsSaving(true)
    try {
      if (isEditMode && id) {
        await updateKpi(id, { name: name.trim(), payload })
      } else {
        await createKpi({ name: name.trim(), payload })
      }
      toast.success('Saved')
      void navigate({ to: '/kpi/list' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save KPI')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className='p-4'>Loading KPI...</div>
  }

  return (
    <div className='space-y-4 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit KPI' : 'Create KPI'}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          <Label htmlFor='kpi-name'>Name</Label>
          <Input id='kpi-name' value={name} onChange={(event) => setName(event.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={builderState.metadata.description}
            onChange={(event) =>
              setBuilderState((prev) => ({
                ...prev,
                metadata: { description: event.target.value },
              }))
            }
            placeholder='Description'
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={builderState.mapping.source}
            onChange={(event) =>
              setBuilderState((prev) => ({
                ...prev,
                mapping: { source: event.target.value },
              }))
            }
            placeholder='Source mapping'
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formula</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={builderState.formula.expression}
            onChange={(event) =>
              setBuilderState((prev) => ({
                ...prev,
                formula: { expression: event.target.value },
              }))
            }
            placeholder='Formula expression'
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thresholds</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-2'>
          <Input
            value={builderState.thresholds.warning}
            onChange={(event) =>
              setBuilderState((prev) => ({
                ...prev,
                thresholds: { ...prev.thresholds, warning: event.target.value },
              }))
            }
            placeholder='Warning threshold'
          />
          <Input
            value={builderState.thresholds.critical}
            onChange={(event) =>
              setBuilderState((prev) => ({
                ...prev,
                thresholds: { ...prev.thresholds, critical: event.target.value },
              }))
            }
            placeholder='Critical threshold'
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className='overflow-x-auto rounded-md bg-muted p-3 text-xs'>
            {JSON.stringify(payload, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
