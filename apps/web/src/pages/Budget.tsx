import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useBudgetSummary, useBudgetTransactions, useBudgetAccounts, useCreateBudgetAccount } from '@/hooks/useBudget'
import { AddTransactionModal } from '@/components/budget/AddTransactionModal'
import styles from './Budget.module.css'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function Budget() {
  const [showAddTransaction, setShowAddTransaction] = useState(false)

  const { data: summary, isLoading: loadingSummary } = useBudgetSummary()
  const { data: transactions = [], isLoading: loadingTransactions } = useBudgetTransactions()
  const { data: accounts = [] } = useBudgetAccounts()
  const createAccount = useCreateBudgetAccount()

  const handleCreateDefaultAccount = async () => {
    try {
      await createAccount.mutateAsync({ name: 'Main Account' })
    } catch (err) {
      console.error('Failed to create account:', err)
    }
  }

  const needsAccount = accounts.length === 0

  return (
    <AppLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Budget</h1>
          <button
            className={styles.addButton}
            onClick={() => setShowAddTransaction(true)}
            disabled={needsAccount}
          >
            + Add Transaction
          </button>
        </header>

        {needsAccount ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>💰</div>
            <p className={styles.emptyText}>Set up your first account to start tracking</p>
            <button
              className={styles.emptyAddButton}
              onClick={handleCreateDefaultAccount}
              disabled={createAccount.isPending}
            >
              {createAccount.isPending ? 'Creating...' : 'Create Main Account'}
            </button>
          </div>
        ) : (
          <>
            {loadingSummary ? (
              <div className={styles.loading}>Loading summary...</div>
            ) : summary && (
              <div className={styles.summaryCard}>
                <h2 className={styles.summaryTitle}>This Month</h2>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <div className={styles.summaryLabel}>Income</div>
                    <div className={`${styles.summaryValue} ${styles.income}`}>
                      {formatCurrency(summary.total_income)}
                    </div>
                  </div>
                  <div className={styles.summaryItem}>
                    <div className={styles.summaryLabel}>Expenses</div>
                    <div className={`${styles.summaryValue} ${styles.expense}`}>
                      {formatCurrency(summary.total_expenses)}
                    </div>
                  </div>
                  <div className={styles.summaryItem}>
                    <div className={styles.summaryLabel}>Net</div>
                    <div className={`${styles.summaryValue} ${summary.net >= 0 ? styles.positive : styles.negative}`}>
                      {formatCurrency(summary.net)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Recent Transactions</h2>
              </div>

              {loadingTransactions ? (
                <div className={styles.loading}>Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>📝</div>
                  <p className={styles.emptyText}>No transactions yet</p>
                  <button
                    className={styles.emptyAddButton}
                    onClick={() => setShowAddTransaction(true)}
                  >
                    Add your first transaction
                  </button>
                </div>
              ) : (
                <div className={styles.transactionList}>
                  {transactions.map((tx) => (
                    <div key={tx.budget_transaction_id} className={styles.transactionCard}>
                      <div className={styles.transactionInfo}>
                        <span className={styles.transactionTitle}>{tx.title}</span>
                        <span className={styles.transactionMeta}>
                          {tx.category_name} • {formatDate(tx.occurred_at)}
                          {tx.merchant && ` • ${tx.merchant}`}
                        </span>
                      </div>
                      <span className={`${styles.transactionAmount} ${styles[tx.type]}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <AddTransactionModal
          isOpen={showAddTransaction}
          onClose={() => setShowAddTransaction(false)}
        />
      </div>
    </AppLayout>
  )
}
