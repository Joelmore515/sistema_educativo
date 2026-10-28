-- Fase 1: seguridad y control de acceso
-- Ejecutar en producción antes de desplegar la nueva versión.
-- En desarrollo, sequelize.sync({ alter: false }) crea estas tablas al arrancar.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY password_reset_tokens_token_hash_unique (token_hash),
  KEY password_reset_tokens_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NULL,
  email VARCHAR(255) NULL,
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(80) NULL,
  entity_id VARCHAR(80) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  ip VARCHAR(64) NULL,
  user_agent TEXT NULL,
  metadata JSON NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY audit_logs_user_id (user_id),
  KEY audit_logs_action (action),
  KEY audit_logs_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
