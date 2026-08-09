const { Parent, User, Role } = require('../models');
const bcrypt = require('bcryptjs');
const { generateQR } = require('../utils/qrGenerator');

exports.registerParent = async (req, res) => {
  try {
    const { first_name, last_name, dni, email, password, phone } = req.body;

    // Verificar si el DNI ya está registrado
    if (dni) {
      const existingParent = await Parent.findOne({ where: { dni } });
      if (existingParent) {
        return res.status(400).json({ message: 'El DNI ya está registrado para otro padre' });
      }
    }

    // Generar QR para el padre (reuniones)
    const { uuid } = await generateQR();

    let userId = null;

    // Si se proporciona email y password, crear usuario
    if (email && password) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
      }

      const role = await Role.findOne({ where: { name: 'padre' } });
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        email,
        password: hashedPassword,
        role_id: role.id
      });
      userId = user.id;
    }

    // Crear registro de padre
    const parent = await Parent.create({
      first_name,
      last_name,
      dni,
      phone,
      qr_code_uuid: uuid,
      user_id: userId
    });

    res.status(201).json({
      message: 'Padre registrado con éxito',
      parent: {
        id: parent.id,
        first_name: parent.first_name,
        last_name: parent.last_name,
        dni: parent.dni,
        qr_code_uuid: parent.qr_code_uuid
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar padre', error: error.message });
  }
};

exports.getAllParents = async (req, res) => {
  try {
    const parents = await Parent.findAll({
      include: [
        { model: User, attributes: ['email'] }
      ]
    });
    res.json(parents);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener padres', error: error.message });
  }
};

exports.updateParent = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, dni, email, password, phone } = req.body;

    const parent = await Parent.findByPk(id);
    if (!parent) {
      return res.status(404).json({ message: 'Padre no encontrado' });
    }

    if (dni && dni !== parent.dni) {
      const existingParent = await Parent.findOne({ where: { dni } });
      if (existingParent) {
        return res.status(400).json({ message: 'El DNI ya está registrado para otro padre' });
      }
    }

    await parent.update({
      first_name,
      last_name,
      dni,
      phone
    });

    // Update User if needed (if they have one or want to create one)
    if (email) {
      let user = await User.findByPk(parent.user_id);
      if (user) {
        const existingEmailUser = await User.findOne({ where: { email } });
        if (existingEmailUser && existingEmailUser.id !== user.id) {
          return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
        }
        
        const updates = { email };
        if (password) {
          updates.password = await bcrypt.hash(password, 10);
        }
        await user.update(updates);
      } else {
        // Create new user for existing parent
        const existingEmailUser = await User.findOne({ where: { email } });
        if (existingEmailUser) {
          return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
        }
        
        const role = await Role.findOne({ where: { name: 'padre' } });
        const hashedPassword = await bcrypt.hash(password || '123456', 10); // Default pass if not provided
        
        user = await User.create({
          email,
          password: hashedPassword,
          role_id: role.id
        });
        await parent.update({ user_id: user.id });
      }
    }

    res.json({ message: 'Padre actualizado con éxito', parent });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar padre', error: error.message });
  }
};

exports.deleteParent = async (req, res) => {
  try {
    const { id } = req.params;
    const parent = await Parent.findByPk(id);
    
    if (!parent) {
      return res.status(404).json({ message: 'Padre no encontrado' });
    }

    // Optional: Delete associated user if exists
    if (parent.user_id) {
      await User.destroy({ where: { id: parent.user_id } });
    }

    await parent.destroy();
    res.json({ message: 'Padre eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar padre', error: error.message });
  }
};
