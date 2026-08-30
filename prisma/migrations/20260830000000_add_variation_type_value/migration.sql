ALTER TABLE `product_variations`
  ADD COLUMN `variationType` VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN `variationValue` VARCHAR(255) NOT NULL DEFAULT '';
