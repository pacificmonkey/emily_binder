import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, EmptyState, LoadingSpinner, Modal, Input, ErrorCard } from '@/components/ui'
import { RefillHistory } from '@/components/health'
import {
  useMedications,
  useProviders,
  usePharmacies,
  useRefillRisks,
  useCreateMedication,
  useCreateProvider,
  useUpdateMedication,
  useLogIntake,
  PROVIDER_TYPE_LABELS,
  PROVIDER_TYPE_ICONS,
} from '@/hooks/useHealth'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { addDays, format } from 'date-fns'
import type { MedicationWithRelations } from '@/services/health'
import type { HealthProvider, ProviderType } from '@/types/database'
import styles from './Health.module.css'

// Calculate medication supply information
function calculateSupplyInfo(medication: MedicationWithRelations): {
  daysRemaining: number | null
  runOutDate: Date | null
  refillByDate: Date | null
  status: 'ok' | 'low' | 'critical' | 'unknown'
} {
  const { pills_on_hand, pills_per_day, low_supply_threshold } = medication

  if (pills_on_hand === null || pills_per_day === null || pills_per_day <= 0) {
    return { daysRemaining: null, runOutDate: null, refillByDate: null, status: 'unknown' }
  }

  const daysRemaining = Math.floor(pills_on_hand / pills_per_day)
  const runOutDate = addDays(new Date(), daysRemaining)

  // Calculate refill by date (when supply hits low threshold)
  let refillByDate: Date | null = null
  if (low_supply_threshold !== null) {
    const daysUntilLow = Math.floor((pills_on_hand - low_supply_threshold) / pills_per_day)
    if (daysUntilLow > 0) {
      refillByDate = addDays(new Date(), daysUntilLow)
    } else {
      refillByDate = new Date() // Already at or below threshold
    }
  }

  // Determine status
  let status: 'ok' | 'low' | 'critical' | 'unknown' = 'ok'
  if (daysRemaining <= 3) {
    status = 'critical'
  } else if (low_supply_threshold !== null && pills_on_hand <= low_supply_threshold) {
    status = 'low'
  } else if (daysRemaining <= 7) {
    status = 'low'
  }

  return { daysRemaining, runOutDate, refillByDate, status }
}

type TabType = 'medications' | 'careTeam'

interface MedicationItemProps {
  medication: MedicationWithRelations
  onClick?: () => void
  onLogDose?: () => void
}

