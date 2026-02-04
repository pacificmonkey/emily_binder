import { useState } from 'react'
import { Card, CardContent, Button, EmptyState, LoadingSpinner, Modal, Input, ErrorCard } from '@/components/ui'
import {
  useIncomeSources,
  useExpenses,
  useBudgetSummary,
  useCreateIncome,
  useUpdateIncome,
  useArchiveIncome,
  useCreateExpense,
  useUpdateExpense,
  useArchiveExpense,
  useMarkExpensePaid,
  useCurrentMonthActualExpenses,
  useCreateActualExpense,
  useUpdateActualExpense,
  useDeleteActualExpense,
  useLogPlannedExpense,
  useBudgetExpenseCategories,
} from '@/hooks/useBudget'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { BudgetIncomeSource, BudgetExpense, BudgetActualExpense, BudgetExpenseCategory, ExpenseFrequency } from '@/types/database'
import styles from './Budget.module.css'

type ExpenseTabType = 'monthly' | 'one_time'

// =============================================================================
// INCOME ITEM COMPONENT
// =============================================================================

interface IncomeItemProps {
  income: BudgetIncomeSource
  categories: BudgetExpenseCategory[]
  onEdit: () => void
  onDelete: () => void
}

function IncomeItem({ income, categories, onEdit, onDelete }: IncomeItemProps) {
  const isRestricted = income.allowed_categories && income.allowed_categories.length > 0

  // Helper to get category info
  const getCategoryInfo = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName)
    return cat ? { icon: cat.icon, label: cat.name } : { icon: '📦', label: categoryName }
  }

  return (
    <div className={styles.listItem}>
      <div className={styles.itemInfo}>
        <span className={styles.itemName}>{income.name}</span>
        <div className={styles.itemMetaRow}>
          <span className={styles.itemMeta}>Monthly</span>
          {isRestricted ? (
            <span className={styles.restrictionBadge}>
              {income.allowed_categories!.map(catName => {
                const catInfo = getCategoryInfo(catName)
                return (
                  <span key={catName} className={styles.categoryChip}>
                    {catInfo.icon} {catInfo.label}
                  </span>
                )
              })}
            </span>
          ) : (
            <span className={styles.unrestrictedBadge}>All categories</span>
          )}
        </div>
      </div>
      <div className={styles.itemActions}>
        <span className={styles.itemAmount}>${Number(income.amount).toFixed(2)}</span>
        <button className={styles.editBtn} onClick={onEdit} title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button className={styles.deleteBtn} onClick={onDelete} title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// PLANNED EXPENSE ITEM COMPONENT
// =============================================================================

interface PlannedExpenseItemProps {
  expense: BudgetExpense
  categories: BudgetExpenseCategory[]
  onEdit: () => void
  onDelete: () => void
  onLog?: () => void
  onTogglePaid?: () => void
}

function PlannedExpenseItem({ expense, categories, onEdit, onDelete, onLog, onTogglePaid }: PlannedExpenseItemProps) {
  // Helper to get category info
  const getCategoryInfo = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName)
    return cat ? { icon: cat.icon, label: cat.name } : { icon: '📦', label: categoryName }
  }

  return (
    <div className={cn(styles.listItem, expense.is_paid && styles.paid)}>
      {expense.frequency === 'one_time' && onTogglePaid && (
        <button
          className={cn(styles.checkbox, expense.is_paid && styles.checked)}
          onClick={onTogglePaid}
          aria-label={expense.is_paid ? 'Mark as unpaid' : 'Mark as paid'}
        >
          {expense.is_paid && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      )}
      <div className={styles.itemInfo}>
        <span className={cn(styles.itemName, expense.is_paid && styles.strikethrough)}>
          {expense.name}
        </span>
        <div className={styles.itemMetaRow}>
          {expense.category && (
            <span className={styles.categoryBadge}>
              {getCategoryInfo(expense.category).icon} {getCategoryInfo(expense.category).label}
            </span>
          )}
          {expense.frequency === 'one_time' && expense.due_date && (
            <span className={styles.dueDate}>
              Due {format(new Date(expense.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </div>
      <div className={styles.itemActions}>
        <span className={cn(styles.itemAmount, expense.is_paid && styles.strikethrough)}>
          ${Number(expense.amount).toFixed(2)}
        </span>
        {onLog && (
          <button className={styles.logBtn} onClick={onLog} title="Log actual expense">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Log
          </button>
        )}
        <button className={styles.editBtn} onClick={onEdit} title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button className={styles.deleteBtn} onClick={onDelete} title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// ACTUAL EXPENSE ITEM COMPONENT
// =============================================================================

interface ActualExpenseItemProps {
  expense: BudgetActualExpense
  categories: BudgetExpenseCategory[]
  onEdit: () => void
  onDelete: () => void
}

function ActualExpenseItem({ expense, categories, onEdit, onDelete }: ActualExpenseItemProps) {
  // Helper to get category info
  const getCategoryInfo = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName)
    return cat ? { icon: cat.icon, label: cat.name } : { icon: '📦', label: categoryName }
  }

  return (
    <div className={styles.listItem}>
      <div className={styles.itemInfo}>
        <span className={styles.itemName}>{expense.name}</span>
        <div className={styles.itemMetaRow}>
          {expense.category && (
            <span className={styles.categoryBadge}>
              {getCategoryInfo(expense.category).icon} {getCategoryInfo(expense.category).label}
            </span>
          )}
          <span className={styles.dueDate}>
            {format(new Date(expense.expense_date), 'MMM d')}
          </span>
        </div>
      </div>
      <div className={styles.itemActions}>
        <span className={styles.itemAmount}>
          ${Number(expense.amount).toFixed(2)}
        </span>
        <button className={styles.editBtn} onClick={onEdit} title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button className={styles.deleteBtn} onClick={onDelete} title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN BUDGET PAGE
// =============================================================================

export function BudgetPage() {
  const [expenseTab, setExpenseTab] = useState<ExpenseTabType>('monthly')
  const [expandedFund, setExpandedFund] = useState<string | null>(null) // 'general' or category name

  // Modal state
  const [showAddIncome, setShowAddIncome] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddActual, setShowAddActual] = useState(false)
  const [editingIncome, setEditingIncome] = useState<BudgetIncomeSource | null>(null)
  const [editingExpense, setEditingExpense] = useState<BudgetExpense | null>(null)
  const [editingActual, setEditingActual] = useState<BudgetActualExpense | null>(null)
  const [loggingExpense, setLoggingExpense] = useState<BudgetExpense | null>(null)

  // Income form state
  const [incomeName, setIncomeName] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeAllowedCategories, setIncomeAllowedCategories] = useState<string[]>([])

  // Planned expense form state
  const [expenseName, setExpenseName] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseFrequency, setExpenseFrequency] = useState<ExpenseFrequency>('monthly')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [expenseDueDate, setExpenseDueDate] = useState('')

  // Actual expense form state
  const [actualName, setActualName] = useState('')
  const [actualAmount, setActualAmount] = useState('')
  const [actualCategory, setActualCategory] = useState('')
  const [actualDate, setActualDate] = useState(new Date().toISOString().split('T')[0])
  const [actualNotes, setActualNotes] = useState('')

  const { user } = useAuth()

  // Data fetching
  const { data: summary, isLoading: summaryLoading } = useBudgetSummary()
  const { data: incomeSources, isLoading: incomeLoading, error: incomeError } = useIncomeSources()
  const { data: expenses, isLoading: expensesLoading, error: expensesError } = useExpenses()
  const { data: actualExpenses, isLoading: actualLoading, error: actualError } = useCurrentMonthActualExpenses()
  const { data: expenseCategories } = useBudgetExpenseCategories()

  // Use categories or default to empty array
  const categories = expenseCategories ?? []

  // Mutations
  const createIncome = useCreateIncome()
  const updateIncome = useUpdateIncome()
  const archiveIncome = useArchiveIncome()
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const archiveExpense = useArchiveExpense()
  const markPaid = useMarkExpensePaid()
  const createActual = useCreateActualExpense()
  const updateActual = useUpdateActualExpense()
  const deleteActual = useDeleteActualExpense()
  const logPlanned = useLogPlannedExpense()

  // Filter expenses by tab
  const monthlyExpenses = expenses?.filter(e => e.frequency === 'monthly') ?? []
  const oneTimeExpenses = expenses?.filter(e => e.frequency === 'one_time') ?? []
  const displayedExpenses = expenseTab === 'monthly' ? monthlyExpenses : oneTimeExpenses

  // Form handlers
  const resetIncomeForm = () => {
    setIncomeName('')
    setIncomeAmount('')
    setIncomeAllowedCategories([])
    setEditingIncome(null)
  }

  const resetExpenseForm = () => {
    setExpenseName('')
    setExpenseAmount('')
    setExpenseFrequency('monthly')
    setExpenseCategory('')
    setExpenseDueDate('')
    setEditingExpense(null)
  }

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !incomeName.trim() || !incomeAmount) return

    await createIncome.mutateAsync({
      owner_user_id: user.id,
      name: incomeName.trim(),
      amount: parseFloat(incomeAmount),
      allowed_categories: incomeAllowedCategories.length > 0 ? incomeAllowedCategories : null,
    })

    resetIncomeForm()
    setShowAddIncome(false)
  }

  const handleUpdateIncome = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingIncome || !incomeName.trim() || !incomeAmount) return

    await updateIncome.mutateAsync({
      id: editingIncome.id,
      updates: {
        name: incomeName.trim(),
        amount: parseFloat(incomeAmount),
        allowed_categories: incomeAllowedCategories.length > 0 ? incomeAllowedCategories : null,
      },
    })

    resetIncomeForm()
  }

  const handleDeleteIncome = async (id: string) => {
    await archiveIncome.mutateAsync(id)
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !expenseName.trim() || !expenseAmount) return

    await createExpense.mutateAsync({
      owner_user_id: user.id,
      name: expenseName.trim(),
      amount: parseFloat(expenseAmount),
      frequency: expenseFrequency,
      category: expenseCategory || null,
      due_date: expenseFrequency === 'one_time' && expenseDueDate ? expenseDueDate : null,
    })

    resetExpenseForm()
    setShowAddExpense(false)
  }

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense || !expenseName.trim() || !expenseAmount) return

    await updateExpense.mutateAsync({
      id: editingExpense.id,
      updates: {
        name: expenseName.trim(),
        amount: parseFloat(expenseAmount),
        category: expenseCategory || null,
        due_date: editingExpense.frequency === 'one_time' && expenseDueDate ? expenseDueDate : null,
      },
    })

    resetExpenseForm()
  }

  const handleDeleteExpense = async (id: string) => {
    await archiveExpense.mutateAsync(id)
  }

  const handleTogglePaid = async (expense: BudgetExpense) => {
    await markPaid.mutateAsync({ id: expense.id, isPaid: !expense.is_paid })
  }

  const openEditIncome = (income: BudgetIncomeSource) => {
    setIncomeName(income.name)
    setIncomeAmount(income.amount.toString())
    setIncomeAllowedCategories(income.allowed_categories ?? [])
    setEditingIncome(income)
  }

  const openEditExpense = (expense: BudgetExpense) => {
    setExpenseName(expense.name)
    setExpenseAmount(expense.amount.toString())
    setExpenseFrequency(expense.frequency)
    setExpenseCategory(expense.category || '')
    setExpenseDueDate(expense.due_date || '')
    setEditingExpense(expense)
  }

  // Actual expense handlers
  const resetActualForm = () => {
    setActualName('')
    setActualAmount('')
    setActualCategory('')
    setActualDate(new Date().toISOString().split('T')[0])
    setActualNotes('')
    setEditingActual(null)
    setLoggingExpense(null)
  }

  const handleAddActual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !actualName.trim() || !actualAmount) return

    await createActual.mutateAsync({
      owner_user_id: user.id,
      name: actualName.trim(),
      amount: parseFloat(actualAmount),
      category: actualCategory || null,
      expense_date: actualDate,
      notes: actualNotes.trim() || null,
    })

    resetActualForm()
    setShowAddActual(false)
  }

  const handleUpdateActual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingActual || !actualName.trim() || !actualAmount) return

    await updateActual.mutateAsync({
      id: editingActual.id,
      updates: {
        name: actualName.trim(),
        amount: parseFloat(actualAmount),
        category: actualCategory || null,
        expense_date: actualDate,
        notes: actualNotes.trim() || null,
      },
    })

    resetActualForm()
  }

  const handleDeleteActual = async (id: string) => {
    await deleteActual.mutateAsync(id)
  }

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loggingExpense || !actualAmount) return

    await logPlanned.mutateAsync({
      plannedExpense: loggingExpense,
      actualAmount: parseFloat(actualAmount),
      expenseDate: actualDate,
      notes: actualNotes.trim() || undefined,
    })

    resetActualForm()
  }

  const openLogExpense = (expense: BudgetExpense) => {
    setActualName(expense.name)
    setActualAmount(expense.amount.toString())
    setActualCategory(expense.category || '')
    setActualDate(new Date().toISOString().split('T')[0])
    setActualNotes('')
    setLoggingExpense(expense)
  }

  const openEditActual = (actual: BudgetActualExpense) => {
    setActualName(actual.name)
    setActualAmount(actual.amount.toString())
    setActualCategory(actual.category || '')
    setActualDate(actual.expense_date)
    setActualNotes(actual.notes || '')
    setEditingActual(actual)
  }

  const error = incomeError || expensesError || actualError

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Budget</h1>
      </header>

      {error && <ErrorCard error={error} resourceName="budget data" />}

      {/* Summary Card */}
      <Card className={styles.summaryCard}>
        <CardContent>
          {summaryLoading ? (
            <div className={styles.loadingContainer}>
              <LoadingSpinner />
            </div>
          ) : summary ? (
            <>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Monthly Income</span>
                  <span className={styles.summaryValue}>${summary.totalMonthlyIncome.toFixed(2)}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Spent This Month</span>
                  <span className={cn(styles.summaryValue, styles.expense)}>
                    -${summary.totalActualExpenses.toFixed(2)}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Planned Budget</span>
                  <span className={cn(styles.summaryValue, styles.muted)}>
                    ${summary.totalMonthlyExpenses.toFixed(2)}
                  </span>
                </div>
                <div className={cn(styles.summaryItem, styles.remaining)}>
                  <span className={styles.summaryLabel}>Remaining This Month</span>
                  <span className={cn(
                    styles.summaryValue,
                    summary.remaining >= 0 ? styles.positive : styles.negative
                  )}>
                    ${summary.remaining.toFixed(2)}
                  </span>
                </div>
                {summary.unpaidOneTimeExpenses > 0 && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Unpaid One-Time</span>
                    <span className={cn(styles.summaryValue, styles.warning)}>
                      ${summary.unpaidOneTimeExpenses.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Remaining Funds by Type - Clickable for details */}
              <div className={styles.remainingFundsSection}>
                <h3 className={styles.remainingFundsTitle}>Remaining Funds</h3>
                <div className={styles.remainingFundsGrid}>
                  {/* General Fund */}
                  {summary.generalFundIncome > 0 && (
                    <div className={styles.fundCard}>
                      <button
                        className={cn(styles.remainingFundItem, styles.clickable, expandedFund === 'general' && styles.expanded)}
                        onClick={() => setExpandedFund(expandedFund === 'general' ? null : 'general')}
                      >
                        <span className={styles.remainingFundLabel}>
                          General ({summary.generalFundSources.join(', ')})
                        </span>
                        <div className={styles.fundItemRight}>
                          <span className={cn(
                            styles.remainingFundValue,
                            summary.generalFundRemaining >= 0 ? styles.positive : styles.negative
                          )}>
                            ${summary.generalFundRemaining.toFixed(2)}
                          </span>
                          <svg
                            className={cn(styles.expandIcon, expandedFund === 'general' && styles.expandedIcon)}
                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </button>
                      {expandedFund === 'general' && (
                        <div className={styles.fundDetails}>
                          <div className={styles.fundDetailRow}>
                            <span>Available:</span>
                            <span>${summary.generalFundIncome.toFixed(2)}</span>
                          </div>
                          <div className={styles.fundDetailRow}>
                            <span>Used:</span>
                            <span>-${summary.generalFundUsed.toFixed(2)}</span>
                          </div>
                          {/* List expenses covered by general fund */}
                          {expenses && expenses.filter(e =>
                            e.frequency === 'monthly' &&
                            (!e.category || !summary.categoryBreakdown.find(c => c.category === e.category && c.restrictedIncome > 0))
                          ).length > 0 && (
                            <div className={styles.fundExpensesList}>
                              <span className={styles.fundExpensesLabel}>Expenses:</span>
                              {expenses.filter(e =>
                                e.frequency === 'monthly' &&
                                (!e.category || !summary.categoryBreakdown.find(c => c.category === e.category && c.restrictedIncome > 0))
                              ).map(exp => (
                                <div key={exp.id} className={styles.fundExpenseItem}>
                                  <span>{exp.name}</span>
                                  <span>-${Number(exp.amount).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Restricted category funds */}
                  {summary.categoryBreakdown
                    .filter(cat => cat.restrictedIncome > 0)
                    .map(cat => (
                      <div key={cat.category} className={styles.fundCard}>
                        <button
                          className={cn(styles.remainingFundItem, styles.clickable, expandedFund === cat.category && styles.expanded)}
                          onClick={() => setExpandedFund(expandedFund === cat.category ? null : cat.category)}
                        >
                          <span className={styles.remainingFundLabel}>
                            {cat.icon} {cat.label} ({cat.restrictedSources.join(', ')})
                          </span>
                          <div className={styles.fundItemRight}>
                            <span className={cn(
                              styles.remainingFundValue,
                              cat.remainingRestricted >= 0 ? styles.positive : styles.negative
                            )}>
                              ${cat.remainingRestricted.toFixed(2)}
                            </span>
                            <svg
                              className={cn(styles.expandIcon, expandedFund === cat.category && styles.expandedIcon)}
                              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </button>
                        {expandedFund === cat.category && (
                          <div className={styles.fundDetails}>
                            <div className={styles.fundDetailRow}>
                              <span>Available:</span>
                              <span>${cat.restrictedIncome.toFixed(2)}</span>
                            </div>
                            <div className={styles.fundDetailRow}>
                              <span>Expenses:</span>
                              <span>-${cat.expenseTotal.toFixed(2)}</span>
                            </div>
                            {/* List expenses in this category */}
                            {expenses && expenses.filter(e => e.frequency === 'monthly' && e.category === cat.category).length > 0 && (
                              <div className={styles.fundExpensesList}>
                                <span className={styles.fundExpensesLabel}>Budgeted:</span>
                                {expenses.filter(e => e.frequency === 'monthly' && e.category === cat.category).map(exp => (
                                  <div key={exp.id} className={styles.fundExpenseItem}>
                                    <span>{exp.name}</span>
                                    <span>-${Number(exp.amount).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {cat.uncoveredExpenses > 0 && (
                              <div className={cn(styles.fundDetailRow, styles.muted)}>
                                <span>Overflow to general:</span>
                                <span>${cat.uncoveredExpenses.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Warnings */}
              {summary.warnings.length > 0 && (
                <div className={styles.warningsSection}>
                  {summary.warnings.map((warning, i) => (
                    <div key={i} className={styles.warningItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Income Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Income</h2>
          <button className={styles.addButton} onClick={() => setShowAddIncome(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        </div>
        <Card>
          <CardContent>
            {incomeLoading ? (
              <div className={styles.loadingContainer}>
                <LoadingSpinner />
              </div>
            ) : !incomeSources || incomeSources.length === 0 ? (
              <EmptyState
                icon={
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                }
                title="No income sources"
                description="Add your income sources to track your budget"
                action={<Button size="sm" onClick={() => setShowAddIncome(true)}>Add Income</Button>}
              />
            ) : (
              <div className={styles.list}>
                {incomeSources.map(income => (
                  <IncomeItem
                    key={income.id}
                    income={income}
                    categories={categories}
                    onEdit={() => openEditIncome(income)}
                    onDelete={() => handleDeleteIncome(income.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Planned Expenses Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Planned Expenses</h2>
          <button className={styles.addButton} onClick={() => setShowAddExpense(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        </div>

        {/* Expense Tabs */}
        <div className={styles.tabs}>
          <button
            className={cn(styles.tab, expenseTab === 'monthly' && styles.activeTab)}
            onClick={() => setExpenseTab('monthly')}
          >
            Monthly
            {monthlyExpenses.length > 0 && (
              <span className={styles.tabBadge}>{monthlyExpenses.length}</span>
            )}
          </button>
          <button
            className={cn(styles.tab, expenseTab === 'one_time' && styles.activeTab)}
            onClick={() => setExpenseTab('one_time')}
          >
            One-Time
            {oneTimeExpenses.filter(e => !e.is_paid).length > 0 && (
              <span className={styles.tabBadge}>{oneTimeExpenses.filter(e => !e.is_paid).length}</span>
            )}
          </button>
        </div>

        <Card>
          <CardContent>
            {expensesLoading ? (
              <div className={styles.loadingContainer}>
                <LoadingSpinner />
              </div>
            ) : displayedExpenses.length === 0 ? (
              <EmptyState
                icon={
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                }
                title={`No ${expenseTab === 'monthly' ? 'monthly' : 'one-time'} expenses`}
                description={`Add your ${expenseTab === 'monthly' ? 'recurring monthly' : 'one-time'} planned expenses`}
                action={<Button size="sm" onClick={() => setShowAddExpense(true)}>Add Expense</Button>}
              />
            ) : (
              <div className={styles.list}>
                {displayedExpenses.map(expense => (
                  <PlannedExpenseItem
                    key={expense.id}
                    expense={expense}
                    categories={categories}
                    onEdit={() => openEditExpense(expense)}
                    onDelete={() => handleDeleteExpense(expense.id)}
                    onLog={() => openLogExpense(expense)}
                    onTogglePaid={expense.frequency === 'one_time' ? () => handleTogglePaid(expense) : undefined}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Actual Expenses Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Actual Expenses</h2>
          <button className={styles.addButton} onClick={() => setShowAddActual(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        </div>
        <Card>
          <CardContent>
            {actualLoading ? (
              <div className={styles.loadingContainer}>
                <LoadingSpinner />
              </div>
            ) : !actualExpenses || actualExpenses.length === 0 ? (
              <EmptyState
                icon={
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                }
                title="No expenses logged this month"
                description="Log your actual spending to track your budget"
                action={<Button size="sm" onClick={() => setShowAddActual(true)}>Log Expense</Button>}
              />
            ) : (
              <div className={styles.list}>
                {actualExpenses.map(actual => (
                  <ActualExpenseItem
                    key={actual.id}
                    expense={actual}
                    categories={categories}
                    onEdit={() => openEditActual(actual)}
                    onDelete={() => handleDeleteActual(actual.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Add/Edit Income Modal */}
      <Modal
        isOpen={showAddIncome || !!editingIncome}
        onClose={() => {
          setShowAddIncome(false)
          resetIncomeForm()
        }}
        title={editingIncome ? 'Edit Income' : 'Add Income'}
      >
        <form onSubmit={editingIncome ? handleUpdateIncome : handleAddIncome} className={styles.form}>
          <Input
            label="Name"
            value={incomeName}
            onChange={(e) => setIncomeName(e.target.value)}
            placeholder="e.g., SSI, SNAP"
            required
          />
          <Input
            label="Amount (Monthly)"
            type="number"
            value={incomeAmount}
            onChange={(e) => setIncomeAmount(e.target.value)}
            placeholder="e.g., 914.00"
            min="0"
            step="0.01"
            required
          />
          <div className={styles.formField}>
            <label className={styles.label}>Allowed Categories</label>
            <p className={styles.fieldHint}>
              Restrict this income to specific expense categories (e.g., SNAP for food only)
            </p>
            <div className={styles.categoryCheckboxes}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={incomeAllowedCategories.length === 0}
                  onChange={() => setIncomeAllowedCategories([])}
                  className={styles.checkboxInput}
                />
                <span>All categories (unrestricted)</span>
              </label>
              {categories.map(cat => (
                <label key={cat.id} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={incomeAllowedCategories.includes(cat.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIncomeAllowedCategories([...incomeAllowedCategories, cat.name])
                      } else {
                        setIncomeAllowedCategories(incomeAllowedCategories.filter(c => c !== cat.name))
                      }
                    }}
                    className={styles.checkboxInput}
                  />
                  <span>{cat.icon} {cat.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className={styles.formActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowAddIncome(false)
                resetIncomeForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createIncome.isPending || updateIncome.isPending}>
              {editingIncome ? 'Save' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Planned Expense Modal */}
      <Modal
        isOpen={showAddExpense || !!editingExpense}
        onClose={() => {
          setShowAddExpense(false)
          resetExpenseForm()
        }}
        title={editingExpense ? 'Edit Planned Expense' : 'Add Planned Expense'}
      >
        <form onSubmit={editingExpense ? handleUpdateExpense : handleAddExpense} className={styles.form}>
          <Input
            label="Name"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            placeholder="e.g., Rent, Electric Bill"
            required
          />
          <Input
            label="Amount"
            type="number"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            placeholder="e.g., 500.00"
            min="0"
            step="0.01"
            required
          />
          {!editingExpense && (
            <div className={styles.formField}>
              <label className={styles.label}>Frequency</label>
              <select
                value={expenseFrequency}
                onChange={(e) => setExpenseFrequency(e.target.value as ExpenseFrequency)}
                className={styles.select}
              >
                <option value="monthly">Monthly</option>
                <option value="one_time">One-Time</option>
              </select>
            </div>
          )}
          <div className={styles.formField}>
            <label className={styles.label}>Category (optional)</label>
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              className={styles.select}
            >
              <option value="">No category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
          {(expenseFrequency === 'one_time' || editingExpense?.frequency === 'one_time') && (
            <Input
              label="Due Date (optional)"
              type="date"
              value={expenseDueDate}
              onChange={(e) => setExpenseDueDate(e.target.value)}
            />
          )}
          <div className={styles.formActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowAddExpense(false)
                resetExpenseForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending}>
              {editingExpense ? 'Save' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Actual Expense Modal */}
      <Modal
        isOpen={showAddActual || !!editingActual}
        onClose={() => {
          setShowAddActual(false)
          resetActualForm()
        }}
        title={editingActual ? 'Edit Actual Expense' : 'Log Actual Expense'}
      >
        <form onSubmit={editingActual ? handleUpdateActual : handleAddActual} className={styles.form}>
          <Input
            label="Name"
            value={actualName}
            onChange={(e) => setActualName(e.target.value)}
            placeholder="e.g., Groceries at Safeway"
            required
          />
          <Input
            label="Amount"
            type="number"
            value={actualAmount}
            onChange={(e) => setActualAmount(e.target.value)}
            placeholder="e.g., 45.00"
            min="0"
            step="0.01"
            required
          />
          <Input
            label="Date"
            type="date"
            value={actualDate}
            onChange={(e) => setActualDate(e.target.value)}
            required
          />
          <div className={styles.formField}>
            <label className={styles.label}>Category (optional)</label>
            <select
              value={actualCategory}
              onChange={(e) => setActualCategory(e.target.value)}
              className={styles.select}
            >
              <option value="">No category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Notes (optional)"
            value={actualNotes}
            onChange={(e) => setActualNotes(e.target.value)}
            placeholder="e.g., Weekly groceries"
          />
          <div className={styles.formActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowAddActual(false)
                resetActualForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createActual.isPending || updateActual.isPending}>
              {editingActual ? 'Save' : 'Log'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Log Planned Expense Modal */}
      <Modal
        isOpen={!!loggingExpense}
        onClose={() => resetActualForm()}
        title={`Log: ${loggingExpense?.name || ''}`}
      >
        <form onSubmit={handleLogExpense} className={styles.form}>
          <p className={styles.fieldHint}>
            Log this planned expense as an actual expense. Adjust the amount if needed.
          </p>
          <Input
            label="Amount"
            type="number"
            value={actualAmount}
            onChange={(e) => setActualAmount(e.target.value)}
            placeholder={loggingExpense?.amount.toString() || '0.00'}
            min="0"
            step="0.01"
            required
          />
          <Input
            label="Date"
            type="date"
            value={actualDate}
            onChange={(e) => setActualDate(e.target.value)}
            required
          />
          <Input
            label="Notes (optional)"
            value={actualNotes}
            onChange={(e) => setActualNotes(e.target.value)}
            placeholder="e.g., Paid with credit card"
          />
          <div className={styles.formActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => resetActualForm()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={logPlanned.isPending}>
              Log Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
