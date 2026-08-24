ALTER TABLE `products`
  ADD COLUMN `sku` VARCHAR(100) NULL AFTER `id`;

UPDATE `products`
SET `sku` = CONCAT('PROD-', `id`)
WHERE `sku` IS NULL;

ALTER TABLE `products`
  MODIFY COLUMN `sku` VARCHAR(100) NOT NULL;

CREATE UNIQUE INDEX `products_sku_key` ON `products`(`sku`);
