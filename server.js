const express = require('express');
const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://localhost:9201' });
const cors = require('cors'); // Import the 'cors' middleware
console.log(client);
const app = express();
const port = 3000;
// Allow requests from a specific origin (your frontend application)
/*const allowedOrigins = [
    'http://localhost:3000', // If your frontend runs on this URL
    'http://localhost:63342/untitled/frontend.html'
];
// Configure CORS options
const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            // Allow requests from the specified origins or if there's no origin (e.g., for localhost)
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Specify the allowed HTTP methods
    preflightContinue: false,
    optionsSuccessStatus: 204,
};*/
const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};

app.use(cors({
  origin: 'http://localhost:4200', // Actualiza con tu origen de Angular
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 204,
}));


// Permitir solicitudes POST en la ruta /api/check
app.post('/api/check', async (req, res) => {
  try {
    const info = await client.info();
    res.json(info);
  } catch (error) {
    console.error('Elasticsearch connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Esto en principio no haría falta pero depende de como esté el CORS a lo mejor no va.
app.get('/', (req, res) => {
    // You should specify the correct path to your HTML file
    res.sendFile(__dirname + '/frontend.html'); // Use the correct path
});

app.get('/check', async (req, res) => {
    try {
        const info = await client.info();
        res.json(info);
    } catch (error) {
        console.error('Elasticsearch connection error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/search', async (req, res) => {
    const query = req.query.query; // Extract the 'query' parameter directly
    console.log(query);
    try {
        if (!query) {
            // Handle empty query
            res.status(400).json({ error: 'Query parameter is missing' });
            return;
        }

        const body = await client.search({
            index: 'fruits',
            q: `name:${query} OR price:${parseFloat(query)}`, // Use the q parameter for a simple query string
        });

        console.log('Elasticsearch Query:', {
            index: 'fruits',
            body: {
                query: {
                    match: {
                        name: query,
                    },
                },
            },
        });
        console.log(JSON.stringify(body, null, 2));

        if (body && body.hits) {
            // Extract relevant fields from the Elasticsearch response
            const results = body.hits.hits.map(hit => ({
                name: hit._source.name,
                description: hit._source.description,
                price: hit._source.price,
            }));

            res.json(results);
        } else {
            res.status(404).json({ error: 'No results found' });
        }
    } catch (error) {
        console.error('Elasticsearch query error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.use(cors());

app.get('/api/data', (req, res) => {
  res.json({ message: 'Datos desde el servidor' });
});

app.listen(port, () => {
    console.log(`Backend server is running on port ${port}`);
});
