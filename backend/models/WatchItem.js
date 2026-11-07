import mongoose from 'mongoose';

const watchItemSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        tmdbId: {
            type: Number,
            required: true,
        },
        mediaType: {
            type: String,
            required: true,
            enum: ['movie', 'series'],
        },
        subType: {
            type: String,
            enum: ['anime', 'animation', 'documentary', 'live_action'],
            default: 'live_action'
        },
        status: {
            type: String,
            enum: ['watched', 'watch_later'],
            default: 'watched'
        },
        title: {
            type: String,
            required: true,
        },
        posterPath: {
            type: String,
        },
        originCountry: {
            type: String,
        },
        releaseDate: {
            type: String,
        },
        genres: [
            {
                id: Number,
                name: String,
            },
        ],
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        userNotes: {
            type: String,
            default: '',
        },
        isFavorite: {
            type: Boolean,
            default: false,
        },
        watchDate: {
            type: Date,
            default: Date.now,
        },
        lastWatchedDate: {
            type: Date,
        },
        watchTimeMinutes: {
            type: Number,
            default: 0,
        },
        // Extracted specific data
        runtime: { type: Number }, // For movies
        seasons: { type: Number }, // For series
        episodes: { type: Number }, // For series
        episodeDuration: { type: Number }, // For series
        watchedSeasons: [{ type: Number }], // Track exactly which seasons were watched
        watchedEpisodes: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
        }, // Granular episode tracking (supports ["S1E1"] string format and legacy objects)
        hasNewSeasonReleased: {
            type: Boolean,
            default: false,
        }, // Track if a new season has been released that hasn't been watched
    },
    {
        timestamps: true,
    }
);

const WatchItem = mongoose.model('WatchItem', watchItemSchema);

export default WatchItem;
