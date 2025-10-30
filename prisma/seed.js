const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Get bcrypt rounds from env or use default
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        role: 'ADMIN',
      },
    });

    console.log('✓ Admin user created:', {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });
  } else {
    console.log('⊘ Admin user already exists');
  }

  // Create sample student users
  const students = [
    {
      email: 'student1@example.com',
      password: 'Student123!',
      name: 'John Doe',
      nim: '1234567890',
    },
    {
      email: 'student2@example.com',
      password: 'Student123!',
      name: 'Jane Smith',
      nim: '0987654321',
    },
  ];

  for (const student of students) {
    const existingStudent = await prisma.user.findUnique({
      where: { email: student.email },
    });

    if (!existingStudent) {
      const hashedPassword = await bcrypt.hash(student.password, saltRounds);

      const createdStudent = await prisma.user.create({
        data: {
          email: student.email,
          password: hashedPassword,
          name: student.name,
          nim: student.nim,
          role: 'STUDENT',
        },
      });

      console.log('✓ Student user created:', {
        id: createdStudent.id,
        email: createdStudent.email,
        name: createdStudent.name,
        nim: createdStudent.nim,
      });
    } else {
      console.log(`⊘ Student ${student.email} already exists`);
    }
  }

  console.log('✓ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('✗ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
