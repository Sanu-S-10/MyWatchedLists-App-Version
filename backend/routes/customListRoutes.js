import express from 'express';
import {
    getCustomLists,
    createCustomList,
    updateCustomList,
    deleteCustomList,
    getSharedCustomList,
} from '../controllers/customListController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/shared/:shareId', getSharedCustomList);

router
    .route('/')
    .get(protect, getCustomLists)
    .post(protect, createCustomList);

router
    .route('/:id')
    .put(protect, updateCustomList)
    .delete(protect, deleteCustomList);

export default router;
