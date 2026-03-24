'use client'

import { useState, useEffect } from 'react'
import { Loader2, UserPlus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toaster'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  assignSupportToPatient,
  unassignSupportFromPatient,
} from '@/services/support'
import type { Patient } from '@/services/admin'
import { getPatientsForImpersonation } from '@/services/admin'

interface PatientWithSupport extends Patient {
  assigned_support_id?: string | null
}

export default function SupportAssignmentsAdmin() {
  const [patients, setPatients] = useState<PatientWithSupport[]>([])
  const [loading, setLoading] = useState(true)
  const [unassignConfirm, setUnassignConfirm] = useState<{
    open: boolean
    patientId: string | null
  }>({
    open: false,
    patientId: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [assignForm, setAssignForm] = useState({
    supportUserId: '',
    patientId: '',
  })

  // Mock support users - in a real app, these would be fetched from the API
  const mockSupportUsers = [
    { id: 'support-1', name: 'Sarah Johnson' },
    { id: 'support-2', name: 'Mike Chen' },
    { id: 'support-3', name: 'Emily Rodriguez' },
  ]

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      setLoading(true)
      const data = await getPatientsForImpersonation()
      setPatients(
        data.map((p) => ({
          ...p,
          assigned_support_id: null, // In a real app, this would come from the API
        }))
      )
    } catch (error) {
      console.error('Failed to load patients:', error)
      toast({
        title: 'Error',
        description: 'Failed to load patients',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAssignSupport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignForm.supportUserId || !assignForm.patientId) {
      toast({
        title: 'Validation Error',
        description: 'Please select both a support user and patient',
        variant: 'error',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await assignSupportToPatient(assignForm.supportUserId, assignForm.patientId)

      toast({
        title: 'Success',
        description: 'Support user assigned to patient',
      })

      setAssignForm({ supportUserId: '', patientId: '' })
      await loadPatients()
    } catch (error) {
      console.error('Failed to assign support:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to assign support',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnassignSupport = async (patientId: string) => {
    try {
      setIsSubmitting(true)
      const patient = patients.find((p) => p.patient_id === patientId)
      if (!patient?.assigned_support_id) {
        throw new Error('No support assignment found')
      }

      await unassignSupportFromPatient(patient.assigned_support_id, patientId)

      toast({
        title: 'Success',
        description: 'Support user unassigned',
      })

      setUnassignConfirm({ open: false, patientId: null })
      await loadPatients()
    } catch (error) {
      console.error('Failed to unassign support:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to unassign support',
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSupportUserName = (userId?: string | null) => {
    if (!userId) return 'Unassigned'
    const user = mockSupportUsers.find((u) => u.id === userId)
    return user?.name || 'Unknown'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Assignments"
        subtitle="Assign support users to patients"
      />

      {/* Assign Support Form */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Support User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAssignSupport} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="support-user" className="text-sm font-medium text-content">
                  Support User
                </label>
                <select
                  id="support-user"
                  className={cn(
                    'flex h-10 w-full rounded-soft border border-border bg-surface px-3 py-2 text-sm text-content',
                    'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
                  )}
                  value={assignForm.supportUserId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, supportUserId: e.target.value })
                  }
                >
                  <option value="">Select a support user</option>
                  {mockSupportUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="patient" className="text-sm font-medium text-content">
                  Patient
                </label>
                <select
                  id="patient"
                  className={cn(
                    'flex h-10 w-full rounded-soft border border-border bg-surface px-3 py-2 text-sm text-content',
                    'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
                  )}
                  value={assignForm.patientId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, patientId: e.target.value })
                  }
                >
                  <option value="">Select a patient</option>
                  {patients.map((patient) => (
                    <option key={patient.patient_id} value={patient.patient_id}>
                      {patient.full_name} ({patient.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Support
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Patients List */}
      <div>
        <h2 className="text-lg font-semibold text-content mb-4">Patient Support Assignments</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : patients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-content-secondary">No patients available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {patients.map((patient) => (
              <Card key={patient.patient_id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-content truncate">
                        {patient.full_name}
                      </h3>
                      <p className="text-sm text-content-secondary truncate">
                        {patient.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge
                          variant={
                            patient.assigned_support_id ? 'success' : 'secondary'
                          }
                          className="font-normal"
                        >
                          {getSupportUserName(patient.assigned_support_id)}
                        </Badge>
                      </div>

                      {patient.assigned_support_id && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() =>
                            setUnassignConfirm({
                              open: true,
                              patientId: patient.patient_id,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Unassign Confirmation Dialog */}
      <ConfirmDialog
        open={unassignConfirm.open}
        onOpenChange={(open) =>
          setUnassignConfirm({ open, patientId: open ? unassignConfirm.patientId : null })
        }
        title="Unassign Support User"
        description="Are you sure you want to unassign the support user from this patient?"
        confirmLabel="Unassign"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (unassignConfirm.patientId) {
            handleUnassignSupport(unassignConfirm.patientId)
          }
        }}
        variant="danger"
      />
    </div>
  )
}
