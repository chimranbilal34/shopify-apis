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


const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
// const scopes = 'read_products';
const scopes = 'write_checkouts, write_customers, write_orders, write_products, write_themes, write_content'
const forwardingAddress = "https://3ff881bf.ngrok.io"; // Replace this with your HTTPS Forwarding address

app.get('/', (req, res) => {
    res.send('Hello World!');
});


//https://3ff881bf.ngrok.io/shopify?shop=mibc-store.myshopify.com
app.get('/shopify', (req, res) => {
    const shop = req.query.shop;
    if (shop) {
        const state = nonce();
        const redirectUri = forwardingAddress + '/shopify/callback';
        const installUrl = 'https://' + shop +
            '/admin/oauth/authorize?client_id=' + apiKey +
            '&scope=' + scopes +
            '&state=' + state +
            '&redirect_uri=' + redirectUri;

        res.cookie('state', state);
        res.redirect(installUrl);
    } else {
        return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
    }
});


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

        /*         request.post(accessTokenRequestUrl, { json: accessTokenPayload })
                    .then((accessTokenResponse) => {
                        const accessToken = accessTokenResponse.access_token;
                        console.log("Access token is : ", accessToken);
                        // DONE: Use access token to make API call to 'shop' endpoint
                        const shopRequestUrl = 'https://' + shop + '/admin/products.json';
                        const shopRequestHeaders = {
                            headers: {
                                'X-Shopify-Access-Token': accessToken,
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
                    .catch((error) => {
                        res.status(error.statusCode).send(error.error.error_description);
                    }); */


        request.post(accessTokenRequestUrl, { json: accessTokenPayload })
            .then(async (accessTokenResponse) => {
                const accessToken = accessTokenResponse.access_token;
                console.log("Access token is : ", accessToken);
                // DONE: Use access token to make API call to 'shop' endpoint

                //Now upload assets
                const data = await assets(accessToken, shop)
                console.log("data is :", data)
                if (data.Ok == 200) {
                    res.json(
                        JSON.stringify({
                            message:
                                "Assets uploaded successfully "
                        })
                    );
                }

            }).catch((error) => {
                console.log(error);
                res.status(error.statusCode).send(error.error.error_description);
            });
    } else {
        res.status(400).send('Required parameters missing');
    }
});

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
        "product": {
            "title": "New 2 Ball and Bat",
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
app.get('/app/allproducts', (req, res) => {
    // DONE: Use access token to make API call to 'shop' endpoint
    const { shop } = req.query
    const shopRequestUrl = 'https://' + shop + '/admin/products.json';
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



app.listen(3000, () => {
    console.log('Server listening on port 3000!');
});