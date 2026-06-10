import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import dns from 'dns'

// Load .env BEFORE any other imports that depend on env vars
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

// Apply Google DNS workaround if enabled (must be after .env load)
if (process.env.MONGODB_USE_GOOGLE_DNS === 'true') {
    dns.setServers(['8.8.8.8', '8.8.4.4'])
    console.log('Using Google DNS for MongoDB resolution')
}

// Now import modules that depend on env vars
import connectDB from '../lib/db/mongodb'
import Admin from '../lib/models/Admin'

async function checkAdmin() {
    try {
        await connectDB()
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
