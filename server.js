const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bigInt = require('big-integer');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;
const SESSION_FILE = path.join(__dirname, 'session.txt');

const apiId = parseInt(process.env.API_ID, 10);
const apiHash = process.env.API_HASH || '';
const botToken = process.env.BOT_TOKEN || '';
const channelIdRaw = process.env.CHANNEL_ID || '';

// Mevcut session.txt varsa oradan oku, yoksa .env içindeki SESSION_STRING'i kullan
let savedSession = process.env.SESSION_STRING || '';
if (fs.existsSync(SESSION_FILE)) {
    const fileContent = fs.readFileSync(SESSION_FILE, 'utf8').trim();
    if (fileContent) {
        savedSession = fileContent;
    }
}

const stringSession = new StringSession(savedSession);
let client;

async function initTelegramClient() {
    if (!apiId || !apiHash || !botToken) {
        console.warn('[UYARI] .env içindeki API_ID, API_HASH veya BOT_TOKEN eksik! Lütfen .env dosyasını doldurun.');
        return;
    }

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
}

function resolveChannelPeer(rawId) {
    if (!rawId) return null;
    const trimmed = String(rawId).trim();
    if (/^-?\d+$/.test(trimmed)) {
        return bigInt(trimmed);
    }
    return trimmed;
}

app.get('/stream/:messageId', async (req, res) => {
    try {
        if (!client || !client.connected) {
            return res.status(503).send('Telegram istemcisi henüz hazır değil veya bağlı değil.');
        }

        const messageId = parseInt(req.params.messageId, 10);
        if (isNaN(messageId) || messageId <= 0) {
            return res.status(400).send('Geçersiz messageId.');
        }

        const channelPeer = resolveChannelPeer(channelIdRaw);
        if (!channelPeer) {
            return res.status(500).send('CHANNEL_ID yapılandırılmamış.');
        }

        const messages = await client.getMessages(channelPeer, { ids: [messageId] });
        if (!messages || messages.length === 0 || !messages[0]) {
            return res.status(404).send('Mesaj bulunamadı.');
        }

        const msg = messages[0];
        const media = msg.media;
        const document = media && media.document ? media.document : null;

        if (!document) {
            return res.status(404).send('Mesaj içinde video/document medyası bulunamadı.');
        }

        const fileSize = Number(document.size);
        const rangeHeader = req.headers.range;

        let start = 0;
        let end = Math.min(2 * 1024 * 1024 - 1, fileSize - 1);

        if (rangeHeader) {
            const parts = rangeHeader.replace(/bytes=/, '').split('-');
            start = parseInt(parts[0], 10) || 0;
            if (parts[1] && parts[1].trim() !== '') {
                end = Math.min(parseInt(parts[1], 10), fileSize - 1);
            } else {
                end = Math.min(start + 2 * 1024 * 1024 - 1, fileSize - 1);
            }
        }

        if (start >= fileSize || start < 0 || start > end) {
            res.writeHead(416, {
                'Content-Range': `bytes */${fileSize}`,
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
