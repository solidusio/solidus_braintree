//= require "vendor/braintree-2.9.0"

Braintree.setup("", "dropin", {
  container: "braintree-dropin",
  form: "new_payment",
  onReady: function() {
    return console.log("braintree dropin is ready");
  },
  onPaymentMethodReceived: (function(_this) {
    return function(obj) {
      return console.log(obj.nonce);
    };
  })(this)
});
