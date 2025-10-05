const express = require('express');
const router = express.Router();
const VSPhoneAPI = require('../services/vsphone-api');

const api = new VSPhoneAPI();

// Get all instances
router.get('/instances', async (req, res) => {
    try {
        const instances = await api.getInstances();
        res.json(instances);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new instance
router.post('/instances/create', async (req, res) => {
    try {
        const { androidVersion, goodId } = req.body;
        const result = await api.createInstance(androidVersion, goodId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Restart instance
router.post('/instances/restart', async (req, res) => {
    try {
        const { padCodes } = req.body;
        const result = await api.restartInstance(padCodes);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Execute ADB command
router.post('/instances/command', async (req, res) => {
    try {
        const { padCode, command } = req.body;
        const result = await api.executeCommand(padCode, command);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload file to instance
router.post('/instances/upload', async (req, res) => {
    try {
        const { padCode, fileUrl, autoInstall } = req.body;
        const result = await api.uploadFile(padCode, fileUrl, autoInstall);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;