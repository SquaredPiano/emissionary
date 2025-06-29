-- Add competition and achievements tables
-- This migration adds the competition system with badges, user achievements, and streaks

-- Create enum types
CREATE TYPE badge_rarity AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');
CREATE TYPE badge_requirement AS ENUM (
  'FIRST_UPLOAD',
  'UPLOAD_STREAK_3',
  'UPLOAD_STREAK_7',
  'UPLOAD_STREAK_30',
  'TOTAL_RECEIPTS_10',
  'TOTAL_RECEIPTS_50',
  'TOTAL_RECEIPTS_100',
  'LOW_EMISSIONS_WEEK',
  'GREEN_WEEKS_5',
  'GREEN_WEEKS_10',
  'TOTAL_EMISSIONS_1000',
  'GREEN_CHOICES_10',
  'GREEN_CHOICES_50',
  'PERFECT_WEEK',
  'EARLY_ADOPTER'
);
CREATE TYPE streak_type AS ENUM ('UPLOAD', 'GREEN_CHOICES', 'LOW_EMISSIONS');

-- Add competition fields to users table
ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN experience INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN longest_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_upload_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN total_receipts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_emissions DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN green_choices INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN weekly_green_weeks INTEGER DEFAULT 0;

-- Create badges table
CREATE TABLE badges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  rarity badge_rarity NOT NULL,
  points INTEGER DEFAULT 10,
  requirement badge_requirement NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE user_achievements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, badge_id)
);

-- Create streaks table
CREATE TABLE streaks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type streak_type NOT NULL,
  current INTEGER DEFAULT 0,
  longest INTEGER DEFAULT 0,
  last_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- Insert default badges
INSERT INTO badges (name, description, icon, rarity, points, requirement) VALUES
-- Upload Master badges
('First Upload', 'Upload your first receipt', '📄', 'COMMON', 10, 'FIRST_UPLOAD'),
('Upload Streak 3', 'Upload receipts for 3 consecutive days', '🔥', 'COMMON', 15, 'UPLOAD_STREAK_3'),
('Upload Streak 7', 'Upload receipts for 7 consecutive days', '🔥', 'RARE', 25, 'UPLOAD_STREAK_7'),
('Upload Streak 30', 'Upload receipts for 30 consecutive days', '🔥', 'EPIC', 100, 'UPLOAD_STREAK_30'),
('Receipt Collector 10', 'Upload 10 receipts total', '📚', 'COMMON', 20, 'TOTAL_RECEIPTS_10'),
('Receipt Collector 50', 'Upload 50 receipts total', '📚', 'RARE', 50, 'TOTAL_RECEIPTS_50'),
('Receipt Collector 100', 'Upload 100 receipts total', '📚', 'EPIC', 150, 'TOTAL_RECEIPTS_100'),

-- Green Pioneer badges
('Low Emissions Week', 'Have a week with emissions below 50kg CO₂e', '🌱', 'COMMON', 20, 'LOW_EMISSIONS_WEEK'),
('Green Weeks 5', 'Have 5 weeks with emissions below 50kg CO₂e', '🌱', 'RARE', 75, 'GREEN_WEEKS_5'),
('Green Weeks 10', 'Have 10 weeks with emissions below 50kg CO₂e', '🌱', 'EPIC', 200, 'GREEN_WEEKS_10'),
('Green Choice 10', 'Make 10 low-emission food choices', '🥗', 'COMMON', 30, 'GREEN_CHOICES_10'),
('Green Choice 50', 'Make 50 low-emission food choices', '🥗', 'RARE', 100, 'GREEN_CHOICES_50'),

-- Milestone Master badges
('Carbon Tracker 1000', 'Track 1000kg CO₂e total emissions', '📊', 'RARE', 80, 'TOTAL_EMISSIONS_1000'),
('Perfect Week', 'Have a perfect green week', '⭐', 'EPIC', 150, 'PERFECT_WEEK'),
('Early Adopter', 'Be an early adopter of carbon tracking', '🚀', 'LEGENDARY', 500, 'EARLY_ADOPTER');

-- Create indexes for better performance
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_badge_id ON user_achievements(badge_id);
CREATE INDEX idx_streaks_user_id ON streaks(user_id);
CREATE INDEX idx_users_total_points ON users(total_points DESC);
CREATE INDEX idx_users_level ON users(level DESC);
CREATE INDEX idx_users_current_streak ON users(current_streak DESC);

-- Add RLS policies
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Badges are readable by all authenticated users
CREATE POLICY "Badges are viewable by authenticated users" ON badges
  FOR SELECT USING (auth.role() = 'authenticated');

-- User achievements are readable by the user who owns them
CREATE POLICY "User achievements are viewable by owner" ON user_achievements
  FOR SELECT USING (auth.uid()::text = user_id);

-- User achievements are insertable/updatable by the user who owns them
CREATE POLICY "User achievements are insertable by owner" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "User achievements are updatable by owner" ON user_achievements
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Streaks are readable by the user who owns them
CREATE POLICY "Streaks are viewable by owner" ON streaks
  FOR SELECT USING (auth.uid()::text = user_id);

-- Streaks are insertable/updatable by the user who owns them
CREATE POLICY "Streaks are insertable by owner" ON streaks
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Streaks are updatable by owner" ON streaks
  FOR UPDATE USING (auth.uid()::text = user_id); 