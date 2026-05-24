# E-Pharmacy & E-Medical DBMS System — DataVista 2026 Project Plan

---

## 1. PROJECT OVERVIEW

**Project Title:** MediCare Pro — E-Pharmacy & Hospital Management System  
**Domain:** Healthcare / Hospital Information System  
**Scope:** Manages IPD & OPD patients, medicine dispatch, stock, prescriptions (via 6-digit Patient ID), PDF billing, and a sales report dashboard.

---

## 2. RECOMMENDED TECH STACK

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React.js + Tailwind CSS | Component-based, fast, modern UI |
| **Charts** | Recharts | Seamless React integration for dashboards |
| **PDF Generation** | jsPDF + html2canvas | In-browser PDF bill generation |
| **Backend** | Node.js + Express.js | Lightweight, fast REST API |
| **Database** | MySQL | Full support for Triggers, Stored Procedures, Cursors, Transactions |
| **ORM / Query** | mysql2 (raw queries) | Direct SQL control for DBMS features |
| **Auth** | JWT (JSON Web Tokens) | Secure staff login |

> **Why MySQL over PostgreSQL?** MySQL's stored procedure and cursor syntax is more straightforward for academic demonstration. PL/pgSQL requires extra setup. MySQL also natively supports all 4 required DBMS features (Triggers, Stored Procedures, Cursors, Transactions).

---

## 3. DATABASE DESIGN

### 3.1 Entities & Tables

#### `patients`
```sql
CREATE TABLE patients (
    patient_id    CHAR(6)      PRIMARY KEY,   -- 6-digit unique e.g. 100001
    full_name     VARCHAR(100) NOT NULL,
    dob           DATE         NOT NULL,
    gender        ENUM('M','F','Other'),
    phone         VARCHAR(15)  UNIQUE NOT NULL,
    email         VARCHAR(100),
    blood_group   VARCHAR(5),
    address       TEXT,
    patient_type  ENUM('IPD','OPD') NOT NULL,
    registered_on DATETIME     DEFAULT CURRENT_TIMESTAMP
);
```

#### `wards`
```sql
CREATE TABLE wards (
    ward_id    INT AUTO_INCREMENT PRIMARY KEY,
    ward_name  VARCHAR(50) NOT NULL,    -- e.g. General, ICU, Pediatric
    capacity   INT NOT NULL
);
```

#### `beds`
```sql
CREATE TABLE beds (
    bed_id    INT AUTO_INCREMENT PRIMARY KEY,
    ward_id   INT NOT NULL,
    bed_number VARCHAR(10) NOT NULL,    -- e.g. A-101
    status    ENUM('Available','Occupied','Maintenance') DEFAULT 'Available',
    FOREIGN KEY (ward_id) REFERENCES wards(ward_id)
);
```

#### `ipd_admissions`
```sql
CREATE TABLE ipd_admissions (
    admission_id     INT AUTO_INCREMENT PRIMARY KEY,
    patient_id       CHAR(6) NOT NULL,
    bed_id           INT NOT NULL,
    admission_date   DATETIME DEFAULT CURRENT_TIMESTAMP,
    discharge_date   DATETIME,
    diagnosis        TEXT,
    attending_doctor INT NOT NULL,
    status           ENUM('Admitted','Discharged') DEFAULT 'Admitted',
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (bed_id)     REFERENCES beds(bed_id),
    FOREIGN KEY (attending_doctor) REFERENCES doctors(doctor_id)
);
```

#### `opd_visits`
```sql
CREATE TABLE opd_visits (
    visit_id      INT AUTO_INCREMENT PRIMARY KEY,
    patient_id    CHAR(6) NOT NULL,
    visit_date    DATETIME DEFAULT CURRENT_TIMESTAMP,
    doctor_id     INT NOT NULL,
    symptoms      TEXT,
    notes         TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (doctor_id)  REFERENCES doctors(doctor_id)
);
```

#### `doctors`
```sql
CREATE TABLE doctors (
    doctor_id      INT AUTO_INCREMENT PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    phone          VARCHAR(15),
    email          VARCHAR(100)
);
```

#### `medicines`
```sql
CREATE TABLE medicines (
    medicine_id   INT AUTO_INCREMENT PRIMARY KEY,
    medicine_name VARCHAR(150) NOT NULL,
    category      VARCHAR(50),           -- e.g. Antibiotic, Analgesic
    manufacturer  VARCHAR(100),
    unit_price    DECIMAL(10,2) NOT NULL,
    unit          VARCHAR(20)            -- e.g. Tablet, Syrup, Injection
);
```

