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

exports.getMeetingAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Check if meeting exists
    const meeting = await Meeting.findByPk(id);
    if (!meeting) {
      return res.status(404).json({ message: 'Reunión no encontrada' });
    }

    // 2. Fetch all parents
    const parents = await Parent.findAll();

    // 3. Fetch attendances for this meeting
    const attendances = await MeetingAttendance.findAll({
      where: { meeting_id: id }
    });

    // 4. Map parents with their attendance status
    const attendanceMap = {};
    attendances.forEach(att => {
      attendanceMap[att.parent_id] = att;
    });

    const result = parents.map(parent => {
      const att = attendanceMap[parent.id];
      return {
        parent_id: parent.id,
        first_name: parent.first_name,
        last_name: parent.last_name,
        dni: parent.dni,
        attendance_id: att ? att.id : null,
        status: att ? 'Presente' : 'Ausente',
        check_in: att ? att.check_in : null,
        check_out: att ? att.check_out : null
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener asistencia de la reunión', error: error.message });
  }
};

exports.manualAddAttendance = async (req, res) => {
  try {
    const { id } = req.params; // meeting_id
    const { parent_id, check_in, check_out } = req.body;

    const attendance = await MeetingAttendance.create({
      meeting_id: id,
      parent_id,
      check_in: check_in || new Date(),
      check_out: check_out || null
    });

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar asistencia', error: error.message });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { check_in, check_out } = req.body;

    const attendance = await MeetingAttendance.findByPk(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: 'Registro de asistencia no encontrado' });
    }

    await attendance.update({
      check_in: check_in !== undefined ? check_in : attendance.check_in,
      check_out: check_out !== undefined ? check_out : attendance.check_out
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar asistencia', error: error.message });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    
    const attendance = await MeetingAttendance.findByPk(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: 'Registro de asistencia no encontrado' });
    }

    await attendance.destroy();
    res.json({ message: 'Asistencia eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar asistencia', error: error.message });
  }
};
