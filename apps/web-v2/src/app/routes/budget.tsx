import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { SectionErrorBoundary } from '@/components/shared/error-boundary'
import { CardSkeleton, ListSkeleton } from '@/components/shared/loading-skeleton'
import { AccountCard } from '@/components/budget/account-card'
import { SpendingChart } from '@/components/budget/spending-chart'
import { TransactionForm } from '@/components/budget/transaction-form'
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/stores/settings-store'
import {
  useBudgetAccounts,
  useBudgetTransactions,
  useBudgetSummary,
  useDeleteTransaction,
} from '@/hooks/use-budget'
import { toast } from '@/components/ui/toaster'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Trash2, Plus } from 'lucide-react'

export default function BudgetPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)

  const privacyMode = useSettingsStore((state) => state.privacyMode)

  // Fetch data
  const { data: accounts = [], isLoading: accountsLoading, error: accountsError } = useBudgetAccounts()
  const { data: transactions = [], isLoading: transactionsLoading } = useBudgetTransactions()
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useBudgetSummary()
  const deleteTransaction = useDeleteTransaction()

  // Calculate balances for each account
  const accountBalances = useMemo(() => {
    const balances: Record<string, { balance: number; planned: number; actual: number }> = {}

    for (const account of accounts) {
      const accountTransactions = transactions.filter(
        (t) => t.account_id === account.budget_account_id
      )
      const balance = accountTransactions.reduce((sum, t) => {
        return t.type === 'income' ? sum + t.amount : sum - t.amount
      }, 0)

      const planned = 0 // Would come from budget plans if available
      const actual = accountTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      balances[account.budget_account_id] = { balance, planned, actual }
    }

    return balances
  }, [accounts, transactions])

  const handleDeleteClick = (transactionId: string) => {
    setTransactionToDelete(transactionId)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return

    try {
      await deleteTransaction.mutateAsync(transactionToDelete)
      toast({
        title: 'Transaction deleted.',
        variant: 'success',
      })
      setDeleteConfirmOpen(false)
      setTransactionToDelete(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete transaction'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'error',
      })
    }
  }

  const isLoading = accountsLoading || summaryLoading
  const hasError = accountsError || summaryError
  const hasAccounts = accounts.length > 0
  const hasTransactions = transactions.length > 0

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <PageHeader
        title="Budget"
        action={
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2 min-h-[44px]"
            size="default"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        }
      />

      {/* Error State */}
      {hasError && (
        <div role="alert" className="rounded-soft bg-danger-light border border-danger/20 p-4">
          <p className="text-sm text-danger-dark">
            Failed to load budget data. Please check your connection and try again.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !hasAccounts ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <CardSkeleton className="h-32" />
          <ListSkeleton count={3} />
        </div>
      ) : !hasAccounts ? (
        <EmptyState
          icon={<div className="text-4xl">💰</div>}
          message="No budget accounts yet. Create your first account to get started."
        />
      ) : (
        <>
          {/* Account Cards Grid */}
          <SectionErrorBoundary section="budget-accounts">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((account) => (
                <AccountCard
                  key={account.budget_account_id}
                  account={account}
                  balance={accountBalances[account.budget_account_id]?.balance || 0}
                  totalPlanned={accountBalances[account.budget_account_id]?.planned || 0}
                  totalActual={accountBalances[account.budget_account_id]?.actual || 0}
                />
              ))}
            </div>
          </SectionErrorBoundary>

          {/* Monthly Summary */}
          {summary && (
            <SectionErrorBoundary section="budget-summary">
              <div className="rounded-soft bg-surface shadow-soft p-6">
                <h2 className="text-lg font-semibold text-content mb-4">Monthly Summary</h2>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-xs font-medium text-content-muted uppercase tracking-wide mb-1">
                      Income
                    </p>
                    <p
                      className={cn(
                        'text-2xl font-bold',
                        privacyMode ? 'blur-sm' : 'text-success'
                      )}
                      aria-live="polite"
                    >
                      ${summary.total_income.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-content-muted uppercase tracking-wide mb-1">
                      Expenses
                    </p>
                    <p
                      className={cn(
                        'text-2xl font-bold',
                        privacyMode ? 'blur-sm' : 'text-danger'
                      )}
                      aria-live="polite"
                    >
                      ${summary.total_expenses.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-content-muted uppercase tracking-wide mb-1">
                      Net
                    </p>
                    <p
                      className={cn(
                        'text-2xl font-bold',
                        privacyMode ? 'blur-sm' : summary.net >= 0 ? 'text-success' : 'text-danger'
                      )}
                      aria-live="polite"
                    >
                      {summary.net >= 0 ? '+' : '-'}${Math.abs(summary.net).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Category Breakdown */}
                {summary.by_category && summary.by_category.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-content mb-3">By Category</h3>
                    <div className="space-y-2">
                      {summary.by_category.map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-content-secondary">{cat.category_name}</span>
                          <span
                            className={cn(
                              'font-medium',
                              privacyMode ? 'blur-sm' : cat.kind === 'income'
                                ? 'text-success'
                                : 'text-danger'
                            )}
                          >
                            {cat.kind === 'income' ? '+' : '-'}${Math.abs(cat.total).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionErrorBoundary>
          )}

          {/* Spending Chart */}
          <SectionErrorBoundary section="spending-chart">
            <div className="rounded-soft bg-surface shadow-soft p-6">
              <h2 className="text-lg font-semibold text-content mb-4">Spending Over Time</h2>
              <SpendingChart />
            </div>
          </SectionErrorBoundary>

          {/* Recent Transactions */}
          <SectionErrorBoundary section="recent-transactions">
            <div className="rounded-soft bg-surface shadow-soft p-6">
              <h2 className="text-lg font-semibold text-content mb-4">Recent Transactions</h2>

              {transactionsLoading ? (
                <ListSkeleton count={5} />
              ) : !hasTransactions ? (
                <EmptyState
                  icon={<div className="text-2xl">📝</div>}
                  message="No transactions yet. Start by adding your first transaction."
                />
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 50).map((transaction) => (
                    <div
                      key={transaction.budget_transaction_id}
                      className="flex items-center justify-between p-3 rounded-soft bg-surface-sunken hover:bg-surface-raised transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-content text-sm truncate">
                            {transaction.title}
                          </h4>
                          {transaction.merchant && (
                            <span className="text-xs text-content-muted flex-shrink-0">
                              • {transaction.merchant}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-content-muted">
                          <span>{transaction.category_name}</span>
                          <span>•</span>
                          <span>
                            {new Date(transaction.occurred_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span
                          className={cn(
                            'font-semibold text-sm min-w-fit',
                            transaction.type === 'income' ? 'text-success' : 'text-danger',
                            privacyMode && 'blur-sm'
                          )}
                          aria-live="polite"
                        >
                          {transaction.type === 'income' ? '+' : '-'}$
                          {transaction.amount.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleDeleteClick(transaction.budget_transaction_id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-soft p-1.5 hover:bg-danger-light text-danger-dark focus-visible:ring-2 focus-visible:ring-danger focus-visible:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label={`Delete transaction ${transaction.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionErrorBoundary>
        </>
      )}

      {/* Add Transaction Modal */}
      <AlertDialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <AlertDialogContent className="max-w-md">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-content">Add Transaction</h2>
          </div>
          <TransactionForm
            onSuccess={() => setIsAddModalOpen(false)}
            onError={() => {}}
          />
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        variant="danger"
      />
    </div>
  )
}
