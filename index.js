const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');
const axios = require('axios');
const fs = require("fs");
const bodyParser = require('body-parser');
const async = require('async')
const path = require('path');
var ls = require('local-storage');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/mibc-store1-products";
app.use('/webhooks', bodyParser.raw({ type: 'application/json' }))
// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));
const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// const scopes = 'read_products';
const scopes = 'write_checkouts, write_customers, write_orders, write_products, write_themes, write_content'
const forwardingAddress = "https://4593ca5dbf38.ngrok.io"; // Replace this with your HTTPS Forwarding address without slash

app.get('/', (req, res) => {
    res.send('Hello World!');
});


app.post('/hook', (req, res) => {
    console.log(JSON.stringify(req.body))
    res.send('Hook route');
})

app.post('/account/install', (req, res) => {
    console.log(req.body)
})

app.get('/test', (req, res) => {
    const { shop } = req.query;
    ls.set('shop', shop);
    console.log('Here is a shop-----------/test route', shop)
    res.render('index');
    // res.sendFile(path.join(__dirname + '/index.html'));
})

//https://3ff881bf.ngrok.io/shopify?shop=mibc-store.myshopify.com
app.get('/shopify', (req, res) => {
    const shop = req.query.shop;
    // const shop = ls.get('shop');
    console.log('Here is a shop-----------' , shop)
    if (shop) {
        const state = nonce();
        const redirectUri = forwardingAddress + '/shopify/callback';
        const installUrl = 'https://' + shop +
            '/admin/oauth/authorize?client_id=' + apiKey +
            '&scope=' + scopes +
            '&state=' + state +
            '&redirect_uri=' + redirectUri;

        res.cookie('state', state);
        // res.sendFile(path.join(__dirname + '/index.html'));
        // ls.clear();
        res.redirect(installUrl);
    } else {
        return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
    }
});


// https://623a51c9.ngrok.io/shopify/callback?
//code = 791aec7cebf6e31010ef1d8cc70c339e 
//& hmac=cad11460b562de2149011980748f76485a4177b6bc655663bf331d1abd11a700 
//& shop=mibc - store.myshopify.com & state=158573813409300 & timestamp=1585738135

app.get('/shopify/callback', (req, res) => {
    const { shop, hmac, code, state } = req.query;
    const stateCookie = cookie.parse(req.headers.cookie).state;

    if (state !== stateCookie) {
        return res.status(403).send('Request origin cannot be verified');
    }

    if (shop && hmac && code) {
        // DONE: Validate request is from Shopify
        const map = Object.assign({}, req.query);
        delete map['signature'];
        delete map['hmac'];
        const message = querystring.stringify(map);
        const providedHmac = Buffer.from(hmac, 'utf-8');
        const generatedHash = Buffer.from(
            crypto
                .createHmac('sha256', apiSecret)
                .update(message)
                .digest('hex'),
            'utf-8'
        );
        let hashEquals = false;

        try {
            hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
        } catch (e) {
            hashEquals = false;
        };

        if (!hashEquals) {
            return res.status(400).send('HMAC validation failed');
        }

        // DONE: Exchange temporary code for a permanent access token
        const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
        const accessTokenPayload = {
            client_id: apiKey,
            client_secret: apiSecret,
            code,
        };

        request.post(accessTokenRequestUrl, { json: accessTokenPayload })
            .then(async (accessTokenResponse) => {
                const accessToken = accessTokenResponse.access_token;
                console.log("Access token is : ", accessToken);
                // DONE: Use access token to make API call to 'shop' endpoint


                const shopRequestUrl = 'https://' + shop + '/admin/shop.json';
                const shopRequestHeaders = {
                    'X-Shopify-Access-Token': accessToken,
                };

                request.get(shopRequestUrl, { headers: shopRequestHeaders })
                    .then((shopResponse) => {
                        console.log(shopResponse)

                        // res.redirect('https://mibc-store.myshopify.com/')
                        res.status(200).end(shopResponse);
                    })
                    .catch((error) => {
                        res.status(error.statusCode).send(error.error.error_description);
                    });


                //Get Liquid File code

                // const liquidFile = await liquidFileCode(accessToken, shop)
                // console.log(liquidFile)
                // if (liquidFile.Ok == 200) {
                //     fs.writeFile("product-template.liquid", liquidFile.code, function (err) {
                //         if (err) {
                //             return console.log(err);
                //         }
                //         console.log("The file was saved!");
                //     });
                //     res.json(
                //         JSON.stringify({
                //             message: "Product Template code - The file was saved in code directory",
                //             code: liquidFile.code
                //         })
                //     );
                // }

                // Now upload assets
                // const data = await assets(accessToken, shop)
                // console.log("data is :", data)
                // if (data.Ok == 200) {
                //     res.json(
                //         JSON.stringify({
                //             message:
                //                 "Assets uploaded successfully "
                //         })
                //     );
                // }

            }).catch((error) => {
                console.log(error);
                res.status(error.statusCode).send(error.error.error_description);
            });
    } else {
        res.status(400).send('Required parameters missing');
    }
});




