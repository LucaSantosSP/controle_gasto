ALTER TABLE `products`
  ADD COLUMN `minimumStock` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `product_variations`
  ADD COLUMN `minimumStock` INTEGER NOT NULL DEFAULT 0;
