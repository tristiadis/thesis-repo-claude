# Thesis Repository System

A comprehensive thesis repository management system built with Node.js, Express.js, Prisma ORM, and PostgreSQL.

## Features

- User authentication and authorization (Admin, Student roles)
- Thesis submission and management
- File upload functionality
- Session management
- Responsive web interface with EJS templates

## Tech Stack

- **Backend**: Node.js 18+ LTS
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5.x
- **Template Engine**: EJS
- **Authentication**: Passport.js with bcrypt
- **Session Management**: express-session
- **File Upload**: Multer

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm (v9 or higher)
- PostgreSQL (v15 or higher)
- Git

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd thesis-repository-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL database

Create a new PostgreSQL database:

```sql
CREATE DATABASE thesis_repo_db;
```

Or using psql command line:

```bash
psql -U postgres
CREATE DATABASE thesis_repo_db;
\q
```

### 4. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` file and configure your settings:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/thesis_repo_db?schema=public
SESSION_SECRET=your-super-secret-session-key-change-this
PORT=3000
```

**Important**: Replace `username` and `password` with your PostgreSQL credentials.

### 5. Set up Prisma

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

(Optional) Seed the database with initial data:

```bash
npm run prisma:seed
```

### 6. Create upload directories

```bash
mkdir -p public/uploads/thesis
mkdir -p public/uploads/profiles
```

### 7. Start the application

For development (with auto-reload):

```bash
npm run dev
```

For production:

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
thesis-repository-system/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js
│   │   ├── passport.js
│   │   └── multer.js
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── routes/          # Route definitions
│   ├── services/        # Business logic
│   └── utils/           # Utility functions
├── views/               # EJS templates
│   ├── layouts/         # Layout templates
│   ├── partials/        # Reusable components
│   ├── admin/           # Admin views
│   ├── student/         # Student views
│   └── public/          # Public views
├── public/              # Static files
│   ├── css/            # Stylesheets
│   ├── js/             # Client-side scripts
│   ├── images/         # Images
│   └── uploads/        # Uploaded files
├── prisma/             # Database schema and migrations
│   └── schema.prisma
├── docs/               # Documentation
├── server.js           # Application entry point
└── package.json        # Dependencies and scripts

```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:seed` - Seed the database with initial data
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Development Workflow

1. Make sure PostgreSQL is running
2. Run migrations: `npm run prisma:migrate`
3. Start development server: `npm run dev`
4. Access the application at `http://localhost:3000`
5. View database with Prisma Studio: `npm run prisma:studio`

## Database Migrations

To create a new migration after modifying `prisma/schema.prisma`:

```bash
npm run prisma:migrate
```

To reset the database (⚠️ Warning: This will delete all data):

```bash
npx prisma migrate reset
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret key for session encryption
- `PORT` - Application port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `MAX_FILE_SIZE` - Maximum file upload size in bytes
- `ALLOWED_FILE_TYPES` - Allowed file extensions for uploads

## Security Considerations

- Change `SESSION_SECRET` to a strong, random value in production
- Use HTTPS in production
- Keep dependencies updated
- Don't commit `.env` file to version control
- Set appropriate file upload size limits
- Validate all user inputs
- Use prepared statements (Prisma handles this)

## Troubleshooting

### Database connection errors

- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check DATABASE_URL in `.env` file
- Ensure database exists and credentials are correct

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Module not found errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

ISC

## Support

For issues and questions, please open an issue in the repository.