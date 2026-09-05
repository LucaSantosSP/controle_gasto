CREATE TABLE `shipping_packages` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `totalValue` DECIMAL(10, 2) NOT NULL,
  `unitValue` DECIMAL(10, 2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `sales`
  ADD COLUMN `shippingPackageId` INTEGER NULL,
  ADD COLUMN `shippingPackageUnitValue` DECIMAL(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE `sales`
  ADD CONSTRAINT `sales_shippingPackageId_fkey`
  FOREIGN KEY (`shippingPackageId`) REFERENCES `shipping_packages`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
