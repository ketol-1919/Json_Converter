const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

app.post('/chat', (req, res) => {
    const userMessage = req.body.message;
    console.log('Received message:', userMessage);

    // とりあえず固定のメッセージを返す
    res.json({ reply: 'これはテストメッセージです。' });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
