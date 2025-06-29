-- Add gamification fields to users table
ALTER TABLE users 
ADD COLUMN level INTEGER DEFAULT 1,
ADD COLUMN experience INTEGER DEFAULT 0,
ADD COLUMN current_streak INTEGER DEFAULT 0,
ADD COLUMN longest_streak INTEGER DEFAULT 0,
ADD COLUMN last_activity_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN total_points INTEGER DEFAULT 0;

-- Create achievements table
CREATE TABLE achievements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    rarity TEXT NOT NULL,
    points INTEGER DEFAULT 10,
    requirement TEXT NOT NULL,
    requirement_value INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE user_achievements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, achievement_id)
);

-- Create user_streaks table
CREATE TABLE user_streaks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, type)
);

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, rarity, points, requirement, requirement_value) VALUES
('First Upload', 'Upload your first receipt', '📄', 'upload', 'common', 10, '{"type": "upload_count", "value": 1, "description": "Upload 1 receipt"}', 1),
('Getting Started', 'Upload 5 receipts', '📊', 'upload', 'common', 20, '{"type": "upload_count", "value": 5, "description": "Upload 5 receipts"}', 5),
('Receipt Collector', 'Upload 25 receipts', '📁', 'upload', 'rare', 50, '{"type": "upload_count", "value": 25, "description": "Upload 25 receipts"}', 25),
('Receipt Master', 'Upload 100 receipts', '👑', 'upload', 'epic', 100, '{"type": "upload_count", "value": 100, "description": "Upload 100 receipts"}', 100),
('Week Warrior', 'Maintain a 7-day upload streak', '🔥', 'streak', 'rare', 30, '{"type": "streak_days", "value": 7, "description": "7-day upload streak"}', 7),
('Month Master', 'Maintain a 30-day upload streak', '⚡', 'streak', 'epic', 75, '{"type": "streak_days", "value": 30, "description": "30-day upload streak"}', 30),
('Green Week', 'Have a week with emissions below 50kg CO₂e', '🌱', 'emissions', 'rare', 40, '{"type": "low_emissions_weeks", "value": 1, "description": "1 week below 50kg CO₂e"}', 1),
('Eco Champion', 'Have 5 weeks with emissions below 50kg CO₂e', '🌍', 'emissions', 'epic', 80, '{"type": "low_emissions_weeks", "value": 5, "description": "5 weeks below 50kg CO₂e"}', 5),
('Carbon Conscious', 'Track 1000kg CO₂e total emissions', '📈', 'milestone', 'rare', 60, '{"type": "total_emissions", "value": 1000, "description": "Track 1000kg CO₂e"}', 1000),
('Green Pioneer', 'Make 50 green choices', '🌿', 'social', 'legendary', 150, '{"type": "green_choices", "value": 50, "description": "50 green choices"}', 50);

-- Create indexes for better performance
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX idx_user_streaks_type ON user_streaks(type);
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_rarity ON achievements(rarity); 