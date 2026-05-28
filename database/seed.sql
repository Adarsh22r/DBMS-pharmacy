USE medicare_pro;

-- Clear existing data (in correct dependency order)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE bill_items;
TRUNCATE TABLE bills;
TRUNCATE TABLE dispatch;
TRUNCATE TABLE stock_log;
TRUNCATE TABLE stock;
TRUNCATE TABLE prescription_items;
TRUNCATE TABLE prescriptions;
TRUNCATE TABLE opd_visits;
TRUNCATE TABLE ipd_admissions;
TRUNCATE TABLE beds;
TRUNCATE TABLE wards;
TRUNCATE TABLE doctors;
TRUNCATE TABLE patients;
TRUNCATE TABLE staff;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Insert Staff (Password: password123, hashed using bcrypt)
INSERT INTO staff (staff_id, full_name, role, phone, email, username, password) VALUES
(1, 'System Administrator', 'Admin', '9876543210', 'admin@medicare.com', 'admin', '$2a$10$pmsQcrgoMVXAgcd5ft.wB.G9RdD7QqgJbJbdgbjlid48CpCvdKMba'),
(2, 'Rahul Sharma', 'Pharmacist', '9876543211', 'rahul@medicare.com', 'rahul', '$2a$10$pmsQcrgoMVXAgcd5ft.wB.G9RdD7QqgJbJbdgbjlid48CpCvdKMba'),
(3, 'Sneha Patel', 'Nurse', '9876543212', 'sneha@medicare.com', 'sneha', '$2a$10$pmsQcrgoMVXAgcd5ft.wB.G9RdD7QqgJbJbdgbjlid48CpCvdKMba'),
(4, 'Dr. Amit Patel', 'Doctor', '9876543213', 'amit@medicare.com', 'amit', '$2a$10$pmsQcrgoMVXAgcd5ft.wB.G9RdD7QqgJbJbdgbjlid48CpCvdKMba');


-- 2. Insert Doctors
INSERT INTO doctors (doctor_id, full_name, specialization, phone, email) VALUES
(1, 'Dr. Amit Patel', 'General Medicine', '9876543213', 'amit@medicare.com'),
(2, 'Dr. Rajesh Kumar', 'Cardiology', '9876543214', 'rajesh@medicare.com'),
(3, 'Dr. Ananya Sharma', 'Pediatrics', '9876543215', 'ananya@medicare.com');

-- 3. Insert Wards
INSERT INTO wards (ward_id, ward_name, capacity) VALUES
(1, 'ICU', 5),
(2, 'General Ward A', 10),
(3, 'Pediatric Ward', 5);

-- 4. Insert Beds
INSERT INTO beds (bed_id, ward_id, bed_number, status) VALUES
-- ICU Beds
(1, 1, 'ICU-101', 'Available'),
(2, 1, 'ICU-102', 'Available'),
(3, 1, 'ICU-103', 'Available'),
(4, 1, 'ICU-104', 'Available'),
(5, 1, 'ICU-105', 'Available'),
-- General Ward Beds
(6, 2, 'GEN-201', 'Available'),
(7, 2, 'GEN-202', 'Available'),
(8, 2, 'GEN-203', 'Available'),
(9, 2, 'GEN-204', 'Available'),
(10, 2, 'GEN-205', 'Available'),
-- Pediatric Beds
(11, 3, 'PED-301', 'Available'),
(12, 3, 'PED-302', 'Available'),
(13, 3, 'PED-303', 'Available');

-- 5. Insert Medicines
INSERT INTO medicines (medicine_id, medicine_name, category, manufacturer, unit_price, unit) VALUES
(1, 'Paracetamol 650mg', 'Analgesic', 'Cipla Ltd', 5.00, 'Tablet'),
(2, 'Amoxicillin 500mg', 'Antibiotic', 'Abbott India', 12.50, 'Tablet'),
(3, 'Ibuprofen 400mg', 'Analgesic', 'GSK', 6.00, 'Tablet'),
(4, 'Atorvastatin 10mg', 'Cardiovascular', 'Sun Pharma', 15.00, 'Tablet'),
(5, 'Metformin 500mg', 'Antidiabetic', 'Lupin', 4.50, 'Tablet'),
(6, 'Azithromycin 500mg', 'Antibiotic', 'Alembic', 22.00, 'Tablet'),
(7, 'Cough Syrup (Ascoril)', 'Antitussive', 'Glenmark', 85.00, 'Bottle'),
(8, 'Insulin Glargine', 'Antidiabetic', 'Biocon', 450.00, 'Vial');

-- 6. Insert Stock (link with medicine)
INSERT INTO stock (stock_id, medicine_id, batch_number, quantity, expiry_date, reorder_level) VALUES
(1, 1, 'B-PAR998', 500, '2028-12-31', 50),
(2, 2, 'B-AMX112', 300, '2027-06-30', 50),
(3, 3, 'B-IBU400', 40, '2027-10-15', 50),  -- Low Stock
(4, 4, 'B-ATO010', 150, '2028-04-20', 30),
(5, 5, 'B-MET500', 250, '2028-09-05', 40),
(6, 6, 'B-AZI500', 15, '2027-02-28', 25),  -- Low Stock
(7, 7, 'B-ASC085', 8, '2027-08-10', 10),   -- Low Stock
(8, 8, 'B-INS450', 0, '2027-11-30', 5);    -- Out of Stock

