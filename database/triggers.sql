USE medicare_pro;

DROP TRIGGER IF EXISTS trg_deduct_stock;
DROP TRIGGER IF EXISTS trg_bed_occupied;
DROP TRIGGER IF EXISTS trg_bed_available;


-- Trigger 2: Mark bed as Occupied on IPD admission
DELIMITER $$
CREATE TRIGGER trg_bed_occupied
AFTER INSERT ON ipd_admissions
FOR EACH ROW
BEGIN
    UPDATE beds 
    SET status = 'Occupied' 
    WHERE bed_id = NEW.bed_id;
END$$
DELIMITER ;

-- Trigger 3: Mark bed as Available on IPD discharge
DELIMITER $$
CREATE TRIGGER trg_bed_available
AFTER UPDATE ON ipd_admissions
FOR EACH ROW
BEGIN
    IF NEW.status = 'Discharged' AND OLD.status = 'Admitted' THEN
        UPDATE beds 
        SET status = 'Available' 
        WHERE bed_id = NEW.bed_id;
    END IF;
END$$
DELIMITER ;
