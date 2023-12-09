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
            index: ['fruits', 'bdanimals'],
            q: `name:${query} OR raza:${query} OR pelaje:${query} OR patologias:${query} OR descripcion:${query} OR color:${query}`,
        });

        console.log('Elasticsearch Query:', {
            index: ['fruits', 'bdanimals'],
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
            const results = body.hits.hits.map(hit => {
                let extractedFields = {};

                if (hit._index === 'fruits') {
                    extractedFields = {
                        name: hit._source.name,
                        description: hit._source.description,
                        price: hit._source.price,
                    };
                }
                if (hit._index === 'bdanimals') {
                    extractedFields = {
                        name: hit._source.name,
                        raza: hit._source.raza,
                        descripcion: hit._source.descripcion,
                        color: hit._source.color,
                        patologias: hit._source.patologias,
                        pelaje: hit._source.pelaje,
                        tamany: hit._source.tamany,
                        edat: hit._source.edat,
                    };
                }

                return extractedFields;
            });

            // Filtra y elimina los resultados vacíos
            const filteredResults = results.filter(result => Object.keys(result).length !== 0);

            res.json(filteredResults); // Devuelve los resultados filtrados
        } else {
            res.status(404).json({ error: 'No results found' });
        }
    } catch (error) {
        console.error('Elasticsearch query error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/searchButton', async (req, res) => {
    const query = req.query.query; // Extract the 'query' parameter directly

    const decodedQuery = decodeURIComponent(query);
    const matrix = decodedQuery.split('|').map(row => row.split(',').filter(element => element !== ''));

    try {
        if (!matrix) {
              res.status(400).send('Consulta no válida');
              return;
        }

        console.log(matrix);

        // Supongamos que 'matrix' es un array con los valores para cada campo en el orden: [tipus, raza, color, patologias, pelaje, tamany, edat]
        const fields = ['tipus', 'raza', 'color', 'patologias', 'pelaje', 'tamany', 'edat'];

        // Construye el objeto de consulta
        const queryBody = {
          index: ['fruits', 'bdanimals'],
          body: {
            query: {
              bool: {
                must: []  // Cambiamos 'should' por 'must'
              }
            }
          }
        };

        // Itera sobre la matriz y agrega condiciones solo para los campos con valores diferentes de ''
        for (let i = 0; i < matrix.length; i++) {
          if (matrix[i].length > 0) {
            if (matrix[i].length === 1) {
              // Si es un solo elemento, agregamos una sola condición dentro de 'must'
              queryBody.body.query.bool.must.push({
                match: {
                  [fields[i]]: matrix[i][0]
                }
              });
            } else {
              // Si es un array, agregamos múltiples condiciones dentro de 'must'
              const shouldConditions = matrix[i].map(element => ({
                match: {
                  [fields[i]]: element
                }
              }));
              queryBody.body.query.bool.must.push({ bool: { should: shouldConditions } });
            }
          }
        }

        console.log('Consulta de Elasticsearch:', JSON.stringify(queryBody, null, 2));

        // Realiza la búsqueda en Elasticsearch
        const result = await client.search(queryBody);

        if (result && result.hits) {
            // Extracta campos relevantes de la respuesta de Elasticsearch
            const results = result.hits.hits.map(hit => {
                let extractedFields = {};

                if (hit._index === 'bdanimals') {
                    extractedFields = {
                        name: hit._source.name,
                        raza: hit._source.raza,
                        descripcion: hit._source.descripcion,
                        color: hit._source.color,
                        patologias: hit._source.patologias,
                        pelaje: hit._source.pelaje,
                        tamany: hit._source.tamany,
                        edat: hit._source.edat,
                    };
                }

                return extractedFields;
            });

            // Filtra y elimina los resultados vacíos
            const filteredResults = results.filter(result => Object.keys(result).length !== 0);

            res.json(filteredResults); // Devuelve los resultados filtrados
        } else {
            res.status(404).json({ error: 'No results found' });
        }
    } catch (error) {
        console.error(error, JSON.stringify(error, null, 2));
        res.status(500).send('Error en la búsqueda');
    }
});

app.use(cors());

app.get('/api/data', (req, res) => {
  res.json({ message: 'Datos desde el servidor' });
});

app.listen(port, () => {
    console.log(`Backend server is running on port ${port}`);
});
