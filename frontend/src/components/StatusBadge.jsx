import { CalendarCheck2, CalendarX2 } from 'lucide-react'

export default function StatusBadge({ status }) {
  const booked = status === 'BOOKED'
  const Icon = booked ? CalendarCheck2 : CalendarX2
  return (
    <span className={`status-badge ${booked ? 'booked' : 'cancelled'}`}>
      <Icon size={13} />
      {booked ? 'Booked' : 'Cancelled'}
    </span>
  )
}
