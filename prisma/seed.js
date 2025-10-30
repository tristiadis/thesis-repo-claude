const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log('');

  // Get bcrypt rounds from env or use default
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;

  // ============================================================================
  // 1. CREATE FACULTIES
  // ============================================================================
  console.log('📚 Seeding Faculties...');

  const faculties = [
    {
      code: 'FMIPA',
      name: 'Fakultas Matematika dan Ilmu Pengetahuan Alam',
      nameEn: 'Faculty of Mathematics and Natural Sciences',
      description: 'Fakultas yang menaungi program studi di bidang sains dan matematika',
    },
    {
      code: 'FT',
      name: 'Fakultas Teknik',
      nameEn: 'Faculty of Engineering',
      description: 'Fakultas yang menaungi program studi di bidang teknik dan rekayasa',
    },
    {
      code: 'FIK',
      name: 'Fakultas Ilmu Komputer',
      nameEn: 'Faculty of Computer Science',
      description: 'Fakultas yang menaungi program studi di bidang teknologi informasi dan komputer',
    },
  ];

  for (const faculty of faculties) {
    const existing = await prisma.faculty.findUnique({
      where: { code: faculty.code },
    });

    if (!existing) {
      const created = await prisma.faculty.create({ data: faculty });
      console.log(`✓ Faculty created: ${created.code} - ${created.name}`);
    } else {
      console.log(`⊘ Faculty ${faculty.code} already exists`);
    }
  }

  // ============================================================================
  // 2. CREATE DEPARTMENTS
  // ============================================================================
  console.log('');
  console.log('🏢 Seeding Departments...');

  const departments = [
    {
      code: 'IF',
      name: 'Informatika',
      nameEn: 'Informatics',
      facultyCode: 'FIK',
    },
    {
      code: 'SI',
      name: 'Sistem Informasi',
      nameEn: 'Information Systems',
      facultyCode: 'FIK',
    },
    {
      code: 'MAT',
      name: 'Matematika',
      nameEn: 'Mathematics',
      facultyCode: 'FMIPA',
    },
    {
      code: 'FIS',
      name: 'Fisika',
      nameEn: 'Physics',
      facultyCode: 'FMIPA',
    },
  ];

  for (const dept of departments) {
    const existing = await prisma.department.findUnique({
      where: { code: dept.code },
    });

    if (!existing) {
      const faculty = await prisma.faculty.findUnique({
        where: { code: dept.facultyCode },
      });

      if (faculty) {
        const created = await prisma.department.create({
          data: {
            code: dept.code,
            name: dept.name,
            nameEn: dept.nameEn,
            facultyId: faculty.id,
          },
        });
        console.log(`✓ Department created: ${created.code} - ${created.name}`);
      }
    } else {
      console.log(`⊘ Department ${dept.code} already exists`);
    }
  }

  // ============================================================================
  // 3. CREATE LECTURERS (with RIS name format: "Last, First")
  // ============================================================================
  console.log('');
  console.log('👨‍🏫 Seeding Lecturers...');

  const lecturers = [
    {
      nidn: '0101010101',
      name: 'Susanto, Budi', // RIS format
      email: 'budi.susanto@university.ac.id',
      departmentCode: 'IF',
    },
    {
      nidn: '0202020202',
      name: 'Wijaya, Siti', // RIS format
      email: 'siti.wijaya@university.ac.id',
      departmentCode: 'IF',
    },
    {
      nidn: '0303030303',
      name: 'Pratama, Ahmad', // RIS format
      email: 'ahmad.pratama@university.ac.id',
      departmentCode: 'IF',
    },
    {
      nidn: '0404040404',
      name: 'Rahman, Dewi', // RIS format
      email: 'dewi.rahman@university.ac.id',
      departmentCode: 'SI',
    },
    {
      nidn: '0505050505',
      name: 'Santoso, Eko', // RIS format
      email: 'eko.santoso@university.ac.id',
      departmentCode: 'MAT',
    },
  ];

  for (const lecturer of lecturers) {
    const existing = await prisma.lecturer.findUnique({
      where: { nidn: lecturer.nidn },
    });

    if (!existing) {
      const department = await prisma.department.findUnique({
        where: { code: lecturer.departmentCode },
      });

      if (department) {
        const created = await prisma.lecturer.create({
          data: {
            nidn: lecturer.nidn,
            name: lecturer.name,
            email: lecturer.email,
            departmentId: department.id,
          },
        });
        console.log(`✓ Lecturer created: ${created.name} (${created.nidn})`);
      }
    } else {
      console.log(`⊘ Lecturer ${lecturer.nidn} already exists`);
    }
  }

  // ============================================================================
  // 4. CREATE USERS (Admin and Students)
  // ============================================================================
  console.log('');
  console.log('👤 Seeding Users...');

  // Admin user
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        password: hashedPassword,
        name: adminName,
        email: adminEmail,
        role: 'ADMIN',
      },
    });

    console.log(`✓ Admin user created: ${admin.username} (${admin.name})`);
  } else {
    console.log(`⊘ Admin user ${adminUsername} already exists`);
  }

  // Student users
  const students = [
    {
      username: 'student1',
      password: 'Student123!',
      name: 'John Doe',
      email: 'john.doe@student.ac.id',
    },
    {
      username: 'student2',
      password: 'Student123!',
      name: 'Jane Smith',
      email: 'jane.smith@student.ac.id',
    },
    {
      username: 'student3',
      password: 'Student123!',
      name: 'Michael Johnson',
      email: 'michael.johnson@student.ac.id',
    },
  ];

  for (const student of students) {
    const existingStudent = await prisma.user.findUnique({
      where: { username: student.username },
    });

    if (!existingStudent) {
      const hashedPassword = await bcrypt.hash(student.password, saltRounds);

      const createdStudent = await prisma.user.create({
        data: {
          username: student.username,
          password: hashedPassword,
          name: student.name,
          email: student.email,
          role: 'STUDENT',
        },
      });

      console.log(`✓ Student user created: ${createdStudent.username} (${createdStudent.name})`);
    } else {
      console.log(`⊘ Student ${student.username} already exists`);
    }
  }

  // ============================================================================
  // 5. CREATE SYSTEM SETTINGS
  // ============================================================================
  console.log('');
  console.log('⚙️  Seeding System Settings...');

  const settings = [
    {
      settingKey: 'site_name',
      settingValue: 'Thesis Repository System',
      settingType: 'STRING',
      description: 'Name of the thesis repository system',
    },
    {
      settingKey: 'max_file_size',
      settingValue: '10485760',
      settingType: 'INTEGER',
      description: 'Maximum file upload size in bytes (10MB)',
    },
    {
      settingKey: 'allow_public_access',
      settingValue: 'true',
      settingType: 'BOOLEAN',
      description: 'Allow public access to approved theses',
    },
    {
      settingKey: 'items_per_page',
      settingValue: '10',
      settingType: 'INTEGER',
      description: 'Number of items to display per page',
    },
    {
      settingKey: 'allowed_file_types',
      settingValue: JSON.stringify(['.pdf', '.doc', '.docx', '.zip', '.rar']),
      settingType: 'JSON',
      description: 'Allowed file types for thesis uploads',
    },
  ];

  for (const setting of settings) {
    const existing = await prisma.systemSetting.findUnique({
      where: { settingKey: setting.settingKey },
    });

    if (!existing) {
      const created = await prisma.systemSetting.create({ data: setting });
      console.log(`✓ Setting created: ${created.settingKey}`);
    } else {
      console.log(`⊘ Setting ${setting.settingKey} already exists`);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('✓ Database seeding completed successfully!');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('📝 Summary:');
  console.log(`   Faculties: ${faculties.length}`);
  console.log(`   Departments: ${departments.length}`);
  console.log(`   Lecturers: ${lecturers.length}`);
  console.log(`   Users: ${1 + students.length} (1 admin + ${students.length} students)`);
  console.log(`   System Settings: ${settings.length}`);
  console.log('');
  console.log('🔐 Default Admin Credentials:');
  console.log(`   Username: ${adminUsername}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('');
  console.log('🎓 Default Student Credentials:');
  console.log('   Username: student1, student2, student3');
  console.log('   Password: Student123!');
  console.log('');
  console.log('⚠️  IMPORTANT: Change default passwords in production!');
  console.log('');
}

main()
  .catch((e) => {
    console.error('✗ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
