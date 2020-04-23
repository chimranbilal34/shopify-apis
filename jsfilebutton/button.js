window.onload = addToCart()
function addToCart() {
    let script = `<button type="submit" name="add" onclick="return checkCommi(event)"
            class="commi-add-to-cart commi-add-to-cart-btn add-to-cart bordered uppercase">
            <span>
                <span {% if settings.language_enable %}data-translate="products.product.add_to_cart"
                    {% endif %}>{{ 'products.product.add_to_cart' | t }}</span>
            </span>
        </button>`


    document.querySelector(".add-to-cart1").replaceWith(script);
    //	document.querySelector(".product-form__controls-group--submit").innerHTML=" ";
    //document.querySelector(".product-form__controls-group--submit").innerHTML = script;
}


/* function addToCart() {
    let script = `<div class="product-form__item product-form__item--submit
                {%- if section.settings.enable_payment_button %} product-form__item--payment-button {%- endif -%}
                {%- if product.has_only_default_variant %} product-form__item--no-variants {%- endif -%}"
              >
                <button type="submit" name="add" onclick="return checkCommi(event)" class="commi-add-to-cart commi-add-to-cart-btn add-to-cart bordered uppercase">
                                                                  <span>
                                                                    <span {% if settings.language_enable %}data-translate="products.product.add_to_cart"{% endif %}>{{ 'products.product.add_to_cart' | t }}</span>
                                                                  </span>
                                                                </button>
              </div>`

    document.querySelector(".product-form__controls-group--submit").innerHTML = " ";
    document.querySelector(".product-form__controls-group--submit").innerHTML = script; */