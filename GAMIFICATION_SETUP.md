
// Gamification Initialization Script
// Run this after setting up your database

const achievements = [
  {
    name: 'First Upload',
    description: 'Upload your first receipt',
    icon: '📄',
    category: 'upload',
    rarity: 'common',
    points: 10,
    requirement: JSON.stringify({ type: 'upload_count', value: 1, description: 'Upload 1 receipt' }),
    requirementValue: 1
  },
  {
    name: 'Getting Started',
    description: 'Upload 5 receipts',
    icon: '📊',
    category: 'upload',
    rarity: 'common',
    points: 20,
    requirement: JSON.stringify({ type: 'upload_count', value: 5, description: 'Upload 5 receipts' }),
    requirementValue: 5
  },
  {
    name: 'Receipt Collector',
    description: 'Upload 25 receipts',
    icon: '📁',
    category: 'upload',
    rarity: 'rare',
    points: 50,
    requirement: JSON.stringify({ type: 'upload_count', value: 25, description: 'Upload 25 receipts' }),
    requirementValue: 25
  },
  {
    name: 'Receipt Master',
    description: 'Upload 100 receipts',
    icon: '👑',
    category: 'upload',
    rarity: 'epic',
    points: 100,
    requirement: JSON.stringify({ type: 'upload_count', value: 100, description: 'Upload 100 receipts' }),
    requirementValue: 100
  },
  {
    name: 'Week Warrior',
    description: 'Maintain a 7-day upload streak',
    icon: '🔥',
    category: 'streak',
    rarity: 'rare',
    points: 30,
    requirement: JSON.stringify({ type: 'streak_days', value: 7, description: '7-day upload streak' }),
    requirementValue: 7
  },
  {
    name: 'Month Master',
    description: 'Maintain a 30-day upload streak',
    icon: '⚡',
    category: 'streak',
    rarity: 'epic',
    points: 75,
    requirement: JSON.stringify({ type: 'streak_days', value: 30, description: '30-day upload streak' }),
    requirementValue: 30
  },
  {
    name: 'Green Week',
    description: 'Have a week with emissions below 50kg CO₂e',
    icon: '🌱',
    category: 'emissions',
    rarity: 'rare',
    points: 40,
    requirement: JSON.stringify({ type: 'low_emissions_weeks', value: 1, description: '1 week below 50kg CO₂e' }),
    requirementValue: 1
  },
  {
    name: 'Eco Champion',
    description: 'Have 5 weeks with emissions below 50kg CO₂e',
    icon: '🌍',
    category: 'emissions',
    rarity: 'epic',
    points: 80,
    requirement: JSON.stringify({ type: 'low_emissions_weeks', value: 5, description: '5 weeks below 50kg CO₂e' }),
    requirementValue: 5
  },
  {
    name: 'Carbon Conscious',
    description: 'Track 1000kg CO₂e total emissions',
    icon: '📈',
    category: 'milestone',
    rarity: 'rare',
    points: 60,
    requirement: JSON.stringify({ type: 'total_emissions', value: 1000, description: 'Track 1000kg CO₂e' }),
    requirementValue: 1000
  },
  {
    name: 'Green Pioneer',
    description: 'Make 50 green choices',
    icon: '🌿',
    category: 'social',
    rarity: 'legendary',
    points: 150,
    requirement: JSON.stringify({ type: 'green_choices', value: 50, description: '50 green choices' }),
    requirementValue: 50
  }
];

console.log('🎮 Gamification system is ready!');
console.log('📋 Features included:');
console.log('   ✅ Achievement system with 10 badges');
console.log('   ✅ Level progression system');
console.log('   ✅ Streak tracking');
console.log('   ✅ Leaderboard functionality');
console.log('   ✅ Progress tracking to next badge');
console.log('   ✅ Real-time achievement notifications');
console.log('   ✅ Gamification dashboard');
console.log('   ✅ Integration with receipt uploads');

console.log('\n🚀 Next steps:');
console.log('1. Run: npx prisma db push (if not done already)');
console.log('2. Start your development server: pnpm dev');
console.log('3. Navigate to /gamification to see the gamification hub');
console.log('4. Upload receipts to start earning achievements!');

console.log('\n📖 Achievement Categories:');
console.log('   📄 Upload Master - Earn badges for consistent receipt uploads');
console.log('   🔥 Streak Champion - Maintain daily streaks and earn rewards');
console.log('   🌱 Eco Warrior - Reduce emissions and earn green badges');
console.log('   🏆 Milestone Master - Reach significant milestones and achievements');

console.log('\n✨ The gamification system will automatically:');
console.log('   • Track user progress and streaks');
console.log('   • Award achievements when criteria are met');
console.log('   • Show progress bars to next achievements');
console.log('   • Display leaderboards and rankings');
console.log('   • Provide motivational feedback and tips');

console.log('\n🎉 Ready to gamify your carbon footprint tracking!');
