CREATE DATABASE IF NOT EXISTS school_attendance;
USE school_attendance;

-- Roles table
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('admin'), ('director'), ('docente'), ('padre');

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Sections table
CREATE TABLE sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    grade VARCHAR(20) NOT NULL
);

-- Parents table
CREATE TABLE parents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE,
    phone VARCHAR(20),
    qr_code_uuid VARCHAR(100) UNIQUE,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Students table
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE,
    qr_code_uuid VARCHAR(100) UNIQUE,
    parent_id INT,
    section_id INT,
    FOREIGN KEY (parent_id) REFERENCES parents(id),
    FOREIGN KEY (section_id) REFERENCES sections(id)
);

-- Attendance table
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    check_in DATETIME DEFAULT CURRENT_TIMESTAMP,
    check_out DATETIME NULL,
    status ENUM('presente', 'tardanza', 'ausente') DEFAULT 'presente',
    duration VARCHAR(50),
    FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Meetings table
CREATE TABLE meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date DATETIME NOT NULL,
    description TEXT
);

-- Parent Meeting Attendance
CREATE TABLE meeting_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT,
    meeting_id INT,
    check_in DATETIME DEFAULT CURRENT_TIMESTAMP,
    check_out DATETIME NULL,
    FOREIGN KEY (parent_id) REFERENCES parents(id),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);
