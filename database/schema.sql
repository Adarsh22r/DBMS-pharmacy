-- E-Pharmacy & E-Medical DBMS System - Schema Definition
CREATE DATABASE IF NOT EXISTS medicare_pro;
USE medicare_pro;

-- Disable foreign key checks to allow easy drops if needed during initialization
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS bill_items;
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS dispatch;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS prescription_items;
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS stock_log;
DROP TABLE IF EXISTS stock;
DROP TABLE IF EXISTS medicines;
DROP TABLE IF EXISTS opd_visits;
DROP TABLE IF EXISTS ipd_admissions;
DROP TABLE IF EXISTS beds;
DROP TABLE IF EXISTS wards;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS patients;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Patients Table (6-digit Patient ID)
CREATE TABLE patients (
    patient_id    CHAR(6)      PRIMARY KEY,   -- 6-digit unique e.g. 100001
    full_name     VARCHAR(100) NOT NULL,
    dob           DATE         NOT NULL,
    gender        ENUM('M','F','Other') NOT NULL,
    phone         VARCHAR(15)  UNIQUE NOT NULL,
    email         VARCHAR(100),
    blood_group   VARCHAR(5),
    address       TEXT,
    patient_type  ENUM('IPD','OPD') NOT NULL,
    registered_on DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- 2. Doctors Table
CREATE TABLE doctors (
    doctor_id      INT AUTO_INCREMENT PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    phone          VARCHAR(15),
    email          VARCHAR(100)
);

-- 3. Wards Table
CREATE TABLE wards (
    ward_id    INT AUTO_INCREMENT PRIMARY KEY,
    ward_name  VARCHAR(50) NOT NULL,    -- e.g. General, ICU, Pediatric
    capacity   INT NOT NULL
);

-- 4. Beds Table
CREATE TABLE beds (
    bed_id     INT AUTO_INCREMENT PRIMARY KEY,
    ward_id    INT NOT NULL,
    bed_number VARCHAR(10) NOT NULL,    -- e.g. A-101
    status     ENUM('Available','Occupied','Maintenance') DEFAULT 'Available',
    FOREIGN KEY (ward_id) REFERENCES wards(ward_id) ON DELETE CASCADE
);

-- 5. IPD Admissions Table
CREATE TABLE ipd_admissions (
    admission_id     INT AUTO_INCREMENT PRIMARY KEY,
    patient_id       CHAR(6) NOT NULL,
    bed_id           INT NOT NULL,
    admission_date   DATETIME DEFAULT CURRENT_TIMESTAMP,
    discharge_date   DATETIME NULL,
    diagnosis        TEXT,
    attending_doctor INT NOT NULL,
    status           ENUM('Admitted','Discharged') DEFAULT 'Admitted',
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (bed_id)     REFERENCES beds(bed_id) ON DELETE CASCADE,
    FOREIGN KEY (attending_doctor) REFERENCES doctors(doctor_id) ON DELETE CASCADE
);

-- 6. OPD Visits Table
CREATE TABLE opd_visits (
    visit_id      INT AUTO_INCREMENT PRIMARY KEY,
    patient_id    CHAR(6) NOT NULL,
    visit_date    DATETIME DEFAULT CURRENT_TIMESTAMP,
    doctor_id     INT NOT NULL,
    symptoms      TEXT,
    notes         TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id)  REFERENCES doctors(doctor_id) ON DELETE CASCADE
);

-- 7. Medicines Table
CREATE TABLE medicines (
    medicine_id   INT AUTO_INCREMENT PRIMARY KEY,
    medicine_name VARCHAR(150) NOT NULL,
    category      VARCHAR(50),           -- e.g. Antibiotic, Analgesic
    manufacturer  VARCHAR(100),
    unit_price    DECIMAL(10,2) NOT NULL,
    unit          VARCHAR(20)            -- e.g. Tablet, Syrup, Injection
);

-- 8. Stock Table
CREATE TABLE stock (
    stock_id       INT AUTO_INCREMENT PRIMARY KEY,
    medicine_id    INT NOT NULL,
    batch_number   VARCHAR(50) NOT NULL,
    quantity       INT NOT NULL DEFAULT 0,
    expiry_date    DATE NOT NULL,
    reorder_level  INT NOT NULL DEFAULT 50,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE CASCADE
);

-- 9. Stock Log Table (Audit trail)
CREATE TABLE stock_log (
    log_id         INT AUTO_INCREMENT PRIMARY KEY,
    medicine_id    INT NOT NULL,
    change_type    ENUM('IN','OUT') NOT NULL,
    quantity       INT NOT NULL,
    reason         VARCHAR(100),
    batch_stock_id INT NULL,
    log_time       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE CASCADE,
    FOREIGN KEY (batch_stock_id) REFERENCES stock(stock_id) ON DELETE SET NULL
);


-- 10. Prescriptions Table
CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id      CHAR(6)  NOT NULL,
    doctor_id       INT      NOT NULL,
    prescribed_on   DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id)  REFERENCES doctors(doctor_id) ON DELETE CASCADE
);

-- 11. Prescription Items Table
CREATE TABLE prescription_items (
    item_id         INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id INT NOT NULL,
    medicine_id     INT NOT NULL,
    dosage          VARCHAR(100),       -- e.g. 500mg twice daily
    quantity        INT NOT NULL,
    frequency       VARCHAR(50),        -- e.g. BD, TDS, OD
    duration_days   INT,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id)     REFERENCES medicines(medicine_id) ON DELETE CASCADE
);

-- 12. Staff Table
CREATE TABLE staff (
    staff_id   INT AUTO_INCREMENT PRIMARY KEY,
    full_name  VARCHAR(100) NOT NULL,
    role       ENUM('Pharmacist','Nurse','Admin','Doctor') NOT NULL,
    phone      VARCHAR(15),
    email      VARCHAR(100),
    username   VARCHAR(50) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL    -- bcrypt hashed
);

-- 13. Dispatch Table
CREATE TABLE dispatch (
    dispatch_id   INT AUTO_INCREMENT PRIMARY KEY,
    patient_id    CHAR(6)  NOT NULL,
    medicine_id   INT      NOT NULL,
    quantity      INT      NOT NULL,
    dispatched_by INT      NOT NULL,    -- staff_id
    dispatch_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id)    REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id)   REFERENCES medicines(medicine_id) ON DELETE CASCADE,
    FOREIGN KEY (dispatched_by) REFERENCES staff(staff_id) ON DELETE CASCADE
);

-- 14. Bills Table
CREATE TABLE bills (
    bill_id        INT AUTO_INCREMENT PRIMARY KEY,
    patient_id     CHAR(6)       NOT NULL,
    bill_date      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    total_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount       DECIMAL(10,2) DEFAULT 0,
    final_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_mode   ENUM('Cash','Card','UPI','Insurance') NOT NULL DEFAULT 'Cash',
    payment_status ENUM('Pending','Paid','Partial') DEFAULT 'Pending',
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- 15. Bill Items Table
CREATE TABLE bill_items (
    bill_item_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id      INT           NOT NULL,
    description  VARCHAR(200)  NOT NULL,
    quantity     INT           DEFAULT 1,
    unit_price   DECIMAL(10,2) NOT NULL,
    subtotal     DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
);
