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

async function resetAdmin() {
    const MONGODB_URI = process.env.MONGODB_URI

    if (!MONGODB_URI) {
        console.error('Please define the MONGODB_URI environment variable')
        process.exit(1)
    }

    try {
        await mongoose.connect(MONGODB_URI)
        console.log('Connected to MongoDB')

        const username = 'admin'
        const password = 'testpassword123' // Hardcoded for testing

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12)

        const result = await Admin.findOneAndUpdate(
            { username },
            { passwordHash },
            { new: true, upsert: true }
        )

        console.log('Admin password reset to: testpassword123')
        console.log(`Username: ${username}`)
        console.log(`Update result: ${result ? 'Success' : 'Failed'}`)

        process.exit(0)
    } catch (error) {
        console.error('Error resetting admin:', error)
        process.exit(1)
    }
}

resetAdmin()
