CREATE DATABASE IF NOT EXISTS ucu_lost_found
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ucu_lost_found;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student','admin') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  report_type ENUM('lost','found') NOT NULL,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL,
  public_description TEXT NOT NULL,
  private_details TEXT NULL,
  item_date DATE NOT NULL,
  campus_location VARCHAR(150) NOT NULL,
  photo_path VARCHAR(255) NULL,
  status ENUM('open','returned') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_reports_search (report_type, category, campus_location, status)
);

CREATE TABLE IF NOT EXISTS claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  claimant_id INT NOT NULL,
  evidence TEXT NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  admin_response TEXT NULL,
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_claim_report FOREIGN KEY (report_id) REFERENCES reports(id),
  CONSTRAINT fk_claim_user FOREIGN KEY (claimant_id) REFERENCES users(id),
  CONSTRAINT fk_claim_admin FOREIGN KEY (reviewed_by) REFERENCES users(id),
  UNIQUE KEY unique_claimant_per_report (report_id, claimant_id),
  INDEX idx_claims_status (status)
);
