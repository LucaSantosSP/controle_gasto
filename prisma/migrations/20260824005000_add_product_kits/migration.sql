ALTER TABLE `products`
  ADD COLUMN `isKit` BOOLEAN NOT NULL DEFAULT false AFTER `name`;

CREATE TABLE `product_components` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `kitId` INTEGER NOT NULL,
  `componentId` INTEGER NOT NULL,
  `quantity` INTEGER NOT NULL,

  UNIQUE INDEX `product_components_kitId_componentId_key`(`kitId`, `componentId`),
  INDEX `product_components_componentId_idx`(`componentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `product_components`
  ADD CONSTRAINT `product_components_kitId_fkey` FOREIGN KEY (`kitId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `product_components`
  ADD CONSTRAINT `product_components_componentId_fkey` FOREIGN KEY (`componentId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