const liquidFileCode = async (accessToken, shop) => {
    const apiGetThemeListUrl = 'https://' + shop + '/admin/themes.json';
    const themeRequestHeaders = {
        headers: {
            'X-Shopify-Access-Token': accessToken,
            timeout: 10000
        }
    };
    const jsfile = './assetsfiles/storetest2.js'
    const apiThemeResponse = await axios.get(apiGetThemeListUrl, themeRequestHeaders);
    const themeData = apiThemeResponse.data.themes;


    let activeTheme = "";
    for (const theme of themeData) {
        if (theme.role === "main") {
            activeTheme = theme.id;
            const apiGetThemeProductCodeUrl = `https://${shop}/admin/themes/${activeTheme}/assets.json?asset[key]=sections/product-template.liquid`;
            const productTemplateCode = await axios.get(apiGetThemeProductCodeUrl, themeRequestHeaders);
            console.log(productTemplateCode.data.asset.value)

            return {
                "Ok": 200,
                "code": productTemplateCode.data.asset.value
            }
        }
    }

}



const assets = async (accessToken, shop) => {
    const apiGetThemeListUrl = 'https://' + shop + '/admin/themes.json';
    const themeRequestHeaders = {
        headers: {
            'X-Shopify-Access-Token': accessToken,
            timeout: 10000
        }
    };
    const jsfile = './assetsfiles/storetest2.js'
    const apiThemeResponse = await axios.get(apiGetThemeListUrl, themeRequestHeaders);
    const themeData = apiThemeResponse.data.themes;


    let activeTheme = "";
    for (const theme of themeData) {
        if (theme.role === "main") {
            activeTheme = theme.id;
            const bufJs = await fs.readFileSync(jsfile);
            const jsData = {
                asset: {
                    key: "assets/storetest2.js",
                    attachment: bufJs.toString("base64")
                }
            };

            const apiPutThemeAssetsUrl = `https://${shop}/admin/themes/${activeTheme}/assets.json`;
            await axios.put(apiPutThemeAssetsUrl, jsData, themeRequestHeaders);

            return {
                "Ok": 200
            }
        }
    }
}

