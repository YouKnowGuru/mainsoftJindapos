import mongoose from 'mongoose';

const ContactMessageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['Unread', 'Read', 'Replied'],
            default: 'Unread',
        },
        replyNote: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

export const ContactMessage =
    mongoose.models.ContactMessage || mongoose.model('ContactMessage', ContactMessageSchema);
