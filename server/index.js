import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// WhatsApp configuration
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1386503997875308';
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '1794051941635621';
const WHATSAPP_TEST_RECIPIENT_NUMBER = process.env.WHATSAPP_TEST_RECIPIENT_NUMBER; // If set, ALL messages go to this number

// We use dynamic import for node-fetch to support native fetch in newer Node or fetch polyfills
// But Node 18+ has native fetch, so we can just use global fetch!

/**
 * Normalizes a phone number for WhatsApp API
 * Requires country code without the '+' symbol
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Basic validation - if it's 10 digits, assume it's an Indian number without +91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
}

/**
 * Sends a WhatsApp message via Meta Cloud API
 */
async function sendWhatsAppMessage(to, templateData) {
  if (!WHATSAPP_ACCESS_TOKEN) {
    throw new Error('WHATSAPP_ACCESS_TOKEN is missing');
  }
  if (!WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID is missing');
  }

  const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'template',
    template: {
      name: 'saferoute_emergency_alert',
      language: { code: 'en_US' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: templateData.userName },
            { type: 'text', text: templateData.lat },
            { type: 'text', text: templateData.lng },
            { type: 'text', text: templateData.time }
          ]
        }
      ]
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('Meta API Error:', JSON.stringify(data, null, 2));
    throw new Error(data.error?.message || 'Failed to send WhatsApp message');
  }

  return data;
}

// Endpoint to handle SOS WhatsApp delivery
app.post('/api/sos/whatsapp', async (req, res) => {
  try {
    const { contacts, lat, lng, userName } = req.body;
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts provided' });
    }

    const templateData = {
      userName: userName || 'A SafeRoute user',
      lat: lat ? lat.toString() : 'Unknown',
      lng: lng ? lng.toString() : 'Unknown',
      time: new Date().toLocaleString()
    };
    
    console.log('Dispatching Template Payload:', JSON.stringify(templateData));


    if (!WHATSAPP_ACCESS_TOKEN) {
      console.error('Server is missing WHATSAPP_ACCESS_TOKEN');
      return res.status(500).json({ error: 'WhatsApp integration is not configured on the server.' });
    }

    const successful = [];
    const failed = [];

    // For the initial test, the user says:
    // "SEND ONLY TO MY OWN VERIFIED TEST WHATSAPP NUMBER."
    // So we will actually map all outgoing requests to their test number for now,
    // OR we will assume the phone numbers supplied by the frontend are test numbers.
    // The user will configure their verified test number in their profile,
    // so we'll just respect the number provided by the frontend.
    // Let's iterate and send sequentially to respect rate limits.

    for (const contact of contacts) {
      // DEVELOPMENT/TEST MODE OVERRIDE:
      // If a test recipient is configured in .env, map all messages to it to prevent Meta API #131030 errors on unverified numbers
      const targetPhone = WHATSAPP_TEST_RECIPIENT_NUMBER || contact.phone_number;
      const formattedPhone = normalizePhoneNumber(targetPhone);
      
      if (!formattedPhone) {
        failed.push({
          contact_id: contact.id,
          name: contact.name,
          error: 'Invalid phone format'
        });
        continue;
      }

      try {
        await sendWhatsAppMessage(formattedPhone, templateData);
        successful.push({
          contact_id: contact.id,
          name: contact.name,
          phone: formattedPhone
        });
      } catch (err) {
        failed.push({
          contact_id: contact.id,
          name: contact.name,
          phone: formattedPhone,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      delivered_count: successful.length,
      failed_count: failed.length,
      successful,
      failed
    });

  } catch (error) {
    console.error('Server error processing SOS:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`SafeRoute Backend Server running on port ${PORT}`);
  });
}

export default app;
