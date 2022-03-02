import { apiCalls } from './src/apicalls.js'
import express from 'express';
import bodyParser from 'body-parser';


const app = express();
const port = process.env.Port || 3000;

let cityWorks = [];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.raw());

app.post('/', (req, res) => {

    const message = req.body.id
    cityWorks.push(message);
    apiCalls(message);
    return res.send(message);


})


app.listen(port, () => console.log(`Listening on port ${port}`))
