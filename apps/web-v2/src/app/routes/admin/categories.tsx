'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toaster'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  getMissionCategories,
  createMissionCategory,
  updateMissionCategory,
  deleteMissionCategory,
} from '@/services/categories'
import type { MissionCategory } from '@/types/database'

interface EditingCategory {
  mission_category_id: string
  name: string
  color: string
  icon: string
  base_points: number
  sort_order: number
  is_active: boolean
  editing?: boolean
}

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState<EditingCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    color: '#6B7280',
    icon: 'tag',
    base_points: '5',
    sort_order: '0',
  })

  const [editForm, setEditForm] = useState({
    name: '',
    color: '',
    icon: '',
    base_points: '',
    sort_order: '',
    is_active: true,
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await getMissionCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories:', error)
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in category name',
        variant: 'error',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await createMissionCategory({
        name: form.name,
        color: form.color,
        icon: form.icon,
        base_points: parseInt(form.base_points),
        sort_order: parseInt(form.sort_order),
      })

      toast({
        title: 'Success',
        description: `Category "${form.name}" created`,
      })

      setForm({
        name: '',
        color: '#6B7280',
        icon: 'tag',
        base_points: '5',
        sort_order: '0',
      })
      setShowCreate(false)
      await loadCategories()
    } catch (error) {
      console.error('Failed to create category:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create category',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartEdit = (category: MissionCategory) => {
    setEditingId(category.mission_category_id)
    setEditForm({
      name: category.name,
      color: category.color,
      icon: category.icon,
      base_points: category.base_points.toString(),
      sort_order: category.sort_order.toString(),
      is_active: category.is_active,
    })
  }

  const handleUpdateCategory = async (categoryId: string) => {
    if (!editForm.name) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in category name',
        variant: 'error',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await updateMissionCategory({
        mission_category_id: categoryId,
        name: editForm.name,
        color: editForm.color,
        icon: editForm.icon,
        base_points: parseInt(editForm.base_points),
        sort_order: parseInt(editForm.sort_order),
        is_active: editForm.is_active,
      })

      toast({
        title: 'Success',
        description: 'Category updated',
      })

      setEditingId(null)
      await loadCategories()
    } catch (error) {
      console.error('Failed to update category:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update category',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      setIsSubmitting(true)
      await deleteMissionCategory(categoryId)

      toast({
        title: 'Success',
        description: 'Category deleted',
      })

      setDeleteConfirm({ open: false, id: null })
      await loadCategories()
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete category',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mission Categories"
        subtitle="Create and manage mission categories"
        action={
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Category
          </Button>
        }
      />

      {/* Create Category Form */}
      {showCreate && (
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle>Create Category</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-name">Category Name</Label>
                  <Input
                    id="cat-name"
                    placeholder="e.g., Exercise"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-icon">Icon</Label>
                  <Input
                    id="cat-icon"
                    placeholder="e.g., dumbbell"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-color">Color (hex)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cat-color"
                      type="text"
                      placeholder="#6B7280"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                    />
                    <div
                      className="h-10 w-10 rounded-soft border border-border"
                      style={{ backgroundColor: form.color }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-points">Base Points</Label>
                  <Input
                    id="cat-points"
                    type="number"
                    min="0"
                    placeholder="5"
                    value={form.base_points}
                    onChange={(e) => setForm({ ...form, base_points: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-sort">Sort Order</Label>
                  <Input
                    id="cat-sort"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  />
                </div>
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
                  {isSubmitting ? 'Creating...' : 'Create Category'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      <div>
        <h2 className="text-lg font-semibold text-content mb-4">Categories</h2>
        {loading ? (
          <p className="text-content-secondary">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="text-content-secondary">No categories yet</p>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <Card key={category.mission_category_id} className="overflow-hidden">
                {editingId === category.mission_category_id ? (
                  // Edit Mode
                  <CardContent className="p-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleUpdateCategory(category.mission_category_id)
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`edit-name-${category.mission_category_id}`}>
                            Name
                          </Label>
                          <Input
                            id={`edit-name-${category.mission_category_id}`}
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-icon-${category.mission_category_id}`}>
                            Icon
                          </Label>
                          <Input
                            id={`edit-icon-${category.mission_category_id}`}
                            value={editForm.icon}
                            onChange={(e) =>
                              setEditForm({ ...editForm, icon: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`edit-color-${category.mission_category_id}`}>
                            Color
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id={`edit-color-${category.mission_category_id}`}
                              type="text"
                              value={editForm.color}
                              onChange={(e) =>
                                setEditForm({ ...editForm, color: e.target.value })
                              }
                            />
                            <div
                              className="h-10 w-10 rounded-soft border border-border"
                              style={{ backgroundColor: editForm.color }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-points-${category.mission_category_id}`}>
                            Points
                          </Label>
                          <Input
                            id={`edit-points-${category.mission_category_id}`}
                            type="number"
                            min="0"
                            value={editForm.base_points}
                            onChange={(e) =>
                              setEditForm({ ...editForm, base_points: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit-sort-${category.mission_category_id}`}>
                            Sort
                          </Label>
                          <Input
                            id={`edit-sort-${category.mission_category_id}`}
                            type="number"
                            min="0"
                            value={editForm.sort_order}
                            onChange={(e) =>
                              setEditForm({ ...editForm, sort_order: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`edit-active-${category.mission_category_id}`}
                          checked={editForm.is_active}
                          onChange={(e) =>
                            setEditForm({ ...editForm, is_active: e.target.checked })
                          }
                          className="w-4 h-4"
                        />
                        <Label
                          htmlFor={`edit-active-${category.mission_category_id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          Active
                        </Label>
                      </div>

                      <div className="flex gap-2 justify-end border-t border-border pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                ) : (
                  // View Mode
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="h-8 w-8 rounded-full border-2 border-border"
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <h3 className="font-semibold text-content">{category.name}</h3>
                            <p className="text-xs text-content-muted">{category.icon}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary">{category.base_points} points</Badge>
                          <Badge variant={category.is_active ? 'success' : 'secondary'}>
                            {category.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">Sort: {category.sort_order}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleStartEdit(category)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() =>
                            setDeleteConfirm({
                              open: true,
                              id: category.mission_category_id,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
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
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (deleteConfirm.id) {
            handleDeleteCategory(deleteConfirm.id)
          }
        }}
        variant="danger"
      />
    </div>
  )
}
