import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateBillPDF = (bill) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [13, 148, 136]; // Teal #0D9488
  const secondaryColor = [30, 41, 59]; // Slate #1E293B
  const lightGrey = [241, 245, 249]; // #F1F5F9

  // Add decorative top header block
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 15, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('MEDICARE PRO', 14, 10);

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.text('E-PHARMACY & HOSPITAL BILLING SYSTEM', 120, 10);

  // Reset text color to slate
  doc.setTextColor(...secondaryColor);

  // Hospital Details
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'bold');
  doc.text('MediCare Pro Healthcare Services', 14, 25);
  doc.setFont('Helvetica', 'normal');
  doc.text('123, Health Avenue, Tech Park', 14, 30);
  doc.text('Mumbai, MH - 400001', 14, 35);
  doc.text('Phone: +91 98765 43210 | info@medicare.com', 14, 40);

  // Invoice Heading
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text('INVOICE / RECEIPT', 140, 28);

  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.setFont('Helvetica', 'bold');
  doc.text(`Invoice No: #${bill.bill_id}`, 140, 34);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Date: ${new Date(bill.bill_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, 140, 39);

  // Horizontal divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 45, 196, 45);

  // Patient Info block
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Billed To (Patient):', 14, 52);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${bill.patient_name}`, 14, 58);
  doc.text(`Patient ID: ${bill.patient_id}`, 14, 63);
  doc.text(`Patient Type: ${bill.patient_type}`, 14, 68);
  
  if (bill.patient_type === 'IPD' && bill.bed_number) {
    doc.text(`Ward: ${bill.ward_name} (Bed ${bill.bed_number})`, 14, 73);
  }

  // Contact Info block
  doc.setFont('Helvetica', 'bold');
  doc.text('Contact Details:', 110, 52);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Phone: ${bill.phone}`, 110, 58);
  doc.text(`Email: ${bill.email || 'N/A'}`, 110, 63);
  doc.text(`Address: ${bill.address || 'N/A'}`, 110, 68);

  // Table items
  const tableColumn = ["#", "Item Description", "Qty", "Unit Price", "Subtotal"];
  const tableRows = [];

  bill.items.forEach((item, index) => {
    const itemData = [
      index + 1,
      item.description,
      item.quantity,
      `INR ${parseFloat(item.unit_price).toFixed(2)}`,
      `INR ${parseFloat(item.subtotal).toFixed(2)}`
    ];
    tableRows.push(itemData);
  });

  // Render Table
  doc.autoTable({
    startY: 80,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: lightGrey
    },
    columnStyles: {
      0: { width: 10 },
      1: { width: 85 },
      2: { width: 20, halign: 'center' },
      3: { width: 35, halign: 'right' },
      4: { width: 35, halign: 'right' }
    },
    styles: {
      font: 'Helvetica',
      fontSize: 9
    }
  });

  // Calculate position after table
  const finalY = doc.previousAutoTable.finalY + 10;

  // Summary Totals on the right
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text('Subtotal:', 130, finalY);
  doc.text(`INR ${parseFloat(bill.total_amount).toFixed(2)}`, 175, finalY, { align: 'right' });

  doc.text('Discount:', 130, finalY + 6);
  doc.text(`INR ${parseFloat(bill.discount || 0).toFixed(2)}`, 175, finalY + 6, { align: 'right' });

  doc.line(130, finalY + 9, 196, finalY + 9);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('Grand Total:', 130, finalY + 15);
  doc.text(`INR ${parseFloat(bill.final_amount).toFixed(2)}`, 175, finalY + 15, { align: 'right' });

  // Payment Status Details on the left
  doc.setTextColor(...secondaryColor);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Info:', 14, finalY);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Payment Mode: ${bill.payment_mode}`, 14, finalY + 6);
  doc.text(`Status: ${bill.payment_status.toUpperCase()}`, 14, finalY + 11);

  // Draw Paid Stamp
  if (bill.payment_status === 'Paid') {
    doc.setDrawColor(22, 163, 74); // green
    doc.setLineWidth(0.8);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(14, finalY + 16, 35, 12, 1, 1, 'FD');
    doc.setTextColor(22, 163, 74);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PAID STAMP', 18, finalY + 24);
  }

  // Draw Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 275, 196, 275);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for choosing MediCare Pro. This is a computer-generated medical invoice.', 14, 280);
  doc.text('MediCare Pro DBMS System © 2026', 140, 280);

  // Open PDF in a new window/tab
  const string = doc.output('bloburl');
  window.open(string, '_blank');
};
