import express from 'express';
import { askQuestions } from './ai-service/query.js';
import * as dotenv from 'dotenv';
import morganMiddleware from './config/morganMiddleware.js';
dotenv.config();
const app = express();
const port = 300;
app.use(morganMiddleware);
app.get('/', (req, res) => {
    res.json({ status: 'OK' });
});
app.post('/question', (req, res) => {
    askQuestions(req.body.question)
        .then(result => res.status(200).send(result))
        .catch(err => res.status(500).send(err));
});
// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500).send({ error: err });
});
app.listen(port, () => {
    console.log(`⚡️[baseline chat backend]: Server is running at http://localhost:${port}`);
});
