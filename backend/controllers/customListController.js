import crypto from 'crypto';
import mongoose from 'mongoose';
import CustomList from '../models/CustomList.js';
import WatchItem from '../models/WatchItem.js';

const normalizeItemIds = (itemIds) => {
    if (!Array.isArray(itemIds)) return [];
    return itemIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
};

const buildItemsSnapshot = async (userId, itemIds) => {
    const normalizedIds = normalizeItemIds(itemIds);
    if (normalizedIds.length === 0) return [];

    const watchItems = await WatchItem.find({
        user: userId,
        _id: { $in: normalizedIds },
    }).lean();

    const lookup = new Map(watchItems.map((item) => [item._id.toString(), item]));

    return normalizedIds
        .map((id) => lookup.get(id.toString()))
        .filter(Boolean)
        .map((item) => ({
            watchItem: item._id,
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            subType: item.subType || 'live_action',
            title: item.title,
            posterPath: item.posterPath || '',
            releaseDate: item.releaseDate || '',
        }));
};

const toResponse = (list) => ({
    _id: list._id,
    name: list.name,
    description: list.description,
    isPublic: list.isPublic,
    shareId: list.shareId,
    itemCount: list.items.length,
    items: list.items,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
});

const getCustomLists = async (req, res) => {
    const lists = await CustomList.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json(lists.map(toResponse));
};

const createCustomList = async (req, res) => {
    const { name, description, itemIds, isPublic } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'List name is required' });
    }

    const items = await buildItemsSnapshot(req.user._id, itemIds);

    const customList = await CustomList.create({
        user: req.user._id,
        name: name.trim(),
        description: description?.trim() || '',
        items,
        shareId: crypto.randomBytes(10).toString('hex'),
        isPublic: typeof isPublic === 'boolean' ? isPublic : true,
    });

    res.status(201).json(toResponse(customList));
};

const updateCustomList = async (req, res) => {
    const { name, description, itemIds, isPublic } = req.body;
    const customList = await CustomList.findById(req.params.id);

    if (!customList) {
        return res.status(404).json({ message: 'List not found' });
    }

    if (customList.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    if (typeof name === 'string') {
        if (!name.trim()) {
            return res.status(400).json({ message: 'List name is required' });
        }
        customList.name = name.trim();
    }

    if (typeof description === 'string') {
        customList.description = description.trim();
    }

    if (Array.isArray(itemIds)) {
        customList.items = await buildItemsSnapshot(req.user._id, itemIds);
    }

    if (typeof isPublic === 'boolean') {
        customList.isPublic = isPublic;
    }

    const updated = await customList.save();
    res.json(toResponse(updated));
};

const deleteCustomList = async (req, res) => {
    const customList = await CustomList.findById(req.params.id);

    if (!customList) {
        return res.status(404).json({ message: 'List not found' });
    }

    if (customList.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    await customList.deleteOne();
    res.json({ message: 'List removed' });
};

const getSharedCustomList = async (req, res) => {
    const list = await CustomList.findOne({ shareId: req.params.shareId }).lean();

    if (!list || !list.isPublic) {
        return res.status(404).json({ message: 'Shared list not found' });
    }

    const sharedItems = (list.items || []).map((item) => ({
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        subType: item.subType,
        title: item.title,
        posterPath: item.posterPath,
        releaseDate: item.releaseDate,
    }));

    res.json({
        name: list.name,
        description: list.description,
        itemCount: sharedItems.length,
        items: sharedItems,
    });
};

export {
    getCustomLists,
    createCustomList,
    updateCustomList,
    deleteCustomList,
    getSharedCustomList,
};
