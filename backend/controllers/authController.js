const User = require('../models/User');
const Role = require('../models/Role');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { email, password, roleName } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Buscar el rol
    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ message: 'Rol no válido' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await User.create({
      email,
      password: hashedPassword,
      role_id: role.id
    });

    res.status(201).json({ message: 'Usuario registrado con éxito', userId: user.id });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario con su rol
    const user = await User.findOne({ 
      where: { email },
      include: [{ model: Role }]
    });

    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Crear Token
    const token = jwt.sign(
      { id: user.id, role: user.Role.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.Role.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};
