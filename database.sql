-- ============================================================================
-- SGR-IT: Sistema de Gestión de Recursos IT
-- Base de Datos Completa para XAMPP/MySQL
-- ============================================================================
-- 
-- INSTRUCCIONES DE INSTALACIÓN:
-- 1. Abre phpMyAdmin (http://localhost/phpmyadmin)
-- 2. Importa este archivo completo
-- 3. O ejecuta desde terminal: mysql -u root -P 3307 < database.sql
--
-- CREDENCIALES DE PRUEBA:
-- Admin:    carlos.mendoza@empresa.com / Cursos1
-- Usuario:  ana.garcia@empresa.com / Cursos1
--
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- Crear base de datos
-- ----------------------------------------------------------------------------
DROP DATABASE IF EXISTS `sgr_it_simple`;
CREATE DATABASE `sgr_it_simple` 
    DEFAULT CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE `sgr_it_simple`;

-- ----------------------------------------------------------------------------
-- Tabla: tipos_recurso
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `tipos_recurso`;
CREATE TABLE `tipos_recurso` (
    `id_tipo_recurso` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tipos_recurso` (`id_tipo_recurso`, `nombre`) VALUES
(1, 'Sala'),
(2, 'Portátil'),
(3, 'Proyector');

-- ----------------------------------------------------------------------------
-- Tabla: estados_reserva
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `estados_reserva`;
CREATE TABLE `estados_reserva` (
    `id_estado_reserva` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `estados_reserva` (`id_estado_reserva`, `nombre`) VALUES
(1, 'Pendiente'),
(2, 'Confirmada'),
(3, 'Cancelada');

-- ----------------------------------------------------------------------------
-- Tabla: usuarios
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
    `id_usuario` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `rol` ENUM('admin', 'empleado') DEFAULT 'empleado',
    `foto_url` VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contraseña para todos los usuarios: Cursos1
INSERT INTO `usuarios` (`id_usuario`, `nombre`, `email`, `password_hash`, `rol`, `foto_url`) VALUES
(1, 'Carlos Mendoza', 'carlos.mendoza@empresa.com', '$2y$10$ND2VBkSCBeSSnP2oP95Xsu0A6nCAIx3zX5yWDx71luYA2G5Ou0Y3y', 'admin', 'https://randomuser.me/api/portraits/men/32.jpg'),
(2, 'Ana García', 'ana.garcia@empresa.com', '$2y$10$ND2VBkSCBeSSnP2oP95Xsu0A6nCAIx3zX5yWDx71luYA2G5Ou0Y3y', 'empleado', 'https://randomuser.me/api/portraits/women/44.jpg'),
(3, 'Luis Pérez', 'luis.perez@empresa.com', '$2y$10$ND2VBkSCBeSSnP2oP95Xsu0A6nCAIx3zX5yWDx71luYA2G5Ou0Y3y', 'empleado', 'https://randomuser.me/api/portraits/men/67.jpg'),
(4, 'Marta Santos', 'marta.santos@empresa.com', '$2y$10$ND2VBkSCBeSSnP2oP95Xsu0A6nCAIx3zX5yWDx71luYA2G5Ou0Y3y', 'empleado', 'https://randomuser.me/api/portraits/women/28.jpg'),
(5, 'Pedro Ruiz', 'pedro.ruiz@empresa.com', '$2y$10$ND2VBkSCBeSSnP2oP95Xsu0A6nCAIx3zX5yWDx71luYA2G5Ou0Y3y', 'empleado', 'https://randomuser.me/api/portraits/men/85.jpg');

-- ----------------------------------------------------------------------------
-- Tabla: recursos
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `recursos`;
CREATE TABLE `recursos` (
    `id_recurso` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(100) NOT NULL,
    `id_tipo_recurso` INT NOT NULL,
    `estado` ENUM('disponible', 'no_disponible') DEFAULT 'disponible',
    `ubicacion` VARCHAR(100) DEFAULT NULL,
    `foto_url` VARCHAR(255) DEFAULT NULL,
    `descripcion` TEXT DEFAULT NULL,
    FOREIGN KEY (`id_tipo_recurso`) REFERENCES `tipos_recurso`(`id_tipo_recurso`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `recursos` (`id_recurso`, `nombre`, `id_tipo_recurso`, `estado`, `ubicacion`, `foto_url`, `descripcion`) VALUES
-- Salas de reuniones
(1, 'Sala Juntas Principal', 1, 'disponible', 'Planta 2', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400', 'Sala de reuniones con capacidad para 12 personas. Equipada con TV 65", videoconferencia y pizarra digital.'),
(2, 'Sala Reuniones Pequeña', 1, 'disponible', 'Planta 1', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400', 'Sala pequeña para reuniones de 4-6 personas. Pizarra blanca y TV 42".'),
(3, 'Sala Formación', 1, 'disponible', 'Planta 0', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400', 'Sala de formación con capacidad para 20 personas. Proyector, audio y 10 puestos de ordenador.'),
(4, 'Sala Videoconferencia', 1, 'disponible', 'Planta 2', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400', 'Sala videoconferencia profesional. Pantalla 75", cámara 4K, sistema audio Dolby.'),

-- Portátiles
(5, 'Portátil Dell XPS 15', 2, 'disponible', 'Almacén IT', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', 'Portátil profesional. Intel Core i7-1165G7, 16GB RAM DDR4, SSD NVMe 512GB, Pantalla 15.6" FHD IPS'),
(6, 'Portátil HP Pavilion', 2, 'no_disponible', 'Taller IT', 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400', 'HP Pavilion. AMD Ryzen 5 5500U, 8GB RAM, SSD 256GB, Pantalla 15.6" FHD'),
(7, 'Portátil Lenovo ThinkPad', 2, 'disponible', 'Almacén IT', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', 'ThinkPad empresarial. Intel Core i5-1235U, 16GB RAM, SSD 256GB, Pantalla 14" FHD'),
(8, 'Portátil Asus ZenBook', 2, 'disponible', 'Oficina CEO', 'https://images.unsplash.com/photo-1611078489935-0cb964de46d6?w=400', 'Asus ZenBook ultraligero. Intel Core i7-1165G7, 16GB RAM, SSD 512GB, Pantalla 14" OLED'),
(9, 'Portátil MacBook Pro', 2, 'disponible', 'Oficina 1', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400', 'MacBook Pro 14". Apple M3 Pro, 18GB RAM, SSD 512GB, Pantalla Liquid Retina XDR'),
(10, 'Portátil HP EliteBook', 2, 'disponible', 'Oficina 2', 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=400', 'HP EliteBook premium. Intel Core i7-1255U, 32GB RAM, SSD 1TB, Pantalla 15.6" 4K'),
(11, 'Portátil Surface Laptop', 2, 'disponible', 'Oficina 3', 'https://images.unsplash.com/photo-1629131726692-1accd0c53ce0?w=400', 'Surface Laptop 4. Intel Core i5, 8GB RAM, SSD 256GB, Pantalla táctil 13.5"'),
(12, 'Portátil Acer Aspire', 2, 'disponible', 'Oficina 4', 'https://images.unsplash.com/photo-1602080858428-57174f9431cf?w=400', 'Acer Aspire. Intel Core i5-1135G7, 8GB RAM, SSD 512GB, Pantalla 15.6" FHD'),
(13, 'Portátil MSI Prestige', 2, 'disponible', 'Oficina 5', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400', 'MSI Prestige. Intel Core i7-1185G7, 16GB RAM, SSD 512GB, Pantalla 14" FHD'),

-- Proyectores
(14, 'Proyector Epson EB-X41', 3, 'disponible', 'Almacén IT', 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400', 'Proyector Full HD 1080p. 3600 lúmenes, HDMI, VGA, USB. Ideal para presentaciones.'),
(15, 'Proyector BenQ MH535', 3, 'disponible', 'Sala Juntas Principal', 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400', 'Proyector Full HD 1080p. 3600 lúmenes, HDMI, VGA, USB. Perfecto para salas medianas.'),
(16, 'Proyector Sony VPL', 3, 'disponible', 'Sala Formación', 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400', 'Proyector profesional Sony. 4000 lúmenes, resolución nativa WXGA, conectividad completa.'),
(17, 'Proyector ViewSonic PA503', 3, 'disponible', 'Almacén IT', 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400', 'Proyector compacto. 3600 lúmenes, HDMI, VGA. Fácil de transportar.');

-- ----------------------------------------------------------------------------
-- Tabla: reservas
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `reservas`;
CREATE TABLE `reservas` (
    `id_reserva` INT AUTO_INCREMENT PRIMARY KEY,
    `id_usuario` INT NOT NULL,
    `id_recurso` INT NOT NULL,
    `fecha_inicio` DATETIME NOT NULL,
    `fecha_fin` DATETIME NOT NULL,
    `id_estado_reserva` INT NOT NULL DEFAULT 1,
    FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`),
    FOREIGN KEY (`id_recurso`) REFERENCES `recursos`(`id_recurso`),
    FOREIGN KEY (`id_estado_reserva`) REFERENCES `estados_reserva`(`id_estado_reserva`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reservas de ejemplo (fechas futuras para testing)
INSERT INTO `reservas` (`id_reserva`, `id_usuario`, `id_recurso`, `fecha_inicio`, `fecha_fin`, `id_estado_reserva`) VALUES
(1, 1, 1, '2026-02-05 09:00:00', '2026-02-05 11:00:00', 2),
(2, 2, 5, '2026-02-05 08:00:00', '2026-02-05 20:00:00', 2),
(3, 3, 2, '2026-02-06 14:00:00', '2026-02-06 16:00:00', 2),
(4, 3, 13, '2026-02-06 14:00:00', '2026-02-06 16:00:00', 2),
(5, 4, 3, '2026-02-07 10:00:00', '2026-02-07 13:00:00', 2),
(6, 5, 7, '2026-02-08 09:00:00', '2026-02-08 18:00:00', 3),
(7, 1, 4, '2026-02-09 15:00:00', '2026-02-09 17:00:00', 2),
(8, 2, 1, '2026-02-10 12:00:00', '2026-02-10 13:00:00', 2),
(9, 3, 5, '2026-02-11 08:00:00', '2026-02-11 20:00:00', 2),
(10, 4, 13, '2026-02-12 10:00:00', '2026-02-12 12:00:00', 2);

-- ----------------------------------------------------------------------------
-- Restaurar configuración
-- ----------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
