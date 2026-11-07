import express from 'express';
import {
    getWatchHistory,
    addWatchItem,
    updateWatchItem,
    deleteWatchItem,
    clearWatchHistory,
    aiFilterItems,
} from '../controllers/watchItemController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router
    .route('/')
    .get(protect, getWatchHistory)
    .post(protect, addWatchItem)
    .delete(protect, clearWatchHistory);
router
    .route('/ai-filter')
    .post(protect, aiFilterItems);
router
    .route('/:id')
    .put(protect, updateWatchItem)
    .delete(protect, deleteWatchItem);

export default router;
