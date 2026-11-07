import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Input validation
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        const usernameRegex = /^[a-zA-Z0-9_\-]{3,32}$/;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ message: 'Invalid username format' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const user = await User.create({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password,
            preferences: {
                theme: 'dark'
            }
        });
        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                preferences: user.preferences,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (err) {
        // Log error internally, generic message to client
        console.error('Register error:', err);
        res.status(500).json({ message: 'Registration failed. Please try again later.' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Input validation
        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                preferences: user.preferences,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Login failed. Please try again later.' });
    }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            preferences: user.preferences,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Update user preferences (theme) and profile (username, email)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            // Update username if provided
            if (req.body.username) {
                const usernameRegex = /^[a-zA-Z0-9_\-]{3,32}$/;
                if (!usernameRegex.test(req.body.username)) {
                    return res.status(400).json({ success: false, message: 'Invalid username format' });
                }
                const existingUser = await User.findOne({ username: req.body.username, _id: { $ne: user._id } });
                if (existingUser) {
                    return res.status(400).json({ success: false, message: 'Username already taken' });
                }
                user.username = req.body.username.trim();
            }
            // Update email if provided
            if (req.body.email) {
                const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
                if (!emailRegex.test(req.body.email)) {
                    return res.status(400).json({ success: false, message: 'Invalid email format' });
                }
                const existingUser = await User.findOne({ email: req.body.email, _id: { $ne: user._id } });
                if (existingUser) {
                    return res.status(400).json({ success: false, message: 'Email already in use' });
                }
                user.email = req.body.email.trim().toLowerCase();
            }
            // Ensure preferences object exists
            if (!user.preferences) {
                user.preferences = {};
            }
            if (req.body.theme) {
                user.preferences.theme = req.body.theme;
                user.markModified('preferences');
            }
            if (req.body.password) {
                if (req.body.password.length < 8) {
                    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
                }
                user.password = req.body.password;
            }
            const updatedUser = await user.save();
            res.json({
                success: true,
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                preferences: updatedUser.preferences,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, message: 'Profile update failed. Please try again later.' });
    }
};

export { registerUser, authUser, getUserProfile, updateUserProfile };
