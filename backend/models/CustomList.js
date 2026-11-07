import mongoose from 'mongoose';

const customListItemSchema = new mongoose.Schema(
    {
        watchItem: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WatchItem',
            required: true,
        },
        tmdbId: {
            type: Number,
            required: true,
        },
        mediaType: {
            type: String,
            enum: ['movie', 'series'],
            required: true,
        },
        subType: {
            type: String,
            enum: ['anime', 'animation', 'documentary', 'live_action'],
            default: 'live_action',
        },
        title: {
            type: String,
            required: true,
        },
        posterPath: {
            type: String,
            default: '',
        },
        releaseDate: {
            type: String,
            default: '',
        },
    },
    { _id: false }
);

const customListSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 400,
            default: '',
        },
        items: {
            type: [customListItemSchema],
            default: [],
        },
        shareId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        isPublic: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const CustomList = mongoose.model('CustomList', customListSchema);

export default CustomList;
