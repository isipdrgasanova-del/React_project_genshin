const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const nodemailer = require('nodemailer');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.on('connect', () => console.log('Подключение к БД установлено'));
pool.on('error', (err) => console.error('Ошибка БД:', err.message));

(async () => {
    try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS active_token VARCHAR(500)');
        await pool.query('ALTER TABLE services ADD COLUMN IF NOT EXISTS discount_percent INT DEFAULT 0');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                coupon_id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                discount_percent INT NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
                max_uses INT DEFAULT NULL,
                used_count INT DEFAULT 0,
                expires_at DATE DEFAULT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50)');
        console.log('Схема БД актуальна');
    } catch (e) {
        console.error('Ошибка миграции:', e.message);
    }
})();

const transporter = nodemailer.createTransport({
    host: 'smtp.mail.ru',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет доступа' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        const r = await pool.query('SELECT active_token FROM users WHERE user_id = $1', [req.user.id]);
        if (r.rows.length === 0) return res.status(401).json({ error: 'Пользователь не найден' });
        const activeToken = r.rows[0].active_token;
        if (activeToken && activeToken !== token) {
            return res.status(401).json({ error: 'Сессия устарела. Войдите заново.' });
        }
        next();
    } catch {
        res.status(401).json({ error: 'Неверный токен' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только для админа' });
    next();
};

const validName = (name) => /^[А-ЯЁA-Z][а-яёa-z\-]+(\s[А-ЯЁA-Z][а-яёa-z\-]+)*$/.test(name.trim());
const validPhone = (phone) => /^(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/.test(phone.trim());

// ==================== ЦЕНЗУРА ====================

// Русские полные слова (мат + оскорбления)
const BAD_WORDS_RU = [
    // Мат
    'хуй', 'хуя', 'хую', 'хуе', 'хуё', 'хуи', 'хуйн', 'хуёвый', 'хуёво', 'хуйня', 'хуйло',
    'пизда', 'пизды', 'пизде', 'пизду', 'пиздой', 'пиздец', 'пиздато', 'пиздюк', 'пиздёнок', 'пиздюлина',
    'ебать', 'ебал', 'ебала', 'ебали', 'ебёт', 'ебет', 'ебуч', 'ебучий', 'ебучая', 'ебло', 'ебля', 'ебаш', 'ебану', 'ебануть', 'ебаный', 'ебаная', 'ебанный',
    'блядь', 'бляди', 'блядина', 'блядство', 'блядский', 'бляха',
    'сука', 'суки', 'суке', 'суку', 'сучка', 'сучки', 'сучонок', 'сучара',
    'нахуй', 'нахуя', 'нахуйня',
    'залупа', 'залупой', 'залупе',
    'охуел', 'охуела', 'охуели', 'охуенно', 'охуенный', 'охуеть',
    'ахуел', 'ахуела', 'ахуели', 'ахуенно', 'ахуенный', 'ахуеть',
    'наебал', 'наебала', 'наебали', 'наебать', 'наебка',
    'объебал', 'объебать', 'объебос',
    'отъебал', 'отъебать', 'отъебись',
    'подъебал', 'подъебать', 'подъебка',
    'приебал', 'приебать', 'приебись',
    'разъебал', 'разъебать',
    'въебал', 'въебать', 'въебени', 'въебень',
    'заебал', 'заебала', 'заебали', 'заебать', 'заебись', 'заебало',
    'изъебал', 'изъебать',
    'доебал', 'доебать',
    'проебал', 'проебать', 'проеб',
    'уебал', 'уебать', 'уебище', 'уебан',
    'съебал', 'съебать', 'съебись',
    'ебнул', 'ебнула', 'ебнут', 'ебнутый',
    'наебнул', 'наебнула',
    'выебал', 'выебать', 'выебанный',
    'переебал', 'переебать',
    'недоёб', 'недоеб',
    'долбоёб', 'долбоеб', 'долбоёбы',

    // Оскорбления
    'шлюха', 'шлюхи', 'шлюхе', 'шлюху', 'шлюхой', 'шлюшка', 'шлюшки', 'шлюнд',
    'шалава', 'шалавы', 'шалаве',
    'проститутка', 'проститутки', 'проститут',
    'потаскушка', 'потаскушки',
    'падла', 'падлы', 'падлюк', 'падлюка',
    'сволочь', 'сволочи', 'сволочной',
    'мерзавец', 'мерзавка', 'мерзавцы',
    'подонок', 'подонки', 'подонка',
    'негодяй', 'негодяйка', 'негодяи',
    'мудак', 'мудаки', 'мудака', 'мудил', 'мудила', 'мудозвон',
    'гандон', 'гандона', 'гандур',
    'пидор', 'пидора', 'пидоры', 'пидар', 'пидары', 'пидр', 'пидра', 'педик', 'педика', 'пидорас', 'пидрила',
    'манда', 'манды', 'мандавошка',
    'жопа', 'жопы', 'жопе', 'жопу', 'жопой',
    'мразь', 'мрази', 'мразота',
    'тварь', 'твари', 'тварью',
    'гнида', 'гниды', 'гнидой',
    'козел', 'козёл', 'козла', 'козлы', 'козлина',
    'лох', 'лохи', 'лоха', 'лошара', 'лошар', 'лохушка',
    'дебил', 'дебилы', 'дебила', 'дебильный', 'даун', 'дауны',
    'кретин', 'кретины', 'кретинка',
    'идиот', 'идиоты', 'идиотка', 'идиотский',
    'дурак', 'дураки', 'дурака', 'дура', 'дуры', 'дурочка',
    'чмо', 'чмошник', 'чмошники',
    'урод', 'уроды', 'урода', 'уродина', 'уродливый',
    'ублюдок', 'ублюдки', 'ублюдка',
    'выблядок', 'выблядки',
    'свинья', 'свиньи', 'свиноматка',
    'шакал', 'шакалы',
    'крыса', 'крысы', 'крыской',
    'гадина', 'гадины', 'гадюка', 'гаденыш',
    'паразит', 'паразиты',
    'ничтожество', 'ничтожества',
    'отброс', 'отбросы',
    'дрянь', 'дряни',
    'прохвост', 'прохвосты',
    'холуй', 'холуи',
    'лакей', 'лакеи',
    'хам', 'хамы', 'хамло', 'хамьё',
    'быдло', 'быдла', 'быдлан', 'быдланы',
    'олень', 'олени', 'оленевод',
    'хайп'
];

// Транслит + английский (полные слова)
const BAD_WORDS_LAT = [
    // Транслит мата
    'huy', 'hui', 'huya', 'huye', 'hujo', 'huj', 'huin', 'huynya',
    'xuy', 'xui', 'xuya',
    'pizda', 'pizdy', 'pizdec', 'pizdato', 'pizdyk',
    'ebat', 'ebal', 'ebala', 'ebali', 'ebet', 'ebuchiy', 'eblo', 'eblya',
    'blyad', 'blyadi', 'blyadina', 'blyadstvo', 'blyatskiy', 'blya',
    'suka', 'suki', 'suke', 'suku', 'suchka', 'suchki', 'suchonok',
    'nahuy', 'nahui', 'nahuya',
    'zalupa', 'zalupoy',
    'ohuel', 'ohuela', 'ohuenno', 'ohuenny', 'ohuet',
    'ahuel', 'ahuela', 'ahuenno', 'ahuet',
    'naebal', 'naebala', 'naebat',
    'obebal', 'obebat', 'obebos',
    'otebal', 'otebat', 'otebis',
    'podebal', 'podebat', 'podebka',
    'priebal', 'priebat',
    'razebal', 'razebat',
    'vebal', 'vebat', 'veben',
    'zaebal', 'zaebala', 'zaebali', 'zaebat', 'zaebis',
    'izebal', 'izebat',
    'doebal', 'doebat',
    'proebal', 'proebat', 'proeb',
    'uebal', 'uebat', 'uebishche', 'ueban',
    'sebal', 'sebat',
    'ebnul', 'ebnula', 'ebnut',
    'naebnul',
    'vyebal', 'vyebat', 'vyebanny',
    'perebal', 'perebat',
    'dolboyeb', 'dolboeb',

    // Транслит оскорблений
    'shlyuha', 'shlyuhi', 'shlyuhe', 'shlyuhu', 'shlyushka',
    'shalava', 'shalavy',
    'prostitutka', 'prostitutki', 'prostitut',
    'potaskushka',
    'padla', 'padly', 'padlyuk',
    'svoloch', 'svolochi',
    'merzavec', 'merzavka',
    'podonok', 'podonki',
    'negodyay', 'negodyayka',
    'mudak', 'mudaki', 'mudaka', 'mudil', 'mudila',
    'gandon', 'gandona', 'gandur',
    'pidor', 'pidora', 'pidory', 'pidar', 'pidary', 'pidr', 'pedik', 'pidoras', 'pidrila',
    'manda', 'mandy',
    'zhopa', 'zhopu', 'zhopoy',
    'mraz', 'mrazi', 'mrazota',
    'tvar', 'tvari',
    'gnida', 'gnidy',
    'kozel', 'kozla', 'kozly', 'kozlin',
    'loh', 'lohi', 'loha', 'loshara',
    'debil', 'debila', 'debilny', 'daun', 'dauny',
    'kretin', 'kretiny',
    'idiot', 'idioty', 'idiotka',
    'durak', 'duraki', 'dura', 'dury', 'durochka',
    'chmo', 'chmosh',
    'urod', 'urody', 'urodina',
    'ublyudok', 'ublyudki',
    'vyblyadok',
    'svinya', 'svini', 'svinomatka',
    'shakal', 'shakaly',
    'krysa', 'krysy', 'kryskoy',
    'gadina', 'gadiny', 'gadyuka', 'gadenysh',
    'parazit', 'parazity',
    'nichtozhestvo',
    'otbros', 'otbrosy',
    'dryan', 'dryani',
    'ham', 'hamy', 'hamlo',
    'bydlo', 'bydla', 'bydlan',
    'olen', 'oleni', 'olenevod',

    // Английский
    'fuck', 'fck', 'fuk', 'fak', 'fucker', 'fucking', 'fucked',
    'shit', 'sh1t', 'bullshit',
    'bitch', 'b1tch', 'bitches',
    'bastard',
    'asshole', 'assh0le', 'arsehole',
    'dick', 'd1ck', 'dickhead',
    'pussy', 'puss1',
    'cunt',
    'cock', 'c0ck',
    'whore', 'slut', 'slutt',
    'nigger', 'nigga', 'n1gger',
    'motherfucker',
    'jerk', 'jerkoff',
    'wanker',
    'twat',
    'moron', 'mor0n',
    'retard', 'ret4rd',
    'stupid', 'stup1d',
    'loser', 'l0ser',
    'dumbass', 'dumb'
];

// Замена leet-символов на буквы
const deLeet = (text) => {
    if (!text) return text;
    return text
        .replace(/@/g, 'а')
        .replace(/0/g, 'о')
        .replace(/3/g, 'е')
        .replace(/1/g, 'и')
        .replace(/4/g, 'а')
        .replace(/5/g, 's')
        .replace(/7/g, 'т')
        .replace(/6/g, 'б')
        .replace(/8/g, 'в')
        .replace(/9/g, 'д');
};

// Убираем разделители между буквами
const removeSeparators = (text) => {
    if (!text) return text;
    let result = text;
    // Проходим несколько раз, чтобы убрать вложенные разделители
    for (let i = 0; i < 3; i++) {
        result = result.replace(/([а-яёa-z])[\s\-_.*+|\\/]+([а-яёa-z])/gi, '$1$2');
    }
    return result;
};

// Экранирование спецсимволов regex
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Маскировка всех плохих слов
const maskProfanity = (text) => {
    if (!text) return text;
    let result = text;

    // Шаг 1. Прогоняем текст через deLeet и removeSeparators
    const cleaned = removeSeparators(deLeet(text));

    // Шаг 2. Маскируем русские слова в исходном тексте
    BAD_WORDS_RU.forEach(word => {
        const escaped = escapeRegex(word);
        const regex = new RegExp(escaped, 'gi');
        result = result.replace(regex, (match) => '*'.repeat(match.length));
    });

    // Шаг 3. Маскируем латинские слова (транслит + английский)
    BAD_WORDS_LAT.forEach(word => {
        const escaped = escapeRegex(word);
        const regex = new RegExp(escaped, 'gi');
        result = result.replace(regex, (match) => '*'.repeat(match.length));
    });

    // Шаг 4. Дополнительная проверка на обходы (х.у.й, xуй, etc.)
    // Проверяем, остались ли в cleaned запрещённые слова
    BAD_WORDS_RU.forEach(word => {
        const escaped = escapeRegex(word);
        const regex = new RegExp(escaped, 'gi');
        if (regex.test(cleaned)) {
            // В cleaned найдено слово. Теперь надо замаскировать его в оригинале
            // Ищем позицию первой буквы слова в оригинале
            const cleanedLower = cleaned.toLowerCase();
            const wordLower = word.toLowerCase();
            let idx = cleanedLower.indexOf(wordLower);
            while (idx !== -1) {
                // Находим соответствующую позицию в оригинале
                let origIdx = 0;
                let lettersCount = 0;
                for (let i = 0; i < result.length; i++) {
                    if (/[а-яёa-z0-9@$]/i.test(result[i])) {
                        if (lettersCount === idx) {
                            origIdx = i;
                            break;
                        }
                        lettersCount++;
                    }
                }
                // Маскируем word.length букв, начиная с origIdx
                let count = 0;
                for (let i = origIdx; i < result.length && count < word.length; i++) {
                    if (/[а-яёa-z0-9@$]/i.test(result[i])) {
                        result = result.substring(0, i) + '*' + result.substring(i + 1);
                        count++;
                    }
                }
                idx = cleanedLower.indexOf(wordLower, idx + word.length);
            }
        }
    });

    return result;
};

// ==================== КОНЕЦ ЦЕНЗУРЫ ====================

const parseDuration = (dur) => {
    if (!dur) return 0;
    const lower = dur.toLowerCase();
    if (lower.includes('мгновен')) return 0;
    if (lower.includes('сезон')) return 30;
    const m = dur.match(/(\d+)/);
    return m ? parseInt(m[1]) : 0;
};

app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- КАТЕГОРИИ ---
app.get('/api/categories', async (req, res) => {
    try {
        const r = await pool.query(`SELECT * FROM categories WHERE name != 'Без категории' ORDER BY category_id`);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/categories/all', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM categories ORDER BY category_id');
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/categories', authMiddleware, adminMiddleware, async (req, res) => {
    let { name } = req.body;
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Слишком короткое название' });
    if (name.trim().toLowerCase() === 'без категории') return res.status(400).json({ error: 'Зарезервировано' });
    name = name.trim().replace(/\s+/g, ' ');
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    if (!/^[А-ЯЁA-Z][а-яёa-z\s\-]+$/.test(name)) return res.status(400).json({ error: 'Только буквы, с большой' });
    try {
        const r = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
        res.json(r.rows[0]);
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Такая категория уже есть' });
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/categories/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        let neutral = await pool.query(`SELECT category_id FROM categories WHERE name = 'Без категории'`);
        if (neutral.rows.length === 0) {
            await pool.query(`INSERT INTO categories (name) VALUES ('Без категории')`);
            neutral = await pool.query(`SELECT category_id FROM categories WHERE name = 'Без категории'`);
        }
        const neutralId = neutral.rows[0].category_id;
        await pool.query('UPDATE services SET category_id = $1 WHERE category_id = $2', [neutralId, req.params.id]);
        await pool.query('DELETE FROM categories WHERE category_id = $1', [req.params.id]);
        res.json({ message: 'Категория удалена' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- КАТАЛОГ ---
app.get('/api/services', async (req, res) => {
    const { search } = req.query;
    try {
        let query = `
            SELECT s.service_id, s.title, s.description, s.duration, s.price, s.image_url,
                   s.max_per_day, s.category_id, s.discount_percent,
                   ROUND(s.price * (100 - s.discount_percent) / 100, 2) AS final_price,
                   c.name AS category_name
            FROM services s
            LEFT JOIN categories c ON s.category_id = c.category_id
        `;
        const params = [];
        if (search && search.trim()) {
            query += ` WHERE LOWER(s.title) LIKE LOWER($1) OR LOWER(s.description) LIKE LOWER($1)`;
            params.push(`%${search.trim()}%`);
        }
        query += ` ORDER BY s.category_id, s.service_id`;
        const r = await pool.query(query, params);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- КУПОНЫ ---
app.get('/api/coupons', authMiddleware, async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT coupon_id, code, discount_percent, max_uses, used_count, expires_at, is_active, created_at
            FROM coupons
            WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
              AND (max_uses IS NULL OR used_count < max_uses)
            ORDER BY discount_percent DESC, created_at DESC
        `);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/coupons', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/coupons', authMiddleware, adminMiddleware, async (req, res) => {
    let { code, discountPercent, maxUses, expiresAt } = req.body;
    if (!code || code.trim().length < 3) return res.status(400).json({ error: 'Код минимум 3 символа' });
    code = code.trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9]{3,20}$/.test(code)) return res.status(400).json({ error: 'Код: A-Z и цифры' });
    const discount = parseInt(discountPercent);
    if (isNaN(discount) || discount < 1 || discount > 100) return res.status(400).json({ error: 'Скидка 1-100%' });
    let maxUseVal = null;
    if (maxUses !== undefined && maxUses !== '' && maxUses !== null) {
        maxUseVal = parseInt(maxUses);
        if (isNaN(maxUseVal) || maxUseVal < 1) return res.status(400).json({ error: 'Лимит > 0' });
    }
    try {
        const r = await pool.query(`
            INSERT INTO coupons (code, discount_percent, max_uses, expires_at)
            VALUES ($1, $2, $3, $4) RETURNING *
        `, [code, discount, maxUseVal, expiresAt || null]);
        res.json(r.rows[0]);
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Такой код уже есть' });
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/coupons/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const cur = await pool.query('SELECT is_active FROM coupons WHERE coupon_id = $1', [req.params.id]);
        if (cur.rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
        const newVal = !cur.rows[0].is_active;
        await pool.query('UPDATE coupons SET is_active = $1 WHERE coupon_id = $2', [newVal, req.params.id]);
        res.json({ message: 'Обновлено' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/coupons/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM coupons WHERE coupon_id = $1', [req.params.id]);
        res.json({ message: 'Купон удалён' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/coupons/validate', authMiddleware, async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Введите код' });
    try {
        const r = await pool.query(`
            SELECT * FROM coupons
            WHERE code = $1 AND is_active = TRUE
              AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
              AND (max_uses IS NULL OR used_count < max_uses)
        `, [code.trim().toUpperCase()]);
        if (r.rows.length === 0) return res.status(400).json({ error: 'Промокод недействителен' });
        res.json({
            coupon_id: r.rows[0].coupon_id,
            code: r.rows[0].code,
            discount_percent: r.rows[0].discount_percent
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- АВТОРИЗАЦИЯ ---
app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    if (!fullName || !validName(fullName)) return res.status(400).json({ error: 'ФИО: только буквы, с большой' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Некорректный email' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    if (phone && !validPhone(phone)) return res.status(400).json({ error: 'Телефон: +7 (999) 123-45-67' });

    try {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (full_name, email, password_hash, phone, role_id) VALUES ($1, $2, $3, $4, 2)',
            [fullName.trim(), email.toLowerCase().trim(), hash, phone]
        );
        res.json({ message: 'Регистрация успешна' });
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Email уже используется' });
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const r = await pool.query(`
            SELECT u.*, r.role_name FROM users u 
            JOIN roles r ON u.role_id = r.role_id WHERE u.email = $1
        `, [email.toLowerCase().trim()]);
        const user = r.rows[0];
        if (!user || !await bcrypt.compare(password, user.password_hash)) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }
        const token = jwt.sign({ id: user.user_id, role: user.role_name }, process.env.JWT_SECRET, { expiresIn: '7d' });
        await pool.query('UPDATE users SET active_token = $1 WHERE user_id = $2', [token, user.user_id]);
        res.json({
            token,
            user: {
                id: user.user_id, name: user.full_name, email: user.email,
                phone: user.phone, uid: user.default_uid, address: user.default_address,
                role: user.role_name, firstOrderUsed: user.first_order_used
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
    try {
        await pool.query('UPDATE users SET active_token = NULL WHERE user_id = $1', [req.user.id]);
        res.json({ message: 'Выход выполнен' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const r = await pool.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (r.rows.length === 0) return res.status(400).json({ error: 'Пользователь не найден' });
        const userId = r.rows[0].user_id;
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await pool.query('DELETE FROM reset_codes WHERE user_id = $1', [userId]);
        await pool.query('INSERT INTO reset_codes (user_id, code, expires_at) VALUES ($1, $2, $3)', [userId, code, expiresAt]);

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER, to: email, subject: 'Код для сброса пароля',
                html: `<h2>Ваш код: ${code}</h2><p>Действует 15 минут.</p>`
            });
            console.log(`Код для ${email}: ${code}`);
        } catch (mailErr) {
            console.log(`Email не отправлен. Код для ${email}: ${code}`);
        }
        res.json({ message: 'Код отправлен' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    try {
        const r = await pool.query(`
            SELECT rc.code_id, rc.user_id, u.email, u.full_name FROM reset_codes rc
            JOIN users u ON rc.user_id = u.user_id
            WHERE u.email = $1 AND rc.code = $2 AND rc.used = FALSE AND rc.expires_at > NOW()
        `, [email.toLowerCase().trim(), code]);
        if (r.rows.length === 0) return res.status(400).json({ error: 'Неверный или просроченный код' });

        const userInfo = r.rows[0];
        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1, active_token = NULL WHERE user_id = $2', [hash, userInfo.user_id]);
        await pool.query('UPDATE reset_codes SET used = TRUE WHERE code_id = $1', [userInfo.code_id]);

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER, to: userInfo.email, subject: 'Пароль успешно сброшен',
                html: `<p>Здравствуйте, ${userInfo.full_name}!</p><p>Ваш пароль был успешно сброшен.</p>`
            });
        } catch (mailErr) {
            console.log(`Письмо не отправлено: ${mailErr.message}`);
        }
        res.json({ message: 'Пароль успешно изменён' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ПРОФИЛЬ ---
app.put('/api/users/:userId', authMiddleware, async (req, res) => {
    if (req.user.id !== parseInt(req.params.userId)) return res.status(403).json({ error: 'Только свой профиль' });
    const { fullName, email, phone, uid, address } = req.body;
    if (!fullName || !validName(fullName)) return res.status(400).json({ error: 'Некорректное ФИО' });
    if (phone && !validPhone(phone)) return res.status(400).json({ error: 'Телефон: +7 (999) 123-45-67' });
    try {
        await pool.query(
            'UPDATE users SET full_name = $1, email = $2, phone = $3, default_uid = $4, default_address = $5 WHERE user_id = $6',
            [fullName.trim(), email.toLowerCase().trim(), phone, uid, address, req.params.userId]
        );
        res.json({ message: 'Данные обновлены' });
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Email занят' });
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/users/:userId/password', authMiddleware, async (req, res) => {
    if (req.user.id !== parseInt(req.params.userId)) return res.status(403).json({ error: 'Только свой' });
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    try {
        const r = await pool.query('SELECT password_hash, email, full_name FROM users WHERE user_id = $1', [req.params.userId]);
        if (r.rows.length === 0) return res.status(404).json({ error: 'Не найден' });
        const user = r.rows[0];
        if (!await bcrypt.compare(oldPassword, user.password_hash)) return res.status(400).json({ error: 'Старый пароль неверный' });

        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, req.params.userId]);

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER, to: user.email, subject: 'Пароль успешно изменён',
                html: `<p>Здравствуйте, ${user.full_name}!</p><p>Ваш пароль был успешно изменён.</p>`
            });
            console.log(`Письмо о смене пароля отправлено на ${user.email}`);
        } catch (mailErr) {
            console.log(`Письмо не отправлено: ${mailErr.message}`);
        }
        res.json({ message: 'Пароль изменён' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- КОРЗИНА ---
app.get('/api/cart/:userId', authMiddleware, async (req, res) => {
    if (req.user.id !== parseInt(req.params.userId)) return res.status(403).json({ error: 'Нет доступа' });
    try {
        const r = await pool.query(`
            SELECT c.cart_id, s.service_id, s.title, s.image_url, s.discount_percent,
                   ROUND(s.price * (100 - s.discount_percent) / 100, 2) AS price,
                   c.quantity,
                   ROUND(s.price * (100 - s.discount_percent) / 100 * c.quantity, 2) AS total_item
            FROM cart c JOIN services s ON c.service_id = s.service_id
            WHERE c.user_id = $1
        `, [req.params.userId]);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/cart', authMiddleware, async (req, res) => {
    const { userId, serviceId } = req.body;
    if (req.user.id !== userId) return res.status(403).json({ error: 'Нет доступа' });
    try {
        const existing = await pool.query('SELECT quantity FROM cart WHERE user_id = $1 AND service_id = $2', [userId, serviceId]);
        if (existing.rows.length > 0 && existing.rows[0].quantity >= 10) return res.status(400).json({ error: 'Максимум 10 штук' });
        await pool.query(`
            INSERT INTO cart (user_id, service_id, quantity) VALUES ($1, $2, 1)
            ON CONFLICT (user_id, service_id) DO UPDATE SET quantity = cart.quantity + 1
        `, [userId, serviceId]);
        res.json({ message: 'Добавлено' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/cart/:cartId', authMiddleware, async (req, res) => {
    const { quantity } = req.body;
    if (!quantity || quantity < 1 || quantity > 10) return res.status(400).json({ error: 'Количество 1-10' });
    try {
        const cur = await pool.query('SELECT user_id FROM cart WHERE cart_id = $1', [req.params.cartId]);
        if (cur.rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
        if (cur.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Нет доступа' });
        await pool.query('UPDATE cart SET quantity = $1 WHERE cart_id = $2', [quantity, req.params.cartId]);
        res.json({ message: 'Обновлено' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/cart/:cartId', authMiddleware, async (req, res) => {
    try {
        const cur = await pool.query('SELECT user_id FROM cart WHERE cart_id = $1', [req.params.cartId]);
        if (cur.rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
        if (cur.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Нет доступа' });
        await pool.query('DELETE FROM cart WHERE cart_id = $1', [req.params.cartId]);
        res.json({ message: 'Удалено' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ОФОРМЛЕНИЕ ---
app.post('/api/orders', authMiddleware, async (req, res) => {
    const { userId, uidGame, address, date, items, totalPrice, couponCode } = req.body;
    if (req.user.id !== userId) return res.status(403).json({ error: 'Нет доступа' });
    if (!uidGame) return res.status(400).json({ error: 'Введите UID' });
    if (!address) return res.status(400).json({ error: 'Выберите город' });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(date) < today) return res.status(400).json({ error: 'Дата не может быть меньше текущей' });

    try {
        const active = await pool.query(`
            SELECT o.order_id, o.delivery_date, s.duration
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN services s ON oi.service_id = s.service_id
            WHERE o.user_id = $1 AND o.status IN ('Оплачен', 'Выполнен')
            ORDER BY o.delivery_date DESC LIMIT 1
        `, [userId]);

        if (active.rows.length > 0) {
            const { delivery_date, duration } = active.rows[0];
            const days = parseDuration(duration);
            const endDate = new Date(delivery_date);
            endDate.setDate(endDate.getDate() + days);
            const now = new Date(); now.setHours(0, 0, 0, 0);
            if (now < endDate) {
                return res.status(400).json({ error: `У вас активная услуга до ${endDate.toLocaleDateString('ru-RU')}` });
            }
        }

        const dailyCount = await pool.query(`
            SELECT COALESCE(SUM(oi.quantity), 0) AS total
            FROM orders o JOIN order_items oi ON o.order_id = oi.order_id
            WHERE o.user_id = $1 AND o.delivery_date = $2 AND o.status != 'Отменён'
        `, [userId, date]);

        const existingCount = parseInt(dailyCount.rows[0].total);
        const newCount = items.reduce((s, i) => s + i.quantity, 0);
        if (existingCount + newCount > 10) return res.status(400).json({ error: 'Максимум 10 штук на дату' });

        const dup = await pool.query(`SELECT COUNT(*) FROM orders WHERE user_id = $1 AND delivery_date = $2 AND status != 'Отменён'`, [userId, date]);
        if (parseInt(dup.rows[0].count) > 0) return res.status(400).json({ error: 'На эту дату уже есть заказ' });

        const userR = await pool.query('SELECT first_order_used FROM users WHERE user_id = $1', [userId]);
        const firstOrderUsed = userR.rows[0].first_order_used;
        let couponApplied = 0;
        let finalTotal = totalPrice;
        let appliedCouponCode = null;

        if (!firstOrderUsed && totalPrice >= 1000) {
            couponApplied = totalPrice * 0.1;
            finalTotal = totalPrice - couponApplied;
        }

        if (couponCode) {
            const cR = await pool.query(`
                SELECT * FROM coupons
                WHERE code = $1 AND is_active = TRUE
                  AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
                  AND (max_uses IS NULL OR used_count < max_uses)
            `, [couponCode.trim().toUpperCase()]);
            if (cR.rows.length === 0) return res.status(400).json({ error: 'Промокод недействителен' });
            const coupon = cR.rows[0];
            const promoDiscount = finalTotal * (coupon.discount_percent / 100);
            finalTotal = finalTotal - promoDiscount;
            couponApplied += promoDiscount;
            appliedCouponCode = coupon.code;
            await pool.query('UPDATE coupons SET used_count = used_count + 1 WHERE coupon_id = $1', [coupon.coupon_id]);
        }

        const orderR = await pool.query(`
            INSERT INTO orders (user_id, uid_game, delivery_address, delivery_date, total_price, coupon_applied, coupon_code)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING order_id
        `, [userId, uidGame, address, date, finalTotal, couponApplied, appliedCouponCode]);
        const orderId = orderR.rows[0].order_id;

        for (const item of items) {
            await pool.query(`
                INSERT INTO order_items (order_id, service_id, quantity, price_at_purchase)
                VALUES ($1, $2, $3, $4)
            `, [orderId, item.service_id, item.quantity, item.price]);

            await pool.query(`
                INSERT INTO inventory (user_id, service_id, title, quantity, opened)
                VALUES ($1, $2, $3, $4, FALSE)
            `, [userId, item.service_id, item.title, item.quantity]);
        }

        await pool.query('DELETE FROM cart WHERE user_id = $1', [userId]);
        await pool.query('UPDATE users SET first_order_used = TRUE WHERE user_id = $1', [userId]);

        res.json({ message: 'Заказ оформлен', orderId, couponApplied, finalTotal });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/orders/user/:userId', authMiddleware, async (req, res) => {
    if (req.user.id !== parseInt(req.params.userId)) return res.status(403).json({ error: 'Нет доступа' });
    try {
        const r = await pool.query(`
            SELECT o.order_id, o.uid_game, o.delivery_address, o.delivery_date, o.status,
                   o.total_price, o.coupon_applied, o.coupon_code, o.created_at,
                   json_agg(json_build_object('title', s.title, 'quantity', oi.quantity, 'price', oi.price_at_purchase)) AS items
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN services s ON oi.service_id = s.service_id
            WHERE o.user_id = $1
            GROUP BY o.order_id
            ORDER BY o.created_at DESC
        `, [req.params.userId]);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/inventory/:userId', authMiddleware, async (req, res) => {
    if (req.user.id !== parseInt(req.params.userId)) return res.status(403).json({ error: 'Нет доступа' });
    try {
        const r = await pool.query(`
            SELECT i.*, s.image_url FROM inventory i
            LEFT JOIN services s ON i.service_id = s.service_id
            WHERE i.user_id = $1 ORDER BY i.acquired_at DESC
        `, [req.params.userId]);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ОТЗЫВЫ ---
app.get('/api/reviews/:serviceId', async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT r.review_id, r.rating, r.comment, r.created_at, r.deleted_by_admin, u.full_name
            FROM reviews r JOIN users u ON r.user_id = u.user_id
            WHERE r.service_id = $1 ORDER BY r.created_at DESC
        `, [req.params.serviceId]);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/reviews', authMiddleware, async (req, res) => {
    const { serviceId, rating, comment } = req.body;
    if (!comment || comment.trim().length < 3) return res.status(400).json({ error: 'Отзыв пустой' });
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Оценка 1-5' });

    const cleanComment = maskProfanity(comment.trim());
    console.log('Оригинал:', comment.trim());
    console.log('После цензуры:', cleanComment);

    try {
        await pool.query(
            'INSERT INTO reviews (user_id, service_id, rating, comment) VALUES ($1, $2, $3, $4)',
            [req.user.id, serviceId, rating, cleanComment]
        );
        res.json({ message: 'Отзыв добавлен' });
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Вы уже оставляли отзыв' });
        res.status(500).json({ error: e.message });
    }
});

// --- АДМИН: услуги ---
app.post('/api/services', authMiddleware, adminMiddleware, async (req, res) => {
    const { categoryId, title, description, duration, price, imageUrl, discountPercent } = req.body;
    if (!title || !description || !duration || !price || !imageUrl) return res.status(400).json({ error: 'Все поля обязательны' });
    if (parseFloat(price) <= 0) return res.status(400).json({ error: 'Цена > 0' });
    const discount = parseInt(discountPercent) || 0;
    if (discount < 0 || discount > 100) return res.status(400).json({ error: 'Скидка 0-100%' });
    try {
        await pool.query(`
            INSERT INTO services (category_id, title, description, duration, price, image_url, discount_percent)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [categoryId || null, title, description, duration, price, imageUrl, discount]);
        res.json({ message: 'Услуга добавлена' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/services/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const { categoryId, title, description, duration, price, imageUrl, discountPercent } = req.body;
    if (parseFloat(price) <= 0) return res.status(400).json({ error: 'Цена > 0' });
    const discount = parseInt(discountPercent) || 0;
    if (discount < 0 || discount > 100) return res.status(400).json({ error: 'Скидка 0-100%' });
    try {
        await pool.query(`
            UPDATE services SET category_id = $1, title = $2, description = $3, duration = $4, price = $5, image_url = $6, discount_percent = $7
            WHERE service_id = $8
        `, [categoryId || null, title, description, duration, price, imageUrl, discount, req.params.id]);
        res.json({ message: 'Услуга обновлена' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/services/:id/discount', authMiddleware, adminMiddleware, async (req, res) => {
    const { discountPercent } = req.body;
    const discount = parseInt(discountPercent);
    if (isNaN(discount) || discount < 0 || discount > 100) return res.status(400).json({ error: 'Скидка 0-100%' });
    try {
        await pool.query('UPDATE services SET discount_percent = $1 WHERE service_id = $2', [discount, req.params.id]);
        res.json({ message: 'Скидка обновлена' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/services/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM services WHERE service_id = $1', [req.params.id]);
        res.json({ message: 'Услуга удалена' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- АДМИН: заказы и отзывы ---
app.get('/api/admin/orders', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT o.order_id, u.full_name AS user_name, u.email AS user_email,
                   o.uid_game, o.delivery_date, o.status, o.total_price, o.coupon_applied, o.coupon_code, o.created_at,
                   json_agg(json_build_object('title', s.title, 'quantity', oi.quantity, 'price', oi.price_at_purchase)) AS items
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN services s ON oi.service_id = s.service_id
            GROUP BY o.order_id, u.full_name, u.email
            ORDER BY o.created_at DESC
        `);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/admin/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
    const { status } = req.body;
    const allowed = ['Ожидает оплаты', 'Оплачен', 'Выполнен', 'Отменён'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Недопустимый статус' });
    try {
        const cur = await pool.query('SELECT status FROM orders WHERE order_id = $1', [req.params.id]);
        if (cur.rows.length === 0) return res.status(404).json({ error: 'Не найден' });
        if (cur.rows[0].status === 'Оплачен' && status === 'Ожидает оплаты') {
            return res.status(403).json({ error: 'Нельзя вернуть оплаченный заказ' });
        }
        await pool.query('UPDATE orders SET status = $1 WHERE order_id = $2', [status, req.params.id]);
        res.json({ message: 'Статус обновлён' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/reviews/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await pool.query(
            'UPDATE reviews SET comment = $1, deleted_by_admin = TRUE WHERE review_id = $2',
            ['Отзыв удалён администратором за нарушение политики сайта.', req.params.id]
        );
        res.json({ message: 'Отзыв удалён' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/reviews', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT r.review_id, r.rating, r.comment, r.created_at, r.deleted_by_admin,
                   u.full_name, u.email, s.title AS service_title
            FROM reviews r
            JOIN users u ON r.user_id = u.user_id
            JOIN services s ON r.service_id = s.service_id
            ORDER BY r.created_at DESC
        `);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});