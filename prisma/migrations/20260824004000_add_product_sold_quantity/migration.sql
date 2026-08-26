ALTER TABLE `products`
  ADD COLUMN `soldQuantity` INTEGER NOT NULL DEFAULT 0 AFTER `quantity`;
