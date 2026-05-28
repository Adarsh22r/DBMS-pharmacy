USE medicare_pro;

DROP PROCEDURE IF EXISTS sp_generate_bill;
DROP PROCEDURE IF EXISTS sp_get_prescription;
DROP PROCEDURE IF EXISTS sp_sales_report;
DROP PROCEDURE IF EXISTS sp_low_stock_report;
DROP PROCEDURE IF EXISTS sp_dispatch_medicine;

-- 1. Stored Procedure: Generate Bill for a Patient (aggregates dispatches for today and adds consultation)
DELIMITER $$
CREATE PROCEDURE sp_generate_bill(
    IN  p_patient_id CHAR(6),
    IN  p_payment_mode VARCHAR(20),
    OUT p_bill_id INT
)
BEGIN
    DECLARE v_med_total DECIMAL(10,2) DEFAULT 0;
    DECLARE v_consult_fee DECIMAL(10,2) DEFAULT 300.00;
    DECLARE v_total DECIMAL(10,2) DEFAULT 0;
    DECLARE v_bill_id INT;

    -- Sum all dispatched medicine costs for today
    SELECT IFNULL(SUM(d.quantity * m.unit_price), 0)
    INTO v_med_total
    FROM dispatch d
    JOIN medicines m ON d.medicine_id = m.medicine_id
    WHERE d.patient_id = p_patient_id
      AND DATE(d.dispatch_date) = CURDATE();

    -- Total billing amount (Medicines + Consultation Fee)
    SET v_total = v_med_total + v_consult_fee;

    -- Create Bill Record
    INSERT INTO bills (patient_id, total_amount, final_amount, payment_mode, payment_status)
    VALUES (p_patient_id, v_total, v_total, p_payment_mode, 'Paid');

    SET v_bill_id = LAST_INSERT_ID();

    -- Insert Dispatched Medicines into Bill Items
    INSERT INTO bill_items (bill_id, description, quantity, unit_price, subtotal)
    SELECT 
        v_bill_id, 
        m.medicine_name, 
        d.quantity, 
        m.unit_price, 
        (d.quantity * m.unit_price)
    FROM dispatch d
    JOIN medicines m ON d.medicine_id = m.medicine_id
    WHERE d.patient_id = p_patient_id
      AND DATE(d.dispatch_date) = CURDATE();

    -- Insert Doctor Consultation Item
    INSERT INTO bill_items (bill_id, description, quantity, unit_price, subtotal)
    VALUES (v_bill_id, 'Doctor Consultation Fee', 1, v_consult_fee, v_consult_fee);

    SET p_bill_id = v_bill_id;
END$$
DELIMITER ;


-- 2. Stored Procedure: Get Prescriptions by Patient ID
DELIMITER $$
CREATE PROCEDURE sp_get_prescription(IN p_patient_id CHAR(6))
BEGIN
    SELECT
        pr.prescription_id,
        pr.prescribed_on,
        d.full_name AS doctor_name,
        m.medicine_name,
        m.medicine_id,
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


-- 3. Stored Procedure: Monthly Sales Report
DELIMITER $$
CREATE PROCEDURE sp_sales_report(IN p_year INT, IN p_month INT)
BEGIN
    SELECT
        m.medicine_name,
        m.category,
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


-- 4. Stored Procedure with CURSOR: Low Stock Alert Processor
DELIMITER $$
CREATE PROCEDURE sp_low_stock_report()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE v_medicine_id INT;
    DECLARE v_medicine_name VARCHAR(150);
    DECLARE v_quantity INT;
    DECLARE v_reorder INT;

    -- Cursor to select all items whose stock quantity is at or below reorder level
    DECLARE cur CURSOR FOR
        SELECT s.medicine_id, m.medicine_name, s.quantity, s.reorder_level
        FROM stock s
        JOIN medicines m ON s.medicine_id = m.medicine_id
        WHERE s.quantity <= s.reorder_level;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    -- Create temporary table to gather alerts
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

    -- Return the cursor output
    SELECT * FROM low_stock_alerts;
END$$
DELIMITER ;


-- 5. Stored Procedure with TRANSACTION: Atomically Dispatch Medicine with Stock Locking (FEFO)
DELIMITER $$
CREATE PROCEDURE sp_dispatch_medicine(
    IN  p_patient_id  CHAR(6),
    IN  p_medicine_id INT,
    IN  p_quantity    INT,
    IN  p_staff_id    INT
)
BEGIN
    -- Cursor variables
    DECLARE v_stock_id      INT;
    DECLARE v_batch_qty     INT;
    DECLARE v_batch_expiry  DATE;
    DECLARE v_done          BOOLEAN DEFAULT FALSE;

    -- Working variables
    DECLARE v_remaining     INT DEFAULT p_quantity;   -- units still to be consumed
    DECLARE v_deduct        INT;                       -- units deducted from current batch
    DECLARE v_total_avail   INT DEFAULT 0;             -- pre-check total across all batches

    -- Cursor: walk batches FEFO (earliest expiry first)
    DECLARE fefo_cursor CURSOR FOR
        SELECT stock_id, quantity, expiry_date
        FROM   stock
        WHERE  medicine_id = p_medicine_id
          AND  quantity     > 0
          AND  expiry_date  > CURDATE()        -- exclude already-expired batches
        ORDER BY expiry_date ASC               -- FEFO: earliest expiry consumed first
        FOR UPDATE;                            -- InnoDB row lock for concurrency safety

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    -- Global error handler: rollback on any SQL exception
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Dispatch transaction failed. Rolled back.';
    END;

    START TRANSACTION;

        -- Step 1: Pre-check — ensure total non-expired stock can satisfy the order
        SELECT COALESCE(SUM(quantity), 0)
        INTO   v_total_avail
        FROM   stock
        WHERE  medicine_id = p_medicine_id
          AND  quantity    > 0
          AND  expiry_date > CURDATE();

        IF v_total_avail < p_quantity THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Insufficient non-expired stock to fulfil this dispatch.';
        END IF;

        -- Step 2: Insert dispatch record (one record for the whole order)
        INSERT INTO dispatch (patient_id, medicine_id, quantity, dispatched_by)
        VALUES (p_patient_id, p_medicine_id, p_quantity, p_staff_id);

        -- Step 3: Open FEFO cursor and deduct batch by batch
        OPEN fefo_cursor;

        fefo_loop: LOOP
            FETCH fefo_cursor INTO v_stock_id, v_batch_qty, v_batch_expiry;

            -- Exit when no more batches or order is fully satisfied
            IF v_done OR v_remaining <= 0 THEN
                LEAVE fefo_loop;
            END IF;

            -- How much can we take from this batch?
            IF v_batch_qty >= v_remaining THEN
                SET v_deduct = v_remaining;     -- this batch covers the rest
            ELSE
                SET v_deduct = v_batch_qty;     -- drain this batch entirely, continue loop
            END IF;

            -- Deduct from this specific batch row
            UPDATE stock
            SET    quantity = quantity - v_deduct
            WHERE  stock_id = v_stock_id;

            -- Write to audit log for this batch deduction
            INSERT INTO stock_log (medicine_id, change_type, quantity, reason, batch_stock_id)
            VALUES (
                p_medicine_id,
                'OUT',
                v_deduct,
                CONCAT('FEFO dispatch | patient=', p_patient_id),
                v_stock_id
            );

            SET v_remaining = v_remaining - v_deduct;

        END LOOP fefo_loop;

        CLOSE fefo_cursor;

    COMMIT;
END$$
DELIMITER ;
