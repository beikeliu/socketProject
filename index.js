const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const db = mongoose.connection;
const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server(server, {
    cors: {}
});
const messageSchema = new mongoose.Schema({
    username: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);
const logSchema = new mongoose.Schema({
    username: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});
const Logg = mongoose.model('Logg', logSchema);

async function saveMessage(username, message) {
    const msg = new Message({ username, message });
    await msg.save();
}

async function saveLogg(username, message) {
    const logg = new Logg({ username, message });
    await logg.save();
}

async function getRecentMessages() {
    const latestMessages = await Message.find().sort({ timestamp: -1 }).limit(100);
    return latestMessages.sort((a, b) => a.timestamp - b.timestamp);
}

mongoose.connect('mongodb://admin:admin123@localhost:27017/chat?authSource=admin');

db.on('error', console.error.bind(console, 'MongoDB 连接失败:'));
db.once('open', () => {
    console.log('MongoDB 连接成功！');
});

io.on('connection', async (socket) => {
    io.emit("user count", io.sockets.sockets.size);
    const messages = await getRecentMessages();
    io.emit('chat history', messages);
    socket.on('join user', async (data) => {
        socket.username = data.username;
        await saveLogg(data.username, '加入了聊天室');
    });
    socket.on('disconnect', async (data) => {
        io.emit("user count", io.sockets.sockets.size);
        await saveLogg(socket.username, '离开了聊天室');
    });
    socket.on('chat message', async (data) => {
        await saveMessage(data.username, data.message);
        io.emit('chat message', { ...data, timestamp: new Date().toJSON() });
    });
});

server.listen(3000, () => {
    console.log('server 运行成功！ http://localhost:3000');
});