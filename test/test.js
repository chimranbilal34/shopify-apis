const fs = require('fs');
const cheerio = require('cheerio')

let script = `<div class="product-form__item product-form__item--submit
                {%- if section.settings.enable_payment_button %} product-form__item--payment-button {%- endif -%}
                {%- if product.has_only_default_variant %} product-form__item--no-variants {%- endif -%}"
              >
                <button type="submit" name="add" onclick="return checkCommi(event)" class="commi-add-to-cart commi-add-to-cart-btn add-to-cart bordered uppercase">
                    <span>
                      <span {% if settings.language_enable %}data-translate="products.product.add_to_cart"{% endif %}>{{ 'products.product.add_to_cart' | t }}</span>
                    </span>
                  </button>
                {% if section.settings.enable_payment_button %}
                  {{ form | payment_button }}
                {% endif %}
              </div>`

fs.readFile('theme.html', { encoding: 'utf-8' }, async (err, html) => {
  if (err) {
    throw err;
  }
  var $ = cheerio.load(html, {
    decodeEntities: false, useHtmlParser2: true, withDomLvl1: true,
    normalizeWhitespace: false
  });
  const tag = `<div class="test"> </div>`
  // var a = $('.second').addClass('welcome').text('Hello there!')
  // const a = $('.product-form__controls-group--submit').empty().append(script)
  let script1 = `{{ 'commiShopifyApp.js' | asset_url | script_tag }}
	              {{ 'commiShopifyApp.css' | asset_url | stylesheet_tag }}`
  const a = $('head').append(script1).html()
  //const a = $(script1).insertBefore('body')
  console.log("Testing :\n", a)

  await fs.writeFile("newtheme.html", $.html(), 'utf8', function (err) {
    if (err) {
      return console.log(err);
    }
    console.log("The file was saved!");
  });

  // fs.readFile('product.html', { encoding: 'utf-8' }, (err, data) => {
  //   if (err) {
  //     throw err;
  //   }
  //   // <body><head></head><body></body> </body></html>
  //   var $ = cheerio.load(data);
  //   // data = data.replace(/<html>/g, "")



  //   data = data.replace(/<html>/g, "").replace(/<head>/g, "").replace(/<body>/g, "").replace(/"="/g, "=")
  //   data = data.replace(/<\/head>/g, "").replace(/<\/html>/g, "").replace(/<\/body>/g, "")
  //   //  var sss = escapeCharacter(data)


  //   fs.writeFile("product11.liquid", data, 'utf8', function (err) {
  //     if (err) {
  //       return console.log(err);
  //     }
  //     console.log("The file was saved!");
  //   });

  // });
})
