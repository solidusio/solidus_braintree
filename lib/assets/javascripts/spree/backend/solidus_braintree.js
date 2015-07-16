//= require "vendor/braintree-2.9.0"

  var getClientToken = function(onSuccess){
    return Spree.ajax({
      url: "/api/payment_client_token",
      type: "post",
      error: function(serverResponse) {
        alert("You done goof'd")
      },
      success: function(data) {
        onSuccess(data)
      }
    });
  }

  var attachDropIn = function(data) {
    braintree.setup(data.client_token, "dropin", {
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
  }
//
//  var clientToken = getClientToken().responseText

$( document ).ready(function(){
  getClientToken(attachDropIn);
});

