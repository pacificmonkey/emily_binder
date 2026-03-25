import { useState } from 'react'
import { usePatients } from '@/hooks/use-admin'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Coins as CoinsIcon } from 'lucide-react'

export default function CoinsPage() {
  const { data: patients, isLoading: patientsLoading } = usePatients()
  const [selectedPatient, setSelectedPatient] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAwardCoins = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPatient || !amount || !reason) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'error',
      })
      return
    }

    const amountNum = parseInt(amount, 10)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Amount must be greater than 0',
        variant: 'error',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.rpc('add_coins', {
        p_patient_id: selectedPatient,
        p_amount: amountNum,
        p_reason: reason,
      })

      if (error) {
        throw error
      }

      toast({
        title: 'Success',
        description: `Awarded ${amountNum} coins.`,
        variant: 'success',
      })

      setSelectedPatient('')
      setAmount('')
      setReason('')
    } catch (error) {
      console.error('Failed to award coins:', error)
      toast({
        title: 'Error',
        description: 'Failed to award coins',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-warning-light rounded-soft">
            <CoinsIcon className="h-5 w-5 text-warning" />
          </div>
          <h2 className="text-lg font-semibold text-content">Award Coins</h2>
        </div>

        <form onSubmit={handleAwardCoins} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient" className="text-sm font-medium">
              Patient
            </Label>
            <select
              id="patient"
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              disabled={patientsLoading || isSubmitting}
              className={cn(
                'w-full px-3 py-2 border border-border rounded-soft bg-surface',
                'text-content text-sm transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'
              )}
            >
              <option value="">Select a patient...</option>
              {patients?.map((patient) => (
                <option key={patient.patient_id} value={patient.patient_id}>
                  {patient.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="1"
              disabled={isSubmitting}
              className="bg-surface"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are these coins being awarded?"
              disabled={isSubmitting}
              rows={3}
              className="bg-surface"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !selectedPatient || !amount || !reason}
            className="w-full"
          >
            {isSubmitting ? 'Awarding...' : 'Award Coins'}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-content mb-4">Recent Awards</h3>
        <p className="text-sm text-content-muted">
          Coin award history not yet implemented
        </p>
      </Card>
    </div>
  )
}
