import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import dns from 'dns'

// Load .env BEFORE any other imports that depend on env vars
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split(/\r?\n/).forEach(line => {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) return

    const [key, ...valueParts] = trimmedLine.split('=')
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim()
      value = value.replace(/^(['"])(.*)\1$/, '$2')
      process.env[key.trim()] = value
    }
  })
}

// Apply Google DNS workaround if enabled (must be after .env load)
if (process.env.MONGODB_USE_GOOGLE_DNS === 'true') {
  dns.setServers(['8.8.8.8', '8.8.4.4'])
  console.log('Using Google DNS for MongoDB resolution')
}

// Now import modules that depend on env vars
import mongoose from 'mongoose'
import Admin from '../lib/models/Admin'

async function seedAdmin() {
  const MONGODB_URI = process.env.MONGODB_URI

  if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable')
    process.exit(1)
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
    })
    console.log('Connected to MongoDB')

    const username = process.env.ADMIN_USERNAME || 'admin'
    const password = process.env.ADMIN_PASSWORD || 'admin123'

    const existingAdmin = await Admin.findOne({ username })
    const passwordHash = await bcrypt.hash(password, 12)

    if (existingAdmin) {
      console.log('Admin user already exists. Updating password...')
      existingAdmin.passwordHash = passwordHash
      await existingAdmin.save()
      console.log('Admin password updated successfully.')
    } else {
      await Admin.create({
        username,
        passwordHash,
        role: 'admin',
      })
      console.log('Admin user created successfully.')
    }

    console.log(`Username: ${username}`)
    console.log(`Password: ${password}`)
    console.log('Please change the password after login if using defaults.')

    process.exit(0)
  } catch (error) {
    console.error('Error seeding admin:', error)
    process.exit(1)
  }
}

seedAdmin()
