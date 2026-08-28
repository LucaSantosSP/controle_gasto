CREATE TABLE `sale_stock_movements` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `saleId` INTEGER NOT NULL,
  `productId` INTEGER NOT NULL,
  `quantity` INTEGER NOT NULL,

  INDEX `sale_stock_movements_saleId_idx`(`saleId`),
  INDEX `sale_stock_movements_productId_idx`(`productId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `sale_stock_movements`
  ADD CONSTRAINT `sale_stock_movements_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `sale_stock_movements`
  ADD CONSTRAINT `sale_stock_movements_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