function MedicationItem({ medication, onClick, onLogDose }: MedicationItemProps) {
  const supplyInfo = calculateSupplyInfo(medication)

  const handleLogDose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onLogDose?.()
  }

  return (
    <div className={styles.medItemWrapper}>
      {/* Risk Badge */}
      {supplyInfo.status !== 'ok' && supplyInfo.status !== 'unknown' && (
        <div className={cn(
          styles.riskBadge,
          supplyInfo.status === 'critical' && styles.critical,
          supplyInfo.status === 'low' && styles.low
        )}>
          {supplyInfo.status === 'critical' ? '!' : 'Low'}
        </div>
      )}
      <button className={styles.medItem} onClick={onClick}>
        <div className={styles.medInfo}>
          <span className={styles.medName}>{medication.name}</span>
          {medication.instructions_md && (
            <span className={styles.medInstructions}>{medication.instructions_md}</span>
          )}
          {supplyInfo.daysRemaining !== null && (
            <div className={styles.supplyInfo}>
              <span className={cn(
                styles.supplyStatus,
                supplyInfo.status === 'critical' && styles.critical,
                supplyInfo.status === 'low' && styles.low
              )}>
                {supplyInfo.daysRemaining} days left
              </span>
              {supplyInfo.runOutDate && (
                <span className={styles.supplyDate}>
                  Runs out {format(supplyInfo.runOutDate, 'MMM d')}
                </span>
              )}
              {supplyInfo.refillByDate && supplyInfo.status !== 'critical' && (
                <span className={styles.refillDate}>
                  Refill by {format(supplyInfo.refillByDate, 'MMM d')}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={styles.medActions}>
          {medication.pills_on_hand !== null && (
            <div className={cn(
              styles.pillCount,
              supplyInfo.status === 'low' && styles.lowSupply,
              supplyInfo.status === 'critical' && styles.criticalSupply
            )}>
              {medication.pills_on_hand} pills
            </div>
          )}
        </div>
      </button>
      {/* Log Dose Button */}
      {medication.pills_per_day !== null && medication.pills_per_day > 0 && (
        <button
          className={styles.logDoseBtn}
          onClick={handleLogDose}
          title="Log dose"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}
    </div>
  )
}

interface ProviderItemProps {
  provider: HealthProvider
}

function ProviderItem({ provider }: ProviderItemProps) {
  return (
    <div className={styles.providerItem}>
      <span className={styles.providerIcon}>
        {PROVIDER_TYPE_ICONS[provider.provider_type]}
      </span>
      <div className={styles.providerInfo}>
        <span className={styles.providerName}>{provider.name}</span>
        {provider.specialty_or_role && (
          <span className={styles.providerRole}>{provider.specialty_or_role}</span>
        )}
        {provider.phone && (
          <a href={`tel:${provider.phone}`} className={styles.providerPhone}>
            {provider.phone}
          </a>
        )}
      </div>
    </div>
  )
}

export function HealthPage() {
  const [activeTab, setActiveTab] = useState<TabType>('medications')
  const [showAddMedication, setShowAddMedication] = useState(false)
  const [showAddProvider, setShowAddProvider] = useState(false)

  // Medication detail modal state
  const [selectedMedication, setSelectedMedication] = useState<MedicationWithRelations | null>(null)
  const [isEditingMedication, setIsEditingMedication] = useState(false)

  // Form state for new medication
  const [medName, setMedName] = useState('')
  const [medInstructions, setMedInstructions] = useState('')
  const [medPillsOnHand, setMedPillsOnHand] = useState('')
  const [medPillsPerDay, setMedPillsPerDay] = useState('')
  const [medLowThreshold, setMedLowThreshold] = useState('')
  const [medRefillInstructions, setMedRefillInstructions] = useState('')
  const [medRenewalInstructions, setMedRenewalInstructions] = useState('')

  // Form state for new provider
  const [providerName, setProviderName] = useState('')
  const [providerType, setProviderType] = useState<ProviderType>('doctor')
  const [providerSpecialty, setProviderSpecialty] = useState('')
  const [providerPhone, setProviderPhone] = useState('')
  const [providerPortalUrl, setProviderPortalUrl] = useState('')
  const [providerNotes, setProviderNotes] = useState('')

  // Form state for medication prescriber and pharmacy
  const [medPrescriberId, setMedPrescriberId] = useState('')
  const [medPharmacyId, setMedPharmacyId] = useState('')

  const { user } = useAuth()
  const { data: medications, isLoading: medsLoading, error: medsError } = useMedications()
  const { data: providers, isLoading: providersLoading, error: providersError } = useProviders()
  const { data: pharmacies } = usePharmacies()
  const { data: refillRisks } = useRefillRisks()

  const createMedication = useCreateMedication()
  const createProvider = useCreateProvider()
  const updateMedication = useUpdateMedication()
  const logIntake = useLogIntake()

  // Handle logging a dose
  const handleLogDose = async (medication: MedicationWithRelations) => {
    if (!user || medication.pills_per_day === null) return

    await logIntake.mutateAsync({
      owner_user_id: medication.owner_user_id,
      medication_id: medication.id,
      dose_text: `${medication.pills_per_day} pill${medication.pills_per_day > 1 ? 's' : ''}`,
      created_by_user_id: user.id,
    })
  }

  // Open medication detail modal
  const handleMedicationClick = (medication: MedicationWithRelations) => {
    setSelectedMedication(medication)
    setIsEditingMedication(false)
  }

  // Close medication detail modal
  const closeMedicationDetail = () => {
    setSelectedMedication(null)
    setIsEditingMedication(false)
    resetMedicationForm()
  }

  // Switch to edit mode and populate form
  const startEditingMedication = () => {
    if (!selectedMedication) return
    setMedName(selectedMedication.name)
    setMedInstructions(selectedMedication.instructions_md || '')
    setMedPillsOnHand(selectedMedication.pills_on_hand?.toString() || '')
    setMedPillsPerDay(selectedMedication.pills_per_day?.toString() || '')
    setMedLowThreshold(selectedMedication.low_supply_threshold?.toString() || '')
    setMedRefillInstructions(selectedMedication.refill_instructions || '')
    setMedRenewalInstructions(selectedMedication.renewal_instructions || '')
    setMedPrescriberId(selectedMedication.prescriber_provider_id || '')
    setIsEditingMedication(true)
  }

  // Save medication edits
  const handleUpdateMedication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMedication || !medName.trim()) return

    await updateMedication.mutateAsync({
      id: selectedMedication.id,
      updates: {
        name: medName.trim(),
        instructions_md: medInstructions.trim() || null,
        pills_on_hand: medPillsOnHand ? parseInt(medPillsOnHand, 10) : null,
        pills_per_day: medPillsPerDay ? parseFloat(medPillsPerDay) : null,
        low_supply_threshold: medLowThreshold ? parseInt(medLowThreshold, 10) : null,
        refill_instructions: medRefillInstructions.trim() || null,
        renewal_instructions: medRenewalInstructions.trim() || null,
        prescriber_provider_id: medPrescriberId || null,
      },
    })

    closeMedicationDetail()
  }

  const resetMedicationForm = () => {
    setMedName('')
    setMedInstructions('')
    setMedPillsOnHand('')
    setMedPillsPerDay('')
    setMedLowThreshold('')
    setMedRefillInstructions('')
    setMedRenewalInstructions('')
    setMedPrescriberId('')
    setMedPharmacyId('')
  }

  const resetProviderForm = () => {
    setProviderName('')
    setProviderType('doctor')
    setProviderSpecialty('')
    setProviderPhone('')
    setProviderPortalUrl('')
    setProviderNotes('')
  }

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !medName.trim()) return

    await createMedication.mutateAsync({
      owner_user_id: user.id,
      name: medName.trim(),
      instructions_md: medInstructions.trim() || null,
      pills_on_hand: medPillsOnHand ? parseInt(medPillsOnHand, 10) : null,
      pills_per_day: medPillsPerDay ? parseFloat(medPillsPerDay) : null,
      low_supply_threshold: medLowThreshold ? parseInt(medLowThreshold, 10) : null,
      rx_numbers: null,
      refills_remaining: null,
      refill_instructions: medRefillInstructions.trim() || null,
      renewal_instructions: medRenewalInstructions.trim() || null,
      last_refill_date: null,
      next_refill_due_date: null,
      pharmacy_id: medPharmacyId || null,
      prescriber_provider_id: medPrescriberId || null,
      notes_md: null,
      active: true,
    })

    resetMedicationForm()
    setShowAddMedication(false)
  }

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !providerName.trim()) return

    await createProvider.mutateAsync({
      owner_user_id: user.id,
      name: providerName.trim(),
      provider_type: providerType,
      specialty_or_role: providerSpecialty.trim() || null,
      phone: providerPhone.trim() || null,
      email: null,
      address: null,
      portal_url: providerPortalUrl.trim() || null,
      notes_md: providerNotes.trim() || null,
      active: true,
    })

    resetProviderForm()
    setShowAddProvider(false)
  }

  // Debug logging
  if (medsError) console.error('[Health] Medications error:', medsError)
  if (providersError) console.error('[Health] Providers error:', providersError)

  const isLoading = activeTab === 'medications' ? medsLoading : providersLoading
  const error = activeTab === 'medications' ? medsError : providersError

  // Group providers by type
  const providersByType: Partial<Record<ProviderType, HealthProvider[]>> = {}
  if (providers) {
    for (const provider of providers) {
      const type = provider.provider_type
      if (!providersByType[type]) {
        providersByType[type] = []
      }
      providersByType[type]!.push(provider)
    }
  }

  const providerTypes: ProviderType[] = ['doctor', 'therapist', 'group', 'other']

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Health</h1>
      </header>

      {/* Refill Alerts */}
      {refillRisks && refillRisks.length > 0 && (
        <Card className={styles.alertCard}>
          <CardContent>
            <div className={styles.alerts}>
              {refillRisks.map(risk => (
                <div
                  key={risk.medication.id}
                  className={`${styles.alert} ${risk.riskLevel === 'critical' ? styles.critical : styles.warning}`}
                >
                  <span className={styles.alertIcon}>
                    {risk.riskLevel === 'critical' ? '⚠️' : '💊'}
                  </span>
                  <div className={styles.alertContent}>
                    <span className={styles.alertTitle}>{risk.medication.name}</span>
                    <span className={styles.alertMessage}>{risk.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button
          className={cn(styles.tab, activeTab === 'medications' && styles.activeTab)}
          onClick={() => setActiveTab('medications')}
        >
          Medications
        </button>
        <button
          className={cn(styles.tab, activeTab === 'careTeam' && styles.activeTab)}
          onClick={() => setActiveTab('careTeam')}
        >
          Care Team
        </button>
      </div>

      {/* Error Display */}
      {error && <ErrorCard error={error} resourceName="health data" />}

      {/* Tab Content */}
      {activeTab === 'medications' && (
        <section className={styles.section}>
          {isLoading ? (
            <Card>
              <CardContent>
                <div className={styles.loadingContainer}>
                  <LoadingSpinner />
                </div>
              </CardContent>
            </Card>
          ) : !medications || medications.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M10.5 20.5L3.5 13.5c-1.1-1.1-1.1-2.9 0-4l7-7c1.1-1.1 2.9-1.1 4 0l7 7c1.1 1.1 1.1 2.9 0 4l-7 7c-1.1 1.1-2.9 1.1-4 0z" />
                      <line x1="7.5" y1="7.5" x2="16.5" y2="16.5" />
                    </svg>
                  }
                  title="No medications"
                  description="Add medications to track them here"
                  action={<Button size="sm" onClick={() => setShowAddMedication(true)}>Add Medication</Button>}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className={styles.sectionHeader}>
                  <CardTitle>Your Medications</CardTitle>
                  <button
                    className={styles.addButton}
                    onClick={() => setShowAddMedication(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className={styles.medList}>
                  {medications.map(med => (
                    <MedicationItem
                      key={med.id}
                      medication={med}
                      onClick={() => handleMedicationClick(med)}
                      onLogDose={() => handleLogDose(med)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {activeTab === 'careTeam' && (
        <section className={styles.section}>
          {isLoading ? (
            <Card>
              <CardContent>
                <div className={styles.loadingContainer}>
                  <LoadingSpinner />
                </div>
              </CardContent>
            </Card>
          ) : !providers || providers.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  }
                  title="No care team members"
                  description="Add your doctors, therapists, and support groups"
                  action={<Button size="sm" onClick={() => setShowAddProvider(true)}>Add Provider</Button>}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Your Care Team</span>
                <button
                  className={styles.addButton}
                  onClick={() => setShowAddProvider(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add
                </button>
              </div>
              {providerTypes.map(type => {
                const typeProviders = providersByType[type] || []
                if (typeProviders.length === 0) return null

                return (
                  <Card key={type}>
                    <CardHeader>
                      <CardTitle>
                        {PROVIDER_TYPE_ICONS[type]} {PROVIDER_TYPE_LABELS[type]}s
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={styles.providerList}>
                        {typeProviders.map(provider => (
                          <ProviderItem key={provider.id} provider={provider} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </>
          )}
        </section>
      )}

      {/* Add Medication Modal */}
      <Modal
        isOpen={showAddMedication}
        onClose={() => {
          setShowAddMedication(false)
          resetMedicationForm()
        }}
        title="Add Medication"
      >
        <form onSubmit={handleAddMedication} className={styles.form}>
          <Input
            label="Medication Name"
            value={medName}
            onChange={(e) => setMedName(e.target.value)}
            placeholder="e.g., Lisinopril 10mg"
            required
          />
          <Input
            label="Instructions (optional)"
            value={medInstructions}
            onChange={(e) => setMedInstructions(e.target.value)}
            placeholder="e.g., Take once daily with food"
          />
          <div className={styles.formSection}>
            <h4 className={styles.formSectionTitle}>Supply Tracking</h4>
            <div className={styles.formRow}>
              <Input
                label="Pills on Hand"
                type="number"
                value={medPillsOnHand}
                onChange={(e) => setMedPillsOnHand(e.target.value)}
                placeholder="e.g., 30"
                min="0"
              />
              <Input
                label="Pills per Day"
                type="number"
                value={medPillsPerDay}
                onChange={(e) => setMedPillsPerDay(e.target.value)}
                placeholder="e.g., 1"
                min="0"
                step="0.5"
              />
            </div>
            <Input
              label="Low Supply Alert (pills)"
              type="number"
              value={medLowThreshold}
              onChange={(e) => setMedLowThreshold(e.target.value)}
              placeholder="e.g., 7 (alert when pills drop to this level)"
              min="0"
            />
            {/* Show calculated dates preview */}
            {medPillsOnHand && medPillsPerDay && parseFloat(medPillsPerDay) > 0 && (
              <div className={styles.calculationPreview}>
                <div className={styles.calculationItem}>
                  <span className={styles.calculationLabel}>Days of supply:</span>
                  <span className={styles.calculationValue}>
                    {Math.floor(parseInt(medPillsOnHand) / parseFloat(medPillsPerDay))} days
                  </span>
                </div>
                <div className={styles.calculationItem}>
                  <span className={styles.calculationLabel}>Runs out:</span>
                  <span className={styles.calculationValue}>
                    {format(addDays(new Date(), Math.floor(parseInt(medPillsOnHand) / parseFloat(medPillsPerDay))), 'MMM d, yyyy')}
                  </span>
                </div>
                {medLowThreshold && (
                  <div className={styles.calculationItem}>
                    <span className={styles.calculationLabel}>Refill by:</span>
                    <span className={styles.calculationValue}>
                      {format(addDays(new Date(), Math.floor((parseInt(medPillsOnHand) - parseInt(medLowThreshold)) / parseFloat(medPillsPerDay))), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className={styles.formSection}>
            <h4 className={styles.formSectionTitle}>Refill Instructions</h4>
            <div className={styles.formField}>
              <label className={styles.label}>How to Get a Refill</label>
              <textarea
                className={styles.textarea}
                value={medRefillInstructions}
                onChange={(e) => setMedRefillInstructions(e.target.value)}
                placeholder="e.g., Call pharmacy at (555) 123-4567, or use CVS app to request refill"
                rows={2}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>When No Refills Remain</label>
              <textarea
                className={styles.textarea}
                value={medRenewalInstructions}
                onChange={(e) => setMedRenewalInstructions(e.target.value)}
                placeholder="e.g., Schedule appointment with Dr. Smith, or call office at (555) 987-6543 for new prescription"
                rows={2}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>Prescriber (optional)</label>
              <select
                value={medPrescriberId}
                onChange={(e) => setMedPrescriberId(e.target.value)}
                className={styles.select}
              >
                <option value="">Select a prescriber...</option>
                {providers?.filter(p => p.provider_type === 'doctor').map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}{provider.specialty_or_role ? ` (${provider.specialty_or_role})` : ''}
                  </option>
                ))}
              </select>
              <span className={styles.fieldHint}>
                Link to the doctor who prescribes this medication for renewal requests
              </span>
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>Pharmacy (optional)</label>
              <select
                value={medPharmacyId}
                onChange={(e) => setMedPharmacyId(e.target.value)}
                className={styles.select}
              >
                <option value="">Select a pharmacy...</option>
                {pharmacies?.map(pharmacy => (
                  <option key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name}{pharmacy.address ? ` - ${pharmacy.address}` : ''}
                  </option>
                ))}
              </select>
              <span className={styles.fieldHint}>
                Link to the pharmacy where you get this medication refilled
              </span>
            </div>
          </div>
          <div className={styles.formActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddMedication(false)
                resetMedicationForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMedication.isPending}>
              Add Medication
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Provider Modal */}
      <Modal
        isOpen={showAddProvider}
        onClose={() => {
          setShowAddProvider(false)
          resetProviderForm()
        }}
        title="Add Provider"
      >
        <form onSubmit={handleAddProvider} className={styles.form}>
          <Input
            label="Provider Name"
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            placeholder="e.g., Dr. Smith"
            required
          />
          <div className={styles.formField}>
            <label className={styles.label}>Provider Type</label>
            <select
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as ProviderType)}
              className={styles.select}
            >
              <option value="doctor">Doctor</option>
              <option value="therapist">Therapist</option>
              <option value="group">Support Group</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Input
            label="Specialty/Role (optional)"
            value={providerSpecialty}
            onChange={(e) => setProviderSpecialty(e.target.value)}
            placeholder="e.g., Cardiologist"
          />
          <div className={styles.formSection}>
            <h4 className={styles.formSectionTitle}>Contact Information</h4>
            <Input
              label="Phone (optional)"
              type="tel"
              value={providerPhone}
              onChange={(e) => setProviderPhone(e.target.value)}
              placeholder="e.g., (555) 123-4567"
            />
            <Input
              label="Online Portal URL (optional)"
              type="url"
              value={providerPortalUrl}
              onChange={(e) => setProviderPortalUrl(e.target.value)}
              placeholder="e.g., https://myhealth.provider.com"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.label}>Notes (optional)</label>
            <textarea
              className={styles.textarea}
              value={providerNotes}
              onChange={(e) => setProviderNotes(e.target.value)}
              placeholder="e.g., Office hours, scheduling preferences, important reminders..."
              rows={3}
            />
          </div>
          <div className={styles.formActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddProvider(false)
                resetProviderForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createProvider.isPending}>
              Add Provider
            </Button>
          </div>
        </form>
      </Modal>

      {/* Medication Detail Modal */}
      <Modal
        isOpen={!!selectedMedication}
        onClose={closeMedicationDetail}
        title={isEditingMedication ? 'Edit Medication' : selectedMedication?.name || 'Medication'}
      >
        {selectedMedication && !isEditingMedication ? (
          <div className={styles.medicationDetail}>
            {/* View Mode */}
            <div className={styles.detailSection}>
              <h4 className={styles.detailLabel}>Instructions</h4>
              <p className={styles.detailValue}>
                {selectedMedication.instructions_md || 'No instructions specified'}
              </p>
            </div>

            {(selectedMedication.pills_on_hand !== null || selectedMedication.pills_per_day !== null) && (
              <div className={styles.detailSection}>
                <h4 className={styles.detailLabel}>Supply Information</h4>
                <div className={styles.detailGrid}>
                  {selectedMedication.pills_on_hand !== null && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailItemLabel}>Pills on hand</span>
                      <span className={styles.detailItemValue}>{selectedMedication.pills_on_hand}</span>
                    </div>
                  )}
                  {selectedMedication.pills_per_day !== null && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailItemLabel}>Pills per day</span>
                      <span className={styles.detailItemValue}>{selectedMedication.pills_per_day}</span>
                    </div>
                  )}
                  {selectedMedication.low_supply_threshold !== null && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailItemLabel}>Low supply alert</span>
                      <span className={styles.detailItemValue}>{selectedMedication.low_supply_threshold} pills</span>
                    </div>
                  )}
                </div>
                {/* Supply status */}
                {(() => {
                  const supplyInfo = calculateSupplyInfo(selectedMedication)
                  if (supplyInfo.daysRemaining === null) return null
                  return (
                    <div className={styles.supplyStatusCard}>
                      <div className={cn(
                        styles.supplyStatusBadge,
                        supplyInfo.status === 'critical' && styles.critical,
                        supplyInfo.status === 'low' && styles.low
                      )}>
                        {supplyInfo.daysRemaining} days remaining
                      </div>
                      {supplyInfo.runOutDate && (
                        <span className={styles.detailMeta}>
                          Runs out {format(supplyInfo.runOutDate, 'MMMM d, yyyy')}
                        </span>
                      )}
                      {supplyInfo.refillByDate && (
                        <span className={styles.detailMeta}>
                          Refill by {format(supplyInfo.refillByDate, 'MMMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {(selectedMedication.refill_instructions || selectedMedication.renewal_instructions) && (
              <div className={styles.detailSection}>
                <h4 className={styles.detailLabel}>Refill Instructions</h4>
                {selectedMedication.refill_instructions && (
                  <div className={styles.instructionBlock}>
                    <span className={styles.instructionTitle}>How to get a refill:</span>
                    <p className={styles.instructionText}>{selectedMedication.refill_instructions}</p>
                  </div>
                )}
                {selectedMedication.renewal_instructions && (
                  <div className={styles.instructionBlock}>
                    <span className={styles.instructionTitle}>When no refills remain:</span>
                    <p className={styles.instructionText}>{selectedMedication.renewal_instructions}</p>
                  </div>
                )}
              </div>
            )}

            {selectedMedication.prescriber && (
              <div className={styles.detailSection}>
                <h4 className={styles.detailLabel}>Prescriber</h4>
                <div className={styles.prescriberCard}>
                  <span className={styles.prescriberName}>{selectedMedication.prescriber.name}</span>
                  {selectedMedication.prescriber.specialty_or_role && (
                    <span className={styles.prescriberRole}>{selectedMedication.prescriber.specialty_or_role}</span>
                  )}
                  {selectedMedication.prescriber.phone && (
                    <a href={`tel:${selectedMedication.prescriber.phone}`} className={styles.prescriberPhone}>
                      {selectedMedication.prescriber.phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Refill History */}
            <div className={styles.detailSection}>
              <h4 className={styles.detailLabel}>Refill History</h4>
              <RefillHistory medicationId={selectedMedication.id} limit={5} />
            </div>

            <div className={styles.formActions}>
              <Button variant="ghost" onClick={closeMedicationDetail}>
                Close
              </Button>
              <Button onClick={startEditingMedication}>
                Edit
              </Button>
            </div>
          </div>
        ) : selectedMedication && isEditingMedication ? (
          <form onSubmit={handleUpdateMedication} className={styles.form}>
            {/* Edit Mode - reuse the same form fields as Add */}
            <Input
              label="Medication Name"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              placeholder="e.g., Lisinopril 10mg"
              required
            />
            <Input
              label="Instructions (optional)"
              value={medInstructions}
              onChange={(e) => setMedInstructions(e.target.value)}
              placeholder="e.g., Take once daily with food"
            />
            <div className={styles.formSection}>
              <h4 className={styles.formSectionTitle}>Supply Tracking</h4>
              <div className={styles.formRow}>
                <Input
                  label="Pills on Hand"
                  type="number"
                  value={medPillsOnHand}
                  onChange={(e) => setMedPillsOnHand(e.target.value)}
                  placeholder="e.g., 30"
                  min="0"
                />
                <Input
                  label="Pills per Day"
                  type="number"
                  value={medPillsPerDay}
                  onChange={(e) => setMedPillsPerDay(e.target.value)}
                  placeholder="e.g., 1"
                  min="0"
                  step="0.5"
                />
              </div>
              <Input
                label="Low Supply Alert (pills)"
                type="number"
                value={medLowThreshold}
                onChange={(e) => setMedLowThreshold(e.target.value)}
                placeholder="e.g., 7"
                min="0"
              />
            </div>
            <div className={styles.formSection}>
              <h4 className={styles.formSectionTitle}>Refill Instructions</h4>
              <div className={styles.formField}>
                <label className={styles.label}>How to Get a Refill</label>
                <textarea
                  className={styles.textarea}
                  value={medRefillInstructions}
                  onChange={(e) => setMedRefillInstructions(e.target.value)}
                  placeholder="e.g., Call pharmacy at (555) 123-4567"
                  rows={2}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>When No Refills Remain</label>
                <textarea
                  className={styles.textarea}
                  value={medRenewalInstructions}
                  onChange={(e) => setMedRenewalInstructions(e.target.value)}
                  placeholder="e.g., Schedule appointment with Dr. Smith"
                  rows={2}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Prescriber (optional)</label>
                <select
                  value={medPrescriberId}
                  onChange={(e) => setMedPrescriberId(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Select a prescriber...</option>
                  {providers?.filter(p => p.provider_type === 'doctor').map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}{provider.specialty_or_role ? ` (${provider.specialty_or_role})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formActions}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditingMedication(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={updateMedication.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}
