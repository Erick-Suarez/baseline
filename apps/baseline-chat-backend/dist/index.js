import express from 'express';
import { askQuestions } from './ai-service/query.js';
import * as dotenv from 'dotenv';
import morganMiddleware from './config/morganMiddleware.js';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
dotenv.config();
const port = 3000;
// TODO: Look into why you need createServer
const app = express();
app.use(express.json());
app.use(morganMiddleware);
app.use(cors());
app.get('/', (req, res) => {
    res.json({ status: 'OK' });
});
// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500).send({ error: err });
});
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:5173' } });
// TODO: Allow for multiple instances by implementing some cookie or auth
io.on('connection', socket => {
    console.log('a user connected');
    io.emit('hello', { data: 'hello world' });
    socket.on('query-request', (data) => {
        console.log('Query request received');
        console.log(data);
        askQuestions(data.query)
            .then(result => {
            console.log(result);
            io.emit('query-response', { result });
        })
            .catch(err => {
            console.error(err);
        });
    });
});
server.listen(port, () => {
    console.log(`⚡️[baseline chat backend]: Server is running at http://localhost:${port}`);
});
