/* const Shopify = require('shopify-api-node');
const fs = require('fs');
const shopify = new Shopify({
    shopName: 'mibc-store.myshopify.com',
    accessToken: '628ba74abb479d543f177eb85e1de1c5'
});
 */
// const shopify = new Shopify({
//     shopName: 'mibc-store.myshopify.com',
//     apiKey: '8e28de12a37707693f0d0ee7bc83ef7f',
//     password: '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'
// });

/* shopify.order
    .list({ limit: 5 })
    .then((orders) => {
        console.log(orders)
        fs.writeFile('old-orders.json', JSON.stringify(orders), (err, data) => {
            if (err) {
                throw err
            }
            console.log('Write scuccessfully')
        })
    })
    .catch((err) => console.error(err));
 */
/* async function createOrder() {
    const orderObject = {

        "line_items": [
            {
                "variant_id": 33115215003692,
                "quantity": 1
            }
        ]

    }
    await shopify.order.create(orderObject).then((order) => console.log(order))
        .catch((err) => console.error(err));
}
createOrder() */


/* var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/mibc-store-products";

MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var myStudent = [
        { name: 'Rohit', address: 'Magnet Brains Bhopal' },
        { name: 'Jai', address: 'Area Colony' },
        { name: 'Roy', address: 'Ashoka Garden' },
        { name: 'Rocky', address: 'MP Nagar' }
    ];
    db.collection("products").insertMany(myStudent, function (err, result) {
        if (err) throw err;
        console.log("Number of documents inserted");
        db.close();
    });

}); */

require('isomorphic-fetch')
const Koa = require('koa');
const router = require('koa-router');
const session = require('koa-session');
const shopifyAuth, { verifyRequest } = require('@shopify/koa-shopify-auth');
// Import our package
const { receiveWebhook, registerWebhook } = require('@shopify/koa-shopify-webhooks');

const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET } = process.env;

const app = new Koa();
const router = new Router();

app.keys = [SHOPIFY_API_SECRET];

app.use(session(app));
app.use(
    shopifyAuth({
        apiKey: SHOPIFY_API_KEY,
        secret: SHOPIFY_API_SECRET,
        scopes: ['write_orders, write_products'],
        async afterAuth(ctx) {
            const { shop, accessToken } = ctx.session;

            await registerWebhook({
                address: 'www.mycool-app.com/webhooks/products/create',
                topic: 'PRODUCTS_CREATE',
                accessToken,
                shop
            });

            await registerWebhook({
                address: 'www.mycool-app.com/webhooks/orders/create',
                topic: 'ORDERS_CREATE',
                accessToken,
                shop
            });

            ctx.redirect('/');
        },
    }),
);

const webhook = receiveWebhook({ secret: SHOPIFY_API_SECRET });

router.post('/webhooks/products/create', webhook, () => {
    /* handle products create */
    console.log('Product Created')
});
router.post('/webhooks/orders/create', webhook, () => {
    /* handle orders create */
    console.log('Order Created')
});

router.get('*', verifyRequest(), () => {
    /* app code */
});

app.use(router.allowedMethods());
app.use(router.routes());































