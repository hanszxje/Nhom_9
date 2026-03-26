const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Cấu hình Database
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Thay bằng user của bạn
    password: '', // Thay bằng mật khẩu của bạn
    database: 'QLBanVe',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ================= API CLIENT =================

// 1. Lấy danh sách chuyến bay (Có Search, Filter, Sort, Pagination)
app.get('/api/flights', async (req, res) => {
    try {
        const { search, airline, sort, page = 1, limit = 10 } = req.query;
        let query = 'SELECT * FROM flights WHERE 1=1';
        const params = [];

        if (search) { query += ' AND route LIKE ?'; params.push(`%${search}%`); }
        if (airline) { query += ' AND airline = ?'; params.push(airline); }
        
        if (sort === 'price_asc') query += ' ORDER BY price ASC';
        else if (sort === 'price_desc') query += ' ORDER BY price DESC';
        else query += ' ORDER BY id DESC'; // Default sort

        // Phân trang
        const offset = (page - 1) * limit;
        query += ` LIMIT ${limit} OFFSET ${offset}`;

        const [rows] = await pool.query(query, params);
        
        // Đếm tổng số lượng cho pagination
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM flights');
        const total = countResult[0].total;

        res.json({ flights: rows, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. Lấy chi tiết 1 chuyến bay
app.get('/api/flights/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM flights WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy chuyến bay' });
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. Khách hàng đặt vé
app.post('/api/bookings', async (req, res) => {
    const { flightId, passengerName, email, phone, adults, children } = req.body;
    try {
        const query = `INSERT INTO bookings (flightId, passengerName, email, phone, adults, children) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(query, [flightId, passengerName, email, phone, adults, children]);
        res.status(201).json({ message: 'Đặt vé thành công' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ================= API ADMIN =================

// 4. Quản lý Chuyến bay (CRUD) - Thêm
app.post('/api/flights', async (req, res) => {
    const { flightCode, airline, route, departureTime, price, logo, isAvailable } = req.body;
    try {
        await pool.query('INSERT INTO flights (flightCode, airline, route, departureTime, price, logo, isAvailable) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [flightCode, airline, route, departureTime, price, logo, isAvailable]);
        res.json({ message: 'Thêm chuyến bay thành công' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 5. Quản lý Chuyến bay (CRUD) - Xóa
app.delete('/api/flights/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM flights WHERE id = ?', [req.params.id]);
        res.json({ message: 'Xóa chuyến bay thành công' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 6. Quản lý Đơn đặt vé - Lấy danh sách & Cập nhật trạng thái
app.get('/api/bookings', async (req, res) => {
    try {
        const query = `SELECT b.*, f.flightCode, f.route FROM bookings b JOIN flights f ON b.flightId = f.id ORDER BY b.createdAt DESC`;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/bookings/:id/status', async (req, res) => {
    try {
        await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ message: 'Cập nhật trạng thái thành công' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(5000, () => console.log('Backend chạy tại http://localhost:5000'));
