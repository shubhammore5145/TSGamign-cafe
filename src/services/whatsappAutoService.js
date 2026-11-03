import { getClean10Phone, generateBookingWhatsAppMessage } from '../utils/staffStats';

const WA_STORAGE_KEY = 'ts_whatsapp_gateway_config';

const DEFAULT_CONFIG = {
  enabled: true,
  provider: 'greenapi',
  apiUrl: 'https://7107.api.greenapi.com',
  instanceId: '710722789545',
  token: '334cd5981dfc4f268d2167767be06682f9e644a5507d4f20b9',
  senderPhone: '919226345875',
  webhookUrl: '',
  phoneNumberId: '',
};

/**
 * Loads WhatsApp Gateway configuration from localStorage.
 * Auto-activates verified Green-API gateway if no custom credentials saved.
 */
export function getWhatsAppConfig() {
  try {
    const raw = localStorage.getItem(WA_STORAGE_KEY);
    if (!raw) {
      saveWhatsAppConfig(DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }
    const parsed = JSON.parse(raw);
    // If instanceId or token is missing or too short, ensure default verified Green-API credentials
    if (!parsed.token || parsed.token.length < 15) {
      const merged = { ...DEFAULT_CONFIG, ...parsed, ...DEFAULT_CONFIG, enabled: true };
      saveWhatsAppConfig(merged);
      return merged;
    }
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Saves WhatsApp Gateway configuration
 */
export function saveWhatsAppConfig(config) {
  try {
    const merged = { ...DEFAULT_CONFIG, ...config };
    localStorage.setItem(WA_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.warn('Failed to save WhatsApp config:', e);
    return config;
  }
}

/**
 * Sends automated background WhatsApp message via API Gateway
 * (Delivered directly to customer's phone without opening WhatsApp app or manual send click)
 */
export async function sendBackgroundWhatsApp({ phone, message, booking = null }) {
  const cleanPhone = getClean10Phone(phone);
  if (!cleanPhone || cleanPhone.length !== 10) {
    return { success: false, reason: 'Invalid 10-digit phone number' };
  }

  const fullPhone = `91${cleanPhone}`;
  const config = getWhatsAppConfig();

  if (!config.enabled) {
    return { success: false, reason: 'gateway_not_enabled', config };
  }

  try {
    // ── 1. ULTRAMSG PROVIDER ─────────────────────────────────
    if (config.provider === 'ultramsg') {
      if (!config.instanceId || !config.token) {
        return { success: false, reason: 'UltraMsg Instance ID and Token are required' };
      }

      const instance = config.instanceId.trim();
      const token = config.token.trim();
      const endpoint = `https://api.ultramsg.com/${instance}/messages/chat`;

      const params = new URLSearchParams();
      params.append('token', token);
      params.append('to', fullPhone);
      params.append('body', message);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await res.json();
      if (data.sent === 'true' || data.id || data.status === 'success') {
        return { success: true, provider: 'ultramsg', data };
      } else {
        throw new Error(data.message || data.error || 'Failed to send message via UltraMsg');
      }
    }

    // ── 2. GREEN-API PROVIDER ────────────────────────────────
    if (config.provider === 'greenapi') {
      if (!config.instanceId || !config.token) {
        return { success: false, reason: 'Green-API Instance ID and Token are required' };
      }

      const instance = config.instanceId.trim();
      const token = config.token.trim();
      let baseUrl = (config.apiUrl || '').trim().replace(/\/+$/, '');
      if (!baseUrl) {
        const hostPrefix = instance.slice(0, 4);
        baseUrl = hostPrefix ? `https://${hostPrefix}.api.greenapi.com` : 'https://api.green-api.com';
      }
      const endpoint = `${baseUrl}/waInstance${instance}/sendMessage/${token}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${fullPhone}@c.us`,
          message,
        }),
      });

      const data = await res.json();
      if (data && (data.idMessage || data.statusMessage === 'success')) {
        return { success: true, provider: 'greenapi', data };
      } else {
        throw new Error(data?.message || data?.error || 'Failed to send message via Green-API');
      }
    }

    // ── 3. CUSTOM WEBHOOK / API URL ──────────────────────────
    if (config.provider === 'webhook') {
      if (!config.webhookUrl) {
        return { success: false, reason: 'Webhook URL is required' };
      }

      const res = await fetch(config.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: fullPhone,
          cleanPhone,
          message,
          booking,
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        return { success: true, provider: 'webhook' };
      } else {
        throw new Error(`Webhook returned status ${res.status}`);
      }
    }

    // ── 4. META CLOUD API ────────────────────────────────────
    if (config.provider === 'meta') {
      if (!config.phoneNumberId || !config.token) {
        return { success: false, reason: 'Meta Phone Number ID and Access Token are required' };
      }

      const phoneId = config.phoneNumberId.trim();
      const token = config.token.trim();
      const endpoint = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: fullPhone,
          type: 'text',
          text: { body: message },
        }),
      });

      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        return { success: true, provider: 'meta', data };
      } else {
        throw new Error(data.error?.message || 'Meta Cloud API error');
      }
    }

    return { success: false, reason: 'Unknown provider' };
  } catch (err) {
    console.error('[WhatsApp Background Send Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Universal auto-send function for bookings:
 * 1. Attempts direct background delivery via configured WhatsApp Gateway API.
 * 2. If Gateway is not enabled yet, falls back to opening pre-filled WhatsApp link.
 */
export async function autoSendBookingConfirmation(booking) {
  if (!booking) return false;
  const phone = booking.userPhone || booking.customerPhone || booking.phone;
  const cleanPhone = getClean10Phone(phone);
  if (!cleanPhone || cleanPhone.length !== 10) return false;

  const message = generateBookingWhatsAppMessage(booking);
  const config = getWhatsAppConfig();

  // 1. If Free 1-Click mode is chosen, open formatted receipt directly (100% Free Forever)
  if (config.provider === 'free_instant') {
    try {
      const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
      if (typeof window !== 'undefined') {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        return { success: true, background: false, provider: 'free_instant' };
      }
    } catch (err) {
      console.warn('[WhatsApp Free Instant] Open failed:', err);
    }
    return { success: false };
  }

  // 2. If Gateway is enabled, attempt background delivery with ZERO manual clicks
  if (config.enabled) {
    try {
      const result = await sendBackgroundWhatsApp({ phone: cleanPhone, message, booking });
      if (result.success) {
        console.log('[WhatsApp Auto Delivery] Sent in background via', result.provider);
        return { success: true, background: true, provider: result.provider };
      } else {
        console.warn('[WhatsApp Auto Delivery] Gateway failed or limit reached, falling back:', result.error || result.reason);
      }
    } catch (e) {
      console.warn('[WhatsApp Auto Delivery] Error:', e);
    }
  }

  // 3. Fallback: If gateway not enabled or limit reached, open pre-filled WhatsApp link
  try {
    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      return { success: true, background: false, fallback: true };
    }
  } catch (err) {
    console.warn('[WhatsApp Fallback] Could not open:', err);
  }

  return { success: false };
}

