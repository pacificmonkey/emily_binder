import { useState, type FormEvent } from 'react'
import { useCreateBudgetTransaction, useBudgetAccounts, useBudgetCategories } from '@/hooks/useBudget'
import type { BudgetTransactionType } from '@/types/database'
import styles from '../wellbeing/LogSymptomModal.module.css'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddTransactionModal({ isOpen, onClose }: AddTransactionModalProps) {
  const [type, setType] = useState<BudgetTransactionType>('expense')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [merchant, setMerchant] = useState('')
  const [notes, setNotes] = useState('')

  const [error, setError] = useState<string | null>(null)

  const { data: accounts = [] } = useBudgetAccounts()
  const { data: categories = [] } = useBudgetCategories()
  const createTransaction = useCreateBudgetTransaction()

  const filteredCategories = categories.filter(c =>
    type === 'income' ? c.kind === 'income' : c.kind === 'expense'
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !amount || !categoryId || !accountId) return

    setError(null)

    try {
      await createTransaction.mutateAsync({
        type,
        title: title.trim(),
        amount: parseFloat(amount),
        category_id: categoryId,
        account_id: accountId,
        merchant: merchant.trim() || null,
        notes: notes.trim() || null,
      })

      setType('expense')
      setTitle('')
      setAmount('')
      setCategoryId('')
      setAccountId('')
      setMerchant('')
      setNotes('')
      onClose()
    } catch (err) {
      console.error('Failed to add transaction:', err)
      setError(err instanceof Error ? err.message : 'Failed to add transaction')
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Transaction</h2>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Type</label>
            <div className={styles.severityGrid}>
              <button
                type="button"
                className={`${styles.severityButton} ${type === 'expense' ? styles.severityButtonActive : ''}`}
                onClick={() => { setType('expense'); setCategoryId('') }}
              >
                Expense
              </button>
              <button
                type="button"
                className={`${styles.severityButton} ${type === 'income' ? styles.severityButtonActive : ''}`}
                onClick={() => { setType('income'); setCategoryId('') }}
              >
                Income
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="title" className={styles.label}>Description</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={styles.input}
              placeholder="e.g., Grocery shopping"
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="amount" className={styles.label}>Amount ($)</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className={styles.input}
              placeholder="0.00"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="account" className={styles.label}>Account</label>
            <select
              id="account"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">Select account...</option>
              {accounts.map(a => (
                <option key={a.budget_account_id} value={a.budget_account_id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="category" className={styles.label}>Category</label>
            <select
              id="category"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">Select category...</option>
              {filteredCategories.map(c => (
                <option key={c.budget_category_id} value={c.budget_category_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {type === 'expense' && (
            <div className={styles.field}>
              <label htmlFor="merchant" className={styles.label}>Merchant (optional)</label>
              <input
                id="merchant"
                type="text"
                value={merchant}
                onChange={e => setMerchant(e.target.value)}
                className={styles.input}
                placeholder="e.g., Walmart"
              />
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="notes" className={styles.label}>Notes (optional)</label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={styles.input}
              placeholder="Any details..."
            />
          </div>
        </form>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!title.trim() || !amount || !categoryId || !accountId || createTransaction.isPending}
          >
            {createTransaction.isPending ? 'Adding...' : 'Add Transaction'}
          </button>
        </div>
      </div>
    </div>
  )
}
