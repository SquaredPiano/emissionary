const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeGamification() {
  try {
    console.log('🚀 Initializing gamification system...');

    // Initialize achievements
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

    console.log('📋 Creating achievements...');
    
    for (const achievement of achievements) {
      await prisma.achievement.upsert({
        where: { name: achievement.name },
        update: {},
        create: achievement
      });
      console.log(`✅ Created achievement: ${achievement.name}`);
    }

    console.log('🎉 Gamification system initialized successfully!');
    console.log(`📊 Created ${achievements.length} achievements`);

    // Show summary
    const achievementCount = await prisma.achievement.count();
    const userCount = await prisma.user.count();
    
    console.log('\n📈 Summary:');
    console.log(`- Total achievements: ${achievementCount}`);
    console.log(`- Total users: ${userCount}`);
    console.log('\n✨ Ready to gamify! Users can now earn achievements by uploading receipts.');

  } catch (error) {
    console.error('❌ Error initializing gamification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
if (require.main === module) {
  initializeGamification()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeGamification }; 