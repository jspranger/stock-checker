/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

const expect = require('chai').expect;
const mongoose = require('mongoose');
const got = require('got');

const CONNECTION_STRING = process.env.DB;
const dateRegex = /([0-9]{4,}-[0-9]{2}-[0-9]{2})/;

let db = undefined;

mongoose.connect(CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }, (err, client) => {
    if (err) {
      console.log(err);
      return;
    }

    db = client;
});

const stockDataSchema = new mongoose.Schema({
  stock: { type: String, required: true },
  likes: []
});

const StockDataModel = mongoose.model('StockData', stockDataSchema);

const testDbConnection = (req, res, next) => {
  if (db === undefined) {
    return res.status(500).send('database unreachable');
  }

  next();
}

const validateStockParameter = (req, res, next) => {
  if (req.query.stock === undefined ) {
    return res.status(400).send('stock parameter missing');
  }
  
  next();
}

async function updateStockData(stock, ip, liked) {
  let stockData = await StockDataModel.findOne({ stock: stock });
  
  if (stockData === null) {
    stockData = await StockDataModel.create({ stock: stock });
  }
  
  if (liked && stockData.likes.includes(ip) === false) {
    stockData = await StockDataModel.findOneAndUpdate({
      stock: stock
    }, {
      '$push': { 'likes': ip }
    }, {
      new: true,
      useFindAndModify: false
    });
  }

  return stockData;
}

const getSingleStock = (req, res, next) => {
  if (typeof req.query.stock === 'string') {
    const stock = req.query.stock.toUpperCase();
    let like = req.query.like === undefined ? false : req.query.like;

    let remoteAddress = req.connection.remoteAddress;

    if (req.headers['x-forwarded-for'].split(',').length > 0) {
      remoteAddress = req.headers['x-forwarded-for'].split(',')[0];
    } else if (req.headers['x-forwarded-for'].length > 0) {
      remoteAddress = req.headers['x-forwarded-for'];
    }

    updateStockData(stock, remoteAddress, like)
    .then(stockData => {
      if (stockData === null) {
        return res.status(500).send('database unreachable');
      }
      
      got(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${stock}&apikey=${process.env.API_KEY}`, { json: true })
        .then(response => {
          const regexResult = response.body['Meta Data']['3. Last Refreshed'].match(dateRegex);
          
          if (regexResult === null) {
            return res.status(500).send('error fetching stock prices');
          }
        
          return res.json({
            stock: stockData.stock,
            price: response.body['Time Series (Daily)'][regexResult[1]]['4. close'],
            likes: stockData.likes.length
          });
        }).catch(error => {
          return res.status(500).send('error fetching stock prices');
      });
    });
  } else {
    next();
  }
}

const compareStocks = (req, res, next) => {
  const [a, b] = req.query.stock;
  const stockA = a.toUpperCase();
  const stockB = b.toUpperCase();
  let like = req.query.like === undefined ? false : req.query.like;

  let remoteAddress = req.connection.remoteAddress;

  if (req.headers['x-forwarded-for'].split(',').length > 0) {
    remoteAddress = req.headers['x-forwarded-for'].split(',')[0];
  } else if (req.headers['x-forwarded-for'].length > 0) {
    remoteAddress = req.headers['x-forwarded-for'];
  }

  updateStockData(stockA, remoteAddress, like)
  .then(stockDataA => {
    if (stockDataA === null) {
      return res.status(500).send('database unreachable');
    }

    got(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${stockA}&apikey=${process.env.API_KEY}`, { json: true })
      .then(responseA => {
        updateStockData(stockB, remoteAddress, like)
        .then(stockDataB => {
          if (stockDataB === null) {
            return res.status(500).send('database unreachable');
          }

          const regexResultA = responseA.body['Meta Data']['3. Last Refreshed'].match(dateRegex);

          if (regexResultA === null) {
            return res.status(500).send('error fetching stock prices');
          }

          got(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${stockB}&apikey=${process.env.API_KEY}`, { json: true })
            .then(responseB => {
              const regexResultB = responseB.body['Meta Data']['3. Last Refreshed'].match(dateRegex);

              if (regexResultB === null) {
                return res.status(500).send('error fetching stock prices');
              }

              return res.json([{
                stock: stockDataA.stock,
                price: responseA.body['Time Series (Daily)'][regexResultA[1]]['4. close'],
                rel_likes: stockDataA.likes.length - stockDataB.likes.length
              }, {
                stock: stockDataB.stock,
                price: responseB.body['Time Series (Daily)'][regexResultB[1]]['4. close'],
                rel_likes: stockDataB.likes.length - stockDataA.likes.length
              }]);
            }).catch(error => {
              return res.status(500).send('error fetching stock prices');
          })
        });
      }).catch(error => {
        return res.status(500).send('error fetching stock prices');
    })
  });
}

module.exports = app => {
  app.route('/api/stock-prices')
  .get(testDbConnection, validateStockParameter, getSingleStock, compareStocks);
};
