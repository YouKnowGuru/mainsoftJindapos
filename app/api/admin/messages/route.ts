import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db/mongodb'
import { ContactMessage } from '@/lib/models/contact-message'

// GET /api/admin/messages - Fetch all contact messages
export async function GET(req: NextRequest) {
    try {
        await connectDB()

        // Fetch messages sorted by newest first
        const messages = await ContactMessage.find({}).sort({ createdAt: -1 })

        return NextResponse.json({
            success: true,
            data: messages,
        })
    } catch (error) {
        console.error('Failed to fetch messages:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch messages' },
            { status: 500 }
        )
    }
}

// PATCH /api/admin/messages - Update message status (e.g. mark as read)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json()
        const { id, status } = body

        if (!id || !status) {
            return NextResponse.json(
                { success: false, error: 'ID and Status are required' },
                { status: 400 }
            )
        }

        await connectDB()

        const updatedMessage = await ContactMessage.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        )

        if (!updatedMessage) {
            return NextResponse.json(
                { success: false, error: 'Message not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: updatedMessage,
        })
    } catch (error) {
        console.error('Failed to update message status:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update message status' },
            { status: 500 }
        )
    }
}
