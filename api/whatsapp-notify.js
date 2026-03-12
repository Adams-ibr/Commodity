// =====================================================
// WHATSAPP NOTIFICATION SERVERLESS FUNCTION
// =====================================================

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, recipient = process.env.WHATSAPP_RECIPIENT } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message content is required' });
    }

    if (!recipient) {
        return res.status(400).json({ error: 'Recipient phone number is required' });
    }

    // UltraMsg Configuration (Default)
    const instanceId = process.env.WHATSAPP_INSTANCE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    if (!instanceId || !token) {
        console.error('Missing WhatsApp API credentials');
        return res.status(500).json({ error: 'WhatsApp API not configured' });
    }

    try {
        const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                token: token,
                to: recipient,
                body: message
            })
        });

        const data = await response.json();

        if (response.ok) {
            return res.status(200).json({ success: true, data });
        } else {
            console.error('WhatsApp API error:', data);
            return res.status(response.status).json({ error: 'Failed to send WhatsApp message', details: data });
        }
    } catch (error) {
        console.error('Unexpected error in whatsapp-notify:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
