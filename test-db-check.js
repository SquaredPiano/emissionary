const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database...\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        clerkId: true,
        email: true,
        receipts: {
          select: {
            id: true,
            merchant: true,
            total: true,
            totalCarbonEmissions: true,
            status: true,
            date: true,
            receiptItems: {
              select: {
                id: true,
                name: true,
                carbonEmissions: true,
              }
            }
          }
        }
      }
    });

    console.log(`Found ${users.length} users:`);
    
    users.forEach(user => {
      console.log(`\nUser: ${user.email} (${user.clerkId})`);
      console.log(`Receipts: ${user.receipts.length}`);
      
      if (user.receipts.length > 0) {
        const totalEmissions = user.receipts.reduce((sum, r) => sum + Number(r.totalCarbonEmissions), 0);
        console.log(`Total emissions: ${totalEmissions.toFixed(2)} kg CO2e`);
        
        user.receipts.forEach(receipt => {
          console.log(`  - ${receipt.merchant}: $${Number(receipt.total).toFixed(2)} | ${Number(receipt.totalCarbonEmissions).toFixed(2)} kg CO2e | ${receipt.status} | ${receipt.date.toISOString().split('T')[0]}`);
        });
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase(); 