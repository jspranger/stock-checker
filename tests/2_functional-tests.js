/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', () => {
    
    console.log('ATENTION:');
    console.log('THE RECOMMENDED SERVICE (https://finance.google.com/finance/info?q=NASDAQ%3aGOOG) NO LONGER WORKS');
    console.log('SO I HAD TO USE A FREE ALTERNATIVE: https://www.alphavantage.co/');
    console.log('IT CONTAINS A LIMITATION OF 5 REQUESTS PER MINUTE, SO THE TESTS ALL TOGETHER WILL FAIL');
    console.log('BUT THEY PASS WHEN ISOLATED AND TIMELY SPACED');
  
    suite('GET /api/stock-prices => stockData object', () => {
      test('1 stock', done => {
       chai.request(server)
        .get('/api/stock-prices')
        .set('x-forwarded-for', '127.0.0.1')
        .query({ stock: 'goog' })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.property(res.body, 'stock');
          assert.property(res.body, 'price');
          assert.property(res.body, 'likes');
          done();
        });
      });
      
      test('1 stock with like', done => {
       chai.request(server)
        .get('/api/stock-prices')
        .set('x-forwarded-for', '127.0.0.1')
        .query({ stock: 'goog', like: true })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.property(res.body, 'stock');
          assert.property(res.body, 'price');
          assert.property(res.body, 'likes');
          done();
        });
      });

      test('1 stock with like again (ensure likes arent double counted)', done => {
       chai.request(server)
        .get('/api/stock-prices')
        .set('x-forwarded-for', '127.0.0.1')
        .query({ stock: 'goog', like: true })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.property(res.body, 'stock');
          assert.property(res.body, 'price');
          assert.property(res.body, 'likes');
          assert.equal(res.body.likes, '1');
          done();
        });
      });

      test('2 stocks', done => {
       chai.request(server)
        .get('/api/stock-prices')
        .set('x-forwarded-for', '127.0.0.1')
        .query({ stock: ['goog', 'msft'] })
        .end((err, res) => {
          assert.equal(res.status, 200);
           console.log(res.body);
          assert.isArray(res.body);
          assert.property(res.body[0], 'stock');
          assert.property(res.body[0], 'price');
          assert.property(res.body[0], 'rel_likes');
          done();
        });
      });
      test('2 stocks with like', done => {
       chai.request(server)
        .get('/api/stock-prices')
        .set('x-forwarded-for', '127.0.0.1')
        .query({ like: true, stock: ['goog', 'msft'] })
        .end((err, res) => {
          assert.equal(res.status, 200);
           console.log(res.body);
          assert.isArray(res.body);
          assert.property(res.body[0], 'stock');
          assert.property(res.body[0], 'price');
          assert.property(res.body[0], 'rel_likes');
          done();
        });
      });
    });
});
