import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MoreHorizontal, Plus, Search, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deleteKpi, getKpi, listKpis, type KpiListItem } from '@/lib/kpiApi'

type KpiListRow = KpiListItem & {
  category: string
  vendor: string
  tech: string
}

export function KpiListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<KpiListRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [techFilter, setTechFilter] = useState('all')

  const load = async () => {
    setIsLoading(true)
    try {
      const base = await listKpis()
      const details = await Promise.all(
        base.map(async (item) => {
          try {
            const detail = await getKpi(item.id)
            const payload = detail.payload as {
              metadata?: { category?: string; vendor?: string; tech?: string }
            }
            return {
              ...item,
              category: payload.metadata?.category || '-',
              vendor: payload.metadata?.vendor || '-',
              tech: payload.metadata?.tech || '-',
            }
          } catch {
            return { ...item, category: '-', vendor: '-', tech: '-' }
          }
        })
      )
      setItems(details)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load KPIs')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteKpi(id)
      toast.success('Deleted')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete KPI')
    }
  }

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category).filter((item) => item !== '-'))),
    [items]
  )
  const vendors = useMemo(
    () => Array.from(new Set(items.map((item) => item.vendor).filter((item) => item !== '-'))),
    [items]
  )
  const techs = useMemo(
    () => Array.from(new Set(items.map((item) => item.tech).filter((item) => item !== '-'))),
    [items]
  )

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (vendorFilter !== 'all' && item.vendor !== vendorFilter) return false
      if (techFilter !== 'all' && item.tech !== techFilter) return false
      return true
    })
  }, [items, search, categoryFilter, vendorFilter, techFilter])

  return (
    <div className='space-y-4 p-4'>
      <Card>
        <CardHeader className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <CardTitle className='text-2xl tracking-tight'>KPI Library</CardTitle>
            <CardDescription>Manage KPI definitions, scope, and maintenance actions.</CardDescription>
          </div>
          <Button onClick={() => void navigate({ to: '/kpi/builder' })}>
            <Plus className='mr-2 size-4' /> New KPI
          </Button>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-3 md:grid-cols-4'>
            <div className='relative md:col-span-2'>
              <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Search KPI by name...'
                className='pl-9'
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder='Category' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className='grid grid-cols-2 gap-3'>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder='Vendor' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor} value={vendor}>
                      {vendor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={techFilter} onValueChange={setTechFilter}>
                <SelectTrigger>
                  <SelectValue placeholder='Tech' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All tech</SelectItem>
                  {techs.map((tech) => (
                    <SelectItem key={tech} value={tech}>
                      {tech}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className='space-y-2'>
              <div className='h-10 animate-pulse rounded bg-muted' />
              <div className='h-10 animate-pulse rounded bg-muted' />
              <div className='h-10 animate-pulse rounded bg-muted' />
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className='border-dashed'>
              <CardContent className='flex flex-col items-center justify-center gap-3 p-10 text-center'>
                <p className='text-lg font-medium'>No KPIs found</p>
                <p className='text-sm text-muted-foreground'>Create your first KPI definition to get started.</p>
                <Button onClick={() => void navigate({ to: '/kpi/builder' })}>
                  <Plus className='mr-2 size-4' /> Create KPI
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tech</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className='font-medium'>{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.tech}</TableCell>
                      <TableCell>{item.vendor}</TableCell>
                      <TableCell>{new Date(item.updatedAt).toLocaleString()}</TableCell>
                      <TableCell className='text-right'>
                        <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='ghost' size='icon'>
                                <MoreHorizontal className='size-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <DropdownMenuItem
                                onClick={() =>
                                  void navigate({ to: '/kpi/builder/$id', params: { id: item.id } })
                                }
                              >
                                <Pencil className='mr-2 size-4' /> Edit
                              </DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className='text-destructive focus:text-destructive'>
                                  <Trash2 className='mr-2 size-4' /> Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete KPI?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. KPI definition will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => void handleDelete(item.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
