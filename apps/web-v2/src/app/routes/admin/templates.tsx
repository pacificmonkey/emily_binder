'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toaster'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  getTaskTemplates,
  createTaskTemplate,
  deleteTaskTemplate,
} from '@/services/admin'
import { getMissionCategories } from '@/services/categories'
import type { TaskTemplate } from '@/services/admin'
import type { MissionCategory } from '@/types/database'

export default function TemplatesAdmin() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [categories, setCategories] = useState<MissionCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    default_points: '5',
    is_must_do: false,
    recurrence_rule: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [templatesData, categoriesData] = await Promise.all([
        getTaskTemplates(),
        getMissionCategories(),
      ])
      setTemplates(templatesData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load templates or categories',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in template title',
        variant: 'error',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await createTaskTemplate({
        title: form.title,
        description: form.description || undefined,
        category_id: form.category_id || undefined,
        default_points: parseInt(form.default_points),
        is_must_do: form.is_must_do,
        recurrence_rule: form.recurrence_rule || undefined,
      })

      toast({
        title: 'Success',
        description: `Template "${form.title}" created`,
      })

      setForm({
        title: '',
        description: '',
        category_id: '',
        default_points: '5',
        is_must_do: false,
        recurrence_rule: '',
      })
      setShowCreate(false)
      await loadData()
    } catch (error) {
      console.error('Failed to create template:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create template',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setIsSubmitting(true)
      await deleteTaskTemplate(templateId)

      toast({
        title: 'Success',
        description: 'Template deleted',
      })

      setDeleteConfirm({ open: false, id: null })
      await loadData()
    } catch (error) {
      console.error('Failed to delete template:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete template',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized'
    const category = categories.find((c) => c.mission_category_id === categoryId)
    return category?.name || 'Unknown'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Templates"
        subtitle="Create and manage task templates"
        action={
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </Button>
        }
      />

      {/* Create Template Form */}
      {showCreate && (
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle>Create Task Template</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-title">Title</Label>
                <Input
                  id="template-title"
                  placeholder="e.g., Morning Exercise"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  placeholder="Optional description of the task"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-category">Category</Label>
                  <select
                    id="template-category"
                    className={cn(
                      'flex h-10 w-full rounded-soft border border-border bg-surface px-3 py-2 text-sm text-content',
                      'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
                    )}
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="">No Category</option>
                    {categories.map((category) => (
                      <option key={category.mission_category_id} value={category.mission_category_id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-points">Default Points</Label>
                  <Input
                    id="template-points"
                    type="number"
                    min="0"
                    placeholder="5"
                    value={form.default_points}
                    onChange={(e) => setForm({ ...form, default_points: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-recurrence">Recurrence Rule (optional)</Label>
                <Input
                  id="template-recurrence"
                  placeholder="e.g., FREQ=DAILY or FREQ=WEEKLY"
                  value={form.recurrence_rule}
                  onChange={(e) =>
                    setForm({ ...form, recurrence_rule: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="template-mustdo"
                  checked={form.is_must_do}
                  onChange={(e) => setForm({ ...form, is_must_do: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="template-mustdo" className="text-sm font-normal cursor-pointer">
                  This is a must-do task
                </Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Template'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      <div>
        <h2 className="text-lg font-semibold text-content mb-4">Task Templates</h2>
        {loading ? (
          <p className="text-content-secondary">Loading templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-content-secondary">No templates yet</p>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <Card key={template.task_template_id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2">
                        <h3 className="font-semibold text-content">{template.title}</h3>
                        {template.description && (
                          <p className="text-sm text-content-secondary mt-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">{template.default_points} points</Badge>
                        {template.is_must_do && (
                          <Badge variant="danger">Must-do</Badge>
                        )}
                        <Badge variant={template.is_active ? 'success' : 'secondary'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          {getCategoryName(template.category_id)}
                        </Badge>
                        {template.recurrence_rule && (
                          <Badge variant="outline" className="font-normal text-xs">
                            {template.recurrence_rule}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() =>
                        setDeleteConfirm({
                          open: true,
                          id: template.task_template_id,
                        })
                      }
                      className="ml-4"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm({ open, id: open ? deleteConfirm.id : null })
        }
        title="Delete Template"
        description="Are you sure you want to delete this template? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (deleteConfirm.id) {
            handleDeleteTemplate(deleteConfirm.id)
          }
        }}
        variant="danger"
      />
    </div>
  )
}
