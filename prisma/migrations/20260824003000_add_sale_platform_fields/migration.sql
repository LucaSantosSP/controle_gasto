ALTER TABLE `sales`
  ADD COLUMN `grossValue` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER `quantity`,
  ADD COLUMN `discountValue` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER `grossValue`,
  ADD COLUMN `platformFeeValue` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER `discountValue`,
  ADD COLUMN `platform` VARCHAR(20) NOT NULL DEFAULT 'PERSONAL' AFTER `totalValue`;

UPDATE `sales`
SET `grossValue` = `totalValue`
WHERE `grossValue` = 0.00;
