-- ==============================================================================
-- Fase 3: Cuentas de acceso para padres o apoderados
-- Ejecutar una sola vez en la base de datos: school_attendance
-- ==============================================================================

USE school_attendance;

-- 1. Asegurar la columna de vínculo con la cuenta de usuario
ALTER TABLE Parents ADD COLUMN IF NOT EXISTS user_id INT NULL;

-- 2. Limpiar referencias huérfanas antes de agregar llaves foráneas
UPDATE Parents p
LEFT JOIN Users u ON u.id = p.user_id
SET p.user_id = NULL
WHERE p.user_id IS NOT NULL AND u.id IS NULL;

DELETE sp
FROM StudentParents sp
LEFT JOIN Students s ON s.id = sp.student_id
WHERE s.id IS NULL;

DELETE sp
FROM StudentParents sp
LEFT JOIN Parents p ON p.id = sp.parent_id
WHERE p.id IS NULL;

-- 3. Eliminar vínculos duplicados antes de crear el índice único
DELETE sp1
FROM StudentParents sp1
INNER JOIN StudentParents sp2
  ON sp1.student_id = sp2.student_id
 AND sp1.parent_id = sp2.parent_id
 AND sp1.id > sp2.id;

-- 4. Unicidad: una cuenta por apoderado y un vínculo por estudiante
ALTER TABLE Parents
  ADD UNIQUE KEY parents_user_id_unique (user_id);

ALTER TABLE StudentParents
  ADD UNIQUE KEY student_parents_student_parent_unique (student_id, parent_id);

-- 5. Integridad referencial
ALTER TABLE Parents
  ADD CONSTRAINT fk_parents_user
  FOREIGN KEY (user_id) REFERENCES Users(id)
  ON DELETE SET NULL;

ALTER TABLE StudentParents
  ADD CONSTRAINT fk_student_parents_student
  FOREIGN KEY (student_id) REFERENCES Students(id)
  ON DELETE CASCADE;

ALTER TABLE StudentParents
  ADD CONSTRAINT fk_student_parents_parent
  FOREIGN KEY (parent_id) REFERENCES Parents(id)
  ON DELETE CASCADE;

-- 6. Migración opcional de la relación legada Students.parent_id
--    Ejecutar solo si la columna Students.parent_id existe en tu base de datos.
--
-- INSERT IGNORE INTO StudentParents (student_id, parent_id, createdAt, updatedAt)
-- SELECT id, parent_id, NOW(), NOW()
-- FROM Students
-- WHERE parent_id IS NOT NULL;
