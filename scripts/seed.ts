import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 بدء تهيئة قاعدة البيانات...');

  try {
    // بيانات الأدمن
    const adminEmail = 'mhndsyd872@gmail.com';
    const adminPassword = '191979';
    const adminName = 'محمود';
    
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // التحقق من وجود الأدمن
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    let adminUser;
    
    if (!existingAdmin) {
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: hashedPassword,
        },
      });
      console.log('✅ تم إنشاء الأدمن');
      console.log('   البريد:', adminEmail);
      console.log('   كلمة المرور:', adminPassword);
    } else {
      adminUser = existingAdmin;
      console.log('⚠️  الأدمن موجود بالفعل');
    }

    // إنشاء فريق افتراضي
    const existingTeam = await prisma.team.findFirst({
      where: { name: 'الفريق الرئيسي' },
    });

    if (!existingTeam) {
      const inviteCode = crypto.randomUUID().split('-')[0].toUpperCase();

      const team = await prisma.team.create({
        data: {
          name: 'الفريق الرئيسي',
          description: 'الفريق الافتراضي للنظام',
          inviteCode,
          members: {
            create: {
              userId: adminUser.id,
              role: 'ADMIN',
            },
          },
        },
      });
      console.log('✅ تم إنشاء الفريق الافتراضي');
      console.log('   كود الدعوة:', inviteCode);
    } else {
      console.log('⚠️  الفريق موجود بالفعل');
      console.log('   كود الدعوة:', existingTeam.inviteCode);
    }

    // إنشاء مواد افتراضية
    const subjects = [
      { name: 'عام', color: '#6366f1' },
      { name: 'رياضيات', color: '#ef4444' },
      { name: 'فيزياء', color: '#f59e0b' },
      { name: 'كيمياء', color: '#10b981' },
      { name: 'أحياء', color: '#06b6d4' },
      { name: 'برمجة', color: '#8b5cf6' },
      { name: 'تصميم', color: '#ec4899' },
      { name: 'إدارة', color: '#64748b' },
      { name: 'تسويق', color: '#f97316' },
    ];

    for (const subject of subjects) {
      const existing = await prisma.subject.findUnique({
        where: { name: subject.name },
      });
      
      if (!existing) {
        await prisma.subject.create({ data: subject });
      }
    }
    
    console.log('✅ تم إنشاء المواد الافتراضية');
    
    console.log('\n🎉 تمت التهيئة بنجاح!');
    console.log('\n📋 بيانات الدخول:');
    console.log('   البريد الإلكتروني:', adminEmail);
    console.log('   كلمة المرور:', adminPassword);
  } catch (error) {
    console.error('❌ حدث خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
