import { db } from '../src/lib/db';

async function checkDatabase() {
  try {
    console.log('🔍 فحص قاعدة البيانات...\n');

    // فحص المستخدمين
    const users = await db.user.findMany();
    console.log('👥 المستخدمين:');
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.name})`);
    });

    // فحص الفرق
    const teams = await db.team.findMany();
    console.log('\n🏢 الفرق:');
    teams.forEach(t => {
      console.log(`   - ${t.name}`);
    });

    // فحص عضويات الفرق
    const members = await db.teamMember.findMany({
      include: { user: true, team: true }
    });
    console.log('\n📋 عضويات الفرق:');
    members.forEach(m => {
      console.log(`   - ${m.user.email} في "${m.team.name}" كـ ${m.role}`);
    });

    // التحقق من المستخدم المطلوب
    const adminUser = await db.user.findUnique({
      where: { email: 'mhndsyd872@gmail.com' },
      include: {
        teamMemberships: {
          include: { team: true }
        }
      }
    });

    console.log('\n✅ التحقق من المستخدم المطلوب:');
    if (adminUser) {
      console.log(`   البريد: ${adminUser.email}`);
      console.log(`   الاسم: ${adminUser.name}`);
      console.log(`   عدد الفرق: ${adminUser.teamMemberships.length}`);
      adminUser.teamMemberships.forEach(tm => {
        console.log(`   - فريق: ${tm.team.name} | الدور: ${tm.role}`);
      });
    } else {
      console.log('   ❌ المستخدم غير موجود!');
    }

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await db.$disconnect();
  }
}

checkDatabase();