//https://af09856f.ngrok.io/app/createproduct?shop=mibc-store.myshopify.com
app.get('/app/createproduct', function (req, res) {

    //this is what we need to post
    // POST /admin/products.json
    // {
    //   "product": {
    //     "title": "Burton Custom Freestyle 151",
    //     "body_html": "<strong>Good snowboard!</strong>",
    //     "vendor": "Burton",
    //     "product_type": "Snowboard",
    //     "tags": "Barnes & Noble, John's Fav, &quot;Big Air&quot;"
    //   }
    // }

    let new_product = {
        "product": {
            "title": "Ball and Bat new 4",
            "body_html": "<strong>Good bat!</strong>",
            "vendor": "Ball and Bat",
            "product_type": "Ball and Bat",
            "tags": "Barnes & Noble, John's Fav, Ball and Bat  &quot;Big Air&quot;",
            "images": [{ "src": "https://i.pinimg.com/originals/eb/f7/f3/ebf7f3a5c1657cc039020ae79c22d905.jpg" }],
            "image": "https://i.pinimg.com/originals/eb/f7/f3/ebf7f3a5c1657cc039020ae79c22d905.jpg"
        }
    };
    console.log(req.query.shop);
    let url = 'https://' + req.query.shop + '/admin/products.json';

    let options = {
        method: 'POST',
        uri: url,
        json: true,
        resolveWithFullResponse: true,//added this to view status code
        headers: {
            'X-Shopify-Access-Token': process.env.ACCESS_TOKEN,
            'content-type': 'application/json'
        },
        body: new_product//pass new product object - NEW - request-promise problably updated
    };

    request.post(options)
        .then(function (response) {
            console.log(response.body);
            if (response.statusCode == 201) {
                res.json(response.body);
            } else {
                res.json(false);
            }

        })
        .catch(function (err) {
            console.log(err);
            res.json(false);
        });


});

//https://af09856f.ngrok.io/app/update?shop=mibc-store.myshopify.com&id=4800257097772
app.get('/app/update', function (req, res) {

    let new_product = {
        // "product": {
        //     "title": "New 2 Ball and Bat",
        // }

        "product": {
            "id": req.query.id,
            "variants": [
                {
                    "id": 123456
                }
            ]
        }
    };

    console.log(req.query.shop);
    let url = 'https://' + req.query.shop + '/admin/products/' + req.query.id + '.json';
    console.log('Url :', url)

    request({
        method: 'PUT',
        uri: url,
        json: true,
        resolveWithFullResponse: true,//added this to view status code
        headers: {
            'X-Shopify-Access-Token': process.env.ACCESS_TOKEN,
            'content-type': 'application/json'
        },
        body: new_product//pass new product object - NEW - request-promise problably updated

    },
        function (error, response, body) {
            if (error) {
                return console.error('upload failed:', error);
            }
            console.log('Upload successful!  Server responded with:', body);
            res.json(true);
        })


});


//https://af09856f.ngrok.io/app/delete?shop=mibc-store.myshopify.com&id=4799908610092
app.get('/app/delete', function (req, res) {
    let url = 'https://' + req.query.shop + '/admin/products/' + req.query.id + '.json';

    let options = {
        method: 'DELETE',
        uri: url,
        resolveWithFullResponse: true,//added this to view status code
        headers: {
            'X-Shopify-Access-Token': process.env.ACCESS_TOKEN,
            'content-type': 'application/json'
        }
    };

    request.delete(options)
        .then(function (response) {
            console.log(response.body);
            if (response.statusCode == 200) {
                res.json(true);
            } else {
                res.json(false);
            }

        })
        .catch(function (err) {
            console.log(err);
            res.json(false);
        });
});

