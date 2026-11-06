-- ==============================================================================
-- Fase 2: Portal de padres y estudiantes
-- Ejecutar en la base de datos ACTUAL de producción en TiDB Cloud: school_attendance
-- ==============================================================================

USE school_attendance;

-- 1. Agregar columna user_id en la tabla de estudiantes (si no existe)
-- Nota: En TiDB / MySQL, si tu tabla se creó como `Students` o `students`, usa la que corresponda.
ALTER TABLE Students ADD COLUMN IF NOT EXISTS user_id INT NULL;
-- Si tu tabla fue creada en minúsculas en TiDB, ejecuta alternativamente:
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id INT NULL;

-- 2. Crear tabla intermedia StudentParents para el vínculo muchos a muchos (padres e hijos)
CREATE TABLE IF NOT EXISTS StudentParents (
  id INT NOT NULL AUTO_INCREMENT,
  student_id INT NOT NULL,
  parent_id INT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY student_parents_student_id (student_id),
  KEY student_parents_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
