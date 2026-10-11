function Footer() {
    return (
        <footer style={{
            background: 'var(--card)', padding: '30px',
            marginTop: '50px', borderTop: '3px solid var(--border)',
            transition: 'background 0.3s'
        }}>
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '30px', maxWidth: '1200px', margin: '0 auto'
            }}>
                <div>
                    <h4 style={{ color: 'var(--accent)' }}>Способы оплаты</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: '5px 0' }}>СБП</p>
                    <p style={{ color: 'var(--text-secondary)', margin: '5px 0' }}>Visa, MasterCard, МИР</p>
                    <p style={{ color: 'var(--text-secondary)', margin: '5px 0' }}>ЮMoney</p>
                    <p style={{ color: 'var(--text-secondary)', margin: '5px 0' }}>Криптовалюта (USDT)</p>
                </div>
                <div>
                    <h4 style={{ color: 'var(--accent)' }}>Связаться с нами</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: '5px 0' }}>support@genshindonate.ru</p>
                    <p style={{ color: 'var(--text-secondary)', margin: '5px 0' }}>Telegram: @genshindonate</p>
                    <p style={{ color: 'var(--text-secondary)', margin: '5px 0' }}>vk.com/genshindonate</p>
                </div>
                <div>
                    <h4 style={{ color: 'var(--accent)' }}>Режим работы</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: '5px 0' }}>Пн-Пт: 10:00 - 22:00</p>
                    <p style={{ color: 'var(--text-secondary)', margin: '5px 0' }}>Сб-Вс: 12:00 - 20:00</p>
                    <p style={{ color: 'var(--text-secondary)', margin: '5px 0', marginTop: '15px' }}>2025 GenshinDonate</p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;