//https://af09856f.ngrok.io/app/allproducts?shop=mibc-store.myshopify.com
app.get('/app/allproducts', async (req, res) => {
    // DONE: Use access token to make API call to 'shop' endpoint

    const { shop } = req.query
    const shopRequestUrlCount = 'https://' + shop + '/admin/products/count.json'
    const shopRequestHeaderscount = {
        headers: {
            'X-Shopify-Access-Token': process.env.ACCESS_TOKEN,
        }
    };
    const count = await request.get(shopRequestUrlCount, shopRequestHeaderscount)
    const c = JSON.parse(count)
    const itr = Math.ceil(c.count)
    console.log("Products are :", itr)
    // console.log(Math.ceil(count));

    for (let i = 1; i <= Math.ceil(itr / 250); i++) {
        const shopRequestUrl = 'https://' + shop + '/admin/products.json?limit=250&page=' + i;
        console.log('Url is :', shopRequestUrl)
        const shopRequestHeaders = {
            headers: {
                'X-Shopify-Access-Token': process.env.ACCESS_TOKEN,
            }
        };

        await request.get(shopRequestUrl, shopRequestHeaders)
            .then((shopResponse) => {
                var arshopResponse = JSON.parse(shopResponse)
                console.log("datada", arshopResponse.products);
                var counter = 0
                // console.log(data.products)
                async.eachSeries(arshopResponse.products, function (item, callback) {
                    counter = counter + 1
                    //     console.log("Here is item :", item);
                    item["storeName"] = "mibc-store.myshopify.com"

                    //Object Mapping
                    let product = {}
                    // product._id = item._id
                    product.title = item.title
                    product.vendor = item.vendor
                    product.brand = item.storeName
                    product.shortDescription = item.shortDescription || ' '
                    product.handle = item.handle
                    product.avatar = item.image.src || ' '
                    product.options = item.options
                    product.publishedScope = item.published_scope || ' '
                    product.tags = item.tags
                    product.metaTags = item.metaTags || ' '
                    product.specificationList = item.specificationList
                    product.universal = true
                    product.hasMultipleOptions = item.hasMultipleOptions || false
                    product.createdAt = item.created_at
                    product.updatedAt = item.updated_at
                    product.isDeleted = false

                    console.log('Here is a object :', product)

                    MongoClient.connect(url, async function (err, db) {
                        if (err) throw err;
                        // item["storeName"] = "mibc-store.myshopify.com"
                        db.collection("products").insertOne(product, function (err, result) {
                            if (err) throw err;
                            console.log("Number of documents inserted");
                            db.close();
                        });
                    });
                    callback();
                });
                return res.status(200).end(shopResponse);
            })
            .catch((error) => {
                res.status(error.statusCode).send(error);
            });
    }
})


//retrive single product from
//https://af09856f.ngrok.io/app/singleproduct?shop=mibc-store.myshopify.com&id=4800257097772
//https://mibc-store.myshopify.com/admin/products/4800257097772.json
app.get('/app/singleproduct', (req, res) => {
    // DONE: Use access token to make API call to 'shop' endpoint
    const { shop, id } = req.query
    const shopRequestUrl = 'https://' + shop + '/admin/products/' + id + '.json';
    console.log('Url is :', shopRequestUrl)
    const shopRequestHeaders = {
        headers: {
            'X-Shopify-Access-Token': process.env.ACCESS_TOKEN,
        }
    };

    request.get(shopRequestUrl, shopRequestHeaders)
        .then((shopResponse) => {
            res.status(200).end(shopResponse);
        })
        .catch((error) => {
            res.status(error.statusCode).send(error.error.error_description);
        });
})

//https://af09856f.ngrok.io/app/createOrder?shop=mibc-store.myshopify.com&quantity=10&varient=33115215003692
app.get('/app/createOrder', (req, res) => {
    const { shop, varient, quantity } = req.query;
    const url = "https://" + shop + "/admin/orders.json"

    const orderObject = {
        "order": {
            "email": "imran.bilal@blueeast.com",
            "fulfillment_status": "fulfilled",
            "send_receipt": true,
            "send_fulfillment_receipt": true,
            "line_items": [
                {
                    "variant_id": varient,
                    "quantity": quantity
                }
            ]
        }
    }

    let options = {
        method: 'POST',
        uri: url,
        json: true,
        resolveWithFullResponse: true,//added this to view status code
        headers: {
            'X-Shopify-Access-Token': process.env.ACCESS_TOKEN,
            'content-type': 'application/json'
        },
        body: orderObject//pass new order object - NEW - request-promise problably updated
    };

    request.post(options)
        .then(function (response) {
            //   console.log(response.body);
            if (response.statusCode == 201) {
                res.json(response.body);
            } else {
                res.json(false);
            }

        })
        .catch(function (err) {
            console.log(err);
            res.json(false);
        });
})

