import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBudgetAccounts, useBudgetCategories, useCreateTransaction } from '@/hooks/use-budget'
import type { BudgetTransactionType } from '@/types/database'

const transactionFormSchema = z.object({
  type: z.enum(['income', 'expense'] as const, {
    errorMap: () => ({ message: 'Please select income or expense' }),
  }),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  categoryId: z.string().min(1, 'Category is required'),
  accountId: z.string().min(1, 'Account is required'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0'),
  merchant: z.string().max(255, 'Merchant must be 255 characters or less').optional().nullable(),
  occurredAt: z.string().optional().nullable(),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional().nullable(),
})

type TransactionFormData = z.infer<typeof transactionFormSchema>

interface TransactionFormProps {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function TransactionForm({ onSuccess, onError }: TransactionFormProps) {
  const { data: accounts = [] } = useBudgetAccounts()
  const { data: categories = [] } = useBudgetCategories()
  const createTransaction = useCreateTransaction()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: 'expense',
      occurredAt: new Date().toISOString().split('T')[0],
      merchant: '',
      notes: '',
    },
  })

  const transactionType = watch('type')
  const selectedAccountId = watch('accountId')

  // Get selected account for restriction checking
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.budget_account_id === selectedAccountId),
    [accounts, selectedAccountId]
  )

  // Filter categories by type and account restrictions
  const filteredCategories = useMemo(() => {
    let filtered = categories.filter((c) => {
      if (transactionType === 'income') return c.kind === 'income'
      return c.kind === 'expense'
    })

    // If account has restrictions, filter to allowed categories
    if (selectedAccount && selectedAccount.restriction_type !== 'none') {
      const rules = (selectedAccount.restriction_rules as any) || {}
      if (selectedAccount.restriction_type === 'category_allowlist' && rules.allowed_categories) {
        filtered = filtered.filter((c) => rules.allowed_categories.includes(c.budget_category_id))
      } else if (
        selectedAccount.restriction_type === 'category_blocklist' &&
        rules.blocked_categories
      ) {
        filtered = filtered.filter((c) => !rules.blocked_categories.includes(c.budget_category_id))
      }
    }

    return filtered
  }, [categories, transactionType, selectedAccount])

  const onSubmit = async (data: TransactionFormData) => {
    try {
      await createTransaction.mutateAsync({
        type: (data.type === 'income' ? 'income' : 'expense') as BudgetTransactionType,
        title: data.title,
        category_id: data.categoryId,
        account_id: data.accountId,
        amount: data.amount,
        occurred_at: data.occurredAt || null,
        merchant: data.merchant || null,
        notes: data.notes || null,
      })

      toast({
        title: 'Transaction logged.',
        variant: 'success',
      })

      reset()
      onSuccess?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create transaction'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'error',
      })
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Transaction Type - Radio Buttons */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-content">Type</Label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
            <input
              type="radio"
              value="income"
              {...register('type')}
              className="w-4 h-4 rounded-full border border-border text-success focus:ring-success"
            />
            <span className="text-sm text-content">Income</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
            <input
              type="radio"
              value="expense"
              {...register('type')}
              className="w-4 h-4 rounded-full border border-border text-danger focus:ring-danger"
            />
            <span className="text-sm text-content">Expense</span>
          </label>
        </div>
        {errors.type && <p className="text-xs text-danger">{errors.type.message}</p>}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium text-content">
          Title <span className="text-danger">*</span>
        </Label>
        <Input
          id="title"
          placeholder={transactionType === 'income' ? 'e.g. Paycheck' : 'e.g. Groceries'}
          {...register('title')}
          className={errors.title ? 'border-danger' : ''}
        />
        {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
      </div>

      {/* Account */}
      <div className="space-y-2">
        <Label htmlFor="accountId" className="text-sm font-medium text-content">
          Account <span className="text-danger">*</span>
        </Label>
        <select
          id="accountId"
          {...register('accountId')}
          className={cn(
            'flex h-10 w-full rounded-soft border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50',
            errors.accountId ? 'border-danger' : 'border-border'
          )}
        >
          <option value="">Select account</option>
          {accounts.map((account) => (
            <option key={account.budget_account_id} value={account.budget_account_id}>
              {account.name}
            </option>
          ))}
        </select>
        {errors.accountId && <p className="text-xs text-danger">{errors.accountId.message}</p>}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="categoryId" className="text-sm font-medium text-content">
          Category <span className="text-danger">*</span>
        </Label>
        <select
          id="categoryId"
          {...register('categoryId')}
          className={cn(
            'flex h-10 w-full rounded-soft border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50',
            errors.categoryId ? 'border-danger' : 'border-border'
          )}
          disabled={!selectedAccountId || filteredCategories.length === 0}
        >
          <option value="">
            {filteredCategories.length === 0 ? 'No categories available' : 'Select category'}
          </option>
          {filteredCategories.map((category) => (
            <option key={category.budget_category_id} value={category.budget_category_id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId && <p className="text-xs text-danger">{errors.categoryId.message}</p>}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-sm font-medium text-content">
          Amount <span className="text-danger">*</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">
            $
          </span>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            {...register('amount', { valueAsNumber: true })}
            className={cn('pl-6', errors.amount ? 'border-danger' : '')}
          />
        </div>
        {errors.amount && <p className="text-xs text-danger">{errors.amount.message}</p>}
      </div>

      {/* Merchant (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="merchant" className="text-sm font-medium text-content">
          Merchant
        </Label>
        <Input id="merchant" placeholder="e.g. Whole Foods" {...register('merchant')} />
        {errors.merchant && <p className="text-xs text-danger">{errors.merchant.message}</p>}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="occurredAt" className="text-sm font-medium text-content">
          Date
        </Label>
        <Input
          id="occurredAt"
          type="date"
          {...register('occurredAt')}
          className={errors.occurredAt ? 'border-danger' : ''}
        />
        {errors.occurredAt && <p className="text-xs text-danger">{errors.occurredAt.message}</p>}
      </div>

      {/* Notes (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium text-content">
          Notes
        </Label>
        <Textarea
          id="notes"
          placeholder="Add any additional notes (optional)"
          {...register('notes')}
          className={errors.notes ? 'border-danger' : ''}
        />
        {errors.notes && <p className="text-xs text-danger">{errors.notes.message}</p>}
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting || createTransaction.isPending}
          className="flex-1 min-h-[44px]"
        >
          {isSubmitting || createTransaction.isPending ? 'Saving...' : 'Add Transaction'}
        </Button>
      </div>
    </form>
  )
}
