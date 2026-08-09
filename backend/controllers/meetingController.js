const Meeting = require('../models/Meeting');
const MeetingAttendance = require('../models/MeetingAttendance');
const Parent = require('../models/Parent');
const sequelize = require('../config/db');

const parseLocalDateString = (dateStr) => {
  if (!dateStr) return new Date();
  if (typeof dateStr === 'string' && dateStr.includes('-') && !dateStr.includes('T')) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

exports.createMeeting = async (req, res) => {
  try {
    const { title, date, time, description, type } = req.body;
    const parsedDate = parseLocalDateString(date);
    const meeting = await Meeting.create({ title, date: parsedDate, time, description, type });
    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear reunión', error: error.message });
  }
};

exports.getActiveMeetings = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const meetings = await Meeting.findAll({
      where: sequelize.where(
        sequelize.fn('DATE', sequelize.col('date')),
        {
          [Op.eq]: sequelize.fn('DATE', today)
        }
      ),
      order: [['date', 'ASC']]
    });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener reuniones', error: error.message });
  }
};

exports.getAllMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.findAll({
      order: [['date', 'DESC']]
    });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener todas las reuniones', error: error.message });
  }
};

exports.scanParentQR = async (req, res) => {
  try {
    const { uuid, meeting_id } = req.body;

    const parent = await Parent.findOne({ where: { qr_code_uuid: uuid } });
    if (!parent) {
      return res.status(404).json({ message: 'Código QR de padre no reconocido' });
    }

    const now = new Date();

    // Buscar si ya tiene ingreso a esta reunión sin salida
    let attendance = await MeetingAttendance.findOne({
      where: {
        parent_id: parent.id,
        meeting_id: meeting_id,
        check_out: null
      }
    });

    let type = '';
    if (!attendance) {
      type = 'INGRESO';
      attendance = await MeetingAttendance.create({
        parent_id: parent.id,
        meeting_id: meeting_id,
        check_in: now
      });
    } else {
      type = 'SALIDA';
      attendance.check_out = now;
      await attendance.save();
    }

    res.json({
      message: `Registro de ${type} exitoso para reunión`,
      parent: `${parent.first_name} ${parent.last_name}`,
      time: now.toLocaleTimeString()
    });

  } catch (error) {
    res.status(500).json({ message: 'Error al procesar asistencia a reunión', error: error.message });
  }
};

exports.updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, time, description, type } = req.body;
    const meeting = await Meeting.findByPk(id);
    
    if (!meeting) {
      return res.status(404).json({ message: 'Reunión no encontrada' });
    }

    const parsedDate = parseLocalDateString(date);
    await meeting.update({ title, date: parsedDate, time, description, type });
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar reunión', error: error.message });
  }
};

exports.deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findByPk(id);
    
    if (!meeting) {
      return res.status(404).json({ message: 'Reunión no encontrada' });
    }

    await meeting.destroy();
    res.json({ message: 'Reunión eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar reunión', error: error.message });
  }
};
