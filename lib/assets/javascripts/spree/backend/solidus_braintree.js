//= require "vendor/braintree-2.9.0"

  var getClientToken = function(onSuccess){
    return Spree.ajax({
      url: "/api/payment_client_token",
      type: "post",
      error: function(serverResponse) {
        alert("You done goof'd! Go talk to allie!");
      },
      success: function(data) {
        onSuccess(data);
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
      onError: function() {
        return console.log("braintree f*cked up! Call allie!");
      },
      onPaymentMethodReceived: function(obj) {
        $("#payment_method_nonce").val(obj.nonce);
        $("#new_payment").submit();
        return;
      }
    });
  }

$(document).ready(function(){
  getClientToken(attachDropIn);
});
