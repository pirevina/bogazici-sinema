const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bigInt = require('big-integer');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();

// Full CORS support for cross-origin streaming, Range requests and mobile WebKit/ExoPlayer
app.use(cors({
    origin: '*',
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Range', 'Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length']
}));

const PORT = process.env.PORT || 3001;
const SESSION_FILE = path.join(__dirname, 'session.txt');

const apiId = parseInt(process.env.API_ID, 10);
const apiHash = process.env.API_HASH || '';
const botToken = process.env.BOT_TOKEN || '';
const channelIdRaw = process.env.CHANNEL_ID || '';

// In-memory cache for message metadata to avoid re-fetching on rapid range requests / mobile seeking
const messageMetadataCache = new Map();

// Mevcut session.txt varsa oradan oku, yoksa .env içindeki SESSION_STRING'i kullan
let savedSession = process.env.SESSION_STRING || '';
if (fs.existsSync(SESSION_FILE)) {
    const fileContent = fs.readFileSync(SESSION_FILE, 'utf8').trim();
    if (fileContent) {
        savedSession = fileContent;
    }
}

let stringSession = new StringSession(savedSession);
let client;

async function initTelegramClient() {
    if (!apiId || !apiHash || !botToken) {
        console.warn('[UYARI] .env içindeki API_ID, API_HASH veya BOT_TOKEN eksik! Lütfen .env dosyasını doldurun.');
        return;
    }

    try {
        client = new TelegramClient(stringSession, apiId, apiHash, {
            connectionRetries: 5,
        });

        await client.start({
            botAuthToken: botToken,
        });

        const currentSessionString = client.session.save();
        if (currentSessionString) {
            fs.writeFileSync(SESSION_FILE, currentSessionString, 'utf8');
            console.log('[Telegram] Session başarıyla session.txt dosyasına kaydedildi.');
        }

        console.log('[Telegram] GramJS istemcisi başarıyla bağlandı ve hazır.');
    } catch (err) {
        console.warn('[Telegram] Kayıtlı oturum ile bağlanırken hata oluştu:', err.message);
        if (err.message && (err.message.includes('AUTH_KEY_DUPLICATED') || err.message.includes('AUTH_KEY_UNREGISTERED'))) {
            console.log('[Telegram] Oturum anahtarı sıfırlanıyor ve yeni temiz oturum oluşturuluyor...');
            stringSession = new StringSession('');
            client = new TelegramClient(stringSession, apiId, apiHash, {
                connectionRetries: 5,
            });

            await client.start({
                botAuthToken: botToken,
            });

            const newSessionString = client.session.save();
            if (newSessionString) {
                fs.writeFileSync(SESSION_FILE, newSessionString, 'utf8');
                console.log('[Telegram] Yeni session başarıyla session.txt dosyasına kaydedildi.');
            }
            console.log('[Telegram] GramJS istemcisi yeni oturumla başarıyla bağlandı ve hazır.');
        } else {
            throw err;
        }
    }
}

function resolveChannelPeer(rawId) {
    if (!rawId) return null;
    const trimmed = String(rawId).trim();
    if (/^-?\d+$/.test(trimmed)) {
        return bigInt(trimmed);
    }
    return trimmed;
}

async function getDocumentForMessage(messageId) {
    const cached = messageMetadataCache.get(messageId);
    if (cached && (Date.now() - cached.timestamp < 10 * 60 * 1000)) {
        return cached;
    }

    const channelPeer = resolveChannelPeer(channelIdRaw);
    if (!channelPeer) throw new Error('CHANNEL_ID yapılandırılmamış.');

    const messages = await client.getMessages(channelPeer, { ids: [messageId] });
    if (!messages || messages.length === 0 || !messages[0]) {
        return null;
    }

    const msg = messages[0];
    const media = msg.media;
    const document = media && media.document ? media.document : null;
    if (!document) return null;

    const metadata = {
        media,
        document,
        fileSize: Number(document.size),
        timestamp: Date.now()
    };
    messageMetadataCache.set(messageId, metadata);
    return metadata;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        telegramConnected: !!(client && client.connected),
        channelConfigured: !!channelIdRaw,
        timestamp: new Date().toISOString()
    });
});