app.get('/app/updateorder', function (req, res) {

    // order.line_items[0].variant_id = "12345678"
    let new_product = {

        "order": {
            "id": 2081616658476,
            "note": "Customer contacted us about a custom engraving on this iPod",
            line_items: [{
                variant_id: "1234556",
                title: "New one"
            }]
        }
    }


    console.log(req.query.shop);
    let url = 'https://' + req.query.shop + '/admin/orders/' + req.query.id + '.json';
    console.log('Url :', url)

    request({
        method: 'PUT',
        uri: url,
        json: true,
        resolveWithFullResponse: true,//added this to view status code
        headers: {
            'X-Shopify-Access-Token': process.env.ACCESS_TOKEN,
            'content-type': 'application/json'
        },
        body: new_product//pass new product object - NEW - request-promise problably updated

    },
        function (error, response, body) {
            if (error) {
                return console.error('upload failed:', error);
            }
            console.log('Upload successful!  Server responded with:', body);
            res.json(true);
        })


});
const getRawBody = require('raw-body')
const secretKey = '4b6532e09b6bf66bc3a9d029c0f728ef4caef1b587afc3737a581217c86ef302'

app.post('/webhooks/orders/create', async (req, res) => {
    console.log(' We got an order!')

    console.log('Shopname is :', req.get('X-Shopify-Shop-Domain'))
    // we'll compare the hmac to our own hash
    const hmac = req.get('X-Shopify-Hmac-Sha256')

    // create a hash using the body and our key
    const hash = crypto
        .createHmac('sha256', secretKey)
        .update(req.body, 'utf8', 'hex')
        .digest('base64')

    // Compare our hash to Shopify's hash
    if (hash === hmac) {
        // It's a match! All good
        console.log('Hey, it came from Shopifify!')
        console.log(req.body.toString('utf8'));
        res.sendStatus(200)
    } else {
        // No match! This request didn't originate from Shopify
        console.log('Danger! Not from Shopify!')
        res.sendStatus(403)
    }
})


//https://af09856f.ngrok.io/app/createhook?shop=mibc-store.myshopify.com
app.get('/app/createhook', (req, res) => {
    const { shop } = req.query;
    const url = "https://" + shop + "/admin/webhooks.json"

    const webhookObj = {
        "webhook": {
            "topic": "orders/create",
            "address": "https://03deb468.ngrok.io/webhooks/orders/create",
            "format": "json"
        }
    }

    let options = {
        method: 'POST',
        uri: url,
        json: true,
        resolveWithFullResponse: true,//added this to view status code
        headers: {
            'X-Shopify-Access-Token': process.env.ACCESS_TOKEN,
            'content-type': 'application/json'
        },
        body: webhookObj
    };

    request.post(options)
        .then(function (response) {
            console.log(response.body);
            if (response.statusCode == 201) {
                res.json(response.body);
            } else {
                res.json(false);
            }

        })
        .catch(function (err) {
            console.log(err);
            res.json(false);
        });
})


app.post('/webhooks/product/create', async (req, res) => {
    console.log(' New Product Created')
    // we'll compare the hmac to our own hash
    const hmac = req.get('X-Shopify-Hmac-Sha256')

    // create a hash using the body and our key
    const hash = crypto
        .createHmac('sha256', secretKey)
        .update(req.body, 'utf8', 'hex')
        .digest('base64')

    // Compare our hash to Shopify's hash
    if (hash === hmac) {
        // It's a match! All good
        console.log('Hey, it came from Shopifify!')
        console.log(req.body.toString('utf8'));
        res.sendStatus(200)
    } else {
        // No match! This request didn't originate from Shopify
        console.log('Danger! Not from Shopify!')
        res.sendStatus(403)
    }
})


app.listen(3000, () => {
    console.log('Server listening on port 3000!');
});