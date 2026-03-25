'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toaster'
import { PageHeader } from '@/components/shared/page-header'
import { getStoreItems, createSticker, createStoreItem } from '@/services/store'
import type { StoreItem } from '@/types/database'

export default function StickersAdmin() {
  const [storeItems, setStoreItems] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateSticker, setShowCreateSticker] = useState(false)
  const [showCreateItem, setShowCreateItem] = useState(false)

  // Sticker form state
  const [stickerForm, setStickerForm] = useState({
    name: '',
    asset_key: '',
    coin_cost: '',
    description: '',
    default_scale: '1.0',
    tags: '',
  })

  // Store item form state
  const [itemForm, setItemForm] = useState({
    type: 'sticker',
    name: '',
    coin_cost: '',
    inventory_kind: 'cosmetic',
    description: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadStoreItems()
  }, [])

  const loadStoreItems = async () => {
    try {
      setLoading(true)
      const items = await getStoreItems()
      setStoreItems(items)
    } catch (error) {
      console.error('Failed to load store items:', error)
      toast({
        title: 'Error',
        description: 'Failed to load store items',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSticker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stickerForm.name || !stickerForm.asset_key || !stickerForm.coin_cost) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in required fields: name, asset_key, coin_cost',
        variant: 'error',
      })
      return
    }

    try {
      setIsSubmitting(true)
      const tags = stickerForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      await createSticker({
        name: stickerForm.name,
        asset_key: stickerForm.asset_key,
        coin_cost: parseInt(stickerForm.coin_cost),
        description: stickerForm.description || null,
        default_scale: parseFloat(stickerForm.default_scale) || 1.0,
        tags: tags.length > 0 ? tags : undefined,
      })

      toast({
        title: 'Success',
        description: `Sticker "${stickerForm.name}" created`,
      })

      setStickerForm({
        name: '',
        asset_key: '',
        coin_cost: '',
        description: '',
        default_scale: '1.0',
        tags: '',
      })
      setShowCreateSticker(false)
      await loadStoreItems()
    } catch (error) {
      console.error('Failed to create sticker:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create sticker',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateStoreItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemForm.name || !itemForm.coin_cost) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in required fields: name, coin_cost',
        variant: 'error',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await createStoreItem({
        type: itemForm.type as any,
        name: itemForm.name,
        coin_cost: parseInt(itemForm.coin_cost),
        inventory_kind: itemForm.inventory_kind as any,
        description: itemForm.description || null,
      })

      toast({
        title: 'Success',
        description: `Store item "${itemForm.name}" created`,
      })

      setItemForm({
        type: 'sticker',
        name: '',
        coin_cost: '',
        inventory_kind: 'cosmetic',
        description: '',
      })
      setShowCreateItem(false)
      await loadStoreItems()
    } catch (error) {
      console.error('Failed to create store item:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create store item',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sticker Management"
        subtitle="Create and manage store items and stickers"
        action={
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateSticker(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Sticker
            </Button>
            <Button onClick={() => setShowCreateItem(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Item
            </Button>
          </div>
        }
      />

      {/* Create Sticker Form */}
      {showCreateSticker && (
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle>Create Sticker</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSticker} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sticker-name">Name</Label>
                  <Input
                    id="sticker-name"
                    placeholder="e.g., Rainbow Star"
                    value={stickerForm.name}
                    onChange={(e) =>
                      setStickerForm({ ...stickerForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sticker-asset">Asset Key (emoji/name)</Label>
                  <Input
                    id="sticker-asset"
                    placeholder="e.g., ⭐ or star"
                    value={stickerForm.asset_key}
                    onChange={(e) =>
                      setStickerForm({ ...stickerForm, asset_key: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sticker-cost">Coin Cost</Label>
                  <Input
                    id="sticker-cost"
                    type="number"
                    min="0"
                    placeholder="100"
                    value={stickerForm.coin_cost}
                    onChange={(e) =>
                      setStickerForm({ ...stickerForm, coin_cost: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sticker-scale">Default Scale</Label>
                  <Input
                    id="sticker-scale"
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="1.0"
                    value={stickerForm.default_scale}
                    onChange={(e) =>
                      setStickerForm({ ...stickerForm, default_scale: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sticker-description">Description</Label>
                <Textarea
                  id="sticker-description"
                  placeholder="Optional description of the sticker"
                  value={stickerForm.description}
                  onChange={(e) =>
                    setStickerForm({ ...stickerForm, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sticker-tags">Tags (comma-separated)</Label>
                <Input
                  id="sticker-tags"
                  placeholder="e.g., star, sparkle, reward"
                  value={stickerForm.tags}
                  onChange={(e) =>
                    setStickerForm({ ...stickerForm, tags: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateSticker(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Sticker'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Create Store Item Form */}
      {showCreateItem && (
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle>Create Store Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateStoreItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item-type">Type</Label>
                  <select
                    id="item-type"
                    className={cn(
                      'flex h-10 w-full rounded-soft border border-border bg-surface px-3 py-2 text-sm text-content',
                      'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
                    )}
                    value={itemForm.type}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, type: e.target.value })
                    }
                  >
                    <option value="sticker">Sticker</option>
                    <option value="home_decoration">Home Decoration</option>
                    <option value="consumable_token">Consumable Token</option>
                    <option value="real_world_reward">Real-World Reward</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-inventory">Inventory Kind</Label>
                  <select
                    id="item-inventory"
                    className={cn(
                      'flex h-10 w-full rounded-soft border border-border bg-surface px-3 py-2 text-sm text-content',
                      'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
                    )}
                    value={itemForm.inventory_kind}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, inventory_kind: e.target.value })
                    }
                  >
                    <option value="cosmetic">Cosmetic</option>
                    <option value="consumable">Consumable</option>
                    <option value="entitlement">Entitlement</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-name">Name</Label>
                <Input
                  id="item-name"
                  placeholder="e.g., Mystery Box"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-cost">Coin Cost</Label>
                <Input
                  id="item-cost"
                  type="number"
                  min="0"
                  placeholder="500"
                  value={itemForm.coin_cost}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, coin_cost: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-description">Description</Label>
                <Textarea
                  id="item-description"
                  placeholder="Optional description of the item"
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateItem(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Item'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Store Items Grid */}
      <div>
        <h2 className="text-lg font-semibold text-content mb-4">Store Items</h2>
        {loading ? (
          <p className="text-content-secondary">Loading store items...</p>
        ) : storeItems.length === 0 ? (
          <p className="text-content-secondary">No store items yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storeItems.map((item) => (
              <Card key={item.store_item_id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-medium text-content">{item.name}</h3>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={item.enabled ? 'success' : 'secondary'}>
                          {item.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge variant="outline">{item.type}</Badge>
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-sm text-content-secondary">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-sm font-medium text-content">
                        {item.coin_cost} coins
                      </span>
                      <span className="text-xs text-content-muted">{item.inventory_kind}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
