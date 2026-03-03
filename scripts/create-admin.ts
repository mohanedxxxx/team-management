import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  const email = 'admin@team.com';
  const password = 'admin123';
  const name = 'مدير النظام';

  try {
    // التحقق من وجود الأدمن
    const existingAdmin = await db.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log('⚠️  الأدمن موجود بالفعل!');
      console.log('📧 البريد الإلكتروني:', email);
      console.log('🔑 كلمة المرور:', password);
      return;
    }

    // إنشاء الأدمن
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
      },
    });

    console.log('✅ تم إنشاء الأدمن بنجاح!');
    console.log('📧 البريد الإلكتروني:', email);
    console.log('🔑 كلمة المرور:', password);
    console.log('👤 الاسم:', name);
  } catch (error) {
    console.error('❌ حدث خطأ:', error);
  } finally {
    await db.$disconnect();
  }
}

createAdmin();
