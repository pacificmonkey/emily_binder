import { useState } from 'react'
import { usePatients, useStartImpersonation, useStopImpersonation, useCreateUser } from '@/hooks/use-admin'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Users, Loader2, LogOut } from 'lucide-react'

interface ImpersonationModalProps {
  patientId: string
  patientName: string
  onClose: () => void
  onConfirm: (reason: string) => void
  isLoading: boolean
}

function ImpersonationModal({
  patientName,
  onClose,
  onConfirm,
  isLoading,
}: ImpersonationModalProps) {
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      toast({
        title: 'Required',
        description: 'Please provide a reason for impersonation',
        variant: 'error',
      })
      return
    }
    onConfirm(reason)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-content mb-4">
          Impersonate {patientName}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you impersonating this patient?"
              disabled={isLoading}
              rows={3}
              className="bg-surface"
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="flex-1"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Impersonate
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

interface CreateUserFormProps {
  isLoading: boolean
}

function CreateUserForm({ isLoading }: CreateUserFormProps) {
  const { mutate: createUser } = useCreateUser()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('member')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !fullName || !role) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'error',
      })
      return
    }

    createUser(
      { email, full_name: fullName, role },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'User created successfully',
            variant: 'success',
          })
          setEmail('')
          setFullName('')
          setRole('member')
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to create user',
            variant: 'error',
          })
        },
      }
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-content mb-4">Create New User</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            disabled={isLoading}
            className="bg-surface"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium">
            Full Name
          </Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            disabled={isLoading}
            className="bg-surface"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role" className="text-sm font-medium">
            Role
          </Label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isLoading}
            className={cn(
              'w-full px-3 py-2 border border-border rounded-soft bg-surface',
              'text-content text-sm transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'
            )}
          >
            <option value="member">Member</option>
            <option value="support">Support</option>
          </select>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Create User
        </Button>
      </form>
    </Card>
  )
}

export default function PatientsPage() {
  const { data: patients, isLoading } = usePatients()
  const { mutate: startImpersonation, isPending: isImpersonating } = useStartImpersonation()
  const { mutate: stopImpersonation, isPending: isStopping } = useStopImpersonation()
  const { isImpersonating: currentlyImpersonating, impersonatedPatientName } = useAuthStore()

  const [modalPatient, setModalPatient] = useState<{ id: string; name: string } | null>(null)

  const handleImpersonate = (patientId: string, patientName: string) => {
    setModalPatient({ id: patientId, name: patientName })
  }

  const handleConfirmImpersonate = (reason: string) => {
    if (modalPatient) {
      startImpersonation(
        { patientId: modalPatient.id, reason },
        {
          onSuccess: () => {
            setModalPatient(null)
            toast({
              title: 'Impersonating',
              description: `Now impersonating ${modalPatient.name}`,
              variant: 'success',
            })
          },
          onError: (error) => {
            toast({
              title: 'Error',
              description: error instanceof Error ? error.message : 'Failed to impersonate',
              variant: 'error',
            })
          },
        }
      )
    }
  }

  const handleStopImpersonation = () => {
    stopImpersonation(undefined, {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Stopped impersonating',
          variant: 'success',
        })
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to stop impersonation',
          variant: 'error',
        })
      },
    })
  }

  return (
    <div className="space-y-6">
      {currentlyImpersonating && (
        <Card className="p-4 bg-info-light border-l-4 border-info">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-content">
                Currently impersonating: <strong>{impersonatedPatientName}</strong>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopImpersonation}
              disabled={isStopping}
            >
              {isStopping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              <LogOut className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-light rounded-soft">
            <Users className="h-5 w-5 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-content">Patients</h2>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-surface-sunken rounded animate-pulse" />
            ))}
          </div>
        ) : patients && patients.length > 0 ? (
          <div className="space-y-2">
            {patients.map((patient) => (
              <div
                key={patient.patient_id}
                className="flex items-center justify-between p-4 bg-surface rounded-soft border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content truncate">
                    {patient.full_name}
                  </p>
                  <p className="text-xs text-content-muted truncate">{patient.email}</p>
                  {patient.role && (
                    <p className="text-xs text-content-secondary mt-1 capitalize">
                      Role: {patient.role}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImpersonate(patient.patient_id, patient.full_name)}
                  disabled={
                    isImpersonating || isStopping || currentlyImpersonating
                  }
                  className="ml-4 whitespace-nowrap"
                >
                  {isImpersonating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Impersonate
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-content-secondary">No patients found</p>
        )}
      </Card>

      <CreateUserForm isLoading={isImpersonating || isStopping} />

      {modalPatient && (
        <ImpersonationModal
          patientId={modalPatient.id}
          patientName={modalPatient.name}
          onClose={() => setModalPatient(null)}
          onConfirm={handleConfirmImpersonate}
          isLoading={isImpersonating}
        />
      )}
    </div>
  )
}
