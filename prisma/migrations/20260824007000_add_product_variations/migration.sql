CREATE TABLE `product_variations` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `productId` INTEGER NOT NULL,
  `sku` VARCHAR(100) NULL,
  `name` VARCHAR(255) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `soldQuantity` INTEGER NOT NULL DEFAULT 0,
  `manufacturingValue` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `saleValue` DECIMAL(10, 2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `product_variations_sku_key`(`sku`),
  INDEX `product_variations_productId_idx`(`productId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `product_variations`
  ADD CONSTRAINT `product_variations_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `product_components`
  DROP INDEX `product_components_kitId_componentId_key`,
  ADD COLUMN `variationId` INTEGER NULL AFTER `componentId`,
  ADD UNIQUE INDEX `product_components_kitId_componentId_variationId_key`(`kitId`, `componentId`, `variationId`);

ALTER TABLE `product_components`
  ADD CONSTRAINT `product_components_variationId_fkey` FOREIGN KEY (`variationId`) REFERENCES `product_variations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `sale_stock_movements`
  ADD COLUMN `variationId` INTEGER NULL AFTER `productId`,
  ADD INDEX `sale_stock_movements_variationId_idx`(`variationId`);

ALTER TABLE `sale_stock_movements`
  ADD CONSTRAINT `sale_stock_movements_variationId_fkey` FOREIGN KEY (`variationId`) REFERENCES `product_variations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