-- 7. Insert Patients (6-digit ID)
INSERT INTO patients (patient_id, full_name, dob, gender, phone, email, blood_group, address, patient_type) VALUES
('100001', 'Ravi Kumar', '1988-05-14', 'M', '9898989801', 'ravi@gmail.com', 'A+', '123, Park Lane, Mumbai', 'IPD'),
('100002', 'Sunita Sharma', '1995-10-22', 'F', '9898989802', 'sunita@gmail.com', 'O+', '456, Lake View, Pune', 'OPD'),
('100003', 'Aarav Mehta', '2012-03-08', 'M', '9898989803', 'aarav@gmail.com', 'B+', '789, Residency Road, Bangalore', 'IPD');

-- 8. Insert IPD Admissions
-- Aarav Mehta (100003) admitted to Pediatric Ward (PED-301)
INSERT INTO ipd_admissions (admission_id, patient_id, bed_id, admission_date, attending_doctor, status, diagnosis) VALUES
(1, '100003', 11, DATE_SUB(NOW(), INTERVAL 3 DAY), 3, 'Admitted', 'Acute Bronchitis');

-- Note: We will admit Ravi Kumar (100001) during the demo flow or create an active admission
INSERT INTO ipd_admissions (admission_id, patient_id, bed_id, admission_date, attending_doctor, status, diagnosis) VALUES
(2, '100001', 6, DATE_SUB(NOW(), INTERVAL 5 DAY), 2, 'Admitted', 'Mild Cardiac Arrhythmia');

-- Update bed statuses to Occupied for those admitted (normally trigger handles this, but since we insert directly: )
UPDATE beds SET status = 'Occupied' WHERE bed_id IN (6, 11);

-- 9. Insert OPD Visits
INSERT INTO opd_visits (visit_id, patient_id, visit_date, doctor_id, symptoms, notes) VALUES
(1, '100002', DATE_SUB(NOW(), INTERVAL 1 DAY), 1, 'Fever, cough, body ache', 'Suspected viral fever. Prescribed paracetamol and rest.');

-- 10. Insert Prescriptions
INSERT INTO prescriptions (prescription_id, patient_id, doctor_id, prescribed_on, notes) VALUES
(1, '100001', 2, DATE_SUB(NOW(), INTERVAL 5 DAY), 'Cardiac support meds'),
(2, '100002', 1, DATE_SUB(NOW(), INTERVAL 1 DAY), 'General viral relief'),
(3, '100003', 3, DATE_SUB(NOW(), INTERVAL 3 DAY), 'Pediatric respiratory dosage');

-- 11. Insert Prescription Items
-- Patient 100001
INSERT INTO prescription_items (prescription_id, medicine_id, dosage, quantity, frequency, duration_days) VALUES
(1, 4, '10mg', 10, 'OD', 10), -- Atorvastatin
(1, 1, '650mg', 15, 'TDS', 5);  -- Paracetamol

-- Patient 100002
INSERT INTO prescription_items (prescription_id, medicine_id, dosage, quantity, frequency, duration_days) VALUES
(2, 1, '650mg', 10, 'TDS', 3), -- Paracetamol
(2, 6, '500mg', 3, 'OD', 3);   -- Azithromycin

-- Patient 100003
INSERT INTO prescription_items (prescription_id, medicine_id, dosage, quantity, frequency, duration_days) VALUES
(3, 7, '5ml', 1, 'BD', 5),     -- Cough Syrup
(3, 2, '250mg', 10, 'BD', 5);  -- Amoxicillin

-- 12. Add some past Dispatches to have data in the monthly report
-- Past month dispatches (for reports)
INSERT INTO dispatch (patient_id, medicine_id, quantity, dispatched_by, dispatch_date) VALUES
('100001', 4, 10, 2, DATE_SUB(NOW(), INTERVAL 4 DAY)),
('100001', 1, 15, 2, DATE_SUB(NOW(), INTERVAL 4 DAY)),
('100003', 2, 5, 2, DATE_SUB(NOW(), INTERVAL 2 DAY)),
-- Let's add some today dispatches for billing test
('100002', 1, 10, 2, NOW()),
('100002', 6, 3, 2, NOW());

-- Log initial stock OUT due to dispatches (normally triggers handle this, but since we insert directly: )
UPDATE stock SET quantity = quantity - 10 WHERE medicine_id = 4;
UPDATE stock SET quantity = quantity - 25 WHERE medicine_id = 1;
UPDATE stock SET quantity = quantity - 5 WHERE medicine_id = 2;
UPDATE stock SET quantity = quantity - 3 WHERE medicine_id = 6;
