import express from 'express';

const app = express();
const PORT = 31337;

app.use(express.json());

app.post('/webhook', (req, res) => {
    console.log('Get hook:', req.body);
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`Running on http://localhost:${PORT}`);
});
