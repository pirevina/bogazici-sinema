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

// In-memory cache for initial chunks (first 2 MB) and tail chunks (up to 15 MB for moov index)
// Key: messageId, Value: { buffer, start, end }
const initialChunkCache = new Map();
const tailChunkCache = new Map();
const prefetchInProgress = new Set();
const MAX_CACHE_ENTRIES = 30; // Max 30 movies in RAM, well within Render's 512 MB

function putInCache(map, key, data) {
    if (map.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = map.keys().next().value;
        map.delete(oldestKey);
    }
    map.set(key, data);
}

async function prefetchTail(messageId, media, start, end) {
    if (tailChunkCache.has(messageId) || prefetchInProgress.has(messageId)) return;
    prefetchInProgress.add(messageId);
    try {
        console.log(`[Pre-fetch MOOV] Başlatılıyor msg ${messageId}: bytes ${start}-${end} (${((end - start + 1) / (1024*1024)).toFixed(2)} MB)`);
        const alignedStart = Math.floor(start / 4096) * 4096;
        const skipBytes = start - alignedStart;
        const bytesToFetch = end - start + 1;
        const iter = client.iterDownload({
            file: media,
            offset: bigInt(alignedStart),
            requestSize: 524288,
        });
        const chunks = [];
        let isFirst = true;
        let rem = bytesToFetch;
        for await (const chunk of iter) {
            let buf = Buffer.from(chunk);
            if (isFirst) {
                isFirst = false;
                if (skipBytes > 0) buf = buf.slice(skipBytes);
            }
            if (buf.length > rem) buf = buf.slice(0, rem);
            if (buf.length > 0) {
                chunks.push(buf);
                rem -= buf.length;
            }
            if (rem <= 0) break;
        }
        if (chunks.length > 0) {
            const tailBuf = Buffer.concat(chunks);
            putInCache(tailChunkCache, messageId, {
                start: start,
                end: end,
                buffer: tailBuf
            });
            console.log(`[Pre-fetch MOOV] Başarıyla önbelleğe alındı msg ${messageId}: ${tailBuf.length} bytes!`);
        }
    } catch (err) {
        console.warn(`[Pre-fetch MOOV Hatası msg ${messageId}]:`, err.message);
    } finally {
        prefetchInProgress.delete(messageId);
    }
}

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

        // Doğal HTTP Video Streaming: Varsayılan olarak dosyanın sonuna kadar kesintisiz akar
        let start = 0;
        let end = fileSize - 1;

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
                    // Prefix range: bytes=1048576- (Video oynatımı -> dosya sonuna kadar KESİNTİSİZ akar)
                    start = parseInt(sStr, 10);
                    end = fileSize - 1;
                } else if (sStr && eStr) {
                    // Closed range: bytes=0-1 veya bytes=0-1000 (Tarayıcı metadata / başlık kontrolleri)
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

        // 1. FAST PATH: Tam kapalı aralık RAM önbelleğinde var mı? (örn: Safari bytes=0-1 veya 0-2MB)
        const cachedInitial = initialChunkCache.get(messageId);
        if (cachedInitial && start >= cachedInitial.start && end <= cachedInitial.end) {
            const offsetStart = start - cachedInitial.start;
            const offsetEnd = end - cachedInitial.start;
            const slice = cachedInitial.buffer.subarray(offsetStart, offsetEnd + 1);

            res.writeHead(206, {
                'Accept-Ranges': 'bytes',
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Content-Length': slice.length,
                'Content-Type': 'video/mp4',
                'X-Cache': 'HIT-INITIAL',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
                'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
            });
            return res.end(slice);
        }

        // 2. FAST PATH: Dosya sonu (moov index) RAM önbelleğinde var mı? (iOS Safari için)
        const cachedTail = tailChunkCache.get(messageId);
        if (cachedTail && start >= cachedTail.start && end <= cachedTail.end) {
            const offsetStart = start - cachedTail.start;
            const offsetEnd = end - cachedTail.start;
            const slice = cachedTail.buffer.subarray(offsetStart, offsetEnd + 1);

            res.writeHead(206, {
                'Accept-Ranges': 'bytes',
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Content-Length': slice.length,
                'Content-Type': 'video/mp4',
                'X-Cache': 'HIT-TAIL',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
                'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
            });
            return res.end(slice);
        }

        // Uzun süreli video akışı için socket zaman aşımını kaldır
        if (req.socket) {
            req.socket.setTimeout(0);
        }

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

        let remainingBytes = bytesToSend;
        let streamOffset = start;

        // INSTANT START OPTIMIZATION: Baştan başlarken ilk 2 MB önbellekteyse anında yaz!
        if (start === 0 && cachedInitial && cachedInitial.buffer && cachedInitial.buffer.length > 0) {
            const bufToSend = (cachedInitial.buffer.length > remainingBytes)
                ? cachedInitial.buffer.subarray(0, remainingBytes)
                : cachedInitial.buffer;

            res.write(bufToSend);
            remainingBytes -= bufToSend.length;
            streamOffset += bufToSend.length;
        }

        if (remainingBytes <= 0 || isClientClosed) {
            if (!isClientClosed) res.end();
            return;
        }

        // Telegram 4096 byte hizalama kuralı (OFFSET_INVALID hatasını önlemek için)
        const alignedStart = Math.floor(streamOffset / 4096) * 4096;
        const skipBytes = streamOffset - alignedStart;
        let isFirstChunk = true;

        // Önbelleğe alma toplayıcıları
        let initialAccumulator = (start === 0 && !cachedInitial) ? [] : null;
        let initialAccumulatorSize = 0;
        const tailAccumulator = (start >= fileSize - 15 * 1024 * 1024) ? [] : null;

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

            if (buffer.length > 0) {
                if (initialAccumulator) {
                    initialAccumulator.push(buffer);
                    initialAccumulatorSize += buffer.length;
                    if (initialAccumulatorSize >= 2 * 1024 * 1024) {
                        const fullBuf = Buffer.concat(initialAccumulator);
                        putInCache(initialChunkCache, messageId, {
                            start: 0,
                            end: fullBuf.length - 1,
                            buffer: fullBuf
                        });
                        initialAccumulator = null;

                        // Otomatik MOOV Ön Yükleme: Eğer moov atomu dosya sonundaysa (FastStart yoksa) arka planda hemen önbelleğe al!
                        if (!tailChunkCache.has(messageId) && fullBuf.length >= 48) {
                            try {
                                const headMoovIdx = fullBuf.indexOf(Buffer.from('moov'));
                                if (headMoovIdx === -1) {
                                    const mdatIdx = fullBuf.indexOf(Buffer.from('mdat'));
                                    if (mdatIdx >= 4) {
                                        const mdatSize = fullBuf.readUInt32BE(mdatIdx - 4);
                                        if (mdatSize > 0 && mdatSize < fileSize) {
                                            const moovStart = (mdatIdx - 4) + mdatSize;
                                            if (moovStart < fileSize && (fileSize - moovStart) <= 15 * 1024 * 1024) {
                                                prefetchTail(messageId, media, moovStart, fileSize - 1);
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                console.log('[Moov Pre-fetch check]:', e.message);
                            }
                        }
                    }
                }

                if (tailAccumulator) tailAccumulator.push(buffer);

                if (!isClientClosed) {
                    const canWrite = res.write(buffer);
                    remainingBytes -= buffer.length;

                    // Backpressure kontrolü: İstemci yavaş okursa TCP tamponu boşalana kadar bekle
                    if (!canWrite && !isClientClosed) {
                        await new Promise(resolve => res.once('drain', resolve));
                    }
                }
            }

            if (remainingBytes <= 0) {
                break;
            }
        }

        if (tailAccumulator && remainingBytes <= 0) {
            const fullBuf = Buffer.concat(tailAccumulator);
            putInCache(tailChunkCache, messageId, {
                start: start,
                end: end,
                buffer: fullBuf
            });
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

const server = app.listen(PORT, () => {
    console.log(`[Stream Server] http://localhost:${PORT} üzerinde çalışıyor.`);
    initTelegramClient().catch((err) => {
        console.error('[Telegram Başlatma Hatası]:', err);
    });
});

// Uzun süreli film akışlarında Node.js 18+ soket zaman aşımını kaldır
server.requestTimeout = 0;
server.headersTimeout = 65000;
server.keepAliveTimeout = 120000;