// HEAD endpoint for mobile browsers / AVPlayer probe
app.head('/stream/:messageId', async (req, res) => {
    try {
        if (!client || !client.connected) {
            return res.status(503).end();
        }

        const messageId = parseInt(req.params.messageId, 10);
        if (isNaN(messageId) || messageId <= 0) {
            return res.status(400).end();
        }

        const data = await getDocumentForMessage(messageId);
        if (!data) {
            return res.status(404).end();
        }

        res.writeHead(200, {
            'Accept-Ranges': 'bytes',
            'Content-Length': data.fileSize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
            'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
        });
        res.end();
    } catch (err) {
        console.error('[HEAD Hatası]:', err);
        res.status(500).end();
    }
});

app.get('/stream/:messageId', async (req, res) => {
    try {
        if (!client || !client.connected) {
            return res.status(503).send('Telegram istemcisi henüz hazır değil veya bağlı değil.');
        }

        const messageId = parseInt(req.params.messageId, 10);
        if (isNaN(messageId) || messageId <= 0) {
            return res.status(400).send('Geçersiz messageId.');
        }

        const data = await getDocumentForMessage(messageId);
        if (!data) {
            return res.status(404).send('Mesaj veya video bulunamadı.');
        }

        const fileSize = data.fileSize;
        const media = data.media;
        const rangeHeader = req.headers.range;

        // Varsayılan parça boyutu: 2 MB
        const CHUNK_SIZE = 2 * 1024 * 1024;
        let start = 0;
        let end = Math.min(CHUNK_SIZE - 1, fileSize - 1);

        // RFC 7233 standartlarına tam uyumlu Range çözümleyici (iOS Safari Suffix Range destekli)
        if (rangeHeader) {
            const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
            if (match) {
                const sStr = match[1];
                const eStr = match[2];

                if (!sStr && eStr) {
                    // Suffix range: bytes=-524288 (iOS Safari MP4 moov atomunu dosyanın sonundan arar)
                    const suffix = parseInt(eStr, 10);
                    start = Math.max(0, fileSize - suffix);
                    end = fileSize - 1;
                } else if (sStr && !eStr) {
                    // Prefix range: bytes=1048576-
                    start = parseInt(sStr, 10);
                    end = Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
                } else if (sStr && eStr) {
                    // Closed range: bytes=0-1 veya bytes=0-1000
                    start = parseInt(sStr, 10);
                    end = Math.min(parseInt(eStr, 10), fileSize - 1);
                }
            }
        }

        if (start >= fileSize || start < 0 || start > end) {
            res.writeHead(416, {
                'Content-Range': `bytes */${fileSize}`,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
            });
            return res.end();
        }

        // Telegram 4096 byte hizalama kuralı (OFFSET_INVALID hatasını önlemek için)
        const alignedStart = Math.floor(start / 4096) * 4096;
        const skipBytes = start - alignedStart;
        const bytesToSend = end - start + 1;

        res.writeHead(206, {
            'Accept-Ranges': 'bytes',
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Content-Length': bytesToSend,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
            'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
        });

        let isClientClosed = false;
        req.on('close', () => {
            isClientClosed = true;
        });

        let isFirstChunk = true;
        let remainingBytes = bytesToSend;

        const downloadIterator = client.iterDownload({
            file: media,
            offset: bigInt(alignedStart),
            requestSize: 524288, // 512 KB
        });

        for await (const chunk of downloadIterator) {
            if (isClientClosed || remainingBytes <= 0) {
                break;
            }

            let buffer = Buffer.from(chunk);

            if (isFirstChunk) {
                isFirstChunk = false;
                if (skipBytes > 0) {
                    buffer = buffer.slice(skipBytes);
                }
            }

            if (buffer.length > remainingBytes) {
                buffer = buffer.slice(0, remainingBytes);
            }

            if (buffer.length > 0 && !isClientClosed) {
                res.write(buffer);
                remainingBytes -= buffer.length;
            }

            if (remainingBytes <= 0) {
                break;
            }
        }

        if (!isClientClosed) {
            res.end();
        }
    } catch (error) {
        console.error('[Stream Hatası]:', error);
        if (!res.headersSent) {
            res.status(500).send('Video akışı sırasında sunucu hatası oluştu.');
        } else {
            res.end();
        }
    }
});

app.listen(PORT, () => {
    console.log(`[Stream Server] http://localhost:${PORT} üzerinde çalışıyor.`);
    initTelegramClient().catch((err) => {
        console.error('[Telegram Başlatma Hatası]:', err);
    });
});
