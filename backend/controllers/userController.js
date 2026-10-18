const { User, Role } = require('../models');
const bcrypt = require('bcryptjs');

// Obtener todos los usuarios del sistema (solo admin o director)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'createdAt'],
      include: [
        { model: Role, attributes: ['id', 'name'] }
      ],
      order: [['id', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
};

// Crear usuario institucional (admin, director, docente)
exports.createUser = async (req, res) => {
  try {
    const { email, password, roleName } = req.body;

    if (!email || !password || !roleName) {
      return res.status(400).json({ message: 'Email, contraseña y rol son obligatorios' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
    }

    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ message: `El rol '${roleName}' no es válido` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      role_id: role.id
    });

    res.status(201).json({
      message: 'Usuario creado con éxito',
      user: {
        id: user.id,
        email: user.email,
        role: role.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear usuario', error: error.message });
  }
};

// Cambiar contraseña de un usuario
exports.updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Contraseña actualizada con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar contraseña', error: error.message });
  }
};

// Eliminar usuario
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevenir auto-eliminación
    if (req.user && req.user.id === parseInt(id, 10)) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta de administrador' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await user.destroy();
    res.json({ message: 'Usuario eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
  }
};
