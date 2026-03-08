import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import Admin from '../lib/models/Admin'

// Manual .env loader
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=')
        if (key && value.length > 0) {
            process.env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1')
        }
    })
}

async function checkAdmin() {
    const MONGODB_URI = process.env.MONGODB_URI

    if (!MONGODB_URI) {
        console.error('Please define the MONGODB_URI environment variable')
        process.exit(1)
    }

    try {
        await mongoose.connect(MONGODB_URI)
        console.log('Connected to MongoDB')

        const admins = await Admin.find({})
        console.log(`Found ${admins.length} admin(s)`)

        for (const admin of admins) {
            console.log('--- Admin Info ---')
            console.log(`ID: ${admin._id}`)
            console.log(`Username: ${admin.username}`)

            const envPassword = process.env.ADMIN_PASSWORD
            if (envPassword) {
                const isValid = await bcrypt.compare(envPassword, admin.passwordHash)
                console.log(`Password matches .env ADMIN_PASSWORD: ${isValid}`)
                console.log(`Password length in .env: ${envPassword.length}`)
            } else {
                console.log('ADMIN_PASSWORD not found in .env')
            }
        }

        process.exit(0)
    } catch (error) {
        console.error('Error checking admin:', error)
        process.exit(1)
    }
}

checkAdmin()