#### `stock`
```sql
CREATE TABLE stock (
    stock_id       INT AUTO_INCREMENT PRIMARY KEY,
    medicine_id    INT NOT NULL,
    batch_number   VARCHAR(50) NOT NULL,
    quantity       INT NOT NULL DEFAULT 0,
    expiry_date    DATE NOT NULL,
    reorder_level  INT NOT NULL DEFAULT 50,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
);
```

#### `stock_log` *(for audit trail)*
```sql
CREATE TABLE stock_log (
    log_id       INT AUTO_INCREMENT PRIMARY KEY,
    medicine_id  INT NOT NULL,
    change_type  ENUM('IN','OUT') NOT NULL,
    quantity     INT NOT NULL,
    reason       VARCHAR(100),
    log_time     DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `prescriptions`
```sql
CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id      CHAR(6)  NOT NULL,
    doctor_id       INT      NOT NULL,
    prescribed_on   DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (doctor_id)  REFERENCES doctors(doctor_id)
);
```

#### `prescription_items`
```sql
CREATE TABLE prescription_items (
    item_id         INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id INT NOT NULL,
    medicine_id     INT NOT NULL,
    dosage          VARCHAR(100),       -- e.g. 500mg twice daily
    quantity        INT NOT NULL,
    frequency       VARCHAR(50),        -- e.g. BD, TDS, OD
    duration_days   INT,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id),
    FOREIGN KEY (medicine_id)     REFERENCES medicines(medicine_id)
);
```

#### `dispatch` *(IPD medicine delivery)*
```sql
CREATE TABLE dispatch (
    dispatch_id   INT AUTO_INCREMENT PRIMARY KEY,
    patient_id    CHAR(6)  NOT NULL,
    medicine_id   INT      NOT NULL,
    quantity      INT      NOT NULL,
    dispatched_by INT      NOT NULL,    -- staff_id
    dispatch_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id)   REFERENCES patients(patient_id),
    FOREIGN KEY (medicine_id)  REFERENCES medicines(medicine_id),
    FOREIGN KEY (dispatched_by) REFERENCES staff(staff_id)
);
```

#### `bills`
```sql
CREATE TABLE bills (
    bill_id        INT AUTO_INCREMENT PRIMARY KEY,
    patient_id     CHAR(6)       NOT NULL,
    bill_date      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    total_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount       DECIMAL(10,2) DEFAULT 0,
    final_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_mode   ENUM('Cash','Card','UPI','Insurance'),
    payment_status ENUM('Pending','Paid','Partial') DEFAULT 'Pending',
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);
```

#### `bill_items`
```sql
CREATE TABLE bill_items (
    bill_item_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id      INT           NOT NULL,
    description  VARCHAR(200)  NOT NULL,
    quantity     INT           DEFAULT 1,
    unit_price   DECIMAL(10,2) NOT NULL,
    subtotal     DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id)
);
```

#### `staff`
```sql
CREATE TABLE staff (
    staff_id   INT AUTO_INCREMENT PRIMARY KEY,
    full_name  VARCHAR(100) NOT NULL,
    role       ENUM('Pharmacist','Nurse','Admin','Doctor') NOT NULL,
    phone      VARCHAR(15),
    email      VARCHAR(100),
    username   VARCHAR(50) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL    -- bcrypt hashed
);
```

---

### 3.2 Normalization (up to 3NF)

- **1NF**: All attributes are atomic (no repeating groups). Prescription items are in a separate table from prescriptions.
- **2NF**: No partial dependencies. `prescription_items` depends on the full composite key (prescription_id + medicine_id).
- **3NF**: No transitive dependencies. Medicine pricing lives only in `medicines`; patient type (IPD/OPD) is not duplicated across admission tables.

---

### 3.3 ER Diagram Summary

```
patients ──< ipd_admissions >── beds >── wards
patients ──< opd_visits >── doctors
patients ──< prescriptions >── doctors
prescriptions ──< prescription_items >── medicines
medicines ──< stock
medicines ──< dispatch >── patients
dispatch >── staff
patients ──< bills
bills ──< bill_items
```

---

## 4. DBMS FEATURES IMPLEMENTATION

### 4.1 Triggers

**Trigger 1 — Auto-deduct stock when medicine dispatched:**
```sql
DELIMITER $$
CREATE TRIGGER trg_deduct_stock
AFTER INSERT ON dispatch
FOR EACH ROW
BEGIN
    UPDATE stock
    SET quantity = quantity - NEW.quantity
    WHERE medicine_id = NEW.medicine_id;

    INSERT INTO stock_log(medicine_id, change_type, quantity, reason)
    VALUES (NEW.medicine_id, 'OUT', NEW.quantity, 'Dispatch to patient');
