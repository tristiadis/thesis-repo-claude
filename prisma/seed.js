const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log('');

  // Get bcrypt rounds from env or use default
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;

  // ============================================================================
  // 1. CREATE FACULTIES (3 faculties)
  // ============================================================================
  console.log('📚 Seeding Faculties...');

  const faculties = [
    {
      code: 'FT',
      name: 'Fakultas Teknik',
      nameEn: 'Faculty of Engineering',
      description: 'Fakultas yang menaungi program studi di bidang teknik dan rekayasa',
    },
    {
      code: 'FEB',
      name: 'Fakultas Ekonomi dan Bisnis',
      nameEn: 'Faculty of Economics and Business',
      description: 'Fakultas yang menaungi program studi di bidang ekonomi dan bisnis',
    },
    {
      code: 'FISIP',
      name: 'Fakultas Ilmu Sosial dan Politik',
      nameEn: 'Faculty of Social and Political Sciences',
      description: 'Fakultas yang menaungi program studi di bidang ilmu sosial dan politik',
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
  // 2. CREATE DEPARTMENTS (15 departments - 5 per faculty)
  // ============================================================================
  console.log('');
  console.log('🏢 Seeding Departments...');

  const departments = [
    // Fakultas Teknik (5 departments)
    {
      code: 'TIF',
      name: 'Teknik Informatika',
      nameEn: 'Informatics Engineering',
      facultyCode: 'FT',
    },
    {
      code: 'TE',
      name: 'Teknik Elektro',
      nameEn: 'Electrical Engineering',
      facultyCode: 'FT',
    },
    {
      code: 'TS',
      name: 'Teknik Sipil',
      nameEn: 'Civil Engineering',
      facultyCode: 'FT',
    },
    {
      code: 'TM',
      name: 'Teknik Mesin',
      nameEn: 'Mechanical Engineering',
      facultyCode: 'FT',
    },
    {
      code: 'TI',
      name: 'Teknik Industri',
      nameEn: 'Industrial Engineering',
      facultyCode: 'FT',
    },
    // Fakultas Ekonomi dan Bisnis (5 departments)
    {
      code: 'AKT',
      name: 'Akuntansi',
      nameEn: 'Accounting',
      facultyCode: 'FEB',
    },
    {
      code: 'MNJ',
      name: 'Manajemen',
      nameEn: 'Management',
      facultyCode: 'FEB',
    },
    {
      code: 'EKO',
      name: 'Ekonomi Pembangunan',
      nameEn: 'Development Economics',
      facultyCode: 'FEB',
    },
    {
      code: 'BIS',
      name: 'Administrasi Bisnis',
      nameEn: 'Business Administration',
      facultyCode: 'FEB',
    },
    {
      code: 'EKI',
      name: 'Ekonomi Islam',
      nameEn: 'Islamic Economics',
      facultyCode: 'FEB',
    },
    // Fakultas Ilmu Sosial dan Politik (5 departments)
    {
      code: 'IP',
      name: 'Ilmu Politik',
      nameEn: 'Political Science',
      facultyCode: 'FISIP',
    },
    {
      code: 'ADN',
      name: 'Administrasi Negara',
      nameEn: 'Public Administration',
      facultyCode: 'FISIP',
    },
    {
      code: 'HI',
      name: 'Hubungan Internasional',
      nameEn: 'International Relations',
      facultyCode: 'FISIP',
    },
    {
      code: 'KOM',
      name: 'Ilmu Komunikasi',
      nameEn: 'Communication Studies',
      facultyCode: 'FISIP',
    },
    {
      code: 'SOS',
      name: 'Sosiologi',
      nameEn: 'Sociology',
      facultyCode: 'FISIP',
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
  // 3. CREATE LECTURERS (20 lecturers with RIS name format: "Last, First")
  // ============================================================================
  console.log('');
  console.log('👨‍🏫 Seeding Lecturers...');

  const lecturers = [
    // Engineering lecturers
    {
      nidn: '0101088901',
      name: 'Susanto, Budi', // RIS format
      email: 'budi.susanto@university.edu',
      departmentCode: 'TIF',
    },
    {
      nidn: '0202089002',
      name: 'Wijaya, Siti', // RIS format
      email: 'siti.wijaya@university.edu',
      departmentCode: 'TIF',
    },
    {
      nidn: '0303089103',
      name: 'Pratama, Ahmad', // RIS format
      email: 'ahmad.pratama@university.edu',
      departmentCode: 'TE',
    },
    {
      nidn: '0404089204',
      name: 'Rahman, Dewi', // RIS format
      email: 'dewi.rahman@university.edu',
      departmentCode: 'TE',
    },
    {
      nidn: '0505089305',
      name: 'Santoso, Eko', // RIS format
      email: 'eko.santoso@university.edu',
      departmentCode: 'TS',
    },
    {
      nidn: '0606089406',
      name: 'Kurniawan, Andi', // RIS format
      email: 'andi.kurniawan@university.edu',
      departmentCode: 'TM',
    },
    {
      nidn: '0707089507',
      name: 'Putri, Rina', // RIS format
      email: 'rina.putri@university.edu',
      departmentCode: 'TI',
    },
    // Economics and Business lecturers
    {
      nidn: '0808089608',
      name: 'Hidayat, Agus', // RIS format
      email: 'agus.hidayat@university.edu',
      departmentCode: 'AKT',
    },
    {
      nidn: '0909089709',
      name: 'Permata, Sari', // RIS format
      email: 'sari.permata@university.edu',
      departmentCode: 'AKT',
    },
    {
      nidn: '1010089810',
      name: 'Nugroho, Hadi', // RIS format
      email: 'hadi.nugroho@university.edu',
      departmentCode: 'MNJ',
    },
    {
      nidn: '1111089911',
      name: 'Kusuma, Indah', // RIS format
      email: 'indah.kusuma@university.edu',
      departmentCode: 'MNJ',
    },
    {
      nidn: '1212090012',
      name: 'Setiawan, Yudi', // RIS format
      email: 'yudi.setiawan@university.edu',
      departmentCode: 'EKO',
    },
    {
      nidn: '1313090113',
      name: 'Lestari, Maya', // RIS format
      email: 'maya.lestari@university.edu',
      departmentCode: 'BIS',
    },
    {
      nidn: '1414090214',
      name: 'Wibowo, Dedi', // RIS format
      email: 'dedi.wibowo@university.edu',
      departmentCode: 'EKI',
    },
    // Social and Political Sciences lecturers
    {
      nidn: '1515090315',
      name: 'Hartono, Bambang', // RIS format
      email: 'bambang.hartono@university.edu',
      departmentCode: 'IP',
    },
    {
      nidn: '1616090416',
      name: 'Anggraini, Fitri', // RIS format
      email: 'fitri.anggraini@university.edu',
      departmentCode: 'IP',
    },
    {
      nidn: '1717090517',
      name: 'Saputra, Rudi', // RIS format
      email: 'rudi.saputra@university.edu',
      departmentCode: 'ADN',
    },
    {
      nidn: '1818090618',
      name: 'Maharani, Diah', // RIS format
      email: 'diah.maharani@university.edu',
      departmentCode: 'HI',
    },
    {
      nidn: '1919090719',
      name: 'Firmansyah, Eko', // RIS format
      email: 'eko.firmansyah@university.edu',
      departmentCode: 'KOM',
    },
    {
      nidn: '2020090820',
      name: 'Nurjannah, Ani', // RIS format
      email: 'ani.nurjannah@university.edu',
      departmentCode: 'SOS',
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
  // 4. CREATE USERS (1 Admin + 5 Students)
  // ============================================================================
  console.log('');
  console.log('👤 Seeding Users...');

  // Admin user
  const adminUsername = 'admin';
  const adminPassword = 'admin123';
  const adminName = 'System Administrator';
  const adminEmail = 'admin@university.edu';

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

  // Student users (5 students)
  const students = [
    {
      username: 'student1',
      password: 'student123',
      name: 'Andi Saputra',
      email: 'andi.saputra@student.university.edu',
    },
    {
      username: 'student2',
      password: 'student123',
      name: 'Budi Santoso',
      email: 'budi.santoso@student.university.edu',
    },
    {
      username: 'student3',
      password: 'student123',
      name: 'Citra Dewi',
      email: 'citra.dewi@student.university.edu',
    },
    {
      username: 'student4',
      password: 'student123',
      name: 'Dedi Kurniawan',
      email: 'dedi.kurniawan@student.university.edu',
    },
    {
      username: 'student5',
      password: 'student123',
      name: 'Eka Putri',
      email: 'eka.putri@student.university.edu',
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
  // 5. CREATE SAMPLE THESES (3 approved theses)
  // ============================================================================
  console.log('');
  console.log('📄 Seeding Sample Theses...');

  // Get required data for theses
  const tifDept = await prisma.department.findUnique({ where: { code: 'TIF' } });
  const mnjDept = await prisma.department.findUnique({ where: { code: 'MNJ' } });
  const ipDept = await prisma.department.findUnique({ where: { code: 'IP' } });
  const student1User = await prisma.user.findUnique({ where: { username: 'student1' } });
  const student2User = await prisma.user.findUnique({ where: { username: 'student2' } });
  const student3User = await prisma.user.findUnique({ where: { username: 'student3' } });
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });

  // Get lecturers for advisors/examiners
  const lec1 = await prisma.lecturer.findUnique({ where: { nidn: '0101088901' } });
  const lec2 = await prisma.lecturer.findUnique({ where: { nidn: '0202089002' } });
  const lec10 = await prisma.lecturer.findUnique({ where: { nidn: '1010089810' } });
  const lec11 = await prisma.lecturer.findUnique({ where: { nidn: '1111089911' } });
  const lec15 = await prisma.lecturer.findUnique({ where: { nidn: '1515090315' } });
  const lec16 = await prisma.lecturer.findUnique({ where: { nidn: '1616090416' } });

  const sampleTheses = [
    {
      title: 'Implementasi Machine Learning untuk Prediksi Cuaca Menggunakan Algoritma Random Forest',
      titleEn: 'Implementation of Machine Learning for Weather Prediction Using Random Forest Algorithm',
      authorName: 'Andi Saputra',
      studentId: '1234567890',
      graduationYear: 2024,
      defenseDate: new Date('2024-06-15'),
      abstractId: 'Penelitian ini membahas implementasi machine learning untuk prediksi cuaca menggunakan algoritma Random Forest. Data yang digunakan adalah data cuaca historis dari BMKG selama 10 tahun terakhir. Hasil penelitian menunjukkan bahwa algoritma Random Forest mampu memprediksi cuaca dengan akurasi 87.5%. Sistem ini dapat membantu masyarakat dalam mempersiapkan aktivitas sehari-hari berdasarkan prediksi cuaca yang akurat.',
      abstractEn: 'This research discusses the implementation of machine learning for weather prediction using the Random Forest algorithm. The data used is historical weather data from BMKG for the last 10 years. The results show that the Random Forest algorithm can predict weather with 87.5% accuracy. This system can help people prepare daily activities based on accurate weather predictions.',
      keywords: 'machine learning, prediksi cuaca, random forest, data mining',
      keywordsEn: 'machine learning, weather prediction, random forest, data mining',
      departmentId: tifDept.id,
      submitterId: student1User.id,
      advisor1Id: lec1.id,
      advisor2Id: lec2.id,
      examiner1Id: lec1.id,
      examiner2Id: lec2.id,
      status: 'APPROVED',
      reviewedBy: adminUser.id,
      reviewedAt: new Date('2024-06-20'),
      submittedAt: new Date('2024-06-10'),
      publishedAt: new Date('2024-06-25'),
    },
    {
      title: 'Analisis Pengaruh Digital Marketing terhadap Peningkatan Penjualan UMKM di Era Pandemi',
      titleEn: 'Analysis of the Impact of Digital Marketing on Increasing MSME Sales During the Pandemic Era',
      authorName: 'Budi Santoso',
      studentId: '0987654321',
      graduationYear: 2024,
      defenseDate: new Date('2024-07-20'),
      abstractId: 'Penelitian ini menganalisis pengaruh digital marketing terhadap peningkatan penjualan UMKM di era pandemi COVID-19. Metode penelitian yang digunakan adalah metode kuantitatif dengan teknik survei kepada 100 pelaku UMKM di Kota Bandung. Hasil penelitian menunjukkan bahwa penggunaan digital marketing berpengaruh positif dan signifikan terhadap peningkatan penjualan UMKM dengan kontribusi sebesar 78.3%.',
      abstractEn: 'This study analyzes the influence of digital marketing on increasing MSME sales during the COVID-19 pandemic era. The research method used is a quantitative method with survey techniques to 100 MSME actors in Bandung City. The results show that the use of digital marketing has a positive and significant effect on increasing MSME sales with a contribution of 78.3%.',
      keywords: 'digital marketing, UMKM, penjualan, pandemi, media sosial',
      keywordsEn: 'digital marketing, MSME, sales, pandemic, social media',
      departmentId: mnjDept.id,
      submitterId: student2User.id,
      advisor1Id: lec10.id,
      advisor2Id: lec11.id,
      examiner1Id: lec10.id,
      examiner2Id: lec11.id,
      status: 'APPROVED',
      reviewedBy: adminUser.id,
      reviewedAt: new Date('2024-07-25'),
      submittedAt: new Date('2024-07-15'),
      publishedAt: new Date('2024-08-01'),
    },
    {
      title: 'Peran Media Sosial dalam Meningkatkan Partisipasi Politik Pemilih Muda pada Pemilu 2024',
      titleEn: 'The Role of Social Media in Increasing Young Voter Political Participation in the 2024 Elections',
      authorName: 'Citra Dewi',
      studentId: '1122334455',
      graduationYear: 2024,
      defenseDate: new Date('2024-08-10'),
      abstractId: 'Penelitian ini mengkaji peran media sosial dalam meningkatkan partisipasi politik pemilih muda pada Pemilu 2024. Metode penelitian yang digunakan adalah metode kualitatif dengan teknik wawancara mendalam kepada 30 pemilih muda berusia 17-25 tahun. Hasil penelitian menunjukkan bahwa media sosial memiliki peran yang sangat penting dalam meningkatkan kesadaran politik dan partisipasi pemilih muda melalui penyebaran informasi, diskusi politik, dan kampanye digital.',
      abstractEn: 'This study examines the role of social media in increasing young voter political participation in the 2024 Elections. The research method used is a qualitative method with in-depth interview techniques to 30 young voters aged 17-25 years. The results show that social media has a very important role in increasing political awareness and young voter participation through information dissemination, political discussions, and digital campaigns.',
      keywords: 'media sosial, partisipasi politik, pemilih muda, pemilu, demokrasi',
      keywordsEn: 'social media, political participation, young voters, elections, democracy',
      departmentId: ipDept.id,
      submitterId: student3User.id,
      advisor1Id: lec15.id,
      advisor2Id: lec16.id,
      examiner1Id: lec15.id,
      examiner2Id: lec16.id,
      status: 'APPROVED',
      reviewedBy: adminUser.id,
      reviewedAt: new Date('2024-08-15'),
      submittedAt: new Date('2024-08-05'),
      publishedAt: new Date('2024-08-20'),
    },
  ];

  const createdTheses = [];
  for (const thesisData of sampleTheses) {
    const existingThesis = await prisma.thesis.findFirst({
      where: {
        title: thesisData.title,
        studentId: thesisData.studentId,
      },
    });

    if (!existingThesis) {
      const created = await prisma.thesis.create({ data: thesisData });
      createdTheses.push(created);
      console.log(`✓ Thesis created: ${created.title.substring(0, 50)}...`);
    } else {
      createdTheses.push(existingThesis);
      console.log(`⊘ Thesis already exists: ${thesisData.title.substring(0, 50)}...`);
    }
  }

  // ============================================================================
  // 6. CREATE THESIS FILES (for each sample thesis)
  // ============================================================================
  console.log('');
  console.log('📁 Seeding Thesis Files...');

  const fileTypes = ['COVER', 'CHAPTER_1', 'CHAPTER_2', 'CHAPTER_3', 'CHAPTER_4', 'CHAPTER_5', 'BIBLIOGRAPHY'];

  for (const thesis of createdTheses) {
    let sequenceOrder = 0;
    for (const fileType of fileTypes) {
      const existingFile = await prisma.thesisFile.findFirst({
        where: {
          thesisId: thesis.id,
          fileType: fileType,
        },
      });

      if (!existingFile) {
        await prisma.thesisFile.create({
          data: {
            thesisId: thesis.id,
            fileType: fileType,
            filename: `thesis-${thesis.id}-${fileType.toLowerCase()}.pdf`,
            originalFilename: `${fileType.toLowerCase()}.pdf`,
            filePath: `public/uploads/theses/sample-${thesis.id}-${fileType.toLowerCase()}.pdf`,
            fileSize: Math.floor(Math.random() * 5000000) + 500000, // Random size 500KB - 5MB
            mimeType: 'application/pdf',
            checksum: `sha256-${Math.random().toString(36).substring(2, 15)}`,
            accessLevel: 'PUBLIC',
            sequenceOrder: sequenceOrder++,
          },
        });
        console.log(`  ✓ File created for Thesis #${thesis.id}: ${fileType}`);
      } else {
        console.log(`  ⊘ File already exists for Thesis #${thesis.id}: ${fileType}`);
      }
    }
  }

  // ============================================================================
  // 7. CREATE SYSTEM SETTINGS
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

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✓ Database seeding completed successfully!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Faculties: ${faculties.length}`);
  console.log(`   Departments: ${departments.length}`);
  console.log(`   Lecturers: ${lecturers.length}`);
  console.log(`   Users: ${1 + students.length} (1 admin + ${students.length} students)`);
  console.log(`   Sample Theses: ${sampleTheses.length} (APPROVED)`);
  console.log(`   Thesis Files: ${createdTheses.length * fileTypes.length} (${fileTypes.length} files per thesis)`);
  console.log(`   System Settings: ${settings.length}`);
  console.log('');
  console.log('🔐 Default Admin Credentials:');
  console.log(`   Username: ${adminUsername}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('');
  console.log('🎓 Default Student Credentials:');
  console.log('   Username: student1, student2, student3, student4, student5');
  console.log('   Password: student123');
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
