#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const STATIC_DIR = path.join(__dirname, 'static');

const server = http.createServer((req, res) => {
    let pathname = url.parse(req.url).pathname;
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    let filepath = path.join(STATIC_DIR, pathname);
    
    fs.readFile(filepath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
            return;
        }
        
        let contentType = 'text/html';
        if (filepath.endsWith('.js')) contentType = 'application/javascript';
        if (filepath.endsWith('.css')) contentType = 'text/css';
        if (filepath.endsWith('.json')) contentType = 'application/json';
        if (filepath.match(/\.(png|jpg|jpeg|gif|svg)$/)) contentType = 'image/png';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           家庭财务管理应用 - 前端服务器启动成功            ║
╠════════════════════════════════════════════════════════════╣
║  🌐 访问地址: http://localhost:${PORT}                        ║
║  📂 服务目录: ${STATIC_DIR}                                 ║
║  ⏹️  停止服务: 按 Ctrl+C                                     ║
╚════════════════════════════════════════════════════════════╝
    `);
});