END$$
DELIMITER ;
```

**Trigger 2 — Mark bed as Occupied on IPD admission:**
```sql
DELIMITER $$
CREATE TRIGGER trg_bed_occupied
AFTER INSERT ON ipd_admissions
FOR EACH ROW
BEGIN
    UPDATE beds SET status = 'Occupied' WHERE bed_id = NEW.bed_id;
END$$
DELIMITER ;
```

**Trigger 3 — Mark bed as Available on IPD discharge:**
```sql
DELIMITER $$
CREATE TRIGGER trg_bed_available
AFTER UPDATE ON ipd_admissions
FOR EACH ROW
BEGIN
    IF NEW.status = 'Discharged' AND OLD.status = 'Admitted' THEN
        UPDATE beds SET status = 'Available' WHERE bed_id = NEW.bed_id;
    END IF;
END$$
DELIMITER ;
```

---

### 4.2 Stored Procedures

**SP 1 — Generate Bill for a Patient:**
```sql
DELIMITER $$
CREATE PROCEDURE sp_generate_bill(
    IN  p_patient_id CHAR(6),
    IN  p_payment_mode VARCHAR(20),
    OUT p_bill_id INT
)
BEGIN
    DECLARE v_total DECIMAL(10,2) DEFAULT 0;

    -- Sum all dispatched medicine costs
    SELECT SUM(d.quantity * m.unit_price)
    INTO v_total
    FROM dispatch d
    JOIN medicines m ON d.medicine_id = m.medicine_id
    WHERE d.patient_id = p_patient_id
      AND DATE(d.dispatch_date) = CURDATE();

    INSERT INTO bills(patient_id, total_amount, final_amount, payment_mode)
    VALUES (p_patient_id, v_total, v_total, p_payment_mode);

    SET p_bill_id = LAST_INSERT_ID();
END$$
DELIMITER ;
```

**SP 2 — Get Prescription by Patient ID:**
```sql
DELIMITER $$
CREATE PROCEDURE sp_get_prescription(IN p_patient_id CHAR(6))
BEGIN
    SELECT
        pr.prescription_id,
        pr.prescribed_on,
        d.full_name AS doctor_name,
        m.medicine_name,
        pi.dosage,
        pi.quantity,
        pi.frequency,
        pi.duration_days
    FROM prescriptions pr
    JOIN doctors d              ON pr.doctor_id = d.doctor_id
    JOIN prescription_items pi  ON pr.prescription_id = pi.prescription_id
    JOIN medicines m            ON pi.medicine_id = m.medicine_id
    WHERE pr.patient_id = p_patient_id
    ORDER BY pr.prescribed_on DESC;
END$$
DELIMITER ;
```

**SP 3 — Monthly Sales Report:**
```sql
DELIMITER $$
CREATE PROCEDURE sp_sales_report(IN p_year INT, IN p_month INT)
BEGIN
    SELECT
        m.medicine_name,
        SUM(d.quantity)              AS total_units_sold,
        SUM(d.quantity * m.unit_price) AS total_revenue
    FROM dispatch d
    JOIN medicines m ON d.medicine_id = m.medicine_id
    WHERE YEAR(d.dispatch_date) = p_year
      AND MONTH(d.dispatch_date) = p_month
    GROUP BY m.medicine_id
    ORDER BY total_revenue DESC;
END$$
DELIMITER ;
```

---

### 4.3 Cursor — Low Stock Alert Processor

```sql
DELIMITER $$
CREATE PROCEDURE sp_low_stock_report()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE v_medicine_id INT;
    DECLARE v_medicine_name VARCHAR(150);
    DECLARE v_quantity INT;
    DECLARE v_reorder INT;

    DECLARE cur CURSOR FOR
        SELECT s.medicine_id, m.medicine_name, s.quantity, s.reorder_level
        FROM stock s
        JOIN medicines m ON s.medicine_id = m.medicine_id
        WHERE s.quantity <= s.reorder_level;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    DROP TEMPORARY TABLE IF EXISTS low_stock_alerts;
    CREATE TEMPORARY TABLE low_stock_alerts (
        medicine_id   INT,
        medicine_name VARCHAR(150),
        current_qty   INT,
        reorder_level INT,
        status        VARCHAR(20)
    );

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_medicine_id, v_medicine_name, v_quantity, v_reorder;
        IF done THEN LEAVE read_loop; END IF;

        INSERT INTO low_stock_alerts
        VALUES (
            v_medicine_id,
            v_medicine_name,
            v_quantity,
            v_reorder,
            IF(v_quantity = 0, 'OUT OF STOCK', 'LOW STOCK')
        );
    END LOOP;
    CLOSE cur;

    SELECT * FROM low_stock_alerts;
END$$
DELIMITER ;
```

---

### 4.4 Transactions — Dispatch + Stock Update (Atomic)

```sql
DELIMITER $$
CREATE PROCEDURE sp_dispatch_medicine(
    IN p_patient_id  CHAR(6),
    IN p_medicine_id INT,
    IN p_quantity    INT,
    IN p_staff_id    INT
)
BEGIN
    DECLARE v_available INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Dispatch transaction failed. Rolled back.';
    END;

    START TRANSACTION;

        SELECT quantity INTO v_available
        FROM stock
        WHERE medicine_id = p_medicine_id
        FOR UPDATE;                        -- Lock row during transaction

        IF v_available < p_quantity THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient stock';
        END IF;

        INSERT INTO dispatch(patient_id, medicine_id, quantity, dispatched_by)
        VALUES (p_patient_id, p_medicine_id, p_quantity, p_staff_id);

        -- Trigger handles stock deduction automatically

    COMMIT;
END$$
DELIMITER ;
```

---

## 5. API ENDPOINTS (Node.js + Express)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/patients/register` | Register new patient |
| GET | `/api/patients/:id` | Get patient by 6-digit ID |
| GET | `/api/prescription/:patient_id` | Get prescriptions by patient ID |
| GET | `/api/beds/available` | List available beds |
| POST | `/api/ipd/admit` | Admit IPD patient |
| PUT | `/api/ipd/discharge/:admission_id` | Discharge IPD patient |
| POST | `/api/dispatch` | Dispatch medicine to IPD patient |
| GET | `/api/stock` | View current stock |
| GET | `/api/stock/low` | Low stock alerts |
| POST | `/api/bills/generate` | Generate bill (calls SP) |
| GET | `/api/bills/:bill_id/pdf` | Download bill as PDF |
| GET | `/api/reports/sales` | Sales dashboard data |

---

## 6. FRONTEND DESIGN PLAN

### 6.1 Design Language

**Theme:** Clean Medical — White + Deep Teal (`#0D9488`) + Soft Blue accents  
**Typography:** Inter (Google Fonts) — professional and readable  
**Icons:** Lucide React (consistent medical icon set)  
**Cards:** Elevated white cards with subtle shadows, rounded corners (`border-radius: 12px`)  
**Color Palette:**

| Role | Color |
|------|-------|
| Primary (Teal) | `#0D9488` |
| Accent (Blue) | `#3B82F6` |
| Danger (Red) | `#EF4444` |
| Warning (Amber) | `#F59E0B` |
| Background | `#F0FDF4` (light mint) |
| Card Background | `#FFFFFF` |
| Text | `#1E293B` |

---

### 6.2 Pages & Screens

#### 🏠 1. Dashboard (Home)
- Stat cards: Total IPD Patients | Total OPD Today | Available Beds | Low Stock Alerts
- Mini bar chart: Medicine sales this week (Recharts)
- Recent activity feed: last 5 dispatches, admissions

#### 👤 2. Patient Registration
- Split form: left side patient details | right side patient type selector (IPD / OPD)
- IPD → shows Ward + Bed picker (visual grid of beds)
- Auto-generates 6-digit Patient ID on submission
- Toast notification: "Patient ID: 100042 registered successfully"

#### 🔍 3. Patient Lookup (Prescription Viewer)
- Large centered search bar: "Enter 6-digit Patient ID"
- On search → slides down to show:
  - Patient card (name, type, bed number if IPD, blood group)
  - Prescription table: Medicine | Dosage | Frequency | Duration
  - "Download Prescription PDF" button

#### 🛏️ 4. Bed Management (IPD)
- Visual ward grid: beds shown as cards
- Color coding: Green = Available | Red = Occupied | Yellow = Maintenance
- Click bed → see admitted patient info

#### 💊 5. Medicine Dispatch (IPD Only)
- Search patient → shows current prescription
- Checkboxes to confirm which medicines to dispatch
- Quantity input per medicine
- Submit → calls transaction stored procedure
- Success/error toast

#### 📦 6. Stock Management
- Table: Medicine Name | Category | Stock Qty | Reorder Level | Expiry | Status Badge
- Status badges: 🟢 Good | 🟡 Low | 🔴 Out of Stock
- "Add Stock" modal form
- Filter by category / status
- Export as CSV button

#### 🧾 7. Billing
- Search patient → auto-fills medicine costs from dispatch records
- Editable bill items table
- Discount field (%)
- Payment mode selector
- "Generate & Download PDF Bill" button → opens jsPDF-generated PDF in new tab

