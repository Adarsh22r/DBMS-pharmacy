/**
 * Builds a WhatsApp deep-link pre-filled with a discharge summary.
 *
 * @param {Object} patient   - { full_name, patient_id, patient_type, phone }
 * @param {Object} admission - { bed_number, ward_name, admission_date, discharge_date, diagnosis }
 * @param {Object} doctor    - { full_name, specialization }
 * @param {Object} bill      - { items: [{description, quantity, unit_price, subtotal}],
 *                               total_amount, discount, final_amount, payment_mode }
 * @returns {string} Full WhatsApp URL
 */
export function generateWhatsAppLink({ patient, admission, doctor, bill }) {
  const fmt = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  const itemLines = bill.items
    .map(i => `${i.description} (x${i.quantity}):`.padEnd(28) + `Rs.${parseFloat(i.subtotal).toFixed(2)}`)
    .join('\n');

  const message = [
    `*MediCare Pro -- Discharge Summary*`,
    `--------------------------`,
    `*Patient:* ${patient.full_name} (ID: ${patient.patient_id})`,
    `*Type:* ${patient.patient_type}${admission?.bed_number ? ` | *Bed:* ${admission.bed_number}` : ''}`,
    admission?.admission_date
      ? `*Admitted:* ${fmt(admission.admission_date)} | *Discharged:* ${fmt(admission.discharge_date)}`
      : '',
    `*Attending Doctor:* Dr. ${doctor.full_name}${doctor.specialization ? ` (${doctor.specialization})` : ''}`,
    admission?.diagnosis ? `*Diagnosis:* ${admission.diagnosis}` : '',
    ``,
    `*Bill Summary*`,
    `--------------------------`,
    itemLines,
    `--------------------------`,
    `Total:`.padEnd(28) + `Rs.${parseFloat(bill.total_amount).toFixed(2)}`,
    parseFloat(bill.discount) > 0
      ? `Discount:`.padEnd(28) + `-Rs.${parseFloat(bill.discount).toFixed(2)}`
      : '',
    `*Final Paid:*`.padEnd(28) + `Rs.${parseFloat(bill.final_amount).toFixed(2)} (${bill.payment_mode})`,
    ``,
    `Thank you for choosing MediCare Pro.`,
    `Get well soon! \uD83C\uDF3F`,
  ]
    .filter(line => line !== '')       // remove empty conditional lines
    .join('\n');

  // WhatsApp requires phone in international format without + or spaces
  // Indian numbers: strip leading 0, prepend 91
  const phone = patient.phone
    .replace(/\D/g, '')                  // remove non-digits
    .replace(/^0/, '')                   // strip leading zero
    .replace(/^(?!91)/, '91');           // prepend country code if missing

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
