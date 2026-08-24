ALTER TABLE `products`
  CHANGE COLUMN `value` `saleValue` DECIMAL(10, 2) NOT NULL,
  ADD COLUMN `manufacturingValue` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER `quantity`;