#### 📊 8. Sales Report Dashboard
- Date range picker (month/year)
- Cards: Total Revenue | Total Units Sold | Top Selling Medicine | IPD vs OPD Revenue split
- Bar chart: Revenue by Medicine (Recharts)
- Pie chart: Revenue by Category
- Line chart: Daily revenue trend for the month
- Export as PDF / CSV

#### 🔐 9. Staff Login
- Clean centered card
- Email + Password
- JWT-based session

---

### 6.3 UI Component Plan

```
src/
├── components/
│   ├── Sidebar.jsx           ← Navigation (icons + labels)
│   ├── Topbar.jsx            ← Search bar + staff info
│   ├── StatCard.jsx          ← Dashboard stat cards
│   ├── BedGrid.jsx           ← Visual bed map
│   ├── PatientCard.jsx       ← Patient info display
│   ├── PrescriptionTable.jsx ← Prescription viewer
│   ├── StockTable.jsx        ← Stock list with badges
│   ├── DispatchForm.jsx      ← Medicine dispatch UI
│   ├── BillBuilder.jsx       ← Bill generator
│   └── SalesDashboard.jsx    ← Charts + stats
├── pages/
│   ├── Dashboard.jsx
│   ├── RegisterPatient.jsx
│   ├── PatientLookup.jsx
│   ├── BedManagement.jsx
│   ├── Dispatch.jsx
│   ├── Stock.jsx
│   ├── Billing.jsx
│   └── SalesReport.jsx
├── utils/
│   ├── generatePDF.js        ← jsPDF bill generator
│   └── api.js                ← Axios API calls
```

---

## 7. PDF BILL FORMAT (jsPDF)

The bill PDF will contain:
```
┌─────────────────────────────────────────────┐
│  MediCare Pro                               │
│  Hospital & Pharmacy Management             │
├─────────────────────────────────────────────┤
│  Bill No: #10042        Date: 20-May-2026   │
│  Patient ID: 100001     Type: IPD           │
│  Patient Name: Ravi Kumar  Bed: A-101       │
├─────────────────────────────────────────────┤
│  DESCRIPTION    QTY   UNIT PRICE   SUBTOTAL │
│  Paracetamol     10     ₹5.00      ₹50.00  │
│  Amoxicillin     15     ₹8.00     ₹120.00  │
│  Consultation     1   ₹300.00     ₹300.00  │
├─────────────────────────────────────────────┤
│  Total: ₹470.00   Discount: ₹20.00          │
│  Final Amount: ₹450.00                      │
│  Payment Mode: UPI     Status: PAID         │
└─────────────────────────────────────────────┘
```

---

## 8. EVALUATION COVERAGE MAP

| Evaluation Criteria | How it's covered | Marks |
|----|----|----|
| Database Design (ERD, Tables, Keys) | 12 tables, all PKs, FKs, constraints, 3NF normalization | 15 |
| Triggers, Stored Procedures, Cursors, Transactions | 3 triggers, 3 SPs, 1 cursor, transaction in dispatch | 15 |
| Frontend Design | React + Tailwind, 9 pages, charts, PDF | 10 |
| Report & Documentation | This plan serves as the base | 5 |
| Demo & Presentation | Live flow: register → prescribe → dispatch → bill → report | 5 |
| **Total** | | **50** |

---

## 9. BUILD PHASES (Suggested Timeline)

| Phase | Tasks | Duration |
|-------|-------|----------|
| **Phase 1** | DB design, table creation, seed data | 2 days |
| **Phase 2** | Triggers, SPs, Cursors, Transactions | 2 days |
| **Phase 3** | Node.js API endpoints | 2 days |
| **Phase 4** | React frontend — core pages | 3 days |
| **Phase 5** | PDF bill + Sales Dashboard | 2 days |
| **Phase 6** | Testing, bug fixes, demo prep | 1 day |
| **Total** | | **~12 days** |

---

## 10. DEMO FLOW (15-20 min)

1. Register an OPD patient → auto-generate ID e.g. `100042`
2. Doctor writes prescription → linked to patient ID
3. Lookup patient by ID → prescription appears
4. Register another patient as IPD → assign ward + bed → bed turns Red on grid
5. Dispatch medicines → stock auto-deducts (trigger)
6. Generate PDF bill → download
7. Show stock page → low stock warning badge
8. Open Sales Dashboard → show charts for the month
9. Discharge IPD patient → bed turns Green

---

*DataVista 2026 — MediCare Pro | Built with React + Node.js + MySQL*